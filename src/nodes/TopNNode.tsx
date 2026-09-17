import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfig, ColumnSchema } from "../types";

export interface TopNData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  availableColumns: ColumnSchema[];
}

function TopNNode({ data, selected }: NodeProps<TopNData>) {
  const limitN = data.config.limit_n ?? 10;
  const isConfigured = limitN > 0;

  // Reuse sort_columns[0] for the optional sort column on TopN
  const sortCol = data.config.sort_columns?.[0]?.column ?? "";
  const descending = data.config.sort_columns?.[0]?.descending ?? false;

  const setSortCol = (column: string) => {
    const sc = column ? [{ column, descending }] : [];
    data.onConfigChange({ ...data.config, sort_columns: sc });
  };

  const toggleDir = () => {
    if (!sortCol) return;
    data.onConfigChange({
      ...data.config,
      sort_columns: [{ column: sortCol, descending: !descending }],
    });
  };

  return (
    <div className={`rf-node node-transform ${selected ? "selected" : ""}`} style={{ minWidth: 210 }}>
      <Handle type="target" position={Position.Left} id="in" />

      <div className="rf-node-header transform">
        <span className="rf-node-title">Top N</span>
        <span className={`node-status ${isConfigured ? "ok" : "warn"}`} />
      </div>

      <div className="rf-node-body">
        <div className="node-field">
          <label className="node-label">Limit (N rows)</label>
          <input
            className="node-input"
            type="number"
            min={1}
            value={limitN}
            onChange={(e) =>
              data.onConfigChange({
                ...data.config,
                limit_n: parseInt(e.target.value, 10) || 10,
              })
            }
          />
        </div>

        <div className="node-field">
          <label className="node-label">Sort by (optional)</label>
          <div style={{ display: "flex", gap: 4 }}>
            <select
              className="node-select"
              style={{ flex: 1 }}
              value={sortCol}
              onChange={(e) => setSortCol(e.target.value)}
            >
              <option value="">None</option>
              {data.availableColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>

            {sortCol && (
              <button
                className="node-btn-ghost"
                style={{ padding: "2px 6px", fontSize: 11, whiteSpace: "nowrap" }}
                onClick={toggleDir}
              >
                {descending ? "DESC" : "ASC"}
              </button>
            )}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

export default memo(TopNNode);
