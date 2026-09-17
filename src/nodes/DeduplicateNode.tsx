import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface DeduplicateData {}

function DeduplicateNode({ selected }: NodeProps<DeduplicateData>) {
  return (
    <div className={`rf-node node-transform ${selected ? "selected" : ""}`} style={{ minWidth: 180 }}>
      <Handle type="target" position={Position.Left} id="in" />

      <div className="rf-node-header transform">
        <span className="rf-node-title">Deduplicate</span>
        <span className="node-status ok" />
      </div>

      <div className="rf-node-body">
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
          Removes duplicate rows
        </p>
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

export default memo(DeduplicateNode);
