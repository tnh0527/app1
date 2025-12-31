import React, { Component } from "react";

/**
 * ErrorBoundary - Catches JavaScript errors anywhere in child component tree
 * Displays a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render shows fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console (could also send to error reporting service)
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback, pageName = "page" } = this.props;

    if (hasError) {
      // If custom fallback is provided, use it
      if (fallback) {
        return typeof fallback === "function"
          ? fallback({ error, reset: this.handleReset })
          : fallback;
      }

      // Default fallback UI
      return (
        <div className="error-boundary-container" style={styles.container}>
          <div style={styles.content}>
            <div style={styles.icon}>⚠️</div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              An unexpected error occurred while loading the {pageName}.
            </p>
            {process.env.NODE_ENV === "development" && error && (
              <details style={styles.details}>
                <summary style={styles.summary}>Error Details</summary>
                <pre style={styles.errorText}>{error.toString()}</pre>
              </details>
            )}
            <div style={styles.actions}>
              <button onClick={this.handleReset} style={styles.button}>
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                style={styles.secondaryButton}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Default styles for the error boundary
const styles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
    padding: "24px",
    backgroundColor: "#fafafa",
    borderRadius: "8px",
    margin: "16px",
  },
  content: {
    textAlign: "center",
    maxWidth: "500px",
  },
  icon: {
    fontSize: "48px",
    marginBottom: "16px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: "#1a1a1a",
    margin: "0 0 8px 0",
  },
  message: {
    fontSize: "16px",
    color: "#666",
    margin: "0 0 24px 0",
  },
  details: {
    textAlign: "left",
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "4px",
    padding: "12px",
    marginBottom: "24px",
  },
  summary: {
    cursor: "pointer",
    fontWeight: "500",
    color: "#333",
  },
  errorText: {
    marginTop: "12px",
    padding: "12px",
    backgroundColor: "#f5f5f5",
    borderRadius: "4px",
    overflow: "auto",
    fontSize: "12px",
    color: "#d32f2f",
  },
  actions: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
  },
  button: {
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#fff",
    backgroundColor: "#1976d2",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  secondaryButton: {
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#1976d2",
    backgroundColor: "#fff",
    border: "1px solid #1976d2",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
};

export default ErrorBoundary;
