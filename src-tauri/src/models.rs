use serde::{Deserialize, Serialize};

// ─────────────────────────────────────────────────────────────────────────────
// INPUT — Pipeline DAG sent from the frontend
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize, Clone)]
pub struct PipelineDag {
    pub nodes: Vec<Node>,
    pub edges: Vec<Edge>,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Node {
    pub id: String,
    pub kind: NodeKind,
    pub config: NodeConfig,
}

#[derive(Debug, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum NodeKind {
    // Sources
    CsvSource,
    ParquetSource,
    JsonSource,
    AvroSource,
    ExcelSource,
    SqliteSource,
    // Clean / Transform
    Filter,
    Projection,
    Sort,
    Deduplicate,
    DropNulls,
    FillNulls,
    RenameColumns,
    DerivedColumn,
    TopN,
    GroupBy,
    Join,
    Union,
    // Sinks
    ParquetSink,
    CsvSink,
    JsonSink,
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct NodeConfig {
    // CsvSource / ParquetSource / CsvSink / ParquetSink
    pub path: Option<String>,

    // Filter
    pub column: Option<String>,
    pub op: Option<FilterOp>,
    pub value: Option<String>,

    // Projection
    pub columns: Option<Vec<String>>,

    // Sort / TopN
    pub sort_columns: Option<Vec<SortColumn>>,

    // TopN
    pub limit_n: Option<usize>,

    // DropNulls (optional: specific columns; if empty/None => check all)
    pub drop_nulls_columns: Option<Vec<String>>,

    // FillNulls
    pub fill_column: Option<String>,
    pub fill_value: Option<String>,
    pub sheet_name: Option<String>,
    pub table_name: Option<String>,

    // RenameColumns
    pub renames: Option<Vec<ColumnRename>>,

    // DerivedColumn
    pub new_column_name: Option<String>,
    pub expression: Option<String>,

    // GroupBy
    pub group_by_columns: Option<Vec<String>>,
    pub aggregations: Option<Vec<Aggregation>>,

    // Join
    pub join_type: Option<JoinType>,
    pub left_column: Option<String>,
    pub right_column: Option<String>,
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct SortColumn {
    pub column: String,
    pub descending: bool,
}

#[derive(Debug, Deserialize, Clone, Default)]
pub struct ColumnRename {
    pub old_name: String,
    pub new_name: String,
}

#[derive(Debug, Deserialize, Clone)]
pub struct Aggregation {
    pub column: String,
    pub op: AggregateOp,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum AggregateOp {
    Sum,
    Avg,
    Count,
    Min,
    Max,
}

impl AggregateOp {
    pub fn to_sql_op(&self) -> &'static str {
        match self {
            AggregateOp::Sum => "SUM",
            AggregateOp::Avg => "AVG",
            AggregateOp::Count => "COUNT",
            AggregateOp::Min => "MIN",
            AggregateOp::Max => "MAX",
        }
    }
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum JoinType {
    Inner,
    Left,
    Right,
    Full,
}

#[derive(Debug, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum FilterOp {
    Eq,
    Ne,
    Gt,
    Lt,
    Gte,
    Lte,
    Contains,
}

impl FilterOp {
    #[allow(dead_code)]
    pub fn to_sql_op(&self) -> &'static str {
        match self {
            FilterOp::Eq => "=",
            FilterOp::Ne => "!=",
            FilterOp::Gt => ">",
            FilterOp::Lt => "<",
            FilterOp::Gte => ">=",
            FilterOp::Lte => "<=",
            FilterOp::Contains => "LIKE",
        }
    }
}

#[derive(Debug, Deserialize, Clone)]
pub struct Edge {
    pub source: String,
    pub target: String,
    #[serde(rename = "targetHandle")]
    pub target_handle: Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT — Preview result returned to the frontend
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Clone)]
pub struct ExecuteResponse {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<serde_json::Value>>,
    pub total_rows: usize,
    pub preview_rows: usize,
    pub execution_ms: u64,
    pub throughput_lines_per_sec: f64,
    pub memory_mb: f64,
    pub sql_generated: String,
}

#[derive(Debug, Serialize)]
#[allow(dead_code)]
pub struct ErrorResponse {
    pub error: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// COLUMN SCHEMA — returned by schema_inspect command
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ColumnSchema {
    pub name: String,
    pub data_type: String,
}

#[derive(Debug, Serialize)]
pub struct SchemaResponse {
    pub columns: Vec<ColumnSchema>,
    pub row_count_estimate: usize,
}

// ─────────────────────────────────────────────────────────────────────────────
// DATA PROFILING & DOCKER EXPORT
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct ColumnProfile {
    pub name: String,
    pub data_type: String,
    pub total_rows: usize,
    pub null_count: usize,
    pub null_percentage: f64,
    pub distinct_count: usize,
    pub min_value: Option<String>,
    pub max_value: Option<String>,
    pub sample_values: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct NodeProfileResponse {
    pub node_id: String,
    pub total_rows: usize,
    pub total_columns: usize,
    pub profiling_time_ms: u128,
    pub columns: Vec<ColumnProfile>,
}

#[derive(Debug, Serialize)]
pub struct DockerExportPackage {
    pub dockerfile: String,
    pub cargo_toml: String,
    pub main_rs: String,
    pub build_cmd: String,
    pub run_cmd: String,
}

