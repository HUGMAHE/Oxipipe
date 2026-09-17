import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UnionData {}

function UnionNode({ selected }: NodeProps<UnionData>) {
  return (
    <div className={`rf-node node-analyse ${selected ? "selected" : ""}`} style={{ minWidth: 180 }}>
      {/* Input A handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="in_a"
        style={{ top: "30%" }}
      />
      <div
        style={{
          position: "absolute",
          left: -54,
          top: "calc(30% - 8px)",
          fontSize: 10,
          color: "var(--text-muted)",
        }}
      >
        Input A
      </div>

      {/* Input B handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="in_b"
        style={{ top: "70%" }}
      />
      <div
        style={{
          position: "absolute",
          left: -54,
          top: "calc(70% - 8px)",
          fontSize: 10,
          color: "var(--text-muted)",
        }}
      >
        Input B
      </div>

      <div className="rf-node-header analyse">
        <span className="rf-node-title">Union</span>
        <span className="node-status ok" />
      </div>

      <div className="rf-node-body">
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
          Stacks rows from A and B
        </p>
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

export default memo(UnionNode);
