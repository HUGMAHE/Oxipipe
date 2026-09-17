import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfig, ColumnSchema } from "../types";

export interface DropNullsData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  availableColumns: ColumnSchema[];
}

function DropNullsNode({ data, selected }: NodeProps<DropNullsData>) {
  const selected_cols: string[] = data.config.drop_nulls_columns ?? [];

  const toggle = (colName: string) => {
    const next = selected_cols.includes(colName)
      ? selected_cols.filter((c) => c !== colName)
      : [...selected_cols, colName];
    data.onConfigChange({ ...data.config, drop_nulls_columns: next });
  };

  const clearAll = () =>
    data.onConfigChange({ ...data.config, drop_nulls_columns: [] });

  return (
    <div className={`rf-node node-transform ${selected ? "selected" : ""}`} style={{ minWidth: 210 }}>
      <Handle type="target" position={Position.Left} id="in" />

      <div className="rf-node-header transform">
        <span className="rf-node-title">Drop Nulls</span>
        <span className="node-status ok" />
      </div>

      <div className="rf-node-body">
        <div className="node-field">
          <label className="node-label">
            Scope:{" "}
            <span style={{ fontWeight: 600 }}>
              {selected_cols.length === 0 ? "All columns" : selected_cols.join(", ")}
            </span>
          </label>
        </div>

        {data.availableColumns.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              maxHeight: 96,
              overflowY: "auto",
            }}
          >
            {data.availableColumns.map((col) => {
              const active = selected_cols.includes(col.name);
              return (
                <button
                  key={col.name}
                  className={`node-tag ${active ? "active" : ""}`}
                  onClick={() => toggle(col.name)}
                  style={{
                    padding: "2px 7px",
                    fontSize: 11,
                    borderRadius: 4,
                    border: "1px solid var(--border)",
                    background: active ? "var(--accent, #374151)" : "transparent",
                    color: active ? "#fff" : "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  {col.name}
                </button>
              );
            })}
          </div>
        )}

        {selected_cols.length > 0 && (
          <button
            className="node-btn-ghost"
            style={{ marginTop: 6, fontSize: 10 }}
            onClick={clearAll}
          >
            Clear (use all columns)
          </button>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

export default memo(DropNullsNode);
