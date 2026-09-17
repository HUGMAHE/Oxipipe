import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfig, ColumnSchema } from "../types";
import type { FilterOp } from "../types";
import { IconInspect } from "../components/Icons";

export interface FilterData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  availableColumns: ColumnSchema[];
}

const OPS: { value: FilterOp; label: string }[] = [
  { value: "eq", label: "= equals" },
  { value: "ne", label: "≠ not equals" },
  { value: "gt", label: "> greater than" },
  { value: "lt", label: "< less than" },
  { value: "gte", label: "≥ greater or equal" },
  { value: "lte", label: "≤ less or equal" },
  { value: "contains", label: "⊃ contains" },
];

function FilterNode({ data, selected }: NodeProps<FilterData>) {
  const isConfigured =
    data.config.column && data.config.op && data.config.value;

  return (
    <div className={`rf-node node-transform ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} id="in" style={{ top: "50%" }} />
      <div className="rf-node-header transform">
        <span className="rf-node-title">Filter</span>
        <button
          className="btn-inspect"
          onClick={(e) => {
            e.stopPropagation();
            (data as any).onInspect?.("Filter");
          }}
          title="Instant Inspector (Data Profiling)"
        >
          <IconInspect size={12} />
        </button>
        <span className={`node-status ${isConfigured ? "ok" : "warn"}`} />
      </div>
      <div className="rf-node-body">
        <div className="node-field">
          <label className="node-label">Column</label>
          {data.availableColumns.length > 0 ? (
            <select
              className="node-select"
              value={data.config.column ?? ""}
              onChange={(e) =>
                data.onConfigChange({ ...data.config, column: e.target.value })
              }
            >
              <option value="">Select column…</option>
              {data.availableColumns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.data_type})
                </option>
              ))}
            </select>
          ) : (
            <input
              className="node-input"
              placeholder="Column name…"
              value={data.config.column ?? ""}
              onChange={(e) =>
                data.onConfigChange({ ...data.config, column: e.target.value })
              }
            />
          )}
        </div>

        <div className="node-field">
          <label className="node-label">Operator</label>
          <select
            className="node-select"
            value={data.config.op ?? ""}
            onChange={(e) =>
              data.onConfigChange({
                ...data.config,
                op: e.target.value as FilterOp,
              })
            }
          >
            <option value="">Select operator…</option>
            {OPS.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div className="node-field">
          <label className="node-label">Value</label>
          <input
            className="node-input"
            placeholder='e.g. 18, "France", …'
            value={data.config.value ?? ""}
            onChange={(e) =>
              data.onConfigChange({ ...data.config, value: e.target.value })
            }
          />
        </div>

        {isConfigured && (
          <div
            style={{
              fontSize: 10,
              color: "var(--accent-secondary)",
              fontFamily: "var(--font-mono)",
              background: "var(--bg-surface)",
              padding: "4px 6px",
              borderRadius: 4,
              border: "1px solid var(--border-subtle)",
            }}
          >
            WHERE "{data.config.column}"{" "}
            {OPS.find((o) => o.value === data.config.op)?.label.split(" ")[0]}{" "}
            {data.config.value}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ top: "50%" }} />
    </div>
  );
}

export default memo(FilterNode);
