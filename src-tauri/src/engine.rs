use anyhow::{anyhow, Context, Result};
use arrow::array::*;
use arrow::datatypes::{DataType, Field, Schema};
use arrow::record_batch::RecordBatch;
use calamine::{open_workbook, Data as ExcelData, Reader, Xlsx};
use datafusion::datasource::MemTable;
use datafusion::logical_expr::when;
use datafusion::prelude::*;
use rusqlite::Connection;
use std::sync::Arc;
use std::time::Instant;
use sysinfo::System;

use crate::models::{
    ColumnProfile, ColumnSchema, ExecuteResponse, FilterOp, NodeKind, NodeProfileResponse, PipelineDag, SchemaResponse,
};

const PREVIEW_LIMIT: usize = 100;

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

/// Execute a full pipeline DAG and return the preview result.
pub async fn execute_pipeline(dag: PipelineDag) -> Result<ExecuteResponse> {
    let start = Instant::now();

    // 1. Topological sort of the DAG
    let ordered = topological_sort(&dag)?;

    // 2. Build DataFusion session
    let ctx = SessionContext::new();


    // 4. Build DataFrames for each node
    let mut dfs: std::collections::HashMap<String, datafusion::dataframe::DataFrame> = std::collections::HashMap::new();
    let mut final_df: Option<datafusion::dataframe::DataFrame> = None;

    for node in &ordered {
        let df = match node.kind {
            NodeKind::CsvSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("CsvSource missing path"))?;
                ctx.register_csv(&node.id, path, CsvReadOptions::new()).await
                    .with_context(|| format!("Failed to read CSV at '{path}'"))?;
                ctx.table(&node.id).await?
            }
            NodeKind::ParquetSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("ParquetSource missing path"))?;
                ctx.register_parquet(&node.id, path, ParquetReadOptions::default()).await
                    .with_context(|| format!("Failed to read Parquet at '{path}'"))?;
                ctx.table(&node.id).await?
            }
            NodeKind::JsonSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("JsonSource missing path"))?;
                ctx.register_json(&node.id, path, NdJsonReadOptions::default()).await
                    .with_context(|| format!("Failed to read JSON at '{path}'"))?;
                ctx.table(&node.id).await?
            }
            NodeKind::AvroSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("AvroSource missing path"))?;
                ctx.register_avro(&node.id, path, AvroReadOptions::default()).await
                    .with_context(|| format!("Failed to read Avro at '{path}'"))?;
                ctx.table(&node.id).await?
            }
            NodeKind::ExcelSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("ExcelSource missing path"))?;
                let sheet = node.config.sheet_name.as_deref().unwrap_or("Sheet1");
                let batch = excel_to_record_batch(path, sheet)
                    .with_context(|| format!("Failed to read Excel at '{path}' sheet '{sheet}'"))?;
                let schema = batch.schema();
                let table = MemTable::try_new(schema, vec![vec![batch]])?;
                ctx.register_table(&node.id, Arc::new(table))?;
                ctx.table(&node.id).await?
            }
            NodeKind::SqliteSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("SqliteSource missing path"))?;
                let table = node.config.table_name.as_deref().ok_or_else(|| anyhow!("SqliteSource missing table_name"))?;
                let batch = sqlite_to_record_batch(path, table)
                    .with_context(|| format!("Failed to read SQLite '{table}' at '{path}'"))?;
                let schema = batch.schema();
                let mem = MemTable::try_new(schema, vec![vec![batch]])?;
                ctx.register_table(&node.id, Arc::new(mem))?;
                ctx.table(&node.id).await?
            }
            NodeKind::Filter => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let col_name = node.config.column.as_deref().ok_or_else(|| anyhow!("Missing filter col"))?;
                let op = node.config.op.as_ref().ok_or_else(|| anyhow!("Missing filter op"))?;
                let val = node.config.value.as_deref().ok_or_else(|| anyhow!("Missing filter val"))?;
                let expr = build_filter_expr(col_name, op, val);
                parent_df.filter(expr)?
            }
            NodeKind::Projection => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let cols = node.config.columns.as_ref().ok_or_else(|| anyhow!("Missing proj cols"))?;
                let exprs: Vec<_> = cols.iter().map(|c| col(c)).collect();
                parent_df.select(exprs)?
            }
            NodeKind::Sort => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let sort_cols = node.config.sort_columns.as_ref().ok_or_else(|| anyhow!("Sort missing sort_columns"))?;
                let sort_exprs: Vec<_> = sort_cols.iter()
                    .map(|sc| col(&sc.column).sort(!sc.descending, sc.descending))
                    .collect();
                parent_df.sort(sort_exprs)?
            }
            NodeKind::Deduplicate => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                parent_df.distinct()?
            }
            NodeKind::DropNulls => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let schema = parent_df.schema().clone();
                let columns_to_check: Vec<String> = match &node.config.drop_nulls_columns {
                    Some(cols) if !cols.is_empty() => cols.clone(),
                    _ => schema.fields().iter().map(|f| f.name().clone()).collect(),
                };
                let filter_expr = columns_to_check.iter()
                    .map(|c| col(c.as_str()).is_not_null())
                    .reduce(|a, b| a.and(b))
                    .unwrap_or(lit(true));
                parent_df.filter(filter_expr)?
            }
            NodeKind::FillNulls => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let fill_col = node.config.fill_column.as_deref().ok_or_else(|| anyhow!("FillNulls missing fill_column"))?;
                let fill_val = node.config.fill_value.as_deref().ok_or_else(|| anyhow!("FillNulls missing fill_value"))?;
                let lit_val = if let Ok(n) = fill_val.parse::<f64>() {
                    lit(n)
                } else {
                    lit(fill_val)
                };
                let fill_expr = when(col(fill_col).is_null(), lit_val).otherwise(col(fill_col))?;
                parent_df.with_column(fill_col, fill_expr)?
            }
            NodeKind::RenameColumns => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let renames = node.config.renames.as_ref().ok_or_else(|| anyhow!("RenameColumns missing renames"))?;
                let mut df = parent_df;
                for rename in renames {
                    df = df.with_column_renamed(&rename.old_name, &rename.new_name)?;
                }
                df
            }
            NodeKind::DerivedColumn => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let new_col = node.config.new_column_name.as_deref().ok_or_else(|| anyhow!("DerivedColumn missing new_column_name"))?;
                let expression = node.config.expression.as_deref().ok_or_else(|| anyhow!("DerivedColumn missing expression"))?;
                // Materialize parent into MemTable so we can run SQL with the expression
                let schema = parent_df.schema().inner().clone();
                let batches = parent_df.collect().await?;
                let temp_name = format!("_dc_{}", &node.id.replace('-', "")[..8.min(node.id.replace('-', "").len())]);
                let mem_table = Arc::new(MemTable::try_new(schema, vec![batches])?);
                ctx.register_table(&temp_name, mem_table)?;
                ctx.sql(&format!("SELECT *, ({}) AS \"{}\" FROM \"{}\"", expression, new_col, temp_name)).await?
            }
            NodeKind::TopN => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let n = node.config.limit_n.ok_or_else(|| anyhow!("TopN missing limit_n"))?;
                let df = if let Some(sort_cols) = &node.config.sort_columns {
                    if !sort_cols.is_empty() {
                        let sort_exprs: Vec<_> = sort_cols.iter()
                            .map(|sc| col(&sc.column).sort(!sc.descending, sc.descending))
                            .collect();
                        parent_df.sort(sort_exprs)?
                    } else {
                        parent_df
                    }
                } else {
                    parent_df
                };
                df.limit(0, Some(n))?
            }
            NodeKind::GroupBy => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let g_cols = node.config.group_by_columns.as_ref().ok_or_else(|| anyhow!("Missing group cols"))?;
                let group_exprs: Vec<_> = g_cols.iter().map(|c| col(c)).collect();
                let aggs = node.config.aggregations.as_ref().ok_or_else(|| anyhow!("Missing aggs"))?;
                let agg_exprs: Vec<_> = aggs.iter().map(|agg| {
                    let col_expr = col(&agg.column);
                    let alias = format!("{}_{}", agg.column, agg.op.to_sql_op().to_lowercase());
                    let fun_expr = match agg.op {
                        crate::models::AggregateOp::Sum => datafusion::functions_aggregate::sum::sum(col_expr),
                        crate::models::AggregateOp::Avg => datafusion::functions_aggregate::average::avg(col_expr),
                        crate::models::AggregateOp::Count => datafusion::functions_aggregate::count::count(col_expr),
                        crate::models::AggregateOp::Min => datafusion::functions_aggregate::min_max::min(col_expr),
                        crate::models::AggregateOp::Max => datafusion::functions_aggregate::min_max::max(col_expr),
                    };
                    fun_expr.alias(alias)
                }).collect();
                parent_df.aggregate(group_exprs, agg_exprs)?
            }
            NodeKind::Join => {
                let (left_parent, right_parent) = get_join_parents(&node.id, &dag)?;
                let left_df = dfs.get(&left_parent).ok_or_else(|| anyhow!("Missing left df"))?.clone();
                let right_df = dfs.get(&right_parent).ok_or_else(|| anyhow!("Missing right df"))?.clone();
                let join_type = node.config.join_type.as_ref().ok_or_else(|| anyhow!("Missing join type"))?;
                let df_join_type = match join_type {
                    crate::models::JoinType::Inner => datafusion::logical_expr::JoinType::Inner,
                    crate::models::JoinType::Left => datafusion::logical_expr::JoinType::Left,
                    crate::models::JoinType::Right => datafusion::logical_expr::JoinType::Right,
                    crate::models::JoinType::Full => datafusion::logical_expr::JoinType::Full,
                };
                let left_col = node.config.left_column.as_deref().ok_or_else(|| anyhow!("Missing left col"))?;
                let right_col = node.config.right_column.as_deref().ok_or_else(|| anyhow!("Missing right col"))?;
                left_df.join(right_df, df_join_type, &[left_col], &[right_col], None)?
            }
            NodeKind::Union => {
                let (left_parent, right_parent) = get_two_parents(&node.id, &dag)?;
                let left_df = dfs.get(&left_parent).ok_or_else(|| anyhow!("Missing left df for Union"))?.clone();
                let right_df = dfs.get(&right_parent).ok_or_else(|| anyhow!("Missing right df for Union"))?.clone();
                left_df.union(right_df)?
            }
            NodeKind::ParquetSink => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Parquet Export missing data input"))?.clone();
                if let Some(raw_path) = &node.config.path {
                    if !raw_path.trim().is_empty() {
                        let export_path = resolve_export_path(raw_path, "output.parquet");
                        if let Some(parent_dir) = export_path.parent() {
                            let _ = std::fs::create_dir_all(parent_dir);
                        }
                        let batches = parent_df.clone().collect().await
                            .with_context(|| format!("Failed collecting data for Parquet Export"))?;

                        if !batches.is_empty() {
                            let schema = batches[0].schema();
                            let file = std::fs::File::create(&export_path)
                                .with_context(|| format!("Failed to create Parquet file at '{:?}'", export_path))?;
                            let props = datafusion::parquet::file::properties::WriterProperties::builder().build();
                            let mut writer = datafusion::parquet::arrow::ArrowWriter::try_new(file, schema, Some(props))
                                .with_context(|| format!("Failed creating Parquet writer"))?;
                            for batch in &batches {
                                writer.write(batch)
                                    .with_context(|| format!("Failed writing batch to Parquet"))?;
                            }
                            writer.close()
                                .with_context(|| format!("Failed closing Parquet file"))?;
                        }
                    }
                }
                parent_df
            }
            NodeKind::CsvSink => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("CSV Export missing data input"))?.clone();
                if let Some(raw_path) = &node.config.path {
                    if !raw_path.trim().is_empty() {
                        let export_path = resolve_export_path(raw_path, "output.csv");
                        if let Some(parent_dir) = export_path.parent() {
                            let _ = std::fs::create_dir_all(parent_dir);
                        }
                        let batches = parent_df.clone().collect().await
                            .with_context(|| format!("Failed collecting data for CSV Export"))?;

                        let file = std::fs::File::create(&export_path)
                            .with_context(|| format!("Failed to create CSV file at '{:?}'", export_path))?;
                        let mut writer = arrow::csv::WriterBuilder::new()
                            .with_header(true)
                            .build(file);
                        for batch in &batches {
                            writer.write(batch)
                                .with_context(|| format!("Failed writing batch to CSV"))?;
                        }
                    }
                }
                parent_df
            }
            NodeKind::JsonSink => {
                let parent_id = get_parent_id(&node.id, &dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("JSON Export missing data input"))?.clone();
                if let Some(raw_path) = &node.config.path {
                    if !raw_path.trim().is_empty() {
                        let export_path = resolve_export_path(raw_path, "output.json");
                        if let Some(parent_dir) = export_path.parent() {
                            let _ = std::fs::create_dir_all(parent_dir);
                        }
                        let batches = parent_df.clone().collect().await
                            .with_context(|| format!("Failed collecting data for JSON Export"))?;

                        let file = std::fs::File::create(&export_path)
                            .with_context(|| format!("Failed to create JSON file at '{:?}'", export_path))?;
                        let mut writer = arrow::json::LineDelimitedWriter::new(file);
                        for batch in &batches {
                            writer.write(batch)
                                .with_context(|| format!("Failed writing batch to JSON"))?;
                        }
                        writer.finish()
                            .with_context(|| format!("Failed closing JSON file"))?;
                    }
                }
                parent_df
            }
        };
        
        final_df = Some(df.clone());
        dfs.insert(node.id.clone(), df);
    }

    let final_df = final_df.ok_or_else(|| anyhow!("Pipeline produced no result"))?;

    // 5. Execute preview query (LIMIT 100)
    let preview_df = final_df.clone().limit(0, Some(PREVIEW_LIMIT))?;
    let batches = preview_df.collect().await?;

    // 6. Execute count query for total_rows
    let count_df = final_df.clone().aggregate(vec![], vec![datafusion::functions_aggregate::count::count(lit(1)).alias("cnt")])?;
    let count_batches = count_df.collect().await?;
    let total_rows = extract_count(&count_batches)?;

    let execution_ms = start.elapsed().as_millis() as u64;

    // 7. Convert Arrow batches → JSON rows
    let (columns, rows) = arrow_batches_to_json(&batches)?;
    let preview_rows = rows.len();

    // 8. Compute throughput
    let throughput = if execution_ms > 0 {
        (total_rows as f64 / execution_ms as f64) * 1000.0
    } else {
        total_rows as f64 * 1_000_000.0
    };

    // 9. Sample RAM usage
    let memory_mb = get_process_memory_mb();

    Ok(ExecuteResponse {
        columns,
        rows,
        total_rows,
        preview_rows,
        execution_ms,
        throughput_lines_per_sec: throughput,
        memory_mb,
        sql_generated: "DataFrame API".to_string(),
    })
}

/// Profile statistics for a specific target node in the DAG.
pub async fn profile_node(dag: PipelineDag, target_node_id: String) -> Result<NodeProfileResponse> {
    let start = Instant::now();

    // Verify target node exists in DAG
    if !dag.nodes.iter().any(|n| n.id == target_node_id) {
        return Err(anyhow!("Target node '{target_node_id}' not found in DAG"));
    }

    // Extract sub-DAG containing target_node_id and its upstream ancestors
    let mut needed_ids = std::collections::HashSet::new();
    needed_ids.insert(target_node_id.clone());

    let mut queue = vec![target_node_id.clone()];
    while let Some(curr_id) = queue.pop() {
        for edge in &dag.edges {
            if edge.target == curr_id && !needed_ids.contains(&edge.source) {
                needed_ids.insert(edge.source.clone());
                queue.push(edge.source.clone());
            }
        }
    }

    let sub_nodes: Vec<_> = dag.nodes.iter().filter(|n| needed_ids.contains(&n.id)).cloned().collect();
    let sub_edges: Vec<_> = dag.edges.iter().filter(|e| needed_ids.contains(&e.source) && needed_ids.contains(&e.target)).cloned().collect();
    let sub_dag = PipelineDag { nodes: sub_nodes, edges: sub_edges };

    let ordered = topological_sort(&sub_dag)?;
    let ctx = SessionContext::new();
    let mut dfs: std::collections::HashMap<String, datafusion::dataframe::DataFrame> = std::collections::HashMap::new();

    let mut target_df = None;

    for node in &ordered {
        let df = match node.kind {
            NodeKind::CsvSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("CsvSource missing path"))?;
                ctx.register_csv(&node.id, path, CsvReadOptions::new()).await?;
                ctx.table(&node.id).await?
            }
            NodeKind::ParquetSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("ParquetSource missing path"))?;
                ctx.register_parquet(&node.id, path, ParquetReadOptions::default()).await?;
                ctx.table(&node.id).await?
            }
            NodeKind::JsonSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("JsonSource missing path"))?;
                ctx.register_json(&node.id, path, NdJsonReadOptions::default()).await?;
                ctx.table(&node.id).await?
            }
            NodeKind::AvroSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("AvroSource missing path"))?;
                ctx.register_avro(&node.id, path, AvroReadOptions::default()).await?;
                ctx.table(&node.id).await?
            }
            NodeKind::ExcelSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("ExcelSource missing path"))?;
                let sheet = node.config.sheet_name.as_deref().unwrap_or("Sheet1");
                let batch = excel_to_record_batch(path, sheet)?;
                let schema = batch.schema();
                let table = MemTable::try_new(schema, vec![vec![batch]])?;
                ctx.register_table(&node.id, Arc::new(table))?;
                ctx.table(&node.id).await?
            }
            NodeKind::SqliteSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("SqliteSource missing path"))?;
                let table = node.config.table_name.as_deref().ok_or_else(|| anyhow!("SqliteSource missing table_name"))?;
                let batch = sqlite_to_record_batch(path, table)?;
                let schema = batch.schema();
                let mem = MemTable::try_new(schema, vec![vec![batch]])?;
                ctx.register_table(&node.id, Arc::new(mem))?;
                ctx.table(&node.id).await?
            }
            NodeKind::Filter => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let col_name = node.config.column.as_deref().ok_or_else(|| anyhow!("Missing filter col"))?;
                let op = node.config.op.as_ref().ok_or_else(|| anyhow!("Missing filter op"))?;
                let val = node.config.value.as_deref().ok_or_else(|| anyhow!("Missing filter val"))?;
                let expr = build_filter_expr(col_name, op, val);
                parent_df.filter(expr)?
            }
            NodeKind::Projection => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let cols = node.config.columns.as_ref().ok_or_else(|| anyhow!("Missing proj cols"))?;
                let exprs: Vec<_> = cols.iter().map(|c| col(c)).collect();
                parent_df.select(exprs)?
            }
            NodeKind::Sort => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let sort_cols = node.config.sort_columns.as_ref().ok_or_else(|| anyhow!("Sort missing sort_columns"))?;
                let sort_exprs: Vec<_> = sort_cols.iter()
                    .map(|sc| col(&sc.column).sort(!sc.descending, sc.descending))
                    .collect();
                parent_df.sort(sort_exprs)?
            }
            NodeKind::Deduplicate => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                parent_df.distinct()?
            }
            NodeKind::DropNulls => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let schema = parent_df.schema().clone();
                let columns_to_check: Vec<String> = match &node.config.drop_nulls_columns {
                    Some(cols) if !cols.is_empty() => cols.clone(),
                    _ => schema.fields().iter().map(|f| f.name().clone()).collect(),
                };
                let filter_expr = columns_to_check.iter()
                    .map(|c| col(c.as_str()).is_not_null())
                    .reduce(|a, b| a.and(b))
                    .unwrap_or(lit(true));
                parent_df.filter(filter_expr)?
            }
            NodeKind::FillNulls => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let fill_col = node.config.fill_column.as_deref().ok_or_else(|| anyhow!("FillNulls missing fill_column"))?;
                let fill_val = node.config.fill_value.as_deref().ok_or_else(|| anyhow!("FillNulls missing fill_value"))?;
                let lit_val = if let Ok(n) = fill_val.parse::<f64>() { lit(n) } else { lit(fill_val) };
                let fill_expr = when(col(fill_col).is_null(), lit_val).otherwise(col(fill_col))?;
                parent_df.with_column(fill_col, fill_expr)?
            }
            NodeKind::RenameColumns => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let renames = node.config.renames.as_ref().ok_or_else(|| anyhow!("RenameColumns missing renames"))?;
                let mut df = parent_df;
                for rename in renames {
                    df = df.with_column_renamed(&rename.old_name, &rename.new_name)?;
                }
                df
            }
            NodeKind::DerivedColumn => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let new_col = node.config.new_column_name.as_deref().ok_or_else(|| anyhow!("DerivedColumn missing new_column_name"))?;
                let expression = node.config.expression.as_deref().ok_or_else(|| anyhow!("DerivedColumn missing expression"))?;
                let schema = parent_df.schema().inner().clone();
                let batches = parent_df.collect().await?;
                let temp_name = format!("_dc_{}", &node.id.replace('-', "")[..8.min(node.id.replace('-', "").len())]);
                let mem_table = Arc::new(MemTable::try_new(schema, vec![batches])?);
                ctx.register_table(&temp_name, mem_table)?;
                ctx.sql(&format!("SELECT *, ({}) AS \"{}\" FROM \"{}\"", expression, new_col, temp_name)).await?
            }
            NodeKind::TopN => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let n = node.config.limit_n.ok_or_else(|| anyhow!("TopN missing limit_n"))?;
                let df = if let Some(sort_cols) = &node.config.sort_columns {
                    if !sort_cols.is_empty() {
                        let sort_exprs: Vec<_> = sort_cols.iter()
                            .map(|sc| col(&sc.column).sort(!sc.descending, sc.descending))
                            .collect();
                        parent_df.sort(sort_exprs)?
                    } else { parent_df }
                } else { parent_df };
                df.limit(0, Some(n))?
            }
            NodeKind::GroupBy => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                let parent_df = dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone();
                let g_cols = node.config.group_by_columns.as_ref().ok_or_else(|| anyhow!("Missing group cols"))?;
                let group_exprs: Vec<_> = g_cols.iter().map(|c| col(c)).collect();
                let aggs = node.config.aggregations.as_ref().ok_or_else(|| anyhow!("Missing aggs"))?;
                let agg_exprs: Vec<_> = aggs.iter().map(|agg| {
                    let col_expr = col(&agg.column);
                    let alias = format!("{}_{}", agg.column, agg.op.to_sql_op().to_lowercase());
                    let fun_expr = match agg.op {
                        crate::models::AggregateOp::Sum => datafusion::functions_aggregate::sum::sum(col_expr),
                        crate::models::AggregateOp::Avg => datafusion::functions_aggregate::average::avg(col_expr),
                        crate::models::AggregateOp::Count => datafusion::functions_aggregate::count::count(col_expr),
                        crate::models::AggregateOp::Min => datafusion::functions_aggregate::min_max::min(col_expr),
                        crate::models::AggregateOp::Max => datafusion::functions_aggregate::min_max::max(col_expr),
                    };
                    fun_expr.alias(alias)
                }).collect();
                parent_df.aggregate(group_exprs, agg_exprs)?
            }
            NodeKind::Join => {
                let (left_parent, right_parent) = get_join_parents(&node.id, &sub_dag)?;
                let left_df = dfs.get(&left_parent).ok_or_else(|| anyhow!("Missing left df"))?.clone();
                let right_df = dfs.get(&right_parent).ok_or_else(|| anyhow!("Missing right df"))?.clone();
                let join_type = node.config.join_type.as_ref().ok_or_else(|| anyhow!("Missing join type"))?;
                let df_join_type = match join_type {
                    crate::models::JoinType::Inner => datafusion::logical_expr::JoinType::Inner,
                    crate::models::JoinType::Left => datafusion::logical_expr::JoinType::Left,
                    crate::models::JoinType::Right => datafusion::logical_expr::JoinType::Right,
                    crate::models::JoinType::Full => datafusion::logical_expr::JoinType::Full,
                };
                let left_col = node.config.left_column.as_deref().ok_or_else(|| anyhow!("Missing left col"))?;
                let right_col = node.config.right_column.as_deref().ok_or_else(|| anyhow!("Missing right col"))?;
                left_df.join(right_df, df_join_type, &[left_col], &[right_col], None)?
            }
            NodeKind::Union => {
                let (left_parent, right_parent) = get_two_parents(&node.id, &sub_dag)?;
                let left_df = dfs.get(&left_parent).ok_or_else(|| anyhow!("Missing left df for Union"))?.clone();
                let right_df = dfs.get(&right_parent).ok_or_else(|| anyhow!("Missing right df for Union"))?.clone();
                left_df.union(right_df)?
            }
            NodeKind::ParquetSink | NodeKind::CsvSink | NodeKind::JsonSink => {
                let parent_id = get_parent_id(&node.id, &sub_dag)?;
                dfs.get(&parent_id).ok_or_else(|| anyhow!("Missing parent df"))?.clone()
            }
        };

        if node.id == target_node_id {
            target_df = Some(df.clone());
        }
        dfs.insert(node.id.clone(), df);
    }

    let df = target_df.or_else(|| dfs.get(&target_node_id).cloned())
        .ok_or_else(|| anyhow!("Target node '{target_node_id}' not found in DAG"))?;

    let schema = df.schema().clone();
    let batches = df.collect().await?;
    let total_rows: usize = batches.iter().map(|b| b.num_rows()).sum();
    let total_columns = schema.fields().len();

    let mut col_profiles = Vec::with_capacity(total_columns);

    for (col_idx, field) in schema.fields().iter().enumerate() {
        let col_name = field.name().clone();
        let data_type_str = format!("{:?}", field.data_type());

        let mut null_count = 0;
        let mut distinct_set = std::collections::HashSet::new();
        let mut sample_values = Vec::new();
        let mut min_str: Option<String> = None;
        let mut max_str: Option<String> = None;

        for batch in &batches {
            let column = batch.column(col_idx);
            null_count += column.null_count();

            for row_idx in 0..column.len() {
                if column.is_null(row_idx) {
                    continue;
                }
                let val_str = arrow::util::display::array_value_to_string(column, row_idx).unwrap_or_default();
                
                if sample_values.len() < 5 && !sample_values.contains(&val_str) {
                    sample_values.push(val_str.clone());
                }

                distinct_set.insert(val_str.clone());

                match &min_str {
                    None => min_str = Some(val_str.clone()),
                    Some(m) if &val_str < m => min_str = Some(val_str.clone()),
                    _ => {}
                }
                match &max_str {
                    None => max_str = Some(val_str.clone()),
                    Some(m) if &val_str > m => max_str = Some(val_str.clone()),
                    _ => {}
                }
            }
        }

        let null_percentage = if total_rows > 0 {
            (null_count as f64 / total_rows as f64) * 100.0
        } else {
            0.0
        };

        col_profiles.push(ColumnProfile {
            name: col_name,
            data_type: data_type_str,
            total_rows,
            null_count,
            null_percentage,
            distinct_count: distinct_set.len(),
            min_value: min_str,
            max_value: max_str,
            sample_values,
        });
    }

    Ok(NodeProfileResponse {
        node_id: target_node_id,
        total_rows,
        total_columns,
        profiling_time_ms: start.elapsed().as_millis(),
        columns: col_profiles,
    })
}

/// Inspect a CSV schema without running a full pipeline.
pub async fn inspect_schema(path: &str) -> Result<SchemaResponse> {
    let ctx = SessionContext::new();
    ctx.register_csv("source", path, CsvReadOptions::new())
        .await
        .with_context(|| format!("Failed to read CSV at '{path}'"))?;

    let df = ctx.sql("SELECT * FROM source LIMIT 0").await?;
    let schema = df.schema().clone();

    let count_df = ctx
        .sql("SELECT COUNT(*) as cnt FROM source")
        .await?;
    let count_batches = count_df.collect().await?;
    let row_count_estimate = extract_count(&count_batches)?;

    let columns = schema
        .fields()
        .iter()
        .map(|f| ColumnSchema {
            name: f.name().clone(),
            data_type: format!("{}", f.data_type()),
        })
        .collect();

    Ok(SchemaResponse {
        columns,
        row_count_estimate,
    })
}

fn build_filter_expr(col_name: &str, op: &FilterOp, val: &str) -> datafusion::logical_expr::Expr {
    let is_numeric = val.parse::<f64>().is_ok();
    
    let expr_val = if is_numeric && !matches!(op, FilterOp::Contains) {
        // Technically lit() supports numerics, but parsing to f64 might alter precision. 
        // For simplicity, we can just use strings or typed literals if needed.
        // DataFusion does automatic coercion.
        lit(val.parse::<f64>().unwrap())
    } else {
        lit(val)
    };

    let col_expr = col(col_name);
    match op {
        FilterOp::Eq => col_expr.eq(expr_val),
        FilterOp::Ne => col_expr.not_eq(expr_val),
        FilterOp::Gt => col_expr.gt(expr_val),
        FilterOp::Lt => col_expr.lt(expr_val),
        FilterOp::Gte => col_expr.gt_eq(expr_val),
        FilterOp::Lte => col_expr.lt_eq(expr_val),
        FilterOp::Contains => col_expr.like(lit(format!("%{}%", val))),
    }
}

fn get_parent_id(node_id: &str, dag: &PipelineDag) -> Result<String> {
    dag.edges.iter()
        .find(|e| e.target == node_id)
        .map(|e| e.source.clone())
        .ok_or_else(|| anyhow!("Node {} has no incoming edge", node_id))
}

fn get_join_parents(node_id: &str, dag: &PipelineDag) -> Result<(String, String)> {
    let mut left = None;
    let mut right = None;
    for e in &dag.edges {
        if e.target == node_id {
            if e.target_handle.as_deref() == Some("in_left") {
                left = Some(e.source.clone());
            } else if e.target_handle.as_deref() == Some("in_right") {
                right = Some(e.source.clone());
            }
        }
    }
    Ok((
        left.ok_or_else(|| anyhow!("Join node {} missing left input", node_id))?,
        right.ok_or_else(|| anyhow!("Join node {} missing right input", node_id))?,
    ))
}

fn get_two_parents(node_id: &str, dag: &PipelineDag) -> Result<(String, String)> {
    // For Union: use targetHandle in_a / in_b, falling back to order of edges
    let mut a = None;
    let mut b = None;
    for e in &dag.edges {
        if e.target == node_id {
            match e.target_handle.as_deref() {
                Some("in_a") => a = Some(e.source.clone()),
                Some("in_b") => b = Some(e.source.clone()),
                _ => {
                    if a.is_none() { a = Some(e.source.clone()); }
                    else if b.is_none() { b = Some(e.source.clone()); }
                }
            }
        }
    }
    Ok((
        a.ok_or_else(|| anyhow!("Union/two-input node {} missing first input", node_id))?,
        b.ok_or_else(|| anyhow!("Union/two-input node {} missing second input", node_id))?,
    ))
}

// ─────────────────────────────────────────────────────────────────────────────
// DAG TRAVERSAL
// ─────────────────────────────────────────────────────────────────────────────

/// Simple topological sort: walk edges source→target to determine order.
pub fn topological_sort<'a>(dag: &'a PipelineDag) -> Result<Vec<&'a crate::models::Node>> {
    use std::collections::{HashMap, VecDeque};

    let node_map: HashMap<&str, &crate::models::Node> =
        dag.nodes.iter().map(|n| (n.id.as_str(), n)).collect();

    // Build adjacency: in-degree count
    let mut in_degree: HashMap<&str, usize> = dag.nodes.iter().map(|n| (n.id.as_str(), 0)).collect();
    let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();

    for edge in &dag.edges {
        *in_degree.entry(edge.target.as_str()).or_insert(0) += 1;
        adj.entry(edge.source.as_str())
            .or_default()
            .push(edge.target.as_str());
    }

    let mut queue: VecDeque<&str> = in_degree
        .iter()
        .filter(|(_, &deg)| deg == 0)
        .map(|(&id, _)| id)
        .collect();

    let mut sorted = Vec::new();
    while let Some(id) = queue.pop_front() {
        if let Some(node) = node_map.get(id) {
            sorted.push(*node);
        }
        if let Some(neighbors) = adj.get(id) {
            for &next in neighbors {
                let deg = in_degree.entry(next).or_insert(0);
                *deg = deg.saturating_sub(1);
                if *deg == 0 {
                    queue.push_back(next);
                }
            }
        }
    }

    if sorted.len() != dag.nodes.len() {
        return Err(anyhow!("Pipeline graph has a cycle — cannot execute"));
    }

    Ok(sorted)
}

// ─────────────────────────────────────────────────────────────────────────────
// ARROW → JSON CONVERSION
// ─────────────────────────────────────────────────────────────────────────────

fn arrow_batches_to_json(
    batches: &[arrow::record_batch::RecordBatch],
) -> Result<(Vec<String>, Vec<Vec<serde_json::Value>>)> {
    if batches.is_empty() {
        return Ok((Vec::new(), Vec::new()));
    }

    let schema = batches[0].schema();
    let columns: Vec<String> = schema.fields().iter().map(|f| f.name().clone()).collect();

    let mut rows = Vec::new();

    for batch in batches {
        for row_idx in 0..batch.num_rows() {
            let mut row = Vec::new();
            for col_idx in 0..batch.num_columns() {
                let col = batch.column(col_idx);
                let val = arrow_value_to_json(col, row_idx)?;
                row.push(val);
            }
            rows.push(row);
        }
    }

    Ok((columns, rows))
}

fn arrow_value_to_json(
    array: &Arc<dyn Array>,
    idx: usize,
) -> Result<serde_json::Value> {
    if array.is_null(idx) {
        return Ok(serde_json::Value::Null);
    }

    let val = match array.data_type() {
        DataType::Boolean => {
            let arr = array.as_any().downcast_ref::<BooleanArray>().unwrap();
            serde_json::Value::Bool(arr.value(idx))
        }
        DataType::Int8 => {
            let arr = array.as_any().downcast_ref::<Int8Array>().unwrap();
            serde_json::json!(arr.value(idx))
        }
        DataType::Int16 => {
            let arr = array.as_any().downcast_ref::<Int16Array>().unwrap();
            serde_json::json!(arr.value(idx))
        }
        DataType::Int32 => {
            let arr = array.as_any().downcast_ref::<Int32Array>().unwrap();
            serde_json::json!(arr.value(idx))
        }
        DataType::Int64 => {
            let arr = array.as_any().downcast_ref::<Int64Array>().unwrap();
            serde_json::json!(arr.value(idx))
        }
        DataType::UInt8 => {
            let arr = array.as_any().downcast_ref::<UInt8Array>().unwrap();
            serde_json::json!(arr.value(idx))
        }
        DataType::UInt16 => {
            let arr = array.as_any().downcast_ref::<UInt16Array>().unwrap();
            serde_json::json!(arr.value(idx))
        }
        DataType::UInt32 => {
            let arr = array.as_any().downcast_ref::<UInt32Array>().unwrap();
            serde_json::json!(arr.value(idx))
        }
        DataType::UInt64 => {
            let arr = array.as_any().downcast_ref::<UInt64Array>().unwrap();
            serde_json::json!(arr.value(idx))
        }
        DataType::Float32 => {
            let arr = array.as_any().downcast_ref::<Float32Array>().unwrap();
            serde_json::json!(arr.value(idx))
        }
        DataType::Float64 => {
            let arr = array.as_any().downcast_ref::<Float64Array>().unwrap();
            serde_json::json!(arr.value(idx))
        }
        DataType::Utf8 => {
            let arr = array.as_any().downcast_ref::<StringArray>().unwrap();
            serde_json::Value::String(arr.value(idx).to_string())
        }
        DataType::LargeUtf8 => {
            let arr = array.as_any().downcast_ref::<LargeStringArray>().unwrap();
            serde_json::Value::String(arr.value(idx).to_string())
        }
        _ => serde_json::Value::String(format!("{:?}", array.data_type())),
    };

    Ok(val)
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

fn extract_count(batches: &[arrow::record_batch::RecordBatch]) -> Result<usize> {
    if let Some(batch) = batches.first() {
        if let Some(col) = batch.column_by_name("cnt") {
            let arr = col.as_any().downcast_ref::<Int64Array>()
                .ok_or_else(|| anyhow!("Count column is not Int64"))?;
            return Ok(arr.value(0) as usize);
        }
    }
    Ok(0)
}

fn get_process_memory_mb() -> f64 {
    let mut sys = System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All);
    let pid = sysinfo::get_current_pid().ok();
    if let Some(pid) = pid {
        if let Some(process) = sys.process(pid) {
            return process.memory() as f64 / 1_048_576.0;
        }
    }
    0.0
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL → RecordBatch
// ─────────────────────────────────────────────────────────────────────────────

/// Read an Excel sheet and convert all data to an Arrow RecordBatch.
/// - All columns are typed as Float64 if every non-empty value parses as f64,
///   otherwise as Utf8 (string).
/// - The first row is treated as the header.
fn excel_to_record_batch(path: &str, sheet_name: &str) -> Result<RecordBatch> {
    let mut workbook: Xlsx<_> = open_workbook(path)
        .with_context(|| format!("Cannot open Excel file '{path}'"))?;

    let range = workbook
        .worksheet_range(sheet_name)
        .map_err(|e| anyhow!("Sheet '{}' not found in '{}': {:?}", sheet_name, path, e))?;

    let mut rows = range.rows();

    // First row → headers
    let headers: Vec<String> = match rows.next() {
        Some(r) => r.iter().map(|c| match c {
            ExcelData::String(s) => s.clone(),
            ExcelData::Float(f) => f.to_string(),
            ExcelData::Int(i) => i.to_string(),
            _ => "column".to_string(),
        }).collect(),
        None => return Err(anyhow!("Excel sheet '{}' is empty", sheet_name)),
    };

    let n_cols = headers.len();

    // Collect all data rows as Vec<Vec<ExcelData>>
    let data_rows: Vec<Vec<ExcelData>> = rows
        .map(|r| {
            let mut row: Vec<ExcelData> = r.to_vec();
            row.resize(n_cols, ExcelData::Empty);
            row
        })
        .collect();

    // Detect column types: Float64 if all non-empty values parse as f64
    let mut col_buffers_str: Vec<Vec<Option<String>>> = vec![Vec::new(); n_cols];
    let mut col_buffers_f64: Vec<Vec<Option<f64>>> = vec![Vec::new(); n_cols];
    let mut col_is_numeric: Vec<bool> = vec![true; n_cols];

    for row in &data_rows {
        for (ci, cell) in row.iter().enumerate() {
            match cell {
                ExcelData::Float(f) => {
                    col_buffers_f64[ci].push(Some(*f));
                    col_buffers_str[ci].push(Some(f.to_string()));
                }
                ExcelData::Int(i) => {
                    col_buffers_f64[ci].push(Some(*i as f64));
                    col_buffers_str[ci].push(Some(i.to_string()));
                }
                ExcelData::String(s) => {
                    col_is_numeric[ci] = false;
                    col_buffers_f64[ci].push(None);
                    col_buffers_str[ci].push(Some(s.clone()));
                }
                ExcelData::Empty => {
                    col_buffers_f64[ci].push(None);
                    col_buffers_str[ci].push(None);
                }
                other => {
                    col_is_numeric[ci] = false;
                    col_buffers_f64[ci].push(None);
                    col_buffers_str[ci].push(Some(format!("{other:?}")));
                }
            }
        }
    }

    // Build Arrow schema and columns
    let mut fields: Vec<Field> = Vec::with_capacity(n_cols);
    let mut arrays: Vec<Arc<dyn arrow::array::Array>> = Vec::with_capacity(n_cols);

    for (ci, header) in headers.iter().enumerate() {
        if col_is_numeric[ci] {
            fields.push(Field::new(header, DataType::Float64, true));
            let arr: Float64Array = col_buffers_f64[ci].iter().copied().collect();
            arrays.push(Arc::new(arr));
        } else {
            fields.push(Field::new(header, DataType::Utf8, true));
            let arr: StringArray = col_buffers_str[ci]
                .iter()
                .map(|v| v.as_deref())
                .collect();
            arrays.push(Arc::new(arr));
        }
    }

    let schema = Arc::new(Schema::new(fields));
    let batch = RecordBatch::try_new(schema, arrays)?;
    Ok(batch)
}

// ─────────────────────────────────────────────────────────────────────────────
// SQLITE → RecordBatch
// ─────────────────────────────────────────────────────────────────────────────

/// Read a SQLite table and convert it to an Arrow RecordBatch.
/// - INTEGER columns → Int64
/// - REAL columns → Float64
/// - Everything else → Utf8
fn sqlite_to_record_batch(path: &str, table: &str) -> Result<RecordBatch> {
    let conn = Connection::open(path)
        .with_context(|| format!("Cannot open SQLite at '{path}'"))?;

    // Inspect column types via PRAGMA
    let mut stmt = conn.prepare(&format!("PRAGMA table_info(\"{table}\")"))?;
    let col_info: Vec<(String, String)> = stmt
        .query_map([], |row| {
            Ok((
                row.get::<_, String>(1)?,  // name
                row.get::<_, String>(2)?,  // type
            ))
        })?
        .filter_map(|r| r.ok())
        .collect();

    if col_info.is_empty() {
        return Err(anyhow!("Table '{}' not found or is empty in '{}'", table, path));
    }

    // Prepare data buffers per column
    let n_cols = col_info.len();
    let mut str_bufs: Vec<Vec<Option<String>>> = vec![Vec::new(); n_cols];
    let mut i64_bufs: Vec<Vec<Option<i64>>> = vec![Vec::new(); n_cols];
    let mut f64_bufs: Vec<Vec<Option<f64>>> = vec![Vec::new(); n_cols];

    let col_names: Vec<&str> = col_info.iter().map(|(n, _)| n.as_str()).collect();
    let col_types: Vec<&str> = col_info.iter().map(|(_, t)| t.as_str()).collect();

    let query = format!(
        "SELECT {} FROM \"{}\"",
        col_names.iter().map(|n| format!("\"{n}\"")).collect::<Vec<_>>().join(", "),
        table
    );

    let mut stmt = conn.prepare(&query)?;
    let n_rows = stmt.query_map([], |row| {
        let mut cells: Vec<rusqlite::types::Value> = Vec::with_capacity(n_cols);
        for ci in 0..n_cols {
            cells.push(row.get::<_, rusqlite::types::Value>(ci)?);
        }
        Ok(cells)
    })?.filter_map(|r| r.ok()).try_for_each(|cells| -> Result<()> {
        for (ci, val) in cells.into_iter().enumerate() {
            let t = col_types[ci].to_uppercase();
            if t.contains("INT") {
                match val {
                    rusqlite::types::Value::Integer(i) => { i64_bufs[ci].push(Some(i)); f64_bufs[ci].push(None); str_bufs[ci].push(None); }
                    rusqlite::types::Value::Real(f) => { i64_bufs[ci].push(Some(f as i64)); f64_bufs[ci].push(None); str_bufs[ci].push(None); }
                    rusqlite::types::Value::Null => { i64_bufs[ci].push(None); f64_bufs[ci].push(None); str_bufs[ci].push(None); }
                    other => { i64_bufs[ci].push(Some(format!("{other:?}").parse::<i64>().unwrap_or(0))); f64_bufs[ci].push(None); str_bufs[ci].push(None); }
                }
            } else if t.contains("REAL") || t.contains("FLOAT") || t.contains("DOUB") || t.contains("NUM") {
                match val {
                    rusqlite::types::Value::Real(f) => { f64_bufs[ci].push(Some(f)); i64_bufs[ci].push(None); str_bufs[ci].push(None); }
                    rusqlite::types::Value::Integer(i) => { f64_bufs[ci].push(Some(i as f64)); i64_bufs[ci].push(None); str_bufs[ci].push(None); }
                    rusqlite::types::Value::Null => { f64_bufs[ci].push(None); i64_bufs[ci].push(None); str_bufs[ci].push(None); }
                    other => { f64_bufs[ci].push(Some(format!("{other:?}").parse::<f64>().unwrap_or(0.0))); i64_bufs[ci].push(None); str_bufs[ci].push(None); }
                }
            } else {
                let s = match val {
                    rusqlite::types::Value::Text(s) => Some(s),
                    rusqlite::types::Value::Integer(i) => Some(i.to_string()),
                    rusqlite::types::Value::Real(f) => Some(f.to_string()),
                    rusqlite::types::Value::Blob(b) => Some(format!("<blob {} bytes>", b.len())),
                    rusqlite::types::Value::Null => None,
                };
                str_bufs[ci].push(s); i64_bufs[ci].push(None); f64_bufs[ci].push(None);
            }
        }
        Ok(())
    });
    n_rows?;

    // Build Arrow schema + arrays
    let mut fields: Vec<Field> = Vec::with_capacity(n_cols);
    let mut arrays: Vec<Arc<dyn arrow::array::Array>> = Vec::with_capacity(n_cols);

    for (ci, (name, t)) in col_info.iter().enumerate() {
        let t_upper = t.to_uppercase();
        if t_upper.contains("INT") {
            fields.push(Field::new(name, DataType::Int64, true));
            let arr: Int64Array = i64_bufs[ci].iter().copied().collect();
            arrays.push(Arc::new(arr));
        } else if t_upper.contains("REAL") || t_upper.contains("FLOAT") || t_upper.contains("DOUB") || t_upper.contains("NUM") {
            fields.push(Field::new(name, DataType::Float64, true));
            let arr: Float64Array = f64_bufs[ci].iter().copied().collect();
            arrays.push(Arc::new(arr));
        } else {
            fields.push(Field::new(name, DataType::Utf8, true));
            let arr: StringArray = str_bufs[ci].iter().map(|v| v.as_deref()).collect();
            arrays.push(Arc::new(arr));
        }
    }

    let schema = Arc::new(Schema::new(fields));
    let batch = RecordBatch::try_new(schema, arrays)?;
    Ok(batch)
}

fn resolve_export_path(raw_path: &str, default_filename: &str) -> std::path::PathBuf {
    let p = std::path::PathBuf::from(raw_path.trim());
    if p.is_dir() || raw_path.ends_with('/') || raw_path.ends_with('\\') {
        p.join(default_filename)
    } else {
        p
    }
}

