import { useState } from "react";

interface HomeScreenProps {
  onSelectETL: () => void;
  onSelectViz: () => void;
}

export default function HomeScreen({ onSelectETL, onSelectViz }: HomeScreenProps) {
  const [hoveredCard, setHoveredCard] = useState<"etl" | "viz" | null>(null);

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100vh", background: "#0f0f11",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Background grid lines */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(#1a1a1c 1px, transparent 1px), linear-gradient(90deg, #1a1a1c 1px, transparent 1px)",
        backgroundSize: "40px 40px",
        opacity: 0.5,
      }} />

      {/* Glow spots */}
      <div style={{ position: "absolute", top: "20%", left: "20%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(224,105,39,0.06) 0%, transparent 70%)", zIndex: 0 }} />
      <div style={{ position: "absolute", bottom: "20%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(74,158,255,0.05) 0%, transparent 70%)", zIndex: 0 }} />

      <div style={{ position: "relative", zIndex: 1, textAlign: "center", width: "100%", maxWidth: 860, padding: "0 32px" }}>

        {/* Logo + title */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 12 }}>
          <svg width="52" height="52" viewBox="0 0 200 200" fill="none">
            <rect width="200" height="200" rx="44" fill="#141416"/>
            <g fill="none" stroke="#FFFFFF" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 78 42 L 64 42 A 22 22 0 0 0 42 64 L 42 82" />
              <path d="M 122 42 L 136 42 A 22 22 0 0 1 158 64 L 158 82" />
              <path d="M 158 118 L 158 136 A 22 22 0 0 1 136 158 L 122 158" />
              <path d="M 42 118 L 42 136 A 22 22 0 0 0 64 158 L 78 158" />
            </g>
            <g fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="4">
              <line x1="78" y1="42" x2="122" y2="42"/><circle cx="78" cy="42" r="5"/><circle cx="122" cy="42" r="5"/>
              <line x1="158" y1="82" x2="158" y2="118"/><circle cx="158" cy="82" r="5"/><circle cx="158" cy="118" r="5"/>
              <line x1="122" y1="158" x2="78" y2="158"/><circle cx="122" cy="158" r="5"/><circle cx="78" cy="158" r="5"/>
              <line x1="42" y1="118" x2="42" y2="82"/><circle cx="42" cy="118" r="5"/><circle cx="42" cy="82" r="5"/>
            </g>
          </svg>
          <h1 style={{ margin: 0, fontSize: 42, fontWeight: 900, letterSpacing: "-1.5px", color: "#fff" }}>
            Oxipipe
          </h1>
        </div>
        <p style={{ color: "#555", fontSize: 14, marginBottom: 52, letterSpacing: "-0.2px" }}>
          Choose your workspace
        </p>

        {/* Mode cards */}
        <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>

          {/* ETL Card */}
          <button
            onClick={onSelectETL}
            onMouseEnter={() => setHoveredCard("etl")}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              background: hoveredCard === "etl"
                ? "linear-gradient(135deg, #1e1410 0%, #1a1a1c 100%)"
                : "#161618",
              border: `1.5px solid ${hoveredCard === "etl" ? "#e06927" : "#242426"}`,
              borderRadius: 16, padding: "36px 32px",
              cursor: "pointer", textAlign: "left",
              width: 360, flexShrink: 0,
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: hoveredCard === "etl" ? "translateY(-4px)" : "none",
              boxShadow: hoveredCard === "etl"
                ? "0 20px 48px rgba(224,105,39,0.15), 0 4px 16px rgba(0,0,0,0.4)"
                : "0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: hoveredCard === "etl" ? "rgba(224,105,39,0.15)" : "#1e1e20",
              border: `1px solid ${hoveredCard === "etl" ? "#e06927" : "#2a2a2a"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20, transition: "all 0.2s",
            }}>
              <PipelineIcon active={hoveredCard === "etl"} />
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
              Data Processing
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#666", lineHeight: 1.6 }}>
              Build visual ETL pipelines with nodes. Filter, transform, join and export datasets using the Rust DataFusion engine.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["CSV", "Parquet", "JSON", "Excel", "SQLite", "Avro"].map((tag) => (
                <span key={tag} style={{
                  background: "#1e1e20", border: "1px solid #2a2a2a",
                  borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600, color: "#888",
                }}>{tag}</span>
              ))}
            </div>
            <div style={{
              marginTop: 24, display: "flex", alignItems: "center", gap: 6,
              color: hoveredCard === "etl" ? "#e06927" : "#555",
              fontSize: 12, fontWeight: 700, transition: "color 0.2s",
            }}>
              Open ETL Editor
              <span style={{ fontSize: 14 }}>→</span>
            </div>
          </button>

          {/* DataViz Card */}
          <button
            onClick={onSelectViz}
            onMouseEnter={() => setHoveredCard("viz")}
            onMouseLeave={() => setHoveredCard(null)}
            style={{
              background: hoveredCard === "viz"
                ? "linear-gradient(135deg, #101428 0%, #1a1a1c 100%)"
                : "#161618",
              border: `1.5px solid ${hoveredCard === "viz" ? "#4a9eff" : "#242426"}`,
              borderRadius: 16, padding: "36px 32px",
              cursor: "pointer", textAlign: "left",
              width: 360, flexShrink: 0,
              transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: hoveredCard === "viz" ? "translateY(-4px)" : "none",
              boxShadow: hoveredCard === "viz"
                ? "0 20px 48px rgba(74,158,255,0.12), 0 4px 16px rgba(0,0,0,0.4)"
                : "0 4px 16px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: hoveredCard === "viz" ? "rgba(74,158,255,0.15)" : "#1e1e20",
              border: `1px solid ${hoveredCard === "viz" ? "#4a9eff" : "#2a2a2a"}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20, transition: "all 0.2s",
            }}>
              <ChartIcon active={hoveredCard === "viz"} />
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>
              Data Visualization
            </h2>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#666", lineHeight: 1.6 }}>
              Load data files and create interactive dashboards. 20+ chart types including heatmaps, sankey diagrams, and parallel coordinates.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["Line", "Bar", "Scatter", "Heatmap", "Sankey", "Radar", "Treemap", "Boxplot"].map((tag) => (
                <span key={tag} style={{
                  background: "#1e1e20", border: "1px solid #2a2a2a",
                  borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600, color: "#888",
                }}>{tag}</span>
              ))}
            </div>
            <div style={{
              marginTop: 24, display: "flex", alignItems: "center", gap: 6,
              color: hoveredCard === "viz" ? "#4a9eff" : "#555",
              fontSize: 12, fontWeight: 700, transition: "color 0.2s",
            }}>
              Open DataViz Studio
              <span style={{ fontSize: 14 }}>→</span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <p style={{ marginTop: 40, color: "#333", fontSize: 11 }}>
          Powered by <span style={{ color: "#e06927" }}>Rust DataFusion 43</span> · <span style={{ color: "#4a9eff" }}>Apache ECharts</span> · Tauri v2
        </p>
      </div>
    </div>
  );
}

function PipelineIcon({ active }: { active: boolean }) {
  const c = active ? "#e06927" : "#555";
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="7" r="2"/>
      <circle cx="18" cy="7" r="2"/>
      <circle cx="6" cy="17" r="2"/>
      <circle cx="18" cy="17" r="2"/>
      <line x1="8" y1="7" x2="16" y2="7"/>
      <line x1="8" y1="17" x2="16" y2="17"/>
      <line x1="6" y1="9" x2="6" y2="15"/>
      <line x1="18" y1="9" x2="18" y2="15"/>
    </svg>
  );
}

function ChartIcon({ active }: { active: boolean }) {
  const c = active ? "#4a9eff" : "#555";
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  );
}
