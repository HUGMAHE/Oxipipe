import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfig, ColumnSchema, JoinType } from "../types";

export interface JoinData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  availableColumns: ColumnSchema[];
}

const JOIN_TYPES: { value: JoinType; label: string }[] = [
  { value: "inner", label: "Inner Join" },
  { value: "left", label: "Left Join" },
  { value: "right", label: "Right Join" },
  { value: "full", label: "Full Outer Join" },
];

function JoinNode({ data, selected }: NodeProps<JoinData>) {
  const isConfigured = data.config.join_type && data.config.left_column && data.config.right_column;

  return (
    <div className={`rf-node node-analyse ${selected ? "selected" : ""}`} style={{ minWidth: 220 }}>
      {/* Two input handles for Join */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="in_left" 
        style={{ top: "30%" }} 
      />
      <div style={{ position: "absolute", left: -60, top: "22%", fontSize: 10, color: "var(--text-muted)" }}>Left Input</div>
      
      <Handle 
        type="target" 
        position={Position.Left} 
        id="in_right" 
        style={{ top: "70%" }} 
      />
      <div style={{ position: "absolute", left: -66, top: "62%", fontSize: 10, color: "var(--text-muted)" }}>Right Input</div>

      <div className="rf-node-header analyse">
        <span className="rf-node-title">Join</span>
        <span className={`node-status ${isConfigured ? "ok" : "warn"}`} />
      </div>
      
      <div className="rf-node-body">
        <div className="node-field">
          <label className="node-label">Join Type</label>
          <select
            className="node-select"
            value={data.config.join_type ?? "inner"}
            onChange={(e) =>
              data.onConfigChange({ ...data.config, join_type: e.target.value as JoinType })
            }
          >
            <option value="" disabled>Select type…</option>
            {JOIN_TYPES.map((jt) => (
              <option key={jt.value} value={jt.value}>
                {jt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="node-field">
          <label className="node-label">Condition</label>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <select
              className="node-select"
              style={{ flex: 1, padding: "4px" }}
              value={data.config.left_column ?? ""}
              onChange={(e) =>
                data.onConfigChange({ ...data.config, left_column: e.target.value })
              }
            >
              <option value="">Left Col…</option>
              {data.availableColumns.map((c) => (
                <option key={`left-${c.name}`} value={c.name}>{c.name}</option>
              ))}
            </select>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>=</span>
            <select
              className="node-select"
              style={{ flex: 1, padding: "4px" }}
              value={data.config.right_column ?? ""}
              onChange={(e) =>
                data.onConfigChange({ ...data.config, right_column: e.target.value })
              }
            >
              <option value="">Right Col…</option>
              {data.availableColumns.map((c) => (
                <option key={`right-${c.name}`} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ top: "50%" }} />
    </div>
  );
}

export default memo(JoinNode);
