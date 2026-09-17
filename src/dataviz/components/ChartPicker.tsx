import React from "react";
import type { ChartKind } from "../types";

interface ChartPickerProps {
  onSelect: (kind: ChartKind) => void;
  onClose: () => void;
}

interface ChartEntry {
  kind: ChartKind;
  label: string;
  category: string;
  icon: React.ReactNode;
  description: string;
}

const CHARTS: ChartEntry[] = [
  // Tendances
  { kind: "line",        label: "Line",              category: "Trends",       icon: <LineIcon />,      description: "Time series & trends" },
  { kind: "area",        label: "Area",              category: "Trends",       icon: <AreaIcon />,      description: "Cumulative trends" },
  { kind: "bar",         label: "Bar",               category: "Trends",       icon: <BarIcon />,       description: "Category comparison" },
  // Distribution
  { kind: "scatter",     label: "Scatter",           category: "Distribution", icon: <ScatterIcon />,   description: "Correlation between 2 vars" },
  { kind: "bubble",      label: "Bubble",            category: "Distribution", icon: <BubbleIcon />,    description: "3-variable correlation" },
  { kind: "boxplot",     label: "Box Plot",          category: "Distribution", icon: <BoxIcon />,       description: "Statistical distribution" },
  { kind: "histogram",   label: "Histogram",         category: "Distribution", icon: <HistIcon />,      description: "Frequency distribution" },
  // Proportions
  { kind: "pie",         label: "Pie",               category: "Proportions",  icon: <PieIcon />,       description: "Part-to-whole" },
  { kind: "donut",       label: "Donut",             category: "Proportions",  icon: <DonutIcon />,     description: "Part-to-whole (modern)" },
  { kind: "treemap",     label: "Treemap",           category: "Proportions",  icon: <TreeIcon />,      description: "Hierarchical proportions" },
  { kind: "funnel",      label: "Funnel",            category: "Proportions",  icon: <FunnelIcon />,    description: "Sequential conversion" },
  { kind: "sunburst",    label: "Sunburst",          category: "Proportions",  icon: <SunIcon />,       description: "Multi-level hierarchy" },
  // Relations
  { kind: "sankey",      label: "Sankey",            category: "Relations",    icon: <SankeyIcon />,    description: "Flow between nodes" },
  { kind: "network",     label: "Network Graph",     category: "Relations",    icon: <NetworkIcon />,   description: "Node-link relationships" },
  // Comparaison
  { kind: "radar",       label: "Radar",             category: "Comparison",   icon: <RadarIcon />,     description: "Multi-axis comparison" },
  { kind: "heatmap",     label: "Heatmap",           category: "Comparison",   icon: <HeatIcon />,      description: "Matrix intensity" },
  { kind: "parallel",    label: "Parallel Coords",   category: "Comparison",   icon: <ParaIcon />,      description: "High-dimensional data" },
  // Temporel / Finance
  { kind: "candlestick", label: "Candlestick",       category: "Financial",    icon: <CandleIcon />,    description: "OHLC financial data" },
  { kind: "themeriver",  label: "ThemeRiver",        category: "Financial",    icon: <RiverIcon />,     description: "Temporal stream changes" },
  // Indicateurs
  { kind: "gauge",       label: "Gauge",             category: "Indicators",   icon: <GaugeIcon />,     description: "KPI / progress" },
];

const CATEGORIES = ["Trends", "Distribution", "Proportions", "Relations", "Comparison", "Financial", "Indicators"];

export default function ChartPicker({ onSelect, onClose }: ChartPickerProps) {
  const [active, setActive] = React.useState("Trends");
  const filtered = CHARTS.filter((c) => c.category === active);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "#161618", border: "1px solid #2a2a2a",
        borderRadius: 14, width: 720, maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
        overflow: "hidden",
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #222" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#fff" }}>Add Chart</h2>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#666" }}>Choose a visualization type</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#666", fontSize: 20, cursor: "pointer", padding: 4 }}>✕</button>
          </div>

          {/* Category tabs */}
          <div style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }}>
            {CATEGORIES.map((cat) => (
              <button key={cat} onClick={() => setActive(cat)} style={{
                background: active === cat ? "#e06927" : "#1e1e20",
                border: "none", borderRadius: 20,
                color: active === cat ? "#fff" : "#999",
                fontSize: 11, fontWeight: 600,
                padding: "4px 12px", cursor: "pointer",
                transition: "all 0.15s",
              }}>{cat}</button>
            ))}
          </div>
        </div>

        {/* Chart grid */}
        <div style={{ padding: "16px 24px 24px", overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {filtered.map((c) => (
              <button key={c.kind} onClick={() => onSelect(c.kind)} style={{
                background: "#1a1a1c", border: "1px solid #2a2a2a",
                borderRadius: 10, padding: "16px 12px", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                transition: "all 0.15s",
                textAlign: "center",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.border = "1px solid #e06927"; (e.currentTarget as HTMLButtonElement).style.background = "#1e1614"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.border = "1px solid #2a2a2a"; (e.currentTarget as HTMLButtonElement).style.background = "#1a1a1c"; }}
              >
                <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#e2e2e2" }}>{c.label}</div>
                <div style={{ fontSize: 10, color: "#666", lineHeight: 1.3 }}>{c.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mini SVG Icons for each chart type ────────────────────────────────────────
function LineIcon() { return <svg width="44" height="36" fill="none"><polyline points="4,28 14,16 24,20 36,8 44,12" stroke="#e06927" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function AreaIcon() { return <svg width="44" height="36" fill="none"><path d="M4,28 14,16 24,20 36,8 44,12 44,32 4,32Z" fill="#e06927" opacity="0.25" stroke="#e06927" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function BarIcon() { return <svg width="44" height="36" fill="none"><rect x="4" y="20" width="8" height="14" rx="2" fill="#e06927"/><rect x="16" y="10" width="8" height="24" rx="2" fill="#f98845"/><rect x="28" y="16" width="8" height="18" rx="2" fill="#e06927"/></svg>; }
function ScatterIcon() { return <svg width="44" height="36" fill="none"><circle cx="10" cy="26" r="3" fill="#e06927"/><circle cx="18" cy="14" r="3" fill="#f98845"/><circle cx="28" cy="20" r="3" fill="#e06927"/><circle cx="36" cy="8" r="3" fill="#f98845"/><circle cx="14" cy="30" r="3" fill="#f7c59f"/></svg>; }
function BubbleIcon() { return <svg width="44" height="36" fill="none"><circle cx="12" cy="24" r="6" fill="#e06927" opacity="0.7"/><circle cx="30" cy="16" r="10" fill="#f98845" opacity="0.5"/><circle cx="22" cy="28" r="4" fill="#e06927" opacity="0.8"/></svg>; }
function BoxIcon() { return <svg width="44" height="36" fill="none"><rect x="12" y="10" width="20" height="22" rx="2" stroke="#e06927" strokeWidth="2"/><line x1="22" y1="10" x2="22" y2="4" stroke="#e06927" strokeWidth="2"/><line x1="22" y1="32" x2="22" y2="36" stroke="#e06927" strokeWidth="2"/><line x1="16" y1="20" x2="28" y2="20" stroke="#f98845" strokeWidth="2"/></svg>; }
function HistIcon() { return <svg width="44" height="36" fill="none"><rect x="4" y="22" width="6" height="12" rx="1" fill="#e06927" opacity="0.6"/><rect x="12" y="14" width="6" height="20" rx="1" fill="#e06927"/><rect x="20" y="8" width="6" height="26" rx="1" fill="#f98845"/><rect x="28" y="16" width="6" height="18" rx="1" fill="#e06927"/><rect x="36" y="24" width="6" height="10" rx="1" fill="#e06927" opacity="0.6"/></svg>; }
function PieIcon() { return <svg width="44" height="36" fill="none"><path d="M22,18 L22,4 A14,14,0,0,1,36,18Z" fill="#e06927"/><path d="M22,18 L36,18 A14,14,0,0,1,12,30Z" fill="#f98845"/><path d="M22,18 L12,30 A14,14,0,0,1,22,4Z" fill="#f7c59f"/></svg>; }
function DonutIcon() { return <svg width="44" height="36" fill="none"><path d="M22,18 L22,6 A12,12,0,0,1,34,18Z" fill="#e06927"/><path d="M22,18 L34,18 A12,12,0,0,1,10,30Z" fill="#f98845"/><path d="M22,18 L10,30 A12,12,0,0,1,22,6Z" fill="#f7c59f"/><circle cx="22" cy="18" r="6" fill="#161618"/></svg>; }
function TreeIcon() { return <svg width="44" height="36" fill="none"><rect x="2" y="2" width="24" height="20" rx="2" fill="#e06927" opacity="0.8"/><rect x="28" y="2" width="14" height="10" rx="2" fill="#f98845" opacity="0.8"/><rect x="28" y="14" width="14" height="8" rx="2" fill="#f7c59f" opacity="0.8"/><rect x="2" y="24" width="40" height="10" rx="2" fill="#e06927" opacity="0.3"/></svg>; }
function FunnelIcon() { return <svg width="44" height="36" fill="none"><path d="M4,4 L40,4 L32,14 L12,14Z" fill="#e06927"/><path d="M12,16 L32,16 L28,24 L16,24Z" fill="#f98845"/><path d="M16,26 L28,26 L24,34 L20,34Z" fill="#f7c59f"/></svg>; }
function SunIcon() { return <svg width="44" height="36" fill="none"><circle cx="22" cy="18" r="14" fill="none" stroke="#e06927" strokeWidth="6" strokeDasharray="14 10"/><circle cx="22" cy="18" r="7" fill="none" stroke="#f98845" strokeWidth="4" strokeDasharray="8 5"/><circle cx="22" cy="18" r="3" fill="#f7c59f"/></svg>; }
function SankeyIcon() { return <svg width="44" height="36" fill="none"><rect x="2" y="6" width="6" height="8" rx="1" fill="#e06927"/><rect x="2" y="18" width="6" height="12" rx="1" fill="#f98845"/><rect x="36" y="4" width="6" height="14" rx="1" fill="#e06927"/><rect x="36" y="22" width="6" height="8" rx="1" fill="#f98845"/><path d="M8,10 Q22,10 36,11" stroke="#e06927" strokeWidth="5" fill="none" opacity="0.4"/><path d="M8,22 Q22,20 36,25" stroke="#f98845" strokeWidth="7" fill="none" opacity="0.4"/></svg>; }
function NetworkIcon() { return <svg width="44" height="36" fill="none"><circle cx="22" cy="18" r="5" fill="#e06927"/><circle cx="8" cy="8" r="4" fill="#f98845"/><circle cx="36" cy="8" r="4" fill="#f98845"/><circle cx="8" cy="28" r="4" fill="#f7c59f"/><circle cx="36" cy="28" r="4" fill="#f7c59f"/><line x1="22" y1="18" x2="8" y2="8" stroke="#555" strokeWidth="1.5"/><line x1="22" y1="18" x2="36" y2="8" stroke="#555" strokeWidth="1.5"/><line x1="22" y1="18" x2="8" y2="28" stroke="#555" strokeWidth="1.5"/><line x1="22" y1="18" x2="36" y2="28" stroke="#555" strokeWidth="1.5"/></svg>; }
function RadarIcon() { return <svg width="44" height="36" fill="none"><polygon points="22,4 38,14 34,30 10,30 6,14" stroke="#2a2a2a" strokeWidth="1" fill="none"/><polygon points="22,10 32,17 29,26 15,26 12,17" stroke="#2a2a2a" strokeWidth="1" fill="none"/><polygon points="22,8 34,16 30,28 14,28 10,16" stroke="#e06927" strokeWidth="2" fill="#e06927" opacity="0.2"/></svg>; }
function HeatIcon() { return <svg width="44" height="36" fill="none"><rect x="2" y="2" width="10" height="10" rx="1" fill="#e06927"/><rect x="14" y="2" width="10" height="10" rx="1" fill="#f7c59f" opacity="0.4"/><rect x="26" y="2" width="10" height="10" rx="1" fill="#f98845"/><rect x="38" y="2" width="4" height="10" rx="1" fill="#f7c59f" opacity="0.2"/><rect x="2" y="14" width="10" height="10" rx="1" fill="#f7c59f" opacity="0.3"/><rect x="14" y="14" width="10" height="10" rx="1" fill="#e06927"/><rect x="26" y="14" width="10" height="10" rx="1" fill="#f7c59f" opacity="0.2"/><rect x="38" y="14" width="4" height="10" rx="1" fill="#f98845"/><rect x="2" y="26" width="10" height="8" rx="1" fill="#f98845" opacity="0.5"/><rect x="14" y="26" width="10" height="8" rx="1" fill="#f7c59f" opacity="0.2"/><rect x="26" y="26" width="10" height="8" rx="1" fill="#e06927"/><rect x="38" y="26" width="4" height="8" rx="1" fill="#f7c59f" opacity="0.4"/></svg>; }
function ParaIcon() { return <svg width="44" height="36" fill="none"><line x1="6" y1="4" x2="6" y2="32" stroke="#444" strokeWidth="2"/><line x1="18" y1="4" x2="18" y2="32" stroke="#444" strokeWidth="2"/><line x1="30" y1="4" x2="30" y2="32" stroke="#444" strokeWidth="2"/><line x1="42" y1="4" x2="42" y2="32" stroke="#444" strokeWidth="2"/><polyline points="6,10 18,22 30,12 42,24" stroke="#e06927" strokeWidth="2" fill="none" opacity="0.9"/><polyline points="6,20 18,10 30,24 42,14" stroke="#f98845" strokeWidth="2" fill="none" opacity="0.7"/></svg>; }
function CandleIcon() { return <svg width="44" height="36" fill="none"><line x1="10" y1="4" x2="10" y2="32" stroke="#444" strokeWidth="1"/><rect x="6" y="10" width="8" height="16" rx="1" fill="#34d399"/><line x1="24" y1="6" x2="24" y2="30" stroke="#444" strokeWidth="1"/><rect x="20" y="16" width="8" height="10" rx="1" fill="#f87171"/><line x1="38" y1="8" x2="38" y2="28" stroke="#444" strokeWidth="1"/><rect x="34" y="12" width="8" height="10" rx="1" fill="#34d399"/></svg>; }
function RiverIcon() { return <svg width="44" height="36" fill="none"><path d="M2,18 Q12,10 22,18 Q32,26 42,18" stroke="#e06927" strokeWidth="8" fill="none" opacity="0.6" strokeLinecap="round"/><path d="M2,18 Q12,24 22,18 Q32,12 42,18" stroke="#f98845" strokeWidth="5" fill="none" opacity="0.5" strokeLinecap="round"/></svg>; }
function GaugeIcon() { return <svg width="44" height="36" fill="none"><path d="M4,28 A18,18,0,0,1,40,28" stroke="#2a2a2a" strokeWidth="6" fill="none" strokeLinecap="round"/><path d="M4,28 A18,18,0,0,1,22,10" stroke="#e06927" strokeWidth="6" fill="none" strokeLinecap="round"/><line x1="22" y1="28" x2="14" y2="14" stroke="#fff" strokeWidth="2" strokeLinecap="round"/><circle cx="22" cy="28" r="3" fill="#e06927"/></svg>; }
