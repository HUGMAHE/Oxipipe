<p align="center">
  <img src="public/logo.svg" alt="Oxipipe Logo" width="110" height="110" />
</p>

<h1 align="center">Oxipipe</h1>

<p align="center">
  <strong>Node-based visual data processing (ETL) and data visualization desktop application.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square" alt="License: MIT" /></a>
  <a href="https://www.rust-lang.org/"><img src="https://img.shields.io/badge/Rust-1.75+-orange.svg?style=flat-square&logo=rust&logoColor=white" alt="Rust" /></a>
  <a href="https://v2.tauri.app/"><img src="https://img.shields.io/badge/Tauri-v2-24C8DB.svg?style=flat-square&logo=tauri&logoColor=white" alt="Tauri v2" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB.svg?style=flat-square&logo=react&logoColor=black" alt="React 18" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5-3178C6.svg?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://datafusion.apache.org/"><img src="https://img.shields.io/badge/Apache%20DataFusion-v43-228BE6.svg?style=flat-square&logo=apache&logoColor=white" alt="Apache DataFusion" /></a>
  <a href="https://arrow.apache.org/"><img src="https://img.shields.io/badge/Apache%20Arrow-v53-E03538.svg?style=flat-square&logo=apachearrow&logoColor=white" alt="Apache Arrow" /></a>
  <a href="https://echarts.apache.org/"><img src="https://img.shields.io/badge/Apache%20ECharts-v6-AA344D.svg?style=flat-square&logo=apacheecharts&logoColor=white" alt="Apache ECharts" /></a>
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-495057.svg?style=flat-square" alt="Platform" />
</p>

---

<p align="center">
  <img src="public/screenshot-pipeline.png" alt="Oxipipe Visual Pipeline" width="100%" />
</p>

* **Fast:** Powered by Rust and Apache DataFusion for in-memory, multi-threaded data operations.
* **Visual:** Drag-and-drop node canvas to build data transformation pipelines effortlessly.
* **Interactive:** Built-in DataViz studio supporting 20+ chart types (Line, Bar, Scatter, Sankey, Heatmap, Radar, etc.).
* **Native:** Cross-platform desktop application packaged with Tauri and React.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/) (v1.75+)

### Run in Development

```bash
# Install dependencies
npm install

# Start development mode
npm run tauri dev
```

### Build Executable

To create a standalone desktop application for your OS:

```bash
npm run tauri build
```

## Features

### Data Processing (ETL)
- **Data Sources:** Load CSV, Parquet, JSON, Avro, Excel, and SQLite.
- **Transformations:** Filter, Select Columns, Drop/Fill Nulls, Deduplicate, Rename, Derived Columns, Sort, Top N, Group By, Join, and Union.
- **Data Sinks:** Export pipeline outputs to CSV, Parquet, or JSON.
- **Export Capabilities:** Generate standalone native Rust code or ready-to-run Docker containers.
- **Project Files:** Save and load pipelines as `.oxi` files (`Ctrl+S` / `Ctrl+O`).

### Data Visualization
- **File Support:** Load CSV, JSON, or Parquet datasets directly.
- **20+ Chart Types:** Trends, Distributions, Proportions, Relations, Comparisons, Financial (Candlestick), and Indicators.
- **Customization:** Customize colors, themes, line smoothness, data labels, grid lines, and zoom controls.
- **PNG Export:** Export high-resolution chart images in one click.

## License

Oxipipe is [MIT licensed](LICENSE).
