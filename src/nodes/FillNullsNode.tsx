import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfig, ColumnSchema } from "../types";

export interface FillNullsData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  availableColumns: ColumnSchema[];
}

function FillNullsNode({ data, selected }: NodeProps<FillNullsData>) {
  const isConfigured = !!(data.config.fill_column && data.config.fill_value !== undefined && data.config.fill_value !== "");

  return (
    <div className={`rf-node node-transform ${selected ? "selected" : ""}`} style={{ minWidth: 210 }}>
      <Handle type="target" position={Position.Left} id="in" />

      <div className="rf-node-header transform">
        <span className="rf-node-title">Fill Nulls</span>
        <span className={`node-status ${isConfigured ? "ok" : "warn"}`} />
      </div>

      <div className="rf-node-body">
        <div className="node-field">
          <label className="node-label">Column</label>
          <select
            className="node-select"
            value={data.config.fill_column ?? ""}
            onChange={(e) =>
              data.onConfigChange({ ...data.config, fill_column: e.target.value })
            }
          >
            <option value="">Select column…</option>
            {data.availableColumns.map((col) => (
              <option key={col.name} value={col.name}>
                {col.name}
              </option>
            ))}
          </select>
        </div>

        <div className="node-field">
          <label className="node-label">Fill value</label>
          <input
            className="node-input"
            type="text"
            placeholder="e.g. 0 or N/A"
            value={data.config.fill_value ?? ""}
            onChange={(e) =>
              data.onConfigChange({ ...data.config, fill_value: e.target.value })
            }
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

export default memo(FillNullsNode);
