// ── Types partagés du module DataViz ─────────────────────────────────────────

export interface DataColumn {
  name: string;
  type: "number" | "string" | "date" | "boolean";
}

export interface ParsedDataset {
  fileName: string;
  columns: DataColumn[];
  rows: any[][];         // rows[i][j] = valeur de la colonne j à la ligne i
  totalRows: number;
}

export type ChartKind =
  | "line"
  | "bar"
  | "area"
  | "scatter"
  | "bubble"
  | "pie"
  | "donut"
  | "heatmap"
  | "treemap"
  | "sankey"
  | "radar"
  | "boxplot"
  | "candlestick"
  | "parallel"
  | "sunburst"
  | "funnel"
  | "gauge"
  | "themeriver"
  | "histogram"
  | "network";

export interface ChartWidgetConfig {
  id: string;
  kind: ChartKind;
  title: string;
  xCol: string;   // nom de la colonne X
  yCol: string;   // nom de la colonne Y
  zCol?: string;  // nom de la colonne Z (optionnel)
  aggFunc?: "none" | "sum" | "avg" | "count" | "min" | "max";
  colorScheme?: string;

  // Customization Options
  primaryColor?: string;     // Main series color (e.g., #e06927)
  accentColor?: string;      // Secondary color (e.g., #4a9eff)
  bgColor?: string;          // Background ("transparent", "#161618", "#0f0f11", "#ffffff", etc.)
  smooth?: boolean;          // Line/Area smoothness
  showLabels?: boolean;      // Show value labels on points/bars
  showGrid?: boolean;        // Show grid lines
  showLegend?: boolean;      // Show chart legend
  showZoom?: boolean;        // Show data zoom slider
  lineWidth?: number;        // Line width or bar border
  symbolSize?: number;       // Scatter point size or node size
}
