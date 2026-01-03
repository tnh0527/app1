import { useState, useEffect } from "react";
import "./LoadingStates.css";

/**
 * SkeletonElement - Base skeleton element with configurable shape
 */
export const SkeletonElement = ({
  type = "text",
  width,
  height,
  className = "",
  style = {},
}) => {
  const baseClass = `skeleton-element skeleton-${type}`;
  const customStyle = {
    ...style,
    ...(width && { width }),
    ...(height && { height }),
  };

  return <div className={`${baseClass} ${className}`} style={customStyle} />;
};

/**
 * SkeletonCard - Card-shaped skeleton for grid items
 */
export const SkeletonCard = ({
  hasHeader = true,
  hasImage = false,
  lines = 3,
  className = "",
}) => {
  return (
    <div className={`skeleton-card ${className}`}>
      {hasImage && <SkeletonElement type="image" />}
      {hasHeader && (
        <div className="skeleton-card-header">
          <SkeletonElement type="title" width="60%" />
          <SkeletonElement type="circle" width="32px" height="32px" />
        </div>
      )}
      <div className="skeleton-card-body">
        {[...Array(lines)].map((_, i) => (
          <SkeletonElement
            key={i}
            type="text"
            width={i === lines - 1 ? "70%" : "100%"}
          />
        ))}
      </div>
    </div>
  );
};

/**
 * SkeletonChart - Skeleton for chart/graph areas
 */
export const SkeletonChart = ({ height = "200px", className = "" }) => {
  return (
    <div className={`skeleton-chart ${className}`} style={{ height }}>
      <div className="skeleton-chart-bars">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="skeleton-bar"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
      <div className="skeleton-chart-axis" />
    </div>
  );
};

/**
 * SkeletonHero - Large hero section skeleton
 */
export const SkeletonHero = ({ className = "" }) => {
  return (
    <div className={`skeleton-hero ${className}`}>
      <div className="skeleton-hero-content">
        <SkeletonElement type="badge" width="80px" height="24px" />
        <SkeletonElement type="title" width="40%" height="48px" />
        <SkeletonElement type="subtitle" width="60%" />
        <div className="skeleton-hero-stats">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-stat">
              <SkeletonElement type="value" width="80px" height="32px" />
              <SkeletonElement type="label" width="60px" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * SkeletonGrid - Grid of skeleton cards
 */
export const SkeletonGrid = ({ columns = 3, rows = 2, className = "" }) => {
  return (
    <div
      className={`skeleton-grid ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {[...Array(columns * rows)].map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

/**
 * SkeletonList - List of skeleton items
 */
export const SkeletonList = ({
  items = 5,
  hasAvatar = false,
  className = "",
}) => {
  return (
    <div className={`skeleton-list ${className}`}>
      {[...Array(items)].map((_, i) => (
        <div key={i} className="skeleton-list-item">
          {hasAvatar && (
            <SkeletonElement type="avatar" width="40px" height="40px" />
          )}
          <div className="skeleton-list-content">
            <SkeletonElement type="text" width="80%" />
            <SkeletonElement type="text" width="50%" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * SkeletonTable - Table skeleton
 */
export const SkeletonTable = ({ rows = 5, columns = 4, className = "" }) => {
  return (
    <div className={`skeleton-table ${className}`}>
      <div className="skeleton-table-header">
        {[...Array(columns)].map((_, i) => (
          <SkeletonElement key={i} type="text" width="80%" />
        ))}
      </div>
      {[...Array(rows)].map((_, rowIdx) => (
        <div key={rowIdx} className="skeleton-table-row">
          {[...Array(columns)].map((_, colIdx) => (
            <SkeletonElement key={colIdx} type="text" width="70%" />
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * PageLoadingState - Full page loading state
 */
export const PageLoadingState = ({
  message = "Loading...",
  className = "",
}) => {
  return (
    <div className={`page-loading-state ${className}`}>
      <div className="loading-content">
        <div className="loading-spinner-ring">
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
          <div className="spinner-ring"></div>
        </div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

/**
 * EmptyState - No data UI component
 */
export const EmptyState = ({
  icon = "bi-inbox",
  title = "No Data",
  message = "There's nothing to show here yet.",
  action = null,
  actionLabel = "Get Started",
  className = "",
}) => {
  return (
    <div className={`empty-state ${className}`}>
      <div className="empty-state-icon">
        <i className={`bi ${icon}`}></i>
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
      {action && (
        <button className="empty-state-action" onClick={action}>
          <i className="bi bi-plus-lg"></i>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

/**
 * ErrorState - Error UI component
 */
export const ErrorState = ({
  title = "Something went wrong",
  message = "We couldn't load this content. Please try again.",
  onRetry = null,
  onReload = null,
  extraActions = null,
  className = "",
  children,
}) => {
  return (
    <div className={`error-state ${className}`}>
      <div className="error-state-card">
        <div className="error-state-icon">
          <i className="bi bi-exclamation-octagon-fill"></i>
        </div>
        <h3 className="error-state-title">{title}</h3>
        <p className="error-state-message">{message}</p>

        {(onRetry || onReload || extraActions) && (
          <div className="error-state-actions">
            {onRetry && (
              <button className="error-state-retry" onClick={onRetry}>
                <i className="bi bi-arrow-clockwise"></i>
                Try Again
              </button>
            )}
            {onReload && (
              <button className="error-state-reload" onClick={onReload}>
                <i className="bi bi-arrow-repeat"></i>
                Reload Page
              </button>
            )}
            {extraActions}
          </div>
        )}

        {children && <div className="error-state-content">{children}</div>}
      </div>
    </div>
  );
};

/**
 * TimeoutState - Timeout UI component
 */
export const TimeoutState = ({
  title = "Request Timed Out",
  message = "The server took too long to respond. Please check your connection and try again.",
  onRetry = null,
  className = "",
}) => {
  return (
    <div className={`timeout-state ${className}`}>
      <div className="timeout-state-icon">
        <i className="bi bi-hourglass-split"></i>
      </div>
      <h3 className="timeout-state-title">{title}</h3>
      <p className="timeout-state-message">{message}</p>
      {onRetry && (
        <button className="timeout-state-retry" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise"></i>
          Try Again
        </button>
      )}
    </div>
  );
};

/**
 * useDataFetch - Custom hook for data fetching with timeout
 */
export const useDataFetch = (
  fetchFn,
  { timeout = 15000, dependencies = [], onError = null, onTimeout = null } = {}
) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTimedOut, setIsTimedOut] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    setIsTimedOut(false);

    const timeoutId = setTimeout(() => {
      setIsTimedOut(true);
      setLoading(false);
      onTimeout?.();
    }, timeout);

    try {
      const result = await fetchFn();
      clearTimeout(timeoutId);
      if (!isTimedOut) {
        setData(result);
        setError(null);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      if (!isTimedOut) {
        setError(err.message || "Failed to load data");
        onError?.(err);
      }
    } finally {
      clearTimeout(timeoutId);
      if (!isTimedOut) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return {
    data,
    loading,
    error,
    isTimedOut,
    refetch: fetchData,
  };
};

/**
 * ContentWrapper - Wrapper component that handles loading/error/empty states
 */
export const ContentWrapper = ({
  loading = false,
  error = null,
  isTimedOut = false,
  isEmpty = false,
  onRetry = null,
  loadingComponent = null,
  emptyProps = {},
  children,
  className = "",
}) => {
  if (loading) {
    return loadingComponent || <PageLoadingState className={className} />;
  }

  if (isTimedOut) {
    return <TimeoutState onRetry={onRetry} className={className} />;
  }

  if (error) {
    return (
      <ErrorState message={error} onRetry={onRetry} className={className} />
    );
  }

  if (isEmpty) {
    return <EmptyState {...emptyProps} className={className} />;
  }

  return children;
};

export default {
  SkeletonElement,
  SkeletonCard,
  SkeletonChart,
  SkeletonHero,
  SkeletonGrid,
  SkeletonList,
  SkeletonTable,
  PageLoadingState,
  EmptyState,
  ErrorState,
  TimeoutState,
  ContentWrapper,
  useDataFetch,
};
