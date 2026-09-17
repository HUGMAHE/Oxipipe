/**
 * echartsOptions.ts — DataViz module only
 * Builds ECharts `option` objects for each chart kind with full customization support.
 */
import type { ChartWidgetConfig, ParsedDataset } from "../types";

// ── Color palettes & Defaults ───────────────────────────────────────────────
export const PALETTE = [
  "#e06927", "#f98845", "#f7c59f",
  "#4a9eff", "#a78bfa", "#34d399",
  "#fbbf24", "#f87171", "#60a5fa",
  "#818cf8",
];

export const PRESET_THEMES = [
  { name: "Orange Pipe", primary: "#e06927", accent: "#4a9eff" },
  { name: "Neon Cyan", primary: "#00f2fe", accent: "#4facfe" },
  { name: "Emerald Green", primary: "#34d399", accent: "#fbbf24" },
  { name: "Purple Sunset", primary: "#a78bfa", accent: "#f87171" },
  { name: "Crimson Red", primary: "#f87171", accent: "#fbbf24" },
  { name: "Classic Blue", primary: "#60a5fa", accent: "#e06927" },
  { name: "Monochrome", primary: "#e2e2e2", accent: "#666666" },
];

// ── Utility: extract column values ────────────────────────────────────────────
function colValues(ds: ParsedDataset, colName: string): any[] {
  const idx = ds.columns.findIndex((c) => c.name === colName);
  if (idx === -1) return [];
  return ds.rows.map((r) => r[idx]);
}

function colNumeric(ds: ParsedDataset, colName: string): number[] {
  return colValues(ds, colName).map((v) => parseFloat(v) || 0);
}

// ── Helper: build base configuration based on user customization ─────────────
function getBase(cfg: ChartWidgetConfig) {
  const primary = cfg.primaryColor || "#e06927";
  const accent = cfg.accentColor || "#4a9eff";
  const palette = [primary, accent, ...PALETTE.filter((c) => c !== primary && c !== accent)];
  const showGrid = cfg.showGrid !== false;
  const showZoom = cfg.showZoom !== false;

  return {
    backgroundColor: cfg.bgColor || "transparent",
    color: palette,
    animation: true,
    tooltip: { trigger: "axis" as const, backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    legend: cfg.showLegend ? { show: true, textStyle: { color: "#ccc" }, top: 5 } : { show: false },
    grid: { top: cfg.showLegend ? 40 : 25, right: 20, bottom: showZoom ? 48 : 28, left: 50, containLabel: true },
    dataZoom: showZoom ? [{ type: "inside" }, { type: "slider", height: 18 }] : [],
    xAxisSplitLine: showGrid ? { lineStyle: { color: "#2a2a2a" } } : { show: false },
    yAxisSplitLine: showGrid ? { lineStyle: { color: "#2a2a2a" } } : { show: false },
    labelOptions: cfg.showLabels ? { show: true, position: "top", color: "#ccc" } : { show: false },
  };
}

// ── Option builders ────────────────────────────────────────────────────────────

export function buildOption(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  switch (cfg.kind) {
    case "line":     return buildLine(cfg, ds, false);
    case "area":     return buildLine(cfg, ds, true);
    case "bar":      return buildBar(cfg, ds);
    case "scatter":  return buildScatter(cfg, ds);
    case "bubble":   return buildBubble(cfg, ds);
    case "pie":      return buildPie(cfg, ds, false);
    case "donut":    return buildPie(cfg, ds, true);
    case "heatmap":  return buildHeatmap(cfg, ds);
    case "treemap":  return buildTreemap(cfg, ds);
    case "radar":    return buildRadar(cfg, ds);
    case "boxplot":  return buildBoxplot(cfg, ds);
    case "funnel":   return buildFunnel(cfg, ds);
    case "gauge":    return buildGauge(cfg, ds);
    case "histogram": return buildHistogram(cfg, ds);
    case "parallel": return buildParallel(cfg, ds);
    case "sankey":   return buildSankey(cfg, ds);
    case "sunburst": return buildSunburst(cfg, ds);
    case "themeriver": return buildThemeRiver(cfg, ds);
    case "candlestick": return buildCandlestick(cfg, ds);
    case "network":  return buildNetwork(cfg, ds);
    default:         return buildLine(cfg, ds, false);
  }
}

function buildLine(cfg: ChartWidgetConfig, ds: ParsedDataset, area: boolean): object {
  const base = getBase(cfg);
  const x = colValues(ds, cfg.xCol);
  const y = colNumeric(ds, cfg.yCol);
  const primary = cfg.primaryColor || "#e06927";
  const isSmooth = cfg.smooth !== false;
  const lineWidth = cfg.lineWidth ?? 2;

  return {
    ...base,
    xAxis: { type: "category", data: x, axisLabel: { color: "#999", rotate: 30 }, splitLine: base.xAxisSplitLine },
    yAxis: { type: "value", axisLabel: { color: "#999" }, splitLine: base.yAxisSplitLine },
    series: [{
      type: "line", data: y,
      smooth: isSmooth,
      sampling: "lttb",
      large: true,
      label: base.labelOptions,
      areaStyle: area ? { opacity: 0.25 } : undefined,
      lineStyle: { color: primary, width: lineWidth },
      itemStyle: { color: primary },
      symbolSize: cfg.symbolSize ?? 6,
    }],
  };
}

function buildBar(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const x = colValues(ds, cfg.xCol);
  const y = colNumeric(ds, cfg.yCol);
  const primary = cfg.primaryColor || "#e06927";

  return {
    ...base,
    xAxis: { type: "category", data: x, axisLabel: { color: "#999", rotate: 30 }, splitLine: base.xAxisSplitLine },
    yAxis: { type: "value", axisLabel: { color: "#999" }, splitLine: base.yAxisSplitLine },
    series: [{
      type: "bar", data: y,
      label: base.labelOptions,
      itemStyle: { color: primary, borderRadius: [3, 3, 0, 0] },
    }],
  };
}

function buildScatter(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const x = colNumeric(ds, cfg.xCol);
  const y = colNumeric(ds, cfg.yCol);
  const pts = x.map((xi, i) => [xi, y[i]]);
  const primary = cfg.primaryColor || "#e06927";

  return {
    ...base,
    tooltip: { trigger: "item", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    xAxis: { type: "value", axisLabel: { color: "#999" }, splitLine: base.xAxisSplitLine },
    yAxis: { type: "value", axisLabel: { color: "#999" }, splitLine: base.yAxisSplitLine },
    series: [{
      type: "scatter", data: pts, large: true,
      label: base.labelOptions,
      symbolSize: cfg.symbolSize ?? 8,
      itemStyle: { color: primary, opacity: 0.8 },
    }],
  };
}

function buildBubble(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const x = colNumeric(ds, cfg.xCol);
  const y = colNumeric(ds, cfg.yCol);
  const z = cfg.zCol ? colNumeric(ds, cfg.zCol) : x.map(() => 20);
  const pts = x.map((xi, i) => [xi, y[i], z[i]]);
  const primary = cfg.primaryColor || "#e06927";
  const userSize = cfg.symbolSize ?? 1;

  return {
    ...base,
    tooltip: { trigger: "item", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    xAxis: { type: "value", axisLabel: { color: "#999" }, splitLine: base.xAxisSplitLine },
    yAxis: { type: "value", axisLabel: { color: "#999" }, splitLine: base.yAxisSplitLine },
    series: [{
      type: "scatter", data: pts,
      label: base.labelOptions,
      symbolSize: (d: number[]) => Math.max(4, Math.min(60, (d[2] / 5) * userSize)),
      itemStyle: { color: primary, opacity: 0.7 },
    }],
  };
}

function buildPie(cfg: ChartWidgetConfig, ds: ParsedDataset, donut: boolean): object {
  const base = getBase(cfg);
  const labels = colValues(ds, cfg.xCol);
  const vals = colNumeric(ds, cfg.yCol);
  const data = labels.map((name, i) => ({ name, value: vals[i] }));

  return {
    backgroundColor: base.backgroundColor,
    color: base.color,
    legend: base.legend,
    tooltip: { trigger: "item", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    series: [{
      type: "pie",
      radius: donut ? ["40%", "68%"] : "65%",
      data,
      label: { show: cfg.showLabels !== false, color: "#ccc" },
      emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.5)" } },
    }],
  };
}

function buildHeatmap(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const xVals = [...new Set(colValues(ds, cfg.xCol))];
  const yVals = [...new Set(colValues(ds, cfg.yCol))];
  const vals = colNumeric(ds, cfg.zCol || cfg.yCol);
  const primary = cfg.primaryColor || "#e06927";

  const data = ds.rows.slice(0, 1000).map((row, i) => {
    const xi = ds.columns.findIndex((c) => c.name === cfg.xCol);
    const yi = ds.columns.findIndex((c) => c.name === cfg.yCol);
    return [xVals.indexOf(row[xi]), yVals.indexOf(row[yi]), vals[i] || 0];
  });

  return {
    backgroundColor: base.backgroundColor,
    tooltip: { position: "top", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    grid: { top: 40, right: 60, bottom: 60, left: 60 },
    xAxis: { type: "category", data: xVals.slice(0, 30), axisLabel: { color: "#999", rotate: 30 }, splitLine: base.xAxisSplitLine },
    yAxis: { type: "category", data: yVals.slice(0, 30), axisLabel: { color: "#999" }, splitLine: base.yAxisSplitLine },
    visualMap: { min: 0, max: Math.max(...vals.filter(Boolean)) || 100, calculable: true, orient: "horizontal", left: "center", bottom: 0, color: [primary, "#141416"] },
    series: [{
      type: "heatmap", data,
      label: base.labelOptions,
      itemStyle: { borderRadius: 2 },
    }],
  };
}

function buildTreemap(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const labels = colValues(ds, cfg.xCol);
  const vals = colNumeric(ds, cfg.yCol);
  const data = labels.map((name, i) => ({ name: String(name), value: Math.abs(vals[i]) || 1 }));

  return {
    backgroundColor: base.backgroundColor,
    color: base.color,
    tooltip: { trigger: "item", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    series: [{
      type: "treemap", data, roam: false,
      label: { show: cfg.showLabels !== false, color: "#fff" },
      itemStyle: { borderRadius: 4, borderWidth: 1, borderColor: "#141416", gapWidth: 2 },
      levels: [{ itemStyle: { borderColor: "#141416", borderWidth: 2, gapWidth: 4 }, upperLabel: { show: false } }],
    }],
  };
}

function buildRadar(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const numCols = ds.columns.filter((c) => c.type === "number").slice(0, 8);
  const indicators = numCols.map((c) => ({ name: c.name, max: Math.max(...colNumeric(ds, c.name)) || 100 }));
  const firstRow = numCols.map((c) => colNumeric(ds, c.name)[0] || 0);
  const primary = cfg.primaryColor || "#e06927";

  return {
    backgroundColor: base.backgroundColor,
    color: base.color,
    legend: base.legend,
    tooltip: { trigger: "item", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    radar: { indicator: indicators, axisName: { color: "#aaa" }, splitLine: { lineStyle: { color: cfg.showGrid !== false ? "#2a2a2a" : "transparent" } }, splitArea: { show: false } },
    series: [{
      type: "radar",
      data: [{ value: firstRow, name: cfg.yCol || "Dataset Row 1", areaStyle: { opacity: 0.3 }, lineStyle: { color: primary, width: cfg.lineWidth ?? 2 }, itemStyle: { color: primary } }],
      label: base.labelOptions,
    }],
  };
}

function buildBoxplot(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const vals = colNumeric(ds, cfg.yCol).filter(Boolean).sort((a, b) => a - b);
  const q = (p: number) => vals[Math.floor(vals.length * p)] || 0;
  const primary = cfg.primaryColor || "#e06927";
  const accent = cfg.accentColor || "#4a9eff";

  return {
    ...base,
    xAxis: { type: "category", data: [cfg.yCol], splitLine: base.xAxisSplitLine },
    yAxis: { type: "value", axisLabel: { color: "#999" }, splitLine: base.yAxisSplitLine },
    series: [{ type: "boxplot", data: [[q(0), q(0.25), q(0.5), q(0.75), q(1)]], itemStyle: { color: primary, borderColor: accent } }],
  };
}

function buildFunnel(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const labels = colValues(ds, cfg.xCol).slice(0, 10);
  const vals = colNumeric(ds, cfg.yCol).slice(0, 10);
  const data = labels.map((name, i) => ({ name: String(name), value: vals[i] })).sort((a, b) => b.value - a.value);

  return {
    backgroundColor: base.backgroundColor,
    color: base.color,
    legend: base.legend,
    tooltip: { trigger: "item", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    series: [{
      type: "funnel", left: "10%", top: 20, bottom: 20, width: "80%", sort: "descending", data,
      label: { show: cfg.showLabels !== false, color: "#ccc" },
    }],
  };
}

function buildGauge(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const vals = colNumeric(ds, cfg.yCol);
  const avg = vals.reduce((a, b) => a + b, 0) / (vals.length || 1);
  const max = Math.max(...vals) || 100;
  const primary = cfg.primaryColor || "#e06927";
  const accent = cfg.accentColor || "#34d399";

  return {
    backgroundColor: base.backgroundColor,
    tooltip: { formatter: "{a} <br/>{b} : {c}" },
    series: [{
      type: "gauge",
      max,
      data: [{ value: Math.round(avg), name: cfg.yCol }],
      axisLine: { lineStyle: { width: cfg.lineWidth ? cfg.lineWidth * 5 : 14, color: [[0.3, "#f87171"], [0.7, primary], [1, accent]] } },
      pointer: { itemStyle: { color: primary } },
      axisTick: { distance: -20, length: 6, lineStyle: { color: "#fff", width: 1 } },
      splitLine: { distance: -24, length: 12, lineStyle: { color: "#fff", width: 2 } },
      axisLabel: { color: "inherit", distance: 20, fontSize: 12 },
      detail: { valueAnimation: true, formatter: "{value}", color: "inherit" },
      title: { color: "#aaa" },
    }],
  };
}

function buildHistogram(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const vals = colNumeric(ds, cfg.xCol).filter(Boolean);
  const min = Math.min(...vals), max = Math.max(...vals);
  const bins = 20;
  const step = (max - min) / bins || 1;
  const counts = Array(bins).fill(0);
  const labels: string[] = [];
  for (let i = 0; i < bins; i++) labels.push(`${(min + i * step).toFixed(1)}`);
  vals.forEach((v) => { const idx = Math.min(Math.floor((v - min) / step), bins - 1); counts[idx]++; });
  const primary = cfg.primaryColor || "#e06927";

  return {
    ...base,
    xAxis: { type: "category", data: labels, axisLabel: { color: "#999", rotate: 30 }, splitLine: base.xAxisSplitLine },
    yAxis: { type: "value", name: "Count", axisLabel: { color: "#999" }, splitLine: base.yAxisSplitLine },
    series: [{
      type: "bar", data: counts, barWidth: "95%",
      label: base.labelOptions,
      itemStyle: { color: primary },
    }],
  };
}

function buildParallel(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const numCols = ds.columns.filter((c) => c.type === "number").slice(0, 8);
  const parallelAxis = numCols.map((c, i) => ({ dim: i, name: c.name }));
  const data = ds.rows.slice(0, 500).map((row) =>
    numCols.map((c) => { const idx = ds.columns.findIndex((col) => col.name === c.name); return parseFloat(row[idx]) || 0; })
  );
  const primary = cfg.primaryColor || "#e06927";

  return {
    backgroundColor: base.backgroundColor,
    tooltip: { trigger: "item", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    parallelAxis,
    parallel: { left: 48, right: 20, top: 20, bottom: 48, parallelAxisDefault: { axisLabel: { color: "#999" }, axisLine: { lineStyle: { color: "#444" } } } },
    series: [{ type: "parallel", data, lineStyle: { width: cfg.lineWidth ?? 1, opacity: 0.4, color: primary } }],
  };
}

function buildSankey(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const srcs = colValues(ds, cfg.xCol).slice(0, 50);
  const tgts = colValues(ds, cfg.yCol).slice(0, 50);
  const vals = (cfg.zCol ? colNumeric(ds, cfg.zCol) : srcs.map(() => 1)).slice(0, 50);
  const nodeSet = new Set([...srcs, ...tgts].map(String));
  const nodes = [...nodeSet].map((name) => ({ name }));
  const links = srcs.map((s, i) => ({ source: String(s), target: String(tgts[i]), value: vals[i] || 1 })).filter((l) => l.source !== l.target);

  return {
    backgroundColor: base.backgroundColor,
    tooltip: { trigger: "item", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    series: [{
      type: "sankey", data: nodes, links, emphasis: { focus: "adjacency" },
      lineStyle: { color: "gradient", opacity: 0.5 },
      label: { show: cfg.showLabels !== false, color: "#ccc" },
    }],
  };
}

function buildSunburst(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const labels = colValues(ds, cfg.xCol).slice(0, 30);
  const vals = colNumeric(ds, cfg.yCol).slice(0, 30);
  const children = labels.map((name, i) => ({ name: String(name), value: Math.abs(vals[i]) || 1 }));

  return {
    backgroundColor: base.backgroundColor,
    color: base.color,
    tooltip: { trigger: "item", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    series: [{
      type: "sunburst", data: [{ name: "Total", children }], radius: ["15%", "80%"],
      label: { show: cfg.showLabels !== false, rotate: "tangential", color: "#ccc" },
      itemStyle: { borderRadius: 3 },
    }],
  };
}

function buildThemeRiver(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const dates = colValues(ds, cfg.xCol).slice(0, 100);
  const series = colValues(ds, cfg.yCol).slice(0, 100);
  const vals = colNumeric(ds, cfg.zCol || cfg.yCol).slice(0, 100);
  const data = dates.map((d, i) => [String(d), vals[i] || 0, String(series[i])]);

  return {
    backgroundColor: base.backgroundColor,
    color: base.color,
    legend: base.legend,
    tooltip: { trigger: "axis", axisPointer: { type: "line" }, backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    singleAxis: { top: 48, bottom: 48, axisTick: {}, axisLabel: { color: "#999" }, type: "time" },
    series: [{
      type: "themeRiver",
      label: { show: cfg.showLabels !== false, color: "#ccc" },
      data,
    }],
  };
}

function buildCandlestick(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const dates = colValues(ds, cfg.xCol).slice(0, 200);
  const open  = colNumeric(ds, cfg.yCol).slice(0, 200);
  const numCols = ds.columns.filter((c) => c.type === "number");
  const close = numCols[1] ? colNumeric(ds, numCols[1].name).slice(0, 200) : open;
  const low   = numCols[2] ? colNumeric(ds, numCols[2].name).slice(0, 200) : open.map((v) => v * 0.97);
  const high  = numCols[3] ? colNumeric(ds, numCols[3].name).slice(0, 200) : open.map((v) => v * 1.03);
  const ohlc  = dates.map((_, i) => [open[i], close[i], low[i], high[i]]);
  const primary = cfg.primaryColor || "#34d399";
  const accent = cfg.accentColor || "#f87171";

  return {
    ...base,
    xAxis: { type: "category", data: dates, axisLabel: { color: "#999" }, splitLine: base.xAxisSplitLine },
    yAxis: { type: "value", scale: true, axisLabel: { color: "#999" }, splitLine: base.yAxisSplitLine },
    series: [{ type: "candlestick", data: ohlc, itemStyle: { color: primary, color0: accent, borderColor: primary, borderColor0: accent } }],
  };
}

function buildNetwork(cfg: ChartWidgetConfig, ds: ParsedDataset): object {
  const base = getBase(cfg);
  const srcs = colValues(ds, cfg.xCol).slice(0, 60);
  const tgts = colValues(ds, cfg.yCol).slice(0, 60);
  const nodeSet = new Set([...srcs, ...tgts].map(String));
  const primary = cfg.primaryColor || "#e06927";

  const nodes = [...nodeSet].map((name, i) => ({
    id: name, name,
    symbolSize: cfg.symbolSize ?? 16,
    category: i % base.color.length,
    itemStyle: { color: i === 0 ? primary : base.color[i % base.color.length] },
  }));
  const links = srcs.map((s, i) => ({ source: String(s), target: String(tgts[i]) })).filter((l) => l.source !== l.target);

  return {
    backgroundColor: base.backgroundColor,
    tooltip: { trigger: "item", backgroundColor: "#1a1a1a", borderColor: "#333", textStyle: { color: "#eee" } },
    series: [{
      type: "graph", layout: "force", data: nodes, links, roam: true,
      label: { show: cfg.showLabels !== false, color: "#ccc", position: "right" },
      force: { repulsion: 80 },
      lineStyle: { color: "#444", opacity: 0.7, width: cfg.lineWidth ?? 1, curveness: 0.2 },
      emphasis: { focus: "adjacency" },
    }],
  };
}
