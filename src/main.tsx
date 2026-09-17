import React, { Component, useState, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import HomeScreen from "./HomeScreen";
import DataVizApp from "./dataviz/DataVizApp";
import "./index.css";
import "reactflow/dist/style.css";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 32,
            background: "#111",
            color: "#ff6b6b",
            fontFamily: "monospace",
            height: "100vh",
            overflow: "auto",
          }}
        >
          <h2 style={{ color: "#ec4899", marginBottom: 16 }}>⚠️ Oxipipe Runtime Error</h2>
          <div style={{ background: "#222", padding: 16, borderRadius: 8, color: "#fff", marginBottom: 16 }}>
            <strong>{this.state.error && this.state.error.toString()}</strong>
          </div>
          <pre style={{ fontSize: 11, color: "#aaa", whiteSpace: "pre-wrap" }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              background: "#e06927",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            Reload App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ── Top-level router ──────────────────────────────────────────────────────────
type AppModule = "home" | "etl" | "dataviz";

function RootApp() {
  const [module, setModule] = useState<AppModule>("home");

  if (module === "etl") {
    return <App onBack={() => setModule("home")} />;
  }
  if (module === "dataviz") {
    return <DataVizApp onBack={() => setModule("home")} />;
  }
  return (
    <HomeScreen
      onSelectETL={() => setModule("etl")}
      onSelectViz={() => setModule("dataviz")}
    />
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <RootApp />
    </GlobalErrorBoundary>
  </React.StrictMode>
);


