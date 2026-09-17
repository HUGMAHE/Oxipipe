import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type NodeTypes,
} from "reactflow";

import CsvSourceNode from "./nodes/CsvSourceNode";
import ParquetSourceNode from "./nodes/ParquetSourceNode";
import FilterNode from "./nodes/FilterNode";
import ProjectionNode from "./nodes/ProjectionNode";
import SortNode from "./nodes/SortNode";
import DeduplicateNode from "./nodes/DeduplicateNode";
import DropNullsNode from "./nodes/DropNullsNode";
import FillNullsNode from "./nodes/FillNullsNode";
import RenameColumnsNode from "./nodes/RenameColumnsNode";
import DerivedColumnNode from "./nodes/DerivedColumnNode";
import TopNNode from "./nodes/TopNNode";
import GroupByNode from "./nodes/GroupByNode";
import JoinNode from "./nodes/JoinNode";
import UnionNode from "./nodes/UnionNode";
import ParquetSinkNode from "./nodes/ParquetSinkNode";
import CsvSinkNode from "./nodes/CsvSinkNode";
import JsonSinkNode from "./nodes/JsonSinkNode";
import JsonSourceNode from "./nodes/JsonSourceNode";
import AvroSourceNode from "./nodes/AvroSourceNode";
import ExcelSourceNode from "./nodes/ExcelSourceNode";
import SqliteSourceNode from "./nodes/SqliteSourceNode";
import PerformanceWidget from "./components/PerformanceWidget";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getNodeIcon, IconOxipipeLogo, IconExport, IconDerived, IconSave, IconFolderOpen } from "./components/Icons";

import InspectorPanel from "./components/InspectorPanel";
import DockerExportModal from "./components/DockerExportModal";

import { useExecutePipeline } from "./hooks/usePipeline";
import type { ColumnSchema, PipelineDag, NodeProfileResponse, DockerExportPackage } from "./types";

import { invoke } from "@tauri-apps/api/core";

// ─────────────────────────────────────────────────────────────────────────────
// Node type registry
// ─────────────────────────────────────────────────────────────────────────────
const nodeTypes: NodeTypes = {
  csvSource: CsvSourceNode as any,
  parquetSource: ParquetSourceNode as any,
  jsonSource: JsonSourceNode as any,
  avroSource: AvroSourceNode as any,
  excelSource: ExcelSourceNode as any,
  sqliteSource: SqliteSourceNode as any,
  filter: FilterNode as any,
  projection: ProjectionNode as any,
  sort: SortNode as any,
  deduplicate: DeduplicateNode as any,
  dropNulls: DropNullsNode as any,
  fillNulls: FillNullsNode as any,
  renameColumns: RenameColumnsNode as any,
  derivedColumn: DerivedColumnNode as any,
  topN: TopNNode as any,
  groupBy: GroupByNode as any,
  join: JoinNode as any,
  union: UnionNode as any,
  parquetSink: ParquetSinkNode as any,
  csvSink: CsvSinkNode as any,
  jsonSink: JsonSinkNode as any,
};

// ─────────────────────────────────────────────────────────────────────────────
// Palette items
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = [
  // ── Sources ──────────────────────────────────────────────────────────────
  { type: "csvSource",     label: "CSV Source",      category: "source",    description: "Load a CSV file" },
  { type: "parquetSource", label: "Parquet Source",   category: "source",    description: "Load a .parquet file" },
  { type: "jsonSource",    label: "JSON Source",      category: "source",    description: "Load a .json/.ndjson file" },
  { type: "avroSource",    label: "Avro Source",      category: "source",    description: "Load an Apache Avro file" },
  { type: "excelSource",   label: "Excel Source",     category: "source",    description: "Load a .xlsx/.xls spreadsheet" },
  { type: "sqliteSource",  label: "SQLite Source",    category: "source",    description: "Query a SQLite database table" },
  // ── Clean ────────────────────────────────────────────────────────────────
  { type: "filter",        label: "Filter",           category: "clean",     description: "Filter rows by condition" },
  { type: "dropNulls",     label: "Drop Nulls",        category: "clean",     description: "Remove rows with null values" },
  { type: "fillNulls",     label: "Fill Nulls",        category: "clean",     description: "Replace null with a value" },
  { type: "deduplicate",   label: "Deduplicate",       category: "clean",     description: "Remove duplicate rows" },
  // ── Transform ─────────────────────────────────────────────────────────────
  { type: "projection",    label: "Select Columns",   category: "transform", description: "Keep specific columns" },
  { type: "sort",          label: "Sort",              category: "transform", description: "Sort rows by columns" },
  { type: "renameColumns", label: "Rename Columns",    category: "transform", description: "Rename column headers" },
  { type: "derivedColumn", label: "Derived Column",    category: "transform", description: "Create column from expression" },
  { type: "topN",          label: "Top N",             category: "transform", description: "Keep first N rows" },
  // ── Analyse ───────────────────────────────────────────────────────────────
  { type: "groupBy",       label: "Group By",          category: "analyse",   description: "Aggregate by groups" },
  { type: "join",          label: "Join",              category: "analyse",   description: "Merge two tables" },
  { type: "union",         label: "Union",             category: "analyse",   description: "Stack two tables" },
  // ── Export ────────────────────────────────────────────────────────────────
  { type: "parquetSink",   label: "Parquet Export",    category: "sink",      description: "Save as .parquet" },
  { type: "csvSink",       label: "CSV Export",        category: "sink",      description: "Save as .csv" },
  { type: "jsonSink",      label: "JSON Export",       category: "sink",      description: "Save as .json" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type ActiveTab = "preview" | "performance" | "sql";

let idCounter = 0;
const newId = () => `node-${Date.now()}-${++idCounter}`;
let draggedNodeType: string | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// App
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("preview");
  const [activeSchemaColumns, setActiveSchemaColumns] = useState<ColumnSchema[]>([]);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Data Profiling State
  const [inspectorProfile, setInspectorProfile] = useState<NodeProfileResponse | null>(null);
  const [inspectorTargetTitle, setInspectorTargetTitle] = useState<string>("");
  const [isProfilingLoading, setIsProfilingLoading] = useState(false);

  // Docker Export State
  const [isDockerModalOpen, setIsDockerModalOpen] = useState(false);
  const [dockerPackage, setDockerPackage] = useState<DockerExportPackage | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const { result, isRunning, error, run, clear } = useExecutePipeline();

  // Always keep refs up to date to prevent stale closures in node callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const buildDagFromCurrentState = useCallback((): PipelineDag => {
    return {
      nodes: nodesRef.current.map((n: any) => ({
        id: n.id,
        kind: n.type as any,
        config: n.data?.config ?? {},
      })),
      edges: edgesRef.current.map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        targetHandle: e.targetHandle ?? undefined,
      })),
    };
  }, []);



  // ── Node config updater ───────────────────────────────────────────────────
  const updateNodeConfig = useCallback(
    (nodeId: string, config: object) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } }
            : n
        )
      );
    },
    [setNodes]
  );

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<any>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
        )
      );
    },
    [setNodes]
  );

  // Inject schema into transform nodes when it changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.type === "filter" || n.type === "projection" || n.type === "groupBy" || n.type === "join") {
          return { ...n, data: { ...n.data, availableColumns: activeSchemaColumns } };
        }
        return n;
      })
    );
  }, [activeSchemaColumns, setNodes]);

  // ── Drag-and-drop: create node at drop position ──────────────────────────
  const createNodeAtPosition = useCallback(
    (nodeType: string, clientX: number, clientY: number) => {
      if (!reactFlowInstance) return;

      const position = reactFlowInstance.screenToFlowPosition({ x: clientX, y: clientY });
      const id = newId();

      const baseData = {
        config: {},
        onConfigChange: (cfg: object) => updateNodeConfig(id, cfg),
        onInspect: (title?: string) => handleInspectNode(id, title),
        availableColumns: activeSchemaColumns,
      };

      let extra: Record<string, any> = {};
      if (nodeType === "csvSource") {
        extra = {
          schema: null,
          onSchemaLoaded: (cols: ColumnSchema[]) => {
            setActiveSchemaColumns((prev) => {
              const newCols = [...prev];
              for (const col of cols) {
                if (!newCols.find(c => c.name === col.name)) newCols.push(col);
              }
              return newCols;
            });
            updateNodeData(id, { schema: cols });
          },
        };
      }

      const newNode: Node = { id, type: nodeType, position, data: { ...baseData, ...extra } };
      setNodes((nds) => [...nds, newNode]);
    },
    [reactFlowInstance, activeSchemaColumns, updateNodeConfig, updateNodeData, setNodes]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      let nodeType = draggedNodeType;
      try {
        const dtType = e.dataTransfer?.getData("application/reactflow") || e.dataTransfer?.getData("text/plain");
        if (dtType) nodeType = dtType;
      } catch {
        // Fallback to module variable
      }

      if (!nodeType || !reactFlowInstance) return;
      createNodeAtPosition(nodeType, e.clientX, e.clientY);
      draggedNodeType = null;
    },
    [reactFlowInstance, createNodeAtPosition]
  );

  // ── Create node on click (palette click fallback) ─────────────────────────
  const handleAddNodeClick = useCallback(
    (nodeType: string) => {
      createNodeAtPosition(
        nodeType,
        window.innerWidth / 2 + (Math.random() * 80 - 40),
        window.innerHeight / 2 + (Math.random() * 80 - 40)
      );
    },
    [createNodeAtPosition]
  );

  // ── Edge connection ──────────────────────────────────────────────────────
  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges]
  );

  // ── Build DAG and run ────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    const dag = buildDagFromCurrentState();
    await run(dag);
    setActiveTab("preview");
  }, [buildDagFromCurrentState, run]);

  // ── Export Code ──────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      const dag = buildDagFromCurrentState();
      const code = await invoke<string>("generate_code", { dag });
      setGeneratedCode(code);
    } catch (err: any) {
      alert(`Export failed: ${err}`);
    } finally {
      setIsExporting(false);
    }
  }, [buildDagFromCurrentState]);

  // ── Clear canvas ────────────────────────────────────────────────────────
  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setActiveSchemaColumns([]);
    clear();
  }, [setNodes, setEdges, clear]);

  // ── Instant Inspector Data Profiling ──────────────────────────────────
  const handleInspectNode = useCallback(
    async (nodeId: string, nodeTitle?: string) => {
      try {
        setIsProfilingLoading(true);
        setInspectorTargetTitle(nodeTitle || nodeId);
        setInspectorProfile(null);

        const dag = buildDagFromCurrentState();

        const res = await invoke<NodeProfileResponse>("profile_node", {
          dag,
          targetNodeId: nodeId,
        });
        setInspectorProfile(res);
      } catch (err: any) {
        alert(`Profiling failed: ${err}`);
      } finally {
        setIsProfilingLoading(false);
      }
    },
    [buildDagFromCurrentState]
  );

  // ── Docker Export ────────────────────────────────────────────────────────
  const handleDockerExport = useCallback(async () => {
    try {
      const dag = buildDagFromCurrentState();
      const res = await invoke<DockerExportPackage>("generate_docker_export", { dag });
      setDockerPackage(res);
      setIsDockerModalOpen(true);
    } catch (err: any) {
      alert(`Docker export failed: ${err}`);
    }
  }, [buildDagFromCurrentState]);

  // Project File Save/Load State
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [isFileMenuOpen, setIsFileMenuOpen] = useState<boolean>(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  // Close File dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as any)) {
        setIsFileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Notification State
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);

  // ── Save & Load Pipeline (.oxi) ──────────────────────────────────────────
  const handleSavePipeline = useCallback(async (forceSaveAs = false) => {
    if (nodesRef.current.length === 0) {
      alert("Pipeline is empty. Add some nodes before saving.");
      return;
    }
    try {
      let targetPath = currentFilePath;
      if (forceSaveAs || !targetPath) {
        const filePath = await save({
          filters: [{ name: "Oxipipe Pipeline (*.oxi)", extensions: ["oxi"] }],
          defaultPath: targetPath || "pipeline.oxi",
        });
        if (typeof filePath !== "string" || filePath.trim().length === 0) {
          return; // User cancelled
        }
        targetPath = filePath;
      }

      const payload = {
        version: "1.0",
        name: "Oxipipe Pipeline",
        savedAt: new Date().toISOString(),
        nodes: nodesRef.current,
        edges: edgesRef.current,
      };
      const content = JSON.stringify(payload, null, 2);
      await invoke("save_pipeline_file", { path: targetPath, content });
      setCurrentFilePath(targetPath);
      setIsFileMenuOpen(false);
      setNotificationMessage(`Saved ${targetPath.split(/[\\/]/).pop()}`);
      setTimeout(() => setNotificationMessage(null), 3000);
    } catch (err: any) {
      alert(`Failed to save pipeline: ${err}`);
    }
  }, [currentFilePath]);

  const handleLoadPipeline = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: "Oxipipe Pipeline (*.oxi)", extensions: ["oxi"] }],
      });
      if (typeof selected === "string" && selected.trim().length > 0) {
        const content = await invoke<string>("load_pipeline_file", { path: selected });
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          setCurrentFilePath(selected);
          setIsFileMenuOpen(false);
          setNotificationMessage(`Loaded ${selected.split(/[\\/]/).pop()}`);
          setTimeout(() => setNotificationMessage(null), 3000);
        } else {
          alert("Invalid .oxi file structure");
        }
      }
    } catch (err: any) {
      alert(`Failed to load pipeline: ${err}`);
    }
  }, [setNodes, setEdges]);

  const handleClearCanvas = useCallback(() => {
    handleClear();
    setCurrentFilePath(null);
    setIsFileMenuOpen(false);
  }, [handleClear]);

  // Keyboard shortcuts (Ctrl+S for Save, Ctrl+Shift+S for Save As, Ctrl+O for Load)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSavePipeline(e.shiftKey);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleLoadPipeline();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSavePipeline, handleLoadPipeline]);

  // ── Status ──────────────────────────────────────────────────────────────
  const statusDot = error ? "error" : isRunning ? "running" : result ? "success" : "idle";
  const statusText = error
    ? `Error: ${error.slice(0, 80)}`
    : isRunning
    ? "Executing pipeline…"
    : result
    ? `Done — ${result.total_rows.toLocaleString()} rows in ${result.execution_ms}ms`
    : "Ready";

  return (
    <div className="app-layout">
      {/* ── Top Bar ─────────────────────────────────────────────────── */}
      <header className="topbar">
        <div className="topbar-logo" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IconOxipipeLogo size={26} />
          
          {/* File Dropdown Menu */}
          <div className="file-menu-container" ref={fileMenuRef}>
            <button
              type="button"
              className={`btn-file-menu ${isFileMenuOpen ? "active" : ""}`}
              onClick={() => setIsFileMenuOpen((prev) => !prev)}
            >
              File
              <span style={{ fontSize: 9, opacity: 0.7, marginLeft: 2 }}>▼</span>
            </button>

            {isFileMenuOpen && (
              <div className="file-dropdown-menu">
                <button
                  type="button"
                  className="file-dropdown-item"
                  onClick={handleLoadPipeline}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <IconFolderOpen size={13} /> Open Project…
                  </span>
                  <span className="file-dropdown-shortcut">Ctrl+O</span>
                </button>

                <button
                  type="button"
                  className="file-dropdown-item"
                  onClick={() => handleSavePipeline(false)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <IconSave size={13} /> Save Project
                  </span>
                  <span className="file-dropdown-shortcut">Ctrl+S</span>
                </button>

                <button
                  type="button"
                  className="file-dropdown-item"
                  onClick={() => handleSavePipeline(true)}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <IconSave size={13} /> Save As…
                  </span>
                  <span className="file-dropdown-shortcut">Ctrl+Shift+S</span>
                </button>

                <div className="file-dropdown-divider" />

                <button
                  type="button"
                  className="file-dropdown-item danger"
                  onClick={handleClearCanvas}
                >
                  <span>Clear Canvas</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="topbar-actions">
          <button className="btn-secondary" onClick={handleExport} disabled={isExporting || nodes.length === 0}>
            {isExporting ? "Exporting..." : "Export Code"}
          </button>
          <button className="btn-secondary" onClick={handleDockerExport} disabled={nodes.length === 0} style={{ marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 6 }} title="Export Dockerfile & container config">
            <IconExport size={13} /> Docker Export
          </button>
          <button className="btn-run" onClick={handleRun} disabled={isRunning || nodes.length === 0} style={{ marginLeft: 8 }}>
            {isRunning ? <><span className="spinner" /> Running…</> : "▶ Run"}
          </button>
        </div>
      </header>

      {/* ── Main Area ───────────────────────────────────────────────── */}
      <div className="main-area">
        {/* ── Node Palette ──────────────────────────────────────────── */}
        <aside className="palette">
          <div className="palette-title">Sources</div>
          {PALETTE.filter((p) => p.category === "source").map((item) => (
            <div
              key={item.type}
              className="palette-item source"
              draggable
              onClick={() => handleAddNodeClick(item.type)}
              onDragStart={(e) => {
                draggedNodeType = item.type;
                e.dataTransfer.setData("application/reactflow", item.type);
                e.dataTransfer.setData("text/plain", item.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              title={item.description}
            >
              <div className="palette-item-icon source">
                {getNodeIcon(item.type)}
              </div>
              <div>
                <div className="palette-item-label">{item.label}</div>
              </div>
            </div>
          ))}

          <div className="palette-title" style={{ marginTop: 8 }}>Clean</div>
          {PALETTE.filter((p) => p.category === "clean").map((item) => (
            <div
              key={item.type}
              className="palette-item transform"
              draggable
              onClick={() => handleAddNodeClick(item.type)}
              onDragStart={(e) => {
                draggedNodeType = item.type;
                e.dataTransfer.setData("application/reactflow", item.type);
                e.dataTransfer.setData("text/plain", item.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              title={item.description}
            >
              <div className="palette-item-icon transform">
                {getNodeIcon(item.type)}
              </div>
              <div>
                <div className="palette-item-label">{item.label}</div>
              </div>
            </div>
          ))}

          <div className="palette-title" style={{ marginTop: 8 }}>Transform</div>
          {PALETTE.filter((p) => p.category === "transform").map((item) => (
            <div
              key={item.type}
              className="palette-item transform"
              draggable
              onClick={() => handleAddNodeClick(item.type)}
              onDragStart={(e) => {
                draggedNodeType = item.type;
                e.dataTransfer.setData("application/reactflow", item.type);
                e.dataTransfer.setData("text/plain", item.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              title={item.description}
            >
              <div className="palette-item-icon transform">
                {getNodeIcon(item.type)}
              </div>
              <div>
                <div className="palette-item-label">{item.label}</div>
              </div>
            </div>
          ))}

          <div className="palette-title" style={{ marginTop: 8 }}>Analyse</div>
          {PALETTE.filter((p) => p.category === "analyse").map((item) => (
            <div
              key={item.type}
              className="palette-item analyse"
              draggable
              onClick={() => handleAddNodeClick(item.type)}
              onDragStart={(e) => {
                draggedNodeType = item.type;
                e.dataTransfer.setData("application/reactflow", item.type);
                e.dataTransfer.setData("text/plain", item.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              title={item.description}
            >
              <div className="palette-item-icon analyse">
                {getNodeIcon(item.type)}
              </div>
              <div>
                <div className="palette-item-label">{item.label}</div>
              </div>
            </div>
          ))}

          <div className="palette-title" style={{ marginTop: 8 }}>Export</div>
          {PALETTE.filter((p) => p.category === "sink").map((item) => (
            <div
              key={item.type}
              className="palette-item sink"
              draggable
              onClick={() => handleAddNodeClick(item.type)}
              onDragStart={(e) => {
                draggedNodeType = item.type;
                e.dataTransfer.setData("application/reactflow", item.type);
                e.dataTransfer.setData("text/plain", item.type);
                e.dataTransfer.effectAllowed = "move";
              }}
              title={item.description}
            >
              <div className="palette-item-icon sink">
                {getNodeIcon(item.type)}
              </div>
              <div>
                <div className="palette-item-label">{item.label}</div>
              </div>
            </div>
          ))}



          {/* Quick start hint */}
          <div
            style={{
              marginTop: "auto",
              padding: "12px 8px",
              borderTop: "1px solid var(--border-subtle)",
              fontSize: 10,
              color: "var(--text-muted)",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "var(--text-secondary)" }}>Quick start:</strong>
            <br />1. Drag a Source node
            <br />2. Add Transform nodes
            <br />3. Connect & Run ▶
          </div>
        </aside>

        {/* ── Canvas + Bottom Panel ──────────────────────────────────── */}
        <div className="canvas-area">
          <ReactFlowProvider>
            <div
              className="canvas-container"
              ref={reactFlowWrapper}
              style={{ width: "100%", height: "100%" }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onInit={setReactFlowInstance}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                nodeTypes={nodeTypes}
                fitView
                snapToGrid
                snapGrid={[12, 12]}
                deleteKeyCode="Delete"
                proOptions={{ hideAttribution: true }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={28}
                  size={1.2}
                  color="rgba(255, 255, 255, 0.12)"
                />
                <Controls showInteractive={false} />
                <MiniMap
                  nodeColor={(n) => {
                    if (n.type === "csvSource" || n.type === "parquetSource" || n.type === "jsonSource" || n.type === "avroSource" || n.type === "excelSource" || n.type === "sqliteSource") return "#22d3a4";
                    if (n.type === "groupBy" || n.type === "join" || n.type === "union") return "#a78bfa";
                    if (n.type === "csvSink" || n.type === "parquetSink" || n.type === "jsonSink") return "#f59e0b";
                    return "#1F96F3";
                  }}
                  maskColor="rgba(8,8,8,0.75)"
                  style={{ background: "#171717", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 6 }}
                />

                {/* Empty state overlay */}
                {nodes.length === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      textAlign: "center",
                      pointerEvents: "none",
                      userSelect: "none",
                    }}
                  >
                    <div style={{ fontSize: 16, fontWeight: 500, color: "var(--text-muted)", opacity: 0.8 }}>
                      Click or drag nodes from the palette to start
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", opacity: 0.4, marginTop: 6 }}>
                      Build a pipeline by connecting data sources and transforms
                    </div>
                  </div>
                )}
              </ReactFlow>
            </div>
          </ReactFlowProvider>

          {/* ── Bottom Panel ──────────────────────────────────────────── */}
          <div className="bottom-panel">
            <div className="bottom-panel-tabs">
              {(["preview", "performance", "sql"] as ActiveTab[]).map((tab) => (
                <button
                  key={tab}
                  id={`tab-${tab}`}
                  className={`panel-tab ${activeTab === tab ? "active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === "preview" && result && (
                    <span className="panel-tab-badge">{result.preview_rows}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Preview Tab */}
            {activeTab === "preview" && (
              <div className="preview-wrap">
                {!result && !isRunning ? (
                  <div className="preview-empty">
                    <div className="preview-empty-text">No data yet</div>
                    <div className="preview-empty-sub">
                      Connect nodes and press Run Pipeline
                    </div>
                  </div>
                ) : isRunning ? (
                  <div className="preview-empty">
                    <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
                    <div className="preview-empty-text">Executing…</div>
                    <div className="preview-empty-sub">DataFusion is processing your pipeline</div>
                  </div>
                ) : result ? (
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        {result.columns.map((col) => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          {row.map((cell, j) => (
                            <td key={j}>{cell === null ? "null" : String(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            )}

            {/* Performance Tab */}
            {activeTab === "performance" && (
              <PerformanceWidget result={result} isRunning={isRunning} />
            )}

            {/* SQL Tab */}
            {activeTab === "sql" && (
              <div className="sql-panel">
                {result?.sql_generated ? (
                  <>
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 8, fontFamily: "var(--font-sans)" }}>
                      Generated SQL — executed by DataFusion
                    </div>
                    <pre className="sql-code">{result.sql_generated}</pre>
                  </>
                ) : (
                  <div className="preview-empty">
                    <IconDerived size={28} color="var(--text-muted)" />
                    <div className="preview-empty-text" style={{ marginTop: 8 }}>No SQL yet</div>
                    <div className="preview-empty-sub">Run the pipeline to see the generated SQL</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Status Bar ────────────────────────────────────────────── */}
          <div className="status-bar">
            <span className={`status-dot ${statusDot}`} />
            <span className="status-text">{statusText}</span>
            <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text-muted)" }}>
              {nodes.length} node{nodes.length !== 1 ? "s" : ""} · {edges.length} connection{edges.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* ── Notification Toast ────────────────────────────────────────── */}
      {notificationMessage && (
        <div
          style={{
            position: "fixed",
            bottom: 32,
            right: 32,
            background: "var(--bg-panel, #171717)",
            border: "1px solid var(--accent-primary)",
            borderRadius: 8,
            padding: "10px 16px",
            color: "var(--text-primary)",
            fontSize: 12,
            fontWeight: 600,
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 8,
            animation: "slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <IconSave size={14} color="var(--accent-primary)" />
          {notificationMessage}
        </div>
      )}

      {/* ── Error Toast ──────────────────────────────────────────────── */}
      {error && (
        <div className="error-toast" onClick={clear} style={{ cursor: "pointer" }}>
          <strong>⚠ Pipeline Error</strong>
          <br />
          {error}
          <br />
          <span style={{ fontSize: 10, opacity: 0.7 }}>Click to dismiss</span>
        </div>
      )}

      {/* ── Export Code Modal ───────────────────────────────────────── */}
      {generatedCode && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 40
        }}>
          <div style={{
            background: "var(--bg-surface)",
            width: "100%", maxWidth: 800, maxHeight: "100%",
            borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)",
            display: "flex", flexDirection: "column", overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <h3 style={{ margin: 0 }}>Generated Rust Code</h3>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(generatedCode)}>Copy</button>
                <button className="btn-secondary" onClick={() => setGeneratedCode(null)}>Close</button>
              </div>
            </div>
            <div style={{ padding: 20, overflow: "auto", background: "var(--bg-base)" }}>
              <pre style={{ margin: 0, fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-accent)" }}>
                <code>{generatedCode}</code>
              </pre>
            </div>
          </div>
        </div>
      )}
      {/* ── Instant Inspector Side Panel ──────────────────────────── */}
      <InspectorPanel
        profile={inspectorProfile}
        nodeTitle={inspectorTargetTitle}
        isLoading={isProfilingLoading}
        onClose={() => setInspectorProfile(null)}
      />

      {/* ── Docker Export Modal ────────────────────────────────────── */}
      <DockerExportModal
        packageData={dockerPackage}
        isOpen={isDockerModalOpen}
        onClose={() => setIsDockerModalOpen(false)}
      />
    </div>
  );
}
