// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod engine;
mod models;
mod codegen;

use models::{PipelineDag, ExecuteResponse, SchemaResponse, NodeProfileResponse, DockerExportPackage};
use serde_json::json;

// ─────────────────────────────────────────────────────────────────────────────
// TAURI COMMANDS (IPC bridge between frontend and Rust engine)
// ─────────────────────────────────────────────────────────────────────────────

/// Execute a full pipeline DAG → returns preview rows + perf metrics
#[tauri::command]
async fn execute_pipeline(dag: PipelineDag) -> Result<ExecuteResponse, String> {
    engine::execute_pipeline(dag)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Profile statistics for a single node in 1-click
#[tauri::command]
async fn profile_node(dag: PipelineDag, target_node_id: String) -> Result<NodeProfileResponse, String> {
    engine::profile_node(dag, target_node_id)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Inspect the schema of a CSV file without running a pipeline
#[tauri::command]
async fn inspect_schema(path: String) -> Result<SchemaResponse, String> {
    engine::inspect_schema(&path)
        .await
        .map_err(|e| format!("{:#}", e))
}

/// Generate Rust code from the DAG
#[tauri::command]
fn generate_code(dag: PipelineDag) -> Result<String, String> {
    codegen::generate_rust_code(&dag)
        .map_err(|e| format!("{:#}", e))
}

/// Generate Dockerfile export package (Dockerfile, Cargo.toml, main.rs)
#[tauri::command]
fn generate_docker_export(dag: PipelineDag) -> Result<DockerExportPackage, String> {
    codegen::generate_docker_package(&dag)
        .map_err(|e| format!("{:#}", e))
}

/// Save .oxi pipeline project file
#[tauri::command]
fn save_pipeline_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("Failed to save .oxi file: {}", e))
}

/// Load .oxi pipeline project file
#[tauri::command]
fn load_pipeline_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read .oxi file: {}", e))
}

/// Health-check — returns engine version info
#[tauri::command]
fn engine_info() -> serde_json::Value {
    json!({
        "version": env!("CARGO_PKG_VERSION"),
        "engine": "DataFusion 43",
        "arrow": "Apache Arrow 53",
        "runtime": "Rust 1.96 stable",
        "product": "Oxipipe"
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            execute_pipeline,
            profile_node,
            inspect_schema,
            engine_info,
            generate_code,
            generate_docker_export,
            save_pipeline_file,
            load_pipeline_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Oxipipe");
}
