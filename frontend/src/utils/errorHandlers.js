/**
 * Global error handlers for production error monitoring
 * Captures unhandled errors and promise rejections
 */

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// Error logging function
const logError = (errorData) => {
  if (isDevelopment) {
    console.error("[Error Handler]", errorData);
    return;
  }

  // In production, send to backend logging endpoint
  try {
    fetch("/api/log-error/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...errorData,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
      // Don't block UI
      keepalive: true,
    }).catch(() => {
      // Silently fail if endpoint unavailable
    });
  } catch {
    // Prevent error in error handler
  }
};

/**
 * Initialize global error handlers
 * Call this once at app startup
 */
export const initErrorHandlers = () => {
  // Handle uncaught JavaScript errors
  window.addEventListener("error", (event) => {
    const errorData = {
      type: "error",
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
    };

    logError(errorData);

    // Don't suppress default error handling in dev
    if (isDevelopment) {
      return false;
    }

    // Prevent default console logging in production
    event.preventDefault();
    return true;
  });

  // Handle unhandled promise rejections
  window.addEventListener("unhandledrejection", (event) => {
    const errorData = {
      type: "unhandledrejection",
      reason: event.reason?.toString(),
      stack: event.reason?.stack,
      promise: event.promise?.toString(),
    };

    logError(errorData);

    // Don't suppress default handling in dev
    if (isDevelopment) {
      return false;
    }

    // Prevent default console logging in production
    event.preventDefault();
    return true;
  });

  // Optionally suppress console methods in production (not recommended)
  if (isProduction) {
    // Only suppress debug/log, keep warn/error for critical issues
    // Uncomment to suppress console.log in production
    // const noop = () => {};
    // console.log = noop;
    // console.debug = noop;
    // console.info = noop;
    // Keep console.warn and console.error visible
    // or redirect them to monitoring
  }

  if (isDevelopment) {
    console.log("[Error Handlers] Global error handlers initialized");
  }
};

/**
 * Manually log an error to the monitoring service
 * Use this for caught errors you want to track
 */
export const reportError = (error, context = {}) => {
  const errorData = {
    type: "manual",
    message: error.message || error.toString(),
    stack: error.stack,
    context,
  };

  logError(errorData);
};

/**
 * Network error handler for API calls
 * Use this to standardize API error handling
 */
export const handleApiError = (error, endpoint) => {
  const errorData = {
    type: "api_error",
    endpoint,
    status: error.response?.status,
    statusText: error.response?.statusText,
    message: error.message,
    data: error.response?.data,
  };

  logError(errorData);

  // Return user-friendly message
  if (!navigator.onLine) {
    return "You appear to be offline. Please check your connection.";
  }

  if (error.response?.status >= 500) {
    return "Server error. Please try again later.";
  }

  if (error.response?.status === 404) {
    return "The requested resource was not found.";
  }

  if (error.response?.status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (error.response?.status === 401) {
    return "Please log in to continue.";
  }

  return (
    error.response?.data?.message || "An error occurred. Please try again."
  );
};

export default {
  initErrorHandlers,
  reportError,
  handleApiError,
};
