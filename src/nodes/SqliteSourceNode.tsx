import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { open } from "@tauri-apps/plugin-dialog";
import type { NodeConfig } from "../types";

export interface SqliteSourceData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
}

function SqliteSourceNode({ data, selected }: NodeProps<SqliteSourceData>) {
  const isConfigured = !!(data.config.path && data.config.table_name);
  const [tableInput, setTableInput] = useState(data.config.table_name ?? "");

  const handleBrowse = useCallback(async () => {
    const file = await open({
      multiple: false,
      filters: [{ name: "SQLite", extensions: ["db", "sqlite", "sqlite3", "s3db"] }],
    });
    if (typeof file === "string") {
      data.onConfigChange({ ...data.config, path: file });
    }
  }, [data]);

  const handleTableBlur = () => {
    data.onConfigChange({ ...data.config, table_name: tableInput || undefined });
  };

  const filename = data.config.path
    ? data.config.path.split(/[\\/]/).pop() ?? data.config.path
    : null;

  return (
    <div className={`rf-node node-source ${selected ? "selected" : ""}`} style={{ minWidth: 220 }}>
      <div className="rf-node-header source">
        <span className="rf-node-title">SQLite Source</span>
        <span className={`node-status ${isConfigured ? "ok" : "empty"}`} />
      </div>

      <div className="rf-node-body">
        <div className="node-field">
          <label className="node-label">File Path</label>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              className="node-input"
              placeholder="Select a SQLite .db file…"
              value={data.config.path ?? ""}
              onChange={(e) =>
                data.onConfigChange({ ...data.config, path: e.target.value })
              }
              style={{ flex: 1 }}
            />
            <button
              className="btn-secondary"
              onClick={handleBrowse}
              title="Browse"
              style={{ padding: "6px 8px", minWidth: 30 }}
            >
              …
            </button>
          </div>
        </div>

        {filename && (
          <div style={{ fontSize: 10, color: "var(--accent-source)", marginTop: 4 }}>
            ✓ {filename}
          </div>
        )}

        <div className="node-field" style={{ marginTop: 6 }}>
          <label className="node-label">Table Name</label>
          <input
            className="node-input"
            type="text"
            placeholder="e.g. users, orders…"
            value={tableInput}
            onChange={(e) => setTableInput(e.target.value)}
            onBlur={handleTableBlur}
          />
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="out" style={{ top: "50%" }} />
    </div>
  );
}

export default memo(SqliteSourceNode);
