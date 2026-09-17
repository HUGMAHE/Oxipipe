import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfig, ColumnSchema } from "../types";

export interface ProjectionData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  availableColumns: ColumnSchema[];
}

function ProjectionNode({ data, selected }: NodeProps<ProjectionData>) {
  const selected_cols = data.config.columns ?? [];
  const isConfigured = selected_cols.length > 0;
  const allSelected =
    data.availableColumns.length > 0 &&
    selected_cols.length === data.availableColumns.length;

  const toggle = (colName: string) => {
    const next = selected_cols.includes(colName)
      ? selected_cols.filter((c) => c !== colName)
      : [...selected_cols, colName];
    data.onConfigChange({ ...data.config, columns: next });
  };

  const toggleAll = () => {
    if (allSelected) {
      data.onConfigChange({ ...data.config, columns: [] });
    } else {
      data.onConfigChange({
        ...data.config,
        columns: data.availableColumns.map((c) => c.name),
      });
    }
  };

  return (
    <div className={`rf-node node-transform ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} id="in" style={{ top: "50%" }} />
      <div className="rf-node-header transform">
        <span className="rf-node-title">Column Select</span>
        <span className={`node-status ${isConfigured ? "ok" : "warn"}`} />
      </div>
      <div className="rf-node-body">
        {data.availableColumns.length === 0 ? (
          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
            Connect a CSV source first
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label className="node-label">Columns ({selected_cols.length}/{data.availableColumns.length})</label>
              <button
                onClick={toggleAll}
                style={{
                  fontSize: 9,
                  color: "var(--accent-primary)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                  padding: 0,
                }}
              >
                {allSelected ? "None" : "All"}
              </button>
            </div>
            <div className="col-checkbox-list">
              {data.availableColumns.map((col) => (
                <label key={col.name} className="col-checkbox-item">
                  <input
                    type="checkbox"
                    checked={selected_cols.includes(col.name)}
                    onChange={() => toggle(col.name)}
                  />
                  <span className="col-checkbox-label">{col.name}</span>
                  <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--text-muted)" }}>
                    {col.data_type}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ top: "50%" }} />
    </div>
  );
}

export default memo(ProjectionNode);
