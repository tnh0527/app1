import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import api from "../api/axios";

const ConnectionContext = createContext();

export const RETRY_INTERVAL = 5000; // Fixed 5 second retry interval
const PING_ENDPOINT = "/auth/session/"; // Lightweight endpoint to check connection

export const ConnectionProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState(null);

  const retryTimeoutRef = useRef(null);
  const isCheckingRef = useRef(false);
  const mountedRef = useRef(true);
  const checkConnectionRef = useRef(null);
  const scheduleReconnectRef = useRef(null);

  // Reset retry state when connection is restored
  const resetRetryState = useCallback(() => {
    setReconnectAttempts(0);
    setIsReconnecting(false);
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Check backend connection
  const checkConnection = useCallback(async () => {
    if (isCheckingRef.current || !mountedRef.current) {
      return;
    }

    isCheckingRef.current = true;

    try {
      // Use a lightweight endpoint with short timeout
      await api.get(PING_ENDPOINT, {
        timeout: 5000,
        // Don't trigger auth redirects on connection check failures
        validateStatus: (status) => status < 500,
      });

      if (mountedRef.current) {
        // Connection successful
        if (!isOnline) {
          setIsOnline(true);
          resetRetryState();
          setLastError(null);
        }
      }
    } catch (error) {
      if (!mountedRef.current) return;

      // Check if it's a network error (not a server error response)
      const isNetworkError =
        !error.response ||
        error.code === "ECONNABORTED" ||
        error.code === "ERR_NETWORK" ||
        error.message.includes("Network Error") ||
        error.message.includes("timeout");

      if (isNetworkError) {
        setIsOnline(false);
        setLastError(error.message);

        // Always schedule next retry when offline
        if (!isReconnecting) {
          setIsReconnecting(true);
        }
        // call via ref to avoid temporal dead zone
        scheduleReconnectRef.current?.();
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [isOnline, isReconnecting, resetRetryState]);

  // Schedule next reconnection attempt
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;

    // Clear any existing timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setReconnectAttempts((prev) => prev + 1);

    retryTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !isOnline) {
        // invoke via ref to avoid circular deps
        checkConnectionRef.current?.();
      }
    }, RETRY_INTERVAL);
  }, [isOnline]);

  // Manual retry (for user-triggered retry buttons)
  const retry = useCallback(() => {
    if (isCheckingRef.current) {
      return;
    }

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Reset attempts and immediately check
    setReconnectAttempts(0);
    setIsReconnecting(true);
    checkConnectionRef.current?.();
  }, []);

  // Monitor browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastError("No internet connection");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [checkConnection]);

  // Check connection when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isOnline) {
        checkConnection();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkConnection, isOnline]);

  // Initial connection check on mount
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Continue retry cycle when offline
  useEffect(() => {
    if (!isOnline && !isCheckingRef.current && mountedRef.current) {
      scheduleReconnectRef.current?.();
    }
  }, [isOnline]);

  // Keep refs updated for functions used across each other
  useEffect(() => {
    checkConnectionRef.current = checkConnection;
    scheduleReconnectRef.current = scheduleReconnect;
  }, [checkConnection, scheduleReconnect]);

  const value = {
    isOnline,
    isReconnecting,
    reconnectAttempts,
    lastError,
    retry,
    checkConnection,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error("useConnection must be used within ConnectionProvider");
  }
  return context;
};
