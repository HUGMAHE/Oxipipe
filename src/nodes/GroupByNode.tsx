import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfig, ColumnSchema, Aggregation, AggregateOp } from "../types";
import { IconInspect } from "../components/Icons";

export interface GroupByData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  availableColumns: ColumnSchema[];
}

const AGG_OPS: { value: AggregateOp; label: string }[] = [
  { value: "sum", label: "SUM" },
  { value: "avg", label: "AVG" },
  { value: "count", label: "COUNT" },
  { value: "min", label: "MIN" },
  { value: "max", label: "MAX" },
];

function GroupByNode({ data, selected }: NodeProps<GroupByData>) {
  const group_by_columns = data.config.group_by_columns ?? [];
  const aggregations = data.config.aggregations ?? [];

  const handleToggleGroupBy = (col: string) => {
    let newCols = [...group_by_columns];
    if (newCols.includes(col)) {
      newCols = newCols.filter((c) => c !== col);
    } else {
      newCols.push(col);
    }
    data.onConfigChange({ ...data.config, group_by_columns: newCols });
  };

  const handleAddAgg = () => {
    const newAggs = [...aggregations, { column: "", op: "sum" as AggregateOp }];
    data.onConfigChange({ ...data.config, aggregations: newAggs });
  };

  const handleRemoveAgg = (index: number) => {
    const newAggs = [...aggregations];
    newAggs.splice(index, 1);
    data.onConfigChange({ ...data.config, aggregations: newAggs });
  };

  const handleUpdateAgg = (index: number, updates: Partial<Aggregation>) => {
    const newAggs = [...aggregations];
    newAggs[index] = { ...newAggs[index], ...updates };
    data.onConfigChange({ ...data.config, aggregations: newAggs });
  };

  return (
    <div className={`rf-node node-analyse ${selected ? "selected" : ""}`}>
      <Handle type="target" position={Position.Left} id="in" style={{ top: "50%" }} />
      <div className="rf-node-header analyse">
        <span className="rf-node-title">Group By</span>
        <button
          className="btn-inspect"
          onClick={(e) => {
            e.stopPropagation();
            (data as any).onInspect?.("Group By");
          }}
          title="Instant Inspector (Data Profiling)"
        >
          <IconInspect size={12} />
        </button>
        <span className={`node-status ${group_by_columns.length > 0 ? "ok" : "warn"}`} />
      </div>
      
      <div className="rf-node-body">
        {/* Group By Selection */}
        <div className="node-field">
          <label className="node-label">Group By Columns</label>
          {data.availableColumns.length > 0 ? (
            <div style={{ maxHeight: 120, overflowY: "auto", border: "1px solid var(--border-subtle)", borderRadius: 4, padding: 4 }}>
              {data.availableColumns.map((c) => (
                <label key={c.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, padding: "2px 0" }}>
                  <input
                    type="checkbox"
                    checked={group_by_columns.includes(c.name)}
                    onChange={() => handleToggleGroupBy(c.name)}
                  />
                  <span>{c.name}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 9 }}>({c.data_type})</span>
                </label>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 10, color: "var(--text-muted)", fontStyle: "italic" }}>
              Connect a source to see columns
            </div>
          )}
        </div>

        {/* Aggregations */}
        <div className="node-field">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label className="node-label">Aggregations</label>
            <button className="btn-secondary" onClick={handleAddAgg} style={{ fontSize: 10, padding: "2px 6px" }}>+ Add</button>
          </div>
          
          {aggregations.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
              {aggregations.map((agg, idx) => (
                <div key={idx} style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <select
                    className="node-select"
                    style={{ flex: 1, padding: "4px" }}
                    value={agg.column}
                    onChange={(e) => handleUpdateAgg(idx, { column: e.target.value })}
                  >
                    <option value="">Col…</option>
                    {data.availableColumns.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    className="node-select"
                    style={{ width: 60, padding: "4px" }}
                    value={agg.op}
                    onChange={(e) => handleUpdateAgg(idx, { op: e.target.value as AggregateOp })}
                  >
                    {AGG_OPS.map((op) => (
                      <option key={op.value} value={op.value}>{op.label}</option>
                    ))}
                  </select>
                  <button 
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-danger)", padding: "0 4px" }}
                    onClick={() => handleRemoveAgg(idx)}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="out" style={{ top: "50%" }} />
    </div>
  );
}

export default memo(GroupByNode);
