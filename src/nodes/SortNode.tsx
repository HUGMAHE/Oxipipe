import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfig, ColumnSchema, SortColumn } from "../types";

export interface SortData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  availableColumns: ColumnSchema[];
}

function SortNode({ data, selected }: NodeProps<SortData>) {
  const criteria: SortColumn[] = data.config.sort_columns ?? [];
  const isConfigured = criteria.length > 0 && criteria.every((c) => c.column);

  const update = (updated: SortColumn[]) =>
    data.onConfigChange({ ...data.config, sort_columns: updated });

  const addCriterion = () =>
    update([...criteria, { column: "", descending: false }]);

  const removeCriterion = (i: number) =>
    update(criteria.filter((_, idx) => idx !== i));

  const setCriterionColumn = (i: number, column: string) =>
    update(criteria.map((c, idx) => (idx === i ? { ...c, column } : c)));

  const toggleDirection = (i: number) =>
    update(
      criteria.map((c, idx) =>
        idx === i ? { ...c, descending: !c.descending } : c
      )
    );

  return (
    <div className={`rf-node node-transform ${selected ? "selected" : ""}`} style={{ minWidth: 220 }}>
      <Handle type="target" position={Position.Left} id="in" />

      <div className="rf-node-header transform">
        <span className="rf-node-title">Sort</span>
        <span className={`node-status ${isConfigured ? "ok" : "warn"}`} />
      </div>

      <div className="rf-node-body">
        {criteria.map((criterion, i) => (
          <div
            key={i}
            className="node-field"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <select
              className="node-select"
              style={{ flex: 1 }}
              value={criterion.column}
              onChange={(e) => setCriterionColumn(i, e.target.value)}
            >
              <option value="">Column…</option>
              {data.availableColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>

            <button
              className="node-btn-ghost"
              title={criterion.descending ? "Descending" : "Ascending"}
              style={{ padding: "2px 6px", fontSize: 11, whiteSpace: "nowrap" }}
              onClick={() => toggleDirection(i)}
            >
              {criterion.descending ? "DESC" : "ASC"}
            </button>

            <button
              className="node-btn-ghost"
              title="Remove"
              style={{ padding: "2px 5px", color: "var(--danger, #e57373)" }}
              onClick={() => removeCriterion(i)}
            >
              ✕
            </button>
          </div>
        ))}

        {criteria.length === 0 && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px" }}>
            No sort criteria added.
          </p>
        )}

        <button
          className="node-btn"
          style={{ width: "100%", marginTop: 4 }}
          onClick={addCriterion}
        >
          + Add criterion
        </button>
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

export default memo(SortNode);
