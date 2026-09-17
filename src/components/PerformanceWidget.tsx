import { memo, useEffect, useRef } from "react";
import type { ExecuteResponse } from "../types";

interface PerformanceWidgetProps {
  result: ExecuteResponse | null;
  isRunning: boolean;
}

function formatThroughput(lps: number): string {
  if (lps >= 1_000_000) return `${(lps / 1_000_000).toFixed(1)}M`;
  if (lps >= 1_000) return `${(lps / 1_000).toFixed(0)}K`;
  return lps.toFixed(0);
}

function formatMemory(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function AnimatedNumber({ value, suffix }: { value: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.classList.remove("metric-updated");
      void ref.current.offsetWidth; // reflow
      ref.current.classList.add("metric-updated");
    }
  }, [value]);

  return (
    <span ref={ref} className="perf-metric-value good">
      {value}
      {suffix && <span style={{ fontSize: 13, opacity: 0.7 }}>{suffix}</span>}
    </span>
  );
}

function PerformanceWidget({ result, isRunning }: PerformanceWidgetProps) {
  if (isRunning) {
    return (
      <div className="perf-panel">
        <div className="perf-metric">
          <span className="perf-metric-label">Status</span>
          <span className="perf-metric-value" style={{ color: "var(--accent-warning)", fontSize: 16 }}>
            Executing…
          </span>
          <span className="perf-metric-sub">DataFusion running</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="perf-panel">
        <div className="perf-metric">
          <span className="perf-metric-label">Throughput</span>
          <span className="perf-metric-value" style={{ color: "var(--text-muted)" }}>—</span>
          <span className="perf-metric-sub">lines / sec</span>
        </div>
        <div className="perf-metric">
          <span className="perf-metric-label">Total Rows</span>
          <span className="perf-metric-value" style={{ color: "var(--text-muted)" }}>—</span>
          <span className="perf-metric-sub">matched</span>
        </div>
        <div className="perf-metric">
          <span className="perf-metric-label">Exec Time</span>
          <span className="perf-metric-value" style={{ color: "var(--text-muted)" }}>—</span>
          <span className="perf-metric-sub">milliseconds</span>
        </div>
        <div className="perf-metric">
          <span className="perf-metric-label">RAM</span>
          <span className="perf-metric-value" style={{ color: "var(--text-muted)" }}>—</span>
          <span className="perf-metric-sub">process memory</span>
        </div>
      </div>
    );
  }

  return (
    <div className="perf-panel">
      <div className="perf-metric">
        <span className="perf-metric-label">Throughput</span>
        <AnimatedNumber value={formatThroughput(result.throughput_lines_per_sec)} suffix=" lines/s" />
        <span className="perf-metric-sub">DataFusion Apache Arrow</span>
      </div>
      <div className="perf-metric">
        <span className="perf-metric-label">Total Rows</span>
        <AnimatedNumber value={result.total_rows.toLocaleString()} />
        <span className="perf-metric-sub">matched by pipeline</span>
      </div>
      <div className="perf-metric">
        <span className="perf-metric-label">Preview</span>
        <AnimatedNumber value={result.preview_rows.toLocaleString()} suffix=" rows" />
        <span className="perf-metric-sub">shown in table</span>
      </div>
      <div className="perf-metric">
        <span className="perf-metric-label">Exec Time</span>
        <AnimatedNumber
          value={String(result.execution_ms)}
          suffix=" ms"
        />
        <span className="perf-metric-sub">end-to-end latency</span>
      </div>
      <div className="perf-metric">
        <span className="perf-metric-label">RAM</span>
        <AnimatedNumber value={formatMemory(result.memory_mb)} />
        <span className="perf-metric-sub">process memory</span>
      </div>
    </div>
  );
}

export default memo(PerformanceWidget);
