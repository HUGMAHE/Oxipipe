import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfig, ColumnSchema } from "../types";

export interface DerivedColumnData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  availableColumns: ColumnSchema[];
}

function DerivedColumnNode({ data, selected }: NodeProps<DerivedColumnData>) {
  const isConfigured = !!(data.config.new_column_name && data.config.expression);

  return (
    <div className={`rf-node node-transform ${selected ? "selected" : ""}`} style={{ minWidth: 220 }}>
      <Handle type="target" position={Position.Left} id="in" />

      <div className="rf-node-header transform">
        <span className="rf-node-title">Derived Column</span>
        <span className={`node-status ${isConfigured ? "ok" : "warn"}`} />
      </div>

      <div className="rf-node-body">
        <div className="node-field">
          <label className="node-label">New column name</label>
          <input
            className="node-input"
            type="text"
            placeholder="e.g. total"
            value={data.config.new_column_name ?? ""}
            onChange={(e) =>
              data.onConfigChange({ ...data.config, new_column_name: e.target.value })
            }
          />
        </div>

        <div className="node-field">
          <label className="node-label">Expression</label>
          <input
            className="node-input"
            type="text"
            placeholder="price * qty"
            value={data.config.expression ?? ""}
            onChange={(e) =>
              data.onConfigChange({ ...data.config, expression: e.target.value })
            }
          />
        </div>

        {data.availableColumns.length > 0 && (
          <div className="node-field">
            <label className="node-label" style={{ fontSize: 10 }}>
              Available:{" "}
              <span style={{ color: "var(--text-muted)" }}>
                {data.availableColumns.map((c) => c.name).join(", ")}
              </span>
            </label>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

export default memo(DerivedColumnNode);
