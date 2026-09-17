import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfig, ColumnRename, ColumnSchema } from "../types";

export interface RenameColumnsData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  availableColumns: ColumnSchema[];
}

function RenameColumnsNode({ data, selected }: NodeProps<RenameColumnsData>) {
  const renames: ColumnRename[] = data.config.renames ?? [];
  const isConfigured =
    renames.length > 0 && renames.every((r) => r.old_name && r.new_name);

  const update = (next: ColumnRename[]) =>
    data.onConfigChange({ ...data.config, renames: next });

  const addRow = () => update([...renames, { old_name: "", new_name: "" }]);

  const removeRow = (i: number) =>
    update(renames.filter((_, idx) => idx !== i));

  const setField = (i: number, field: keyof ColumnRename, val: string) =>
    update(renames.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));

  return (
    <div className={`rf-node node-transform ${selected ? "selected" : ""}`} style={{ minWidth: 240 }}>
      <Handle type="target" position={Position.Left} id="in" />

      <div className="rf-node-header transform">
        <span className="rf-node-title">Rename Columns</span>
        <span className={`node-status ${isConfigured ? "ok" : "warn"}`} />
      </div>

      <div className="rf-node-body">
        {renames.map((rename, i) => (
          <div
            key={i}
            className="node-field"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <select
              className="node-select"
              style={{ flex: 1 }}
              value={rename.old_name}
              onChange={(e) => setField(i, "old_name", e.target.value)}
            >
              <option value="">Old…</option>
              {data.availableColumns.map((col) => (
                <option key={col.name} value={col.name}>
                  {col.name}
                </option>
              ))}
            </select>

            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>→</span>

            <input
              className="node-input"
              style={{ flex: 1 }}
              type="text"
              placeholder="New name"
              value={rename.new_name}
              onChange={(e) => setField(i, "new_name", e.target.value)}
            />

            <button
              className="node-btn-ghost"
              title="Remove"
              style={{ padding: "2px 5px", color: "var(--danger, #e57373)" }}
              onClick={() => removeRow(i)}
            >
              ✕
            </button>
          </div>
        ))}

        {renames.length === 0 && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "0 0 6px" }}>
            No renames defined.
          </p>
        )}

        <button
          className="node-btn"
          style={{ width: "100%", marginTop: 4 }}
          onClick={addRow}
        >
          + Add rename
        </button>
      </div>

      <Handle type="source" position={Position.Right} id="out" />
    </div>
  );
}

export default memo(RenameColumnsNode);
