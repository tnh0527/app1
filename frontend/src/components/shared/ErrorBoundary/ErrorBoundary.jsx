import React from "react";
import "./ErrorBoundary.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error("Error caught by boundary:", error, errorInfo);
    }

    // Store error details
    this.setState({
      error,
      errorInfo,
    });

    // Send to monitoring service in production
    if (import.meta.env.PROD) {
      this.logErrorToService(error, errorInfo);
    }
  }

  logErrorToService = (error, errorInfo) => {
    // TODO: Integrate with monitoring service (Sentry, LogRocket, etc.)
    // Example:
    // Sentry.captureException(error, { extra: errorInfo });

    // For now, send to backend logging endpoint if available
    try {
      fetch("/api/log-error/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: error.toString(),
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        }),
      }).catch(() => {
        // Silently fail if logging endpoint unavailable
      });
    } catch {
      // Prevent error in error handler
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary-content">
            <div className="error-icon">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
            <h1>Oops! Something went wrong</h1>
            <p className="error-message">
              We&apos;re sorry for the inconvenience. The application
              encountered an unexpected error.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development Only)</summary>
                <pre className="error-stack">
                  {this.state.error.toString()}
                  {"\n\n"}
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo && (
                  <pre className="component-stack">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </details>
            )}

            <div className="error-actions">
              <button onClick={this.handleReload} className="btn-primary">
                <i className="bi bi-arrow-clockwise"></i> Reload Page
              </button>
              <button onClick={this.handleGoHome} className="btn-secondary">
                <i className="bi bi-house"></i> Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
