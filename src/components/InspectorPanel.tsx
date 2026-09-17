import { useState } from "react";
import type { NodeProfileResponse } from "../types";
import { IconInspect } from "./Icons";

interface InspectorPanelProps {
  profile: NodeProfileResponse | null;
  nodeTitle?: string;
  isLoading: boolean;
  onClose: () => void;
}

export default function InspectorPanel({
  profile,
  nodeTitle,
  isLoading,
  onClose,
}: InspectorPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  if (!profile && !isLoading) return null;

  const filteredColumns = profile
    ? profile.columns.filter((c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div
      style={{
        position: "fixed",
        top: 48,
        right: 0,
        bottom: 24,
        width: 360,
        background: "var(--bg-panel, #171717)",
        borderLeft: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.6)",
        zIndex: 900,
        display: "flex",
        flexDirection: "column",
        animation: "slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* ── Panel Header ─────────────────────────────────────────── */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-surface, #161616)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconInspect size={16} color="var(--accent-primary)" />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>
              Instant Inspector
            </div>
            <div style={{ fontSize: 11, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
              {nodeTitle || profile?.node_id || "Node"}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            fontSize: 16,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 4,
          }}
          title="Close Inspector"
        >
          ✕
        </button>
      </div>

      {isLoading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            color: "var(--text-muted)",
          }}
        >
          <div className="spinner" style={{ width: 28, height: 28, borderWidth: 3 }} />
          <div style={{ fontSize: 12 }}>Profiling columns & statistics…</div>
        </div>
      ) : profile ? (
        <>
          {/* ── Summary Bar ────────────────────────────────────── */}
          <div
            style={{
              padding: "10px 16px",
              background: "rgba(224, 105, 39, 0.06)",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-around",
              fontSize: 11,
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)" }}>Rows: </span>
              <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {profile.total_rows.toLocaleString()}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Cols: </span>
              <strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                {profile.total_columns}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Time: </span>
              <strong style={{ color: "var(--accent-source)", fontFamily: "var(--font-mono)" }}>
                {profile.profiling_time_ms}ms
              </strong>
            </div>
          </div>

          {/* ── Search Filter ──────────────────────────────────── */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-subtle)" }}>
            <input
              className="node-input"
              placeholder="Search column…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: "100%", fontSize: 11 }}
            />
          </div>

          {/* ── Column Profiles List ───────────────────────────── */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {filteredColumns.map((col) => {
              const nullColor =
                col.null_percentage === 0
                  ? "#22d3a4"
                  : col.null_percentage < 20
                  ? "#f59e0b"
                  : "#ef4444";

              return (
                <div
                  key={col.name}
                  style={{
                    background: "var(--bg-card, #1e1e1e)",
                    border: "1px solid var(--border-subtle, rgba(255,255,255,0.08))",
                    borderRadius: 8,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {/* Col header */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 12,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-primary)",
                      }}
                    >
                      {col.name}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        background: "rgba(255,255,255,0.06)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {col.data_type}
                    </span>
                  </div>

                  {/* NULL progress bar */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 10,
                        marginBottom: 3,
                      }}
                    >
                      <span style={{ color: "var(--text-muted)" }}>Missing (NULL)</span>
                      <span style={{ color: nullColor, fontWeight: 600 }}>
                        {col.null_percentage.toFixed(1)}% ({col.null_count})
                      </span>
                    </div>
                    <div
                      style={{
                        height: 4,
                        width: "100%",
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 2,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, col.null_percentage)}%`,
                          background: nullColor,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  </div>

                  {/* Distinct count & Min/Max */}
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      fontSize: 10,
                      marginTop: 2,
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(31, 150, 243, 0.1)",
                        color: "var(--accent-primary)",
                        padding: "2px 6px",
                        borderRadius: 4,
                      }}
                    >
                      Unique: {col.distinct_count.toLocaleString()}
                    </div>

                    {col.min_value !== undefined && (
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "var(--text-secondary)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        Min: {col.min_value.slice(0, 15)}
                      </div>
                    )}

                    {col.max_value !== undefined && (
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.05)",
                          color: "var(--text-secondary)",
                          padding: "2px 6px",
                          borderRadius: 4,
                        }}
                      >
                        Max: {col.max_value.slice(0, 15)}
                      </div>
                    )}
                  </div>

                  {/* Sample values */}
                  {col.sample_values.length > 0 && (
                    <div style={{ marginTop: 2 }}>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginBottom: 2 }}>
                        Samples:
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {col.sample_values.map((v, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 9,
                              fontFamily: "var(--font-mono)",
                              background: "rgba(0, 0, 0, 0.4)",
                              color: "#a0a0a0",
                              padding: "1px 5px",
                              borderRadius: 3,
                              border: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            {v.length > 20 ? `${v.slice(0, 20)}…` : v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
