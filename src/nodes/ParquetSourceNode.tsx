import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { open } from "@tauri-apps/plugin-dialog";
import type { NodeConfig } from "../types";

export interface ParquetSourceData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
}

function ParquetSourceNode({ data, selected }: NodeProps<ParquetSourceData>) {
  const isConfigured = !!data.config.path;

  const handleBrowse = useCallback(async () => {
    const file = await open({
      multiple: false,
      filters: [{ name: "Parquet", extensions: ["parquet"] }],
    });
    if (typeof file === "string") {
      data.onConfigChange({ ...data.config, path: file });
    }
  }, [data]);

  const filename = data.config.path
    ? data.config.path.split(/[\\/]/).pop() ?? data.config.path
    : null;

  return (
    <div className={`rf-node node-source ${selected ? "selected" : ""}`} style={{ minWidth: 220 }}>
      <div className="rf-node-header source">
        <span className="rf-node-title">Parquet Source</span>
        <span className={`node-status ${isConfigured ? "ok" : "empty"}`} />
      </div>

      <div className="rf-node-body">
        <div className="node-field">
          <label className="node-label">File Path</label>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              className="node-input"
              placeholder="Select a Parquet file…"
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
      </div>

      <Handle type="source" position={Position.Right} id="out" style={{ top: "50%" }} />
    </div>
  );
}

export default memo(ParquetSourceNode);
