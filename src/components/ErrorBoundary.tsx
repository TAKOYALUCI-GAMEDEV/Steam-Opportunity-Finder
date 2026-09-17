import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

// Prevents a single runtime error from white-screening the whole app: shows a readable
// message (and how to recover) instead of a blank page.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("App error:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          color: "#e6ebf5",
          background: "#0b0f17",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ maxWidth: 560 }}>
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#8b97b0", fontSize: 14, lineHeight: 1.5 }}>
            The page hit an unexpected error. Try a hard refresh
            (⌘/Ctrl + Shift + R). If it persists, this message includes the detail below.
          </p>
          <pre
            style={{
              marginTop: 12,
              padding: 12,
              background: "#121826",
              border: "1px solid #26304a",
              borderRadius: 8,
              fontSize: 12,
              color: "#f2b8b8",
              overflow: "auto",
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            onClick={() => location.reload()}
            style={{
              marginTop: 12,
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #26304a",
              background: "#1a2234",
              color: "#e6ebf5",
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}
