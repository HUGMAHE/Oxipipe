import { memo, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { open } from "@tauri-apps/plugin-dialog";
import { useInspectSchema } from "../hooks/usePipeline";
import type { NodeConfig, ColumnSchema } from "../types";
import { IconInspect } from "../components/Icons";

export interface CsvSourceData {
  config: NodeConfig;
  onConfigChange: (config: NodeConfig) => void;
  schema: ColumnSchema[] | null;
  onSchemaLoaded: (cols: ColumnSchema[]) => void;
}

function CsvSourceNode({ data, selected }: NodeProps<CsvSourceData>) {
  const { inspect, isLoading } = useInspectSchema();

  const handleBrowse = useCallback(async () => {
    const selected_path = await open({
      multiple: false,
      filters: [{ name: "CSV Files", extensions: ["csv", "tsv"] }],
    });
    if (typeof selected_path === "string") {
      data.onConfigChange({ ...data.config, path: selected_path });
      const schema = await inspect(selected_path);
      if (schema) data.onSchemaLoaded(schema.columns);
    }
  }, [data, inspect]);

  const filename = data.config.path
    ? data.config.path.split(/[\\/]/).pop()
    : null;

  return (
    <div className={`rf-node node-source ${selected ? "selected" : ""}`}>
      <div className="rf-node-header source">
        <span className="rf-node-title">CSV Source</span>
        <button
          className="btn-inspect"
          onClick={(e) => {
            e.stopPropagation();
            (data as any).onInspect?.("CSV Source");
          }}
          title="Instant Inspector (Data Profiling)"
        >
          <IconInspect size={12} />
        </button>
        <span className={`node-status ${data.config.path ? "ok" : "empty"}`} />
      </div>
      <div className="rf-node-body">
        <div className="node-field">
          <label className="node-label">File Path</label>
          <div style={{ display: "flex", gap: 4 }}>
            <input
              className="node-input"
              placeholder="Select a CSV file…"
              value={data.config.path ?? ""}
              onChange={(e) =>
                data.onConfigChange({ ...data.config, path: e.target.value })
              }
              style={{ flex: 1 }}
            />
            <button
              className="btn-secondary"
              onClick={handleBrowse}
              disabled={isLoading}
              title="Browse"
              style={{ padding: "6px 8px", minWidth: 30 }}
            >
              {isLoading ? <span className="spinner" /> : "…"}
            </button>
          </div>
        </div>
        {filename && (
          <div style={{ fontSize: 10, color: "var(--accent-success)" }}>
            ✓ {filename}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        style={{ top: "50%" }}
      />
    </div>
  );
}

export default memo(CsvSourceNode);
