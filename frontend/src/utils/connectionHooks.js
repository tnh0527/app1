import { useEffect, useRef, useCallback } from "react";
import { useConnection } from "../contexts/ConnectionContext";

/**
 * useAutoRetry - Hook to automatically retry a function when connection is restored
 *
 * @param {Function} retryFn - Function to call when connection is restored
 * @param {Array} dependencies - Dependencies to watch (like useEffect)
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Enable/disable auto-retry (default: true)
 * @param {boolean} options.retryOnMount - Retry when component mounts and is offline (default: false)
 *
 * @example
 * const fetchData = async () => { ... };
 * useAutoRetry(fetchData, [id], { enabled: !loading });
 */
export const useAutoRetry = (retryFn, dependencies = [], options = {}) => {
  const { enabled = true, retryOnMount = false } = options;
  const { isOnline } = useConnection();
  const previousOnlineRef = useRef(isOnline);
  const hasRetriedRef = useRef(false);

  const executeRetry = useCallback(() => {
    if (enabled && typeof retryFn === "function") {
      retryFn();
    }
  }, [retryFn, enabled]);

  // Reset retry flag when dependencies change
  useEffect(() => {
    hasRetriedRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  // Watch for connection restoration
  useEffect(() => {
    // Connection was restored (offline -> online)
    if (!previousOnlineRef.current && isOnline && !hasRetriedRef.current) {
      hasRetriedRef.current = true;
      executeRetry();
    }

    previousOnlineRef.current = isOnline;
  }, [isOnline, executeRetry]);

  // Optional: Retry on mount if offline
  useEffect(() => {
    if (retryOnMount && !isOnline && !hasRetriedRef.current) {
      hasRetriedRef.current = true;
      executeRetry();
    }
  }, [retryOnMount, isOnline, executeRetry]);
};

/**
 * useConnectionAwareEffect - Like useEffect, but skips execution when offline
 * Useful for periodic data fetching that should pause when offline
 *
 * @param {Function} effect - Effect function to run
 * @param {Array} dependencies - Dependencies array
 * @param {Object} options - Configuration options
 * @param {boolean} options.runOnReconnect - Re-run effect when connection is restored (default: true)
 */
export const useConnectionAwareEffect = (
  effect,
  dependencies = [],
  options = {}
) => {
  const { runOnReconnect = true } = options;
  const { isOnline } = useConnection();
  const previousOnlineRef = useRef(isOnline);

  useEffect(() => {
    if (!isOnline) {
      // Skip effect when offline
      return;
    }

    // Connection was just restored and we should re-run
    const wasOffline = !previousOnlineRef.current;
    previousOnlineRef.current = isOnline;

    // Re-run if reconnected or normal execution
    if (wasOffline && runOnReconnect) {
      // Connection restored - effect will re-run automatically
    }

    // Run the effect
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, effect, runOnReconnect, ...dependencies]);
};

export default useAutoRetry;
