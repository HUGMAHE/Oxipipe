use anyhow::{anyhow, Result};
use crate::models::{DockerExportPackage, FilterOp, NodeKind, PipelineDag};
use crate::engine::topological_sort;

pub fn generate_rust_code(dag: &PipelineDag) -> Result<String> {
    let ordered = topological_sort(dag)?;

    let mut code = String::new();

    // 1. Headers and imports
    code.push_str("use datafusion::prelude::*;\n");
    code.push_str("use datafusion::dataframe::DataFrameWriteOptions;\n");
    code.push_str("use std::error::Error;\n\n");
    code.push_str("#[tokio::main]\n");
    code.push_str("async fn main() -> Result<(), Box<dyn Error>> {\n");
    code.push_str("    let ctx = SessionContext::new();\n\n");

    // 2. Process nodes
    for node in ordered {
        // Build safe variable names based on node id (replace '-' with '_')
        let var_name = format!("df_{}", node.id.replace('-', "_"));

        match node.kind {
            NodeKind::CsvSource => {
                let path = node.config.path.as_deref().ok_or_else(|| anyhow!("Missing path for CsvSource"))?;
                code.push_str(&format!("    // Load CSV source {}\n", node.id));
                code.push_str(&format!("    ctx.register_csv(\"{}\", \"{}\", CsvReadOptions::new()).await?;\n", node.id, path.replace('\\', "/")));
                code.push_str(&format!("    let {} = ctx.table(\"{}\").await?;\n\n", var_name, node.id));
            }
            NodeKind::Filter => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                let col = node.config.column.as_deref().ok_or_else(|| anyhow!("Missing filter col"))?;
                let op = node.config.op.as_ref().ok_or_else(|| anyhow!("Missing filter op"))?;
                let val = node.config.value.as_deref().ok_or_else(|| anyhow!("Missing filter val"))?;

                let is_numeric = val.parse::<f64>().is_ok();
                let expr_val = if is_numeric && !matches!(op, FilterOp::Contains) {
                    format!("lit({}f64)", val)
                } else {
                    format!("lit(\"{}\")", val.replace('"', "\\\""))
                };

                let op_str = match op {
                    FilterOp::Eq => "eq",
                    FilterOp::Ne => "not_eq",
                    FilterOp::Gt => "gt",
                    FilterOp::Lt => "lt",
                    FilterOp::Gte => "gt_eq",
                    FilterOp::Lte => "lt_eq",
                    FilterOp::Contains => "like",
                };

                let filter_expr = if matches!(op, FilterOp::Contains) {
                    format!("col(\"{}\").like(lit(\"%{}%\"))", col, val.replace('"', "\\\""))
                } else {
                    format!("col(\"{}\").{}({})", col, op_str, expr_val)
                };

                code.push_str(&format!("    // Filter {}\n", node.id));
                code.push_str(&format!("    let {} = {}.filter({})?;\n\n", var_name, parent_var, filter_expr));
            }
            NodeKind::Projection => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                let cols = node.config.columns.as_ref().ok_or_else(|| anyhow!("Missing proj cols"))?;
                
                let cols_exprs = cols.iter().map(|c| format!("col(\"{}\")", c)).collect::<Vec<_>>().join(", ");
                
                code.push_str(&format!("    // Projection {}\n", node.id));
                code.push_str(&format!("    let {} = {}.select(vec![{}])?;\n\n", var_name, parent_var, cols_exprs));
            }
            NodeKind::GroupBy => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                
                let g_cols = node.config.group_by_columns.as_ref().ok_or_else(|| anyhow!("Missing group cols"))?;
                let group_exprs = g_cols.iter().map(|c| format!("col(\"{}\")", c)).collect::<Vec<_>>().join(", ");
                
                let aggs = node.config.aggregations.as_ref().ok_or_else(|| anyhow!("Missing aggs"))?;
                let mut agg_exprs = Vec::new();
                for agg in aggs {
                    let op_str = match agg.op {
                        crate::models::AggregateOp::Sum => "datafusion::functions_aggregate::sum::sum",
                        crate::models::AggregateOp::Avg => "datafusion::functions_aggregate::average::avg",
                        crate::models::AggregateOp::Count => "datafusion::functions_aggregate::count::count",
                        crate::models::AggregateOp::Min => "datafusion::functions_aggregate::min_max::min",
                        crate::models::AggregateOp::Max => "datafusion::functions_aggregate::min_max::max",
                    };
                    let alias = format!("{}_{}", agg.column, agg.op.to_sql_op().to_lowercase());
                    agg_exprs.push(format!("{}(col(\"{}\")).alias(\"{}\")", op_str, agg.column, alias));
                }
                
                code.push_str(&format!("    // Group By {}\n", node.id));
                code.push_str(&format!("    let {} = {}.aggregate(vec![{}], vec![{}])?;\n\n", var_name, parent_var, group_exprs, agg_exprs.join(", ")));
            }
            NodeKind::Join => {
                let (left_parent, right_parent) = get_join_parents(&node.id, dag)?;
                let left_var = format!("df_{}", left_parent.replace('-', "_"));
                let right_var = format!("df_{}", right_parent.replace('-', "_"));
                
                let join_type = node.config.join_type.as_ref().ok_or_else(|| anyhow!("Missing join type"))?;
                let df_join_type = match join_type {
                    crate::models::JoinType::Inner => "datafusion::logical_expr::JoinType::Inner",
                    crate::models::JoinType::Left => "datafusion::logical_expr::JoinType::Left",
                    crate::models::JoinType::Right => "datafusion::logical_expr::JoinType::Right",
                    crate::models::JoinType::Full => "datafusion::logical_expr::JoinType::Full",
                };
                
                let left_col = node.config.left_column.as_deref().ok_or_else(|| anyhow!("Missing left col"))?;
                let right_col = node.config.right_column.as_deref().ok_or_else(|| anyhow!("Missing right col"))?;
                
                code.push_str(&format!("    // Join {}\n", node.id));
                code.push_str(&format!("    let {} = {}.join({}, {}, &[\"{}\"], &[\"{}\"], None)?;\n\n", 
                    var_name, left_var, right_var, df_join_type, left_col, right_col));
            }
            NodeKind::ParquetSink => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                let path = node.config.path.as_deref().unwrap_or("output.parquet");
                code.push_str(&format!("    // Write Parquet {}\n", node.id));
                code.push_str(&format!("    {}.write_parquet(\"{}\", DataFrameWriteOptions::new(), None).await?;\n\n", parent_var, path.replace('\\', "/")));
                code.push_str(&format!("    let {} = {};\n\n", var_name, parent_var));
            }
            NodeKind::ParquetSource => {
                let path = node.config.path.as_deref().unwrap_or("input.parquet");
                code.push_str(&format!("    ctx.register_parquet(\"{}\", \"{}\", ParquetReadOptions::default()).await?;\n", node.id, path.replace('\\', "/")));
                code.push_str(&format!("    let {} = ctx.table(\"{}\").await?;\n\n", var_name, node.id));
            }
            NodeKind::AvroSource => {
                let path = node.config.path.as_deref().unwrap_or("input.avro");
                code.push_str(&format!("    ctx.register_avro(\"{}\", \"{}\", AvroReadOptions::default()).await?;\n", node.id, path.replace('\\', "/")));
                code.push_str(&format!("    let {} = ctx.table(\"{}\").await?;\n\n", var_name, node.id));
            }
            NodeKind::ExcelSource => {
                let path = node.config.path.as_deref().unwrap_or("input.xlsx");
                let sheet = node.config.sheet_name.as_deref().unwrap_or("Sheet1");
                code.push_str(&format!("    // Excel source: manually read with calamine\n"));
                code.push_str(&format!("    let _batch_{} = excel_to_record_batch(\"{}\", \"{}\")?;\n", var_name, path.replace('\\', "/"), sheet));
                code.push_str(&format!("    let _schema_{} = _batch_{}.schema();\n", var_name, var_name));
                code.push_str(&format!("    ctx.register_table(\"{}\", Arc::new(MemTable::try_new(_schema_{}, vec![vec![_batch_{}]])?))?;\n", node.id, var_name, var_name));
                code.push_str(&format!("    let {} = ctx.table(\"{}\").await?;\n\n", var_name, node.id));
            }
            NodeKind::SqliteSource => {
                let path = node.config.path.as_deref().unwrap_or("database.db");
                let table = node.config.table_name.as_deref().unwrap_or("table");
                code.push_str(&format!("    // SQLite source: manually read with rusqlite\n"));
                code.push_str(&format!("    let _batch_{} = sqlite_to_record_batch(\"{}\", \"{}\")?;\n", var_name, path.replace('\\', "/"), table));
                code.push_str(&format!("    let _schema_{} = _batch_{}.schema();\n", var_name, var_name));
                code.push_str(&format!("    ctx.register_table(\"{}\", Arc::new(MemTable::try_new(_schema_{}, vec![vec![_batch_{}]])?))?;\n", node.id, var_name, var_name));
                code.push_str(&format!("    let {} = ctx.table(\"{}\").await?;\n\n", var_name, node.id));
            }
            NodeKind::CsvSink => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                let path = node.config.path.as_deref().unwrap_or("output");
                code.push_str(&format!("    // Write CSV {}\n", node.id));
                code.push_str(&format!("    {}.write_csv(\"{}\", DataFrameWriteOptions::new(), None).await?;\n\n", parent_var, path.replace('\\', "/")));
                code.push_str(&format!("    let {} = {};\n\n", var_name, parent_var));
            }
            NodeKind::JsonSource => {
                let path = node.config.path.as_deref().unwrap_or("input.json");
                code.push_str(&format!("    ctx.register_json(\"{}\", \"{}\", NdJsonReadOptions::default()).await?;\n", node.id, path.replace('\\', "/")));
                code.push_str(&format!("    let {} = ctx.table(\"{}\").await?;\n\n", var_name, node.id));
            }
            NodeKind::JsonSink => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                let path = node.config.path.as_deref().unwrap_or("output");
                code.push_str(&format!("    // Write JSON {}\n", node.id));
                code.push_str(&format!("    {}.write_json(\"{}\", DataFrameWriteOptions::new(), None).await?;\n\n", parent_var, path.replace('\\', "/")));
                code.push_str(&format!("    let {} = {};\n\n", var_name, parent_var));
            }
            NodeKind::Sort => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                let sort_cols = node.config.sort_columns.as_ref().ok_or_else(|| anyhow!("Sort missing sort_columns"))?;
                let sort_exprs = sort_cols.iter()
                    .map(|sc| format!("col(\"{}\").sort({}, {})", sc.column, !sc.descending, sc.descending))
                    .collect::<Vec<_>>().join(", ");
                code.push_str(&format!("    let {} = {}.sort(vec![{}])?;\n\n", var_name, parent_var, sort_exprs));
            }
            NodeKind::Deduplicate => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                code.push_str(&format!("    let {} = {}.distinct()?;\n\n", var_name, parent_var));
            }
            NodeKind::DropNulls => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                code.push_str(&format!("    // DropNulls — add .is_not_null() filter per column at runtime\n"));
                code.push_str(&format!("    let {} = {};\n\n", var_name, parent_var));
            }
            NodeKind::FillNulls => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                let fill_col = node.config.fill_column.as_deref().unwrap_or("column");
                let fill_val = node.config.fill_value.as_deref().unwrap_or("0");
                let lit_val = if fill_val.parse::<f64>().is_ok() {
                    format!("lit({}f64)", fill_val)
                } else {
                    format!("lit(\"{}\")", fill_val)
                };
                code.push_str(&format!("    let fill_expr = datafusion::logical_expr::when(col(\"{}\").is_null(), {}).otherwise(col(\"{}\"))?;\n", fill_col, lit_val, fill_col));
                code.push_str(&format!("    let {} = {}.with_column(\"{}\", fill_expr)?;\n\n", var_name, parent_var, fill_col));
            }
            NodeKind::RenameColumns => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                let renames = node.config.renames.as_ref().ok_or_else(|| anyhow!("RenameColumns missing renames"))?;
                code.push_str(&format!("    let mut {} = {};\n", var_name, parent_var));
                for rename in renames {
                    code.push_str(&format!("    {} = {}.with_column_renamed(\"{}\", \"{}\")?;\n", var_name, var_name, rename.old_name, rename.new_name));
                }
                code.push('\n');
            }
            NodeKind::DerivedColumn => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                let new_col = node.config.new_column_name.as_deref().unwrap_or("new_col");
                let expression = node.config.expression.as_deref().unwrap_or("1");
                let id_clean = node.id.replace('-', "");
                let temp = format!("_dc_{}", &id_clean[..8.min(id_clean.len())]);
                code.push_str(&format!("    let _schema = {}.schema().inner().clone();\n", parent_var));
                code.push_str(&format!("    let _batches = {}.collect().await?;\n", parent_var));
                code.push_str(&format!("    ctx.register_table(\"{}\", std::sync::Arc::new(datafusion::datasource::MemTable::try_new(_schema, vec![_batches])?))?\n", temp));
                code.push_str(&format!("        .ok_or_else(|| datafusion::error::DataFusionError::Plan(\"Table already registered\".into()))?;\n"));
                code.push_str(&format!("    let {} = ctx.sql(\"SELECT *, ({}) AS \\\"{}\\\" FROM \\\"{}\\\"\").await?;\n\n", var_name, expression, new_col, temp));
            }
            NodeKind::TopN => {
                let parent_id = get_parent_id(&node.id, dag)?;
                let parent_var = format!("df_{}", parent_id.replace('-', "_"));
                let n = node.config.limit_n.unwrap_or(10);
                code.push_str(&format!("    let {} = {}.limit(0, Some({}))?;\n\n", var_name, parent_var, n));
            }
            NodeKind::Union => {
                let edges: Vec<_> = dag.edges.iter().filter(|e| e.target == node.id).collect();
                if edges.len() >= 2 {
                    let a = format!("df_{}", edges[0].source.replace('-', "_"));
                    let b = format!("df_{}", edges[1].source.replace('-', "_"));
                    code.push_str(&format!("    let {} = {}.union({})?;\n\n", var_name, a, b));
                }
            }
        }
    }

    code.push_str("    println!(\"Pipeline executed successfully!\");\n");
    code.push_str("    Ok(())\n");
    code.push_str("}\n");

    Ok(code)
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

pub fn generate_docker_package(dag: &PipelineDag) -> Result<DockerExportPackage> {
    let main_rs = generate_rust_code(dag)?;

    let dockerfile = r#"# ── Multi-Stage Dockerfile for Oxipipe Data Pipeline ─────────────────
# Stage 1: Build binary using official Rust image
FROM rust:1.80-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Cargo.toml and Cargo.lock placeholder
COPY Cargo.toml ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release && rm -rf src

# Copy real source code and build final binary
COPY src ./src
RUN cargo build --release --bin oxipipe_job

# ── Stage 2: Ultra-lightweight Runtime Image ─────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy release binary from builder
COPY --from=builder /app/target/release/oxipipe_job /app/oxipipe_job

# Set execution command
ENTRYPOINT ["/app/oxipipe_job"]
"#.to_string();

    let cargo_toml = r#"[package]
name = "oxipipe_job"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1", features = ["full"] }
datafusion = { version = "43.0.0", features = ["avro"] }
arrow = "53.4.0"
calamine = "0.26.1"
rusqlite = { version = "0.32.1", features = ["bundled"] }
"#;

    Ok(DockerExportPackage {
        dockerfile,
        cargo_toml: cargo_toml.to_string(),
        main_rs,
        build_cmd: "docker build -t oxipipe-job .".to_string(),
        run_cmd: "docker run --rm oxipipe-job".to_string(),
    })
}

