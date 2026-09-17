import { useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { readDataFile } from "../dataviz/utils/fileReaders";
import type { ParsedDataset, ChartWidgetConfig, ChartKind } from "../dataviz/types";
import DataPreview from "../dataviz/components/DataPreview";
import ChartWidget from "../dataviz/components/ChartWidget";
import ChartPicker from "../dataviz/components/ChartPicker";

interface DataVizAppProps {
  onBack: () => void;
}

let widgetCounter = 0;
function newWidgetId() { return `w-${++widgetCounter}`; }

export default function DataVizApp({ onBack }: DataVizAppProps) {
  const [dataset, setDataset]         = useState<ParsedDataset | null>(null);
  const [isLoading, setIsLoading]     = useState(false);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [widgets, setWidgets]         = useState<ChartWidgetConfig[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [cols, setCols]               = useState(1);

  const handleOpenFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Data Files", extensions: ["csv", "json", "parquet", "tsv", "ndjson"] },
        ],
      });
      if (typeof selected !== "string" || !selected) return;

      setIsLoading(true);
      setLoadError(null);
      const ds = await readDataFile(selected);
      setDataset(ds);
      setWidgets([]); // reset charts on new file
    } catch (err: any) {
      setLoadError(err.message || String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddChart = useCallback((kind: ChartKind) => {
    if (!dataset) return;
    const numCols = dataset.columns.filter((c) => c.type === "number");
    const allCols = dataset.columns;
    const xCol = allCols[0]?.name || "";
    const yCol = numCols[0]?.name || allCols[1]?.name || allCols[0]?.name || "";
    setWidgets((prev) => [
      ...prev,
      { id: newWidgetId(), kind, title: "", xCol, yCol },
    ]);
    setIsPickerOpen(false);
  }, [dataset]);

  const handleUpdateWidget = useCallback((id: string, updated: ChartWidgetConfig) => {
    setWidgets((prev) => prev.map((w) => w.id === id ? updated : w));
  }, []);

  const handleRemoveWidget = useCallback((id: string) => {
    setWidgets((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100vh",
      background: "#0f0f11", color: "#e2e2e2",
      fontFamily: "var(--font-sans, 'Inter', sans-serif)",
      overflow: "hidden",
    }}>
      {/* ── Topbar ─────────────────────────────────────────────────────────── */}
      <header style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "0 16px", height: 48,
        background: "#161618", borderBottom: "1px solid #242426",
        flexShrink: 0, zIndex: 100,
      }}>
        <button onClick={onBack} style={{
          background: "none", border: "1px solid #2a2a2a",
          borderRadius: 6, color: "#888", fontSize: 12,
          padding: "4px 10px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 5,
          transition: "all 0.15s",
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#e06927"; (e.currentTarget as HTMLButtonElement).style.color = "#e06927"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; (e.currentTarget as HTMLButtonElement).style.color = "#888"; }}
        >
          ← Home
        </button>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
          <svg width="22" height="22" viewBox="0 0 200 200" fill="none">
            <rect width="200" height="200" rx="44" fill="#141416"/>
            <g fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 78 42 L 64 42 A 22 22 0 0 0 42 64 L 42 82" /><path d="M 122 42 L 136 42 A 22 22 0 0 1 158 64 L 158 82" />
              <path d="M 158 118 L 158 136 A 22 22 0 0 1 136 158 L 122 158" /><path d="M 42 118 L 42 136 A 22 22 0 0 0 64 158 L 78 158" />
            </g>
            <g fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4">
              <line x1="78" y1="42" x2="122" y2="42"/><circle cx="78" cy="42" r="5"/><circle cx="122" cy="42" r="5"/>
              <line x1="158" y1="82" x2="158" y2="118"/><circle cx="158" cy="82" r="5"/><circle cx="158" cy="118" r="5"/>
              <line x1="122" y1="158" x2="78" y2="158"/><circle cx="122" cy="158" r="5"/><circle cx="78" cy="158" r="5"/>
              <line x1="42" y1="118" x2="42" y2="82"/><circle cx="42" cy="118" r="5"/><circle cx="42" cy="82" r="5"/>
            </g>
          </svg>
          <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: "-0.3px" }}>DataViz</span>
        </div>

        <div style={{ flex: 1 }} />

        {/* File open */}
        <button onClick={handleOpenFile} disabled={isLoading} style={{
          background: "#1e1e20", border: "1px solid #333", borderRadius: 6,
          color: "#e2e2e2", fontSize: 12, fontWeight: 600,
          padding: "5px 12px", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          {isLoading ? "Loading…" : "Open File"}
        </button>

        {/* Add chart */}
        {dataset && (
          <button onClick={() => setIsPickerOpen(true)} style={{
            background: "#e06927", border: "none", borderRadius: 6,
            color: "#fff", fontSize: 12, fontWeight: 700,
            padding: "5px 14px", cursor: "pointer",
          }}>
            + Add Chart
          </button>
        )}

        {/* Cols layout toggle */}
        {widgets.length > 0 && (
          <div style={{ display: "flex", gap: 3 }}>
            {[1, 2, 3].map((n) => (
              <button key={n} onClick={() => setCols(n)} style={{
                background: cols === n ? "#e06927" : "#1e1e20",
                border: "1px solid #333", borderRadius: 4,
                color: "#fff", fontSize: 10, fontWeight: 700,
                width: 26, height: 26, cursor: "pointer",
              }}>{n}</button>
            ))}
          </div>
        )}

        {/* Sidebar toggle */}
        <button onClick={() => setIsSidebarOpen((v) => !v)} style={{
          background: "none", border: "1px solid #2a2a2a", borderRadius: 6,
          color: "#888", fontSize: 11, padding: "4px 8px", cursor: "pointer",
        }}>
          {isSidebarOpen ? "⊲" : "⊳"} Data
        </button>
      </header>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Sidebar: dataset info */}
        {isSidebarOpen && (
          <aside style={{
            width: 280, flexShrink: 0,
            background: "#131315", borderRight: "1px solid #242426",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid #242426" }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "#666" }}>Dataset</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "12px" }}>
              {!dataset && !isLoading && (
                <div style={{ color: "#444", fontSize: 12, textAlign: "center", marginTop: 40 }}>
                  <div style={{ width: 36, height: 36, margin: "0 auto 12px", opacity: 0.4 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 7a2 2 0 0 1 2-2h3.586a1 1 0 0 1 .707.293L10.414 6.4A1 1 0 0 0 11.121 6.693H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    </svg>
                  </div>
                  <div>Open a CSV, JSON or Parquet file to start visualizing</div>
                </div>
              )}
              {isLoading && <div style={{ color: "#666", fontSize: 12, textAlign: "center", marginTop: 40 }}>Loading file…</div>}
              {loadError && <div style={{ color: "#f87171", fontSize: 11, marginTop: 12, padding: 10, background: "#2a1414", borderRadius: 6 }}>{loadError}</div>}
              {dataset && <DataPreview dataset={dataset} />}
            </div>
          </aside>
        )}

        {/* Canvas */}
        <main style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {widgets.length === 0 && dataset && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#444" }}>
              <div style={{ width: 48, height: 48, marginBottom: 16, opacity: 0.4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18"/>
                  <path d="M9 21V9"/>
                </svg>
              </div>
              <div style={{ fontSize: 14, marginBottom: 8 }}>Click <strong style={{ color: "#e06927" }}>+ Add Chart</strong> to start visualizing</div>
              <div style={{ fontSize: 11, color: "#555" }}>Choose from 20 chart types including sankey, heatmap, radar, and more</div>
            </div>
          )}
          {widgets.length === 0 && !dataset && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "#333" }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>
                <svg width="64" height="64" viewBox="0 0 200 200" fill="none">
                  <rect width="200" height="200" rx="44" fill="#1a1a1c"/>
                  <g fill="none" stroke="#333" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M 78 42 L 64 42 A 22 22 0 0 0 42 64 L 42 82" /><path d="M 122 42 L 136 42 A 22 22 0 0 1 158 64 L 158 82" />
                    <path d="M 158 118 L 158 136 A 22 22 0 0 1 136 158 L 122 158" /><path d="M 42 118 L 42 136 A 22 22 0 0 0 64 158 L 78 158" />
                  </g>
                  <g fill="#333" stroke="#333" strokeWidth="4">
                    <line x1="78" y1="42" x2="122" y2="42"/><line x1="158" y1="82" x2="158" y2="118"/>
                    <line x1="122" y1="158" x2="78" y2="158"/><line x1="42" y1="118" x2="42" y2="82"/>
                  </g>
                </svg>
              </div>
              <div style={{ fontSize: 16, color: "#555", marginBottom: 8 }}>Open a data file to get started</div>
              <div style={{ fontSize: 12, color: "#3a3a3a" }}>Supports CSV, JSON, and Parquet</div>
              <button onClick={handleOpenFile} style={{
                marginTop: 20, background: "#e06927", border: "none", borderRadius: 8,
                color: "#fff", fontSize: 13, fontWeight: 700, padding: "10px 24px", cursor: "pointer",
              }}>
                Open Data File
              </button>
            </div>
          )}

          {widgets.length > 0 && (
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gap: 16,
            }}>
              {widgets.map((w) => (
                <ChartWidget
                  key={w.id}
                  config={w}
                  dataset={dataset!}
                  onUpdate={(updated) => handleUpdateWidget(w.id, updated)}
                  onRemove={() => handleRemoveWidget(w.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Chart picker modal */}
      {isPickerOpen && <ChartPicker onSelect={handleAddChart} onClose={() => setIsPickerOpen(false)} />}
    </div>
  );
}
