import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { save } from "@tauri-apps/plugin-dialog";
import type { NodeConfig } from "../types";

export interface CsvSinkData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
}

function CsvSinkNode({ data, selected }: NodeProps<CsvSinkData>) {
  const isConfigured = !!data.config.path;

  const handleBrowse = useCallback(async () => {
    const file = await save({
      filters: [{ name: "CSV Files", extensions: ["csv"] }],
      defaultPath: "output.csv",
    });
    if (typeof file === "string") {
      data.onConfigChange({ ...data.config, path: file });
    }
  }, [data]);

  const filename = data.config.path
    ? data.config.path.split(/[\\/]/).pop() ?? data.config.path
    : null;

  return (
    <div className={`rf-node node-sink ${selected ? "selected" : ""}`} style={{ minWidth: 220 }}>
      <Handle type="target" position={Position.Left} id="in" style={{ top: "50%" }} />

      <div className="rf-node-header sink">
        <span className="rf-node-title">CSV Export</span>
        <span className={`node-status ${isConfigured ? "ok" : "empty"}`} />
      </div>

      <div className="rf-node-body">
        <div className="node-field">
          <label className="node-label">Output File Path</label>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              className="node-input"
              placeholder="e.g. C:/data/output.csv"
              value={data.config.path ?? ""}
              onChange={(e) =>
                data.onConfigChange({ ...data.config, path: e.target.value })
              }
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowse();
              }}
              title="Save as…"
              style={{ padding: "6px 8px", minWidth: 30 }}
            >
              …
            </button>
          </div>
        </div>

        {filename && (
          <div style={{ fontSize: 10, color: "var(--accent-sink)", marginTop: 4 }}>
            ✓ {filename}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(CsvSinkNode);
