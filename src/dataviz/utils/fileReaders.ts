/**
 * fileReaders.ts — DataViz module only
 * Pure JS/TS file readers: CSV (papaparse), JSON (native), Parquet (hyparquet)
 * No Rust DataFusion dependency — uses Tauri's invoke for file reading.
 */
import Papa, { type ParseResult } from "papaparse";
import { invoke } from "@tauri-apps/api/core";
import type { ParsedDataset, DataColumn } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function detectType(values: unknown[]): DataColumn["type"] {
  const sample = values.filter((v) => v !== null && v !== undefined && v !== "").slice(0, 50);
  if (sample.length === 0) return "string";
  const nums = sample.filter((v) => !isNaN(Number(v)));
  if (nums.length / sample.length > 0.8) return "number";
  const dates = sample.filter((v) => !isNaN(Date.parse(String(v))));
  if (dates.length / sample.length > 0.8) return "date";
  return "string";
}

function buildDataset(fileName: string, headers: string[], rawRows: unknown[][]): ParsedDataset {
  const columns: DataColumn[] = headers.map((name, colIdx) => ({
    name,
    type: detectType(rawRows.map((r) => r[colIdx])),
  }));
  return { fileName, columns, rows: rawRows, totalRows: rawRows.length };
}

// ── Read file text via Tauri invoke (no plugin-fs needed) ─────────────────────

async function readFileAsText(filePath: string): Promise<string> {
  return invoke<string>("read_file_text", { path: filePath });
}

async function readFileAsBytes(filePath: string): Promise<Uint8Array> {
  const bytes = await invoke<number[]>("read_file_bytes", { path: filePath });
  return new Uint8Array(bytes);
}

// ── CSV reader ────────────────────────────────────────────────────────────────

export async function readCsv(filePath: string): Promise<ParsedDataset> {
  const text = await readFileAsText(filePath);
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (result: ParseResult<string[]>) => {
        const data = result.data;
        if (data.length < 2) {
          reject(new Error("CSV file is empty or has no data rows"));
          return;
        }
        const headers = data[0].map((h) => String(h).trim());
        const rows: unknown[][] = data.slice(1);
        resolve(buildDataset(filePath.split(/[\\/]/).pop()!, headers, rows));
      },
      error: (err: { message: string }) => reject(new Error(`CSV parse error: ${err.message}`)),
    });
  });
}

// ── JSON reader ───────────────────────────────────────────────────────────────

export async function readJson(filePath: string): Promise<ParsedDataset> {
  const text = await readFileAsText(filePath);
  const parsed: unknown = JSON.parse(text);

  const arr: Record<string, unknown>[] = Array.isArray(parsed) ? parsed as Record<string, unknown>[] : [parsed as Record<string, unknown>];
  if (arr.length === 0) throw new Error("JSON file is empty");

  if (typeof arr[0] === "object" && arr[0] !== null && !Array.isArray(arr[0])) {
    const headers = Object.keys(arr[0]);
    const rows: unknown[][] = arr.map((obj) => headers.map((h) => obj[h]));
    return buildDataset(filePath.split(/[\\/]/).pop()!, headers, rows);
  }

  throw new Error("JSON format not supported. Expected an array of objects.");
}

// ── Parquet reader ────────────────────────────────────────────────────────────

export async function readParquet(filePath: string): Promise<ParsedDataset> {
  const bytesArr = await readFileAsBytes(filePath);
  // Copy to a clean ArrayBuffer to avoid SharedArrayBuffer issues
  const buffer = bytesArr.buffer.slice(bytesArr.byteOffset, bytesArr.byteOffset + bytesArr.byteLength) as ArrayBuffer;

  const { parquetRead, parquetMetadata } = await import("hyparquet");

  const meta = parquetMetadata(buffer);
  const headers: string[] = (meta.schema as Array<{ name?: string }>)
    .slice(1)
    .filter((s) => s.name)
    .map((s) => s.name as string);

  const rows: unknown[][] = [];

  await new Promise<void>((resolve, reject) => {
    parquetRead({
      file: buffer,
      onComplete: (data: unknown[][]) => {
        rows.push(...data);
        resolve();
      },
    }).catch(reject);
  });

  return buildDataset(filePath.split(/[\\/]/).pop()!, headers, rows);
}

// ── Main dispatcher ───────────────────────────────────────────────────────────

export async function readDataFile(filePath: string): Promise<ParsedDataset> {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "csv":
    case "tsv":
      return readCsv(filePath);
    case "json":
    case "ndjson":
      return readJson(filePath);
    case "parquet":
      return readParquet(filePath);
    default:
      throw new Error(`Unsupported file format: .${ext}`);
  }
}
