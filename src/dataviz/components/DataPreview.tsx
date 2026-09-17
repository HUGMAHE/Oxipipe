import type { ParsedDataset } from "../types";

interface DataPreviewProps {
  dataset: ParsedDataset;
}

export default function DataPreview({ dataset }: DataPreviewProps) {
  const previewRows = dataset.rows.slice(0, 5);
  const cols = dataset.columns;

  return (
    <div style={{ fontSize: 11, color: "#aaa" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontWeight: 700, color: "#e2e2e2", fontSize: 12 }}>{dataset.fileName}</span>
        <span style={{ color: "#666" }}>{dataset.totalRows.toLocaleString()} rows · {cols.length} columns</span>
      </div>

      {/* Column badges */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
        {cols.map((c) => (
          <span key={c.name} style={{
            background: c.type === "number" ? "#1a2a1a" : c.type === "date" ? "#1a1a2a" : "#2a1a1a",
            border: `1px solid ${c.type === "number" ? "#2d4a2d" : c.type === "date" ? "#2d2d4a" : "#4a2d2d"}`,
            borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600,
            color: c.type === "number" ? "#34d399" : c.type === "date" ? "#60a5fa" : "#f98845",
          }}>
            {c.name} <span style={{ opacity: 0.6 }}>({c.type})</span>
          </span>
        ))}
      </div>

      {/* Data table preview */}
      <div style={{ overflowX: "auto", borderRadius: 6, border: "1px solid #242426" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
          <thead>
            <tr style={{ background: "#1a1a1c" }}>
              {cols.map((c) => (
                <th key={c.name} style={{ padding: "5px 8px", textAlign: "left", color: "#888", fontWeight: 700, borderBottom: "1px solid #2a2a2a", whiteSpace: "nowrap" }}>
                  {c.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: "1px solid #1e1e20" }}>
                {row.map((cell, ci) => (
                  <td key={ci} style={{ padding: "4px 8px", color: "#ccc", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cell === null || cell === undefined ? <span style={{ color: "#555" }}>null</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {dataset.totalRows > 5 && (
        <div style={{ color: "#555", fontSize: 10, marginTop: 4, textAlign: "center" }}>
          … and {(dataset.totalRows - 5).toLocaleString()} more rows
        </div>
      )}
    </div>
  );
}
