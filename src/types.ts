// Types mirroring the Rust models exactly

export type FilterOp = "eq" | "ne" | "gt" | "lt" | "gte" | "lte" | "contains";

export type NodeKind =
  | "csvSource"
  | "parquetSource"
  | "jsonSource"
  | "avroSource"
  | "excelSource"
  | "sqliteSource"
  | "filter"
  | "projection"
  | "sort"
  | "deduplicate"
  | "dropNulls"
  | "fillNulls"
  | "renameColumns"
  | "derivedColumn"
  | "topN"
  | "groupBy"
  | "join"
  | "union"
  | "parquetSink"
  | "csvSink"
  | "jsonSink";

export interface NodeConfig {
  // CsvSource
  path?: string;
  // Filter
  column?: string;
  op?: FilterOp;
  value?: string;
  // Projection
  columns?: string[];
  // Sort / TopN
  sort_columns?: SortColumn[];
  limit_n?: number;
  // DropNulls
  drop_nulls_columns?: string[];
  // FillNulls
  fill_column?: string;
  fill_value?: string;
  // RenameColumns
  renames?: ColumnRename[];
  // Source-specific options
  sheet_name?: string;   // ExcelSource: which sheet to read (default: Sheet1)
  table_name?: string;   // SqliteSource: which table to read
  // DerivedColumn
  new_column_name?: string;
  expression?: string;
  // GroupBy
  group_by_columns?: string[];
  aggregations?: Aggregation[];
  // Join
  join_type?: JoinType;
  left_column?: string;
  right_column?: string;
}

export interface SortColumn {
  column: string;
  descending: boolean;
}

export interface ColumnRename {
  old_name: string;
  new_name: string;
}

export type AggregateOp = "sum" | "avg" | "count" | "min" | "max";

export interface Aggregation {
  column: string;
  op: AggregateOp;
}

export type JoinType = "inner" | "left" | "right" | "full";

export interface NodeEdge {
  id: string;
  source: string;
  target: string;
  targetHandle?: string;
}

export interface PipelineNode {
  id: string;
  kind: NodeKind;
  config: NodeConfig;
}

export interface PipelineDag {
  nodes: PipelineNode[];
  edges: NodeEdge[];
}

export interface ColumnSchema {
  name: string;
  data_type: string;
}

export interface SchemaResponse {
  columns: ColumnSchema[];
  row_count_estimate: number;
}

export interface ExecuteResponse {
  columns: string[];
  rows: any[][];
  total_rows: number;
  preview_rows: number;
  execution_ms: number;
  throughput_lines_per_sec: number;
  memory_mb: number;
  sql_generated: string;
}

// Data Profiling Types ("Instant Inspector")
export interface ColumnProfile {
  name: string;
  data_type: string;
  total_rows: number;
  null_count: number;
  null_percentage: number;
  distinct_count: number;
  min_value?: string;
  max_value?: string;
  sample_values: string[];
}

export interface NodeProfileResponse {
  node_id: string;
  total_rows: number;
  total_columns: number;
  profiling_time_ms: number;
  columns: ColumnProfile[];
}

// Docker Export Package Types
export interface DockerExportPackage {
  dockerfile: string;
  cargo_toml: string;
  main_rs: string;
  build_cmd: string;
  run_cmd: string;
}
