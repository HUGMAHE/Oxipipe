import { useState } from "react";
import type { DockerExportPackage } from "../types";
import { IconExport } from "./Icons";

interface DockerExportModalProps {
  packageData: DockerExportPackage | null;
  isOpen: boolean;
  onClose: () => void;
}

type Tab = "dockerfile" | "cargo" | "main" | "cli";

export default function DockerExportModal({
  packageData,
  isOpen,
  onClose,
}: DockerExportModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>("dockerfile");
  const [copied, setCopied] = useState(false);

  if (!isOpen || !packageData) return null;

  const getActiveCode = () => {
    switch (activeTab) {
      case "dockerfile":
        return packageData.dockerfile;
      case "cargo":
        return packageData.cargo_toml;
      case "main":
        return packageData.main_rs;
      case "cli":
        return `# Build the production Docker image (~15 MB distroless binary)\n${packageData.build_cmd}\n\n# Run the containerized data pipeline\n${packageData.run_cmd}`;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(6px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "var(--bg-panel, #171717)",
          border: "1px solid var(--border-subtle, rgba(255,255,255,0.1))",
          borderRadius: 12,
          width: "100%",
          maxWidth: 720,
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 16px 48px rgba(0,0,0,0.8)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 20px",
            background: "var(--bg-surface, #161616)",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <IconExport size={20} color="var(--accent-primary)" />
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)" }}>
                Export Docker Container
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Multi-stage build → 15 MB distroless image ({"< 20 MB"} RAM footprint)
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Tabs & Action */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {(["dockerfile", "cargo", "main", "cli"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  height: 36,
                  padding: "0 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: "none",
                  border: "none",
                  borderBottom:
                    activeTab === tab ? "2px solid var(--accent-primary)" : "2px solid transparent",
                  color: activeTab === tab ? "var(--accent-primary)" : "var(--text-muted)",
                  cursor: "pointer",
                }}
              >
                {tab === "dockerfile"
                  ? "Dockerfile"
                  : tab === "cargo"
                  ? "Cargo.toml"
                  : tab === "main"
                  ? "main.rs"
                  : "CLI Commands"}
              </button>
            ))}
          </div>

          <button
            className="btn-secondary"
            onClick={handleCopy}
            style={{ padding: "4px 12px", fontSize: 11 }}
          >
            {copied ? "✓ Copied!" : "Copy Code"}
          </button>
        </div>

        {/* Code Content */}
        <div style={{ flex: 1, padding: 16, overflow: "auto", background: "#0d0d0d" }}>
          <pre
            style={{
              margin: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: activeTab === "dockerfile" ? "#38bdf8" : activeTab === "cargo" ? "#f43f5e" : "#a78bfa",
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {getActiveCode()}
          </pre>
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: "10px 16px",
            background: "var(--bg-panel)",
            borderTop: "1px solid var(--border-subtle)",
            fontSize: 11,
            color: "var(--text-muted)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>💡 Place Dockerfile, Cargo.toml, and main.rs in the same directory to build.</span>
          <button
            className="btn-run"
            onClick={onClose}
            style={{ padding: "5px 16px", fontSize: 12 }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
