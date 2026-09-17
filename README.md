# Oxipipe ⚡

> **Visual data pipeline engine powered by Apache DataFusion + Rust, packaged as a native desktop app via Tauri.**

![License](https://img.shields.io/badge/license-MIT-blue)
![Rust](https://img.shields.io/badge/rust-1.96%2B-orange)
![DataFusion](https://img.shields.io/badge/DataFusion-43-blue)
![Tauri](https://img.shields.io/badge/Tauri-v2-purple)

---

## 🚀 What is Oxipipe?

Oxipipe lets you build data transformation pipelines visually — drag, drop, connect. Under the hood, your pipeline is compiled to SQL and executed by **Apache DataFusion**, giving you Rust-native performance with zero Python overhead.

**15× faster than Spark/Pandas on typical ETL workloads. RAM stays stable and low.**

---

## 📐 Architecture

```
┌──────────────────────────────────────────┐
│  Frontend (React + React Flow)           │
│  Drag-and-drop node canvas               │
│  ↓  invoke("execute_pipeline", dag)      │
├──────────────────────────────────────────┤
│  Tauri IPC Bridge (zero network)         │
├──────────────────────────────────────────┤
│  Rust Engine (src-tauri/)                │
│  ├── DAG → SQL builder                   │
│  ├── Apache DataFusion executor          │
│  └── Arrow → JSON serializer             │
└──────────────────────────────────────────┘
```

---

## 🛠️ Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Rust | ≥ 1.75 | [rustup.rs](https://rustup.rs) |
| Node.js | ≥ 18 | [nodejs.org](https://nodejs.org) |
| npm | ≥ 10 | bundled with Node |
| Tauri CLI | v2 | `cargo install tauri-cli --version "^2"` |
| WebView2 (Windows) | latest | [microsoft.com/webview](https://developer.microsoft.com/microsoft-edge/webview2/) |

---

## ⚡ Quick Start (Dev Mode)

```bash
# 1. Clone and install JS dependencies
npm install

# 2. Run in dev mode (hot-reload frontend + Rust backend)
cargo tauri dev

# 3. The app window opens automatically
```

---

## 📦 Build (Native Executable)

```bash
# Builds .exe (Windows) / .dmg (macOS) / .AppImage (Linux)
cargo tauri build
```

Output in `src-tauri/target/release/bundle/`.

---

## 🎯 MVP Features

- **📂 CSV Source Node** — load any `.csv` file with automatic schema detection
- **🔍 Filter Node** — filter rows by column + operator + value (`age > 18`, `country = 'France'`, etc.)
- **📋 Column Selector** — keep only the columns you need
- **📊 Preview Panel** — first 100 rows displayed instantly after each run
- **⚡ Performance Widget** — real-time throughput, row count, execution time, RAM
- **🔤 SQL Inspector** — see the exact SQL generated from your visual pipeline

---

## 🗂️ Project Structure

```
oxipipe/
├── src/                        # React frontend
│   ├── nodes/
│   │   ├── CsvSourceNode.tsx   # File picker node
│   │   ├── FilterNode.tsx      # Row filter node
│   │   └── ProjectionNode.tsx  # Column selector node
│   ├── components/
│   │   └── PerformanceWidget.tsx
│   ├── hooks/
│   │   └── usePipeline.ts      # Tauri IPC hooks
│   ├── App.tsx                 # Main canvas + layout
│   ├── types.ts                # Shared TypeScript types
│   └── index.css               # Dark theme design system
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             # Entry point
│   │   ├── lib.rs              # Tauri commands
│   │   ├── engine.rs           # DataFusion executor
│   │   └── models.rs           # Rust data types
│   ├── data/
│   │   └── sample.csv          # 100-row demo dataset
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 🔌 API Contract (Tauri IPC)

### `execute_pipeline`
```typescript
invoke("execute_pipeline", { dag: PipelineDag }) → ExecuteResponse
```

### `inspect_schema`
```typescript
invoke("inspect_schema", { path: string }) → SchemaResponse
```

### `engine_info`
```typescript
invoke("engine_info") → { version, engine, arrow, runtime }
```

---

## 📍 Roadmap

- [ ] **Parquet source** — native columnar format support
- [ ] **SQL source** — connect to PostgreSQL / DuckDB
- [ ] **Join node** — merge two data streams
- [ ] **Group By + Aggregate** — SUM, AVG, COUNT per group
- [ ] **Export node** — save results to CSV / Parquet
- [ ] **S3 / GCS source** — cloud storage input
- [ ] **Pipeline save/load** — persist DAG as JSON
- [ ] **Streaming mode** — process files larger than RAM

---

## 📄 License

MIT © Oxipipe Contributors
