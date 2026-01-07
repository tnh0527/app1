import { Component } from "react";
import { ErrorState } from "./LoadingStates/LoadingStates";
import "./ErrorBoundary.css";

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

      // Default fallback UI using ErrorState component
      return (
        <ErrorState
          title="Something went wrong"
          message={`An unexpected error occurred while loading the ${pageName}.`}
          onRetry={this.handleReset}
          onReload={() => window.location.reload()}
        >
          {import.meta.env.DEV && error && (
            <details className="error-details">
              <summary>Error Details</summary>
              <pre className="error-text">{error.toString()}</pre>
            </details>
          )}
        </ErrorState>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
