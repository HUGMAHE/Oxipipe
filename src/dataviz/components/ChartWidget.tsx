import React, { useState, useCallback, useRef } from "react";
import type { ChartWidgetConfig, ParsedDataset, ChartKind } from "../types";
import { buildOption, PRESET_THEMES } from "../utils/echartsOptions";
import ReactECharts from "echarts-for-react";
import ChartPicker from "./ChartPicker";

interface ChartWidgetProps {
  config: ChartWidgetConfig;
  dataset: ParsedDataset;
  onUpdate: (updated: ChartWidgetConfig) => void;
  onRemove: () => void;
}

const LABEL_MAP: Record<ChartKind, string> = {
  line: "Line", area: "Area", bar: "Bar", scatter: "Scatter", bubble: "Bubble",
  pie: "Pie", donut: "Donut", heatmap: "Heatmap", treemap: "Treemap",
  sankey: "Sankey", radar: "Radar", boxplot: "Box Plot", candlestick: "Candlestick",
  parallel: "Parallel Coords", sunburst: "Sunburst", funnel: "Funnel",
  gauge: "Gauge", themeriver: "ThemeRiver", histogram: "Histogram", network: "Network",
};

export default function ChartWidget({ config, dataset, onUpdate, onRemove }: ChartWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isChartPickerOpen, setIsChartPickerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"data" | "style" | "display">("data");

  const echartsRef = useRef<ReactECharts>(null);

  const numCols = dataset.columns.filter((c) => c.type === "number").map((c) => c.name);
  const allCols = dataset.columns.map((c) => c.name);

  const option = buildOption(config, dataset);

  const handleChangeKind = useCallback((kind: ChartKind) => {
    setIsChartPickerOpen(false);
    onUpdate({ ...config, kind });
  }, [config, onUpdate]);

  const handleExportPNG = useCallback(() => {
    if (!echartsRef.current) return;
    const instance = echartsRef.current.getEchartsInstance();
    const bg = config.bgColor && config.bgColor !== "transparent" ? config.bgColor : "#161618";
    const url = instance.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: bg,
    });
    const a = document.createElement("a");
    const name = (config.title || LABEL_MAP[config.kind]).toLowerCase().replace(/[^a-z0-9]/g, "_");
    a.download = `${name}_chart.png`;
    a.href = url;
    a.click();
  }, [config]);

  return (
    <div style={{
      background: config.bgColor && config.bgColor !== "transparent" ? config.bgColor : "#161618",
      border: "1px solid #242426",
      borderRadius: 12, overflow: "hidden",
      boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
      display: "flex", flexDirection: "column",
      transition: "background 0.2s",
    }}>
      {/* Widget header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 12px", background: "#1a1a1c", borderBottom: "1px solid #242426",
        userSelect: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#e2e2e2" }}>{config.title || LABEL_MAP[config.kind]}</span>
          <button
            onClick={() => setIsChartPickerOpen(true)}
            style={{
              background: "#252528", border: "none", borderRadius: 4,
              color: "#888", fontSize: 10, fontWeight: 600, padding: "2px 6px", cursor: "pointer",
            }}
          >
            {LABEL_MAP[config.kind]} ▾
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={handleExportPNG}
            title="Export PNG image"
            style={btnHeaderStyle}
          >
            Export PNG
          </button>
          <button
            onClick={() => setIsConfigOpen((v) => !v)}
            title="Configure settings"
            style={iconBtn(isConfigOpen)}
          >
            ⚙
          </button>
          <button
            onClick={() => setIsMinimized((v) => !v)}
            title={isMinimized ? "Expand" : "Collapse"}
            style={iconBtn()}
          >
            {isMinimized ? "↕" : "−"}
          </button>
          <button
            onClick={onRemove}
            title="Remove chart"
            style={{ ...iconBtn(), color: "#f87171" }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Config panel */}
      {isConfigOpen && !isMinimized && (
        <div style={{
          padding: "10px 14px", background: "#101012",
          borderBottom: "1px solid #242426",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {/* Sub-tabs inside config panel */}
          <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #222", paddingBottom: 6 }}>
            <button onClick={() => setActiveTab("data")} style={tabStyle(activeTab === "data")}>Data Mapping</button>
            <button onClick={() => setActiveTab("style")} style={tabStyle(activeTab === "style")}>Color & Style</button>
            <button onClick={() => setActiveTab("display")} style={tabStyle(activeTab === "display")}>Display Controls</button>
          </div>

          {/* TAB 1: DATA MAPPING */}
          {activeTab === "data" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <label style={labelStyle}>
                <span style={labelText}>Title</span>
                <input value={config.title} onChange={(e) => onUpdate({ ...config, title: e.target.value })}
                  style={inputStyle} placeholder="Chart title" />
              </label>

              <label style={labelStyle}>
                <span style={labelText}>X / Label column</span>
                <select value={config.xCol} onChange={(e) => onUpdate({ ...config, xCol: e.target.value })} style={selectStyle}>
                  {allCols.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>

              <label style={labelStyle}>
                <span style={labelText}>Y / Value column</span>
                <select value={config.yCol} onChange={(e) => onUpdate({ ...config, yCol: e.target.value })} style={selectStyle}>
                  {numCols.map((c) => <option key={c}>{c}</option>)}
                  {numCols.length === 0 && allCols.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>

              {(config.kind === "bubble" || config.kind === "sankey" || config.kind === "themeriver") && (
                <label style={labelStyle}>
                  <span style={labelText}>Z / Size column</span>
                  <select value={config.zCol || ""} onChange={(e) => onUpdate({ ...config, zCol: e.target.value || undefined })} style={selectStyle}>
                    <option value="">— none —</option>
                    {allCols.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}

          {/* TAB 2: COLOR & STYLE */}
          {activeTab === "style" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {/* Presets */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={labelText}>Theme Presets:</span>
                {PRESET_THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => onUpdate({ ...config, primaryColor: theme.primary, accentColor: theme.accent })}
                    style={{
                      background: "#1a1a1c", border: "1px solid #2a2a2a", borderRadius: 12,
                      padding: "2px 8px", cursor: "pointer", fontSize: 10, color: "#ccc",
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: theme.primary, display: "inline-block" }} />
                    {theme.name}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                <label style={labelStyleRow}>
                  <span style={labelText}>Primary Color</span>
                  <input type="color" value={config.primaryColor || "#e06927"}
                    onChange={(e) => onUpdate({ ...config, primaryColor: e.target.value })}
                    style={colorPickerStyle} />
                </label>

                <label style={labelStyleRow}>
                  <span style={labelText}>Accent Color</span>
                  <input type="color" value={config.accentColor || "#4a9eff"}
                    onChange={(e) => onUpdate({ ...config, accentColor: e.target.value })}
                    style={colorPickerStyle} />
                </label>

                <label style={labelStyle}>
                  <span style={labelText}>Background</span>
                  <select
                    value={config.bgColor || "transparent"}
                    onChange={(e) => onUpdate({ ...config, bgColor: e.target.value })}
                    style={selectStyle}
                  >
                    <option value="transparent">Transparent</option>
                    <option value="#161618">Dark Card (#161618)</option>
                    <option value="#0f0f11">Deep Black (#0f0f11)</option>
                    <option value="#181824">Midnight Blue (#181824)</option>
                    <option value="#ffffff">White (#ffffff)</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: DISPLAY CONTROLS */}
          {activeTab === "display" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
              {(config.kind === "line" || config.kind === "area") && (
                <label style={checkboxLabel}>
                  <input type="checkbox" checked={config.smooth !== false}
                    onChange={(e) => onUpdate({ ...config, smooth: e.target.checked })} />
                  <span>Smooth Curve</span>
                </label>
              )}

              <label style={checkboxLabel}>
                <input type="checkbox" checked={!!config.showLabels}
                  onChange={(e) => onUpdate({ ...config, showLabels: e.target.checked })} />
                <span>Show Data Labels</span>
              </label>

              <label style={checkboxLabel}>
                <input type="checkbox" checked={config.showGrid !== false}
                  onChange={(e) => onUpdate({ ...config, showGrid: e.target.checked })} />
                <span>Show Grid Lines</span>
              </label>

              <label style={checkboxLabel}>
                <input type="checkbox" checked={!!config.showLegend}
                  onChange={(e) => onUpdate({ ...config, showLegend: e.target.checked })} />
                <span>Show Legend</span>
              </label>

              <label style={checkboxLabel}>
                <input type="checkbox" checked={config.showZoom !== false}
                  onChange={(e) => onUpdate({ ...config, showZoom: e.target.checked })} />
                <span>Show Zoom Slider</span>
              </label>

              <label style={labelStyleRow}>
                <span style={labelText}>Line Width ({config.lineWidth ?? 2}px)</span>
                <input type="range" min="1" max="8" value={config.lineWidth ?? 2}
                  onChange={(e) => onUpdate({ ...config, lineWidth: parseInt(e.target.value) })}
                  style={{ width: 80 }} />
              </label>

              {(config.kind === "scatter" || config.kind === "bubble" || config.kind === "network" || config.kind === "line") && (
                <label style={labelStyleRow}>
                  <span style={labelText}>Symbol Size ({config.symbolSize ?? 8}px)</span>
                  <input type="range" min="2" max="30" value={config.symbolSize ?? 8}
                    onChange={(e) => onUpdate({ ...config, symbolSize: parseInt(e.target.value) })}
                    style={{ width: 80 }} />
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {!isMinimized && (
        <div style={{ padding: "8px 4px 4px" }}>
          <ReactECharts
            ref={echartsRef}
            key={`${config.kind}-${config.xCol}-${config.yCol}-${config.zCol}-${config.primaryColor}-${config.accentColor}-${config.bgColor}-${config.smooth}-${config.showLabels}-${config.showGrid}-${config.showLegend}-${config.showZoom}-${config.lineWidth}-${config.symbolSize}`}
            option={option}
            style={{ height: 320, width: "100%" }}
            opts={{ renderer: "canvas" }}
            theme="dark"
          />
        </div>
      )}

      {/* Chart Picker modal */}
      {isChartPickerOpen && (
        <ChartPicker onSelect={handleChangeKind} onClose={() => setIsChartPickerOpen(false)} />
      )}
    </div>
  );
}

// ── Micro styles ──────────────────────────────────────────────────────────────
const iconBtn = (active?: boolean): React.CSSProperties => ({
  background: active ? "#e0692720" : "none",
  border: "none", borderRadius: 4,
  color: active ? "#e06927" : "#666",
  fontSize: 13, cursor: "pointer", padding: "2px 5px",
  transition: "color 0.15s",
});

const btnHeaderStyle: React.CSSProperties = {
  background: "#252528",
  border: "1px solid #333",
  borderRadius: 4,
  color: "#ccc",
  fontSize: 10,
  fontWeight: 600,
  padding: "3px 8px",
  cursor: "pointer",
  transition: "all 0.15s",
};

const tabStyle = (active: boolean): React.CSSProperties => ({
  background: active ? "#e0692720" : "none",
  border: "none",
  borderRadius: 4,
  color: active ? "#e06927" : "#888",
  fontSize: 11,
  fontWeight: 600,
  padding: "3px 8px",
  cursor: "pointer",
});

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 3 };
const labelStyleRow: React.CSSProperties = { display: "flex", alignItems: "center", gap: 6 };
const labelText: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px" };
const inputStyle: React.CSSProperties = { background: "#1e1e20", border: "1px solid #333", borderRadius: 4, color: "#e2e2e2", fontSize: 12, padding: "4px 8px", outline: "none" };
const selectStyle: React.CSSProperties = { background: "#1e1e20", border: "1px solid #333", borderRadius: 4, color: "#e2e2e2", fontSize: 12, padding: "4px 8px", outline: "none" };
const colorPickerStyle: React.CSSProperties = { background: "none", border: "none", width: 26, height: 26, cursor: "pointer", padding: 0 };
const checkboxLabel: React.CSSProperties = { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#ccc", cursor: "pointer" };
