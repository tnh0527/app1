import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import authApi from "../api/authApi";

const AuthContext = createContext();

const AUTH_KEY = "isAuthenticated";
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem(AUTH_KEY) === "true" ||
      sessionStorage.getItem(AUTH_KEY) === "true"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const sessionCheckRef = useRef(null);

  // Clear all auth-related storage
  const clearAuthStorage = useCallback(() => {
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    // Clear any other auth-related items
    sessionStorage.removeItem("justLoggedIn");
  }, []);

  // Verify session with backend
  const verifySession = useCallback(async () => {
    try {
      const response = await authApi.checkSession();
      if (response.data?.authenticated) {
        return true;
      }
      return false;
    } catch (error) {
      // 401 means not authenticated
      if (error.response?.status === 401) {
        return false;
      }
      // Network errors or other issues - don't invalidate session
      console.warn("Session check failed:", error);
      return null; // Unknown state
    }
  }, []);

  // Initialize and verify session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedAuth =
        localStorage.getItem(AUTH_KEY) === "true" ||
        sessionStorage.getItem(AUTH_KEY) === "true";

      if (storedAuth) {
        // Verify with backend
        const isValid = await verifySession();

        if (isValid === false) {
          // Session is definitely invalid
          clearAuthStorage();
          setIsAuthenticated(false);
          setSessionError("Session expired. Please log in again.");
        } else if (isValid === true) {
          setIsAuthenticated(true);
        }
        // If isValid is null (network error), keep current state
      } else {
        setIsAuthenticated(false);
      }

      setIsLoading(false);
    };

    initAuth();
  }, [verifySession, clearAuthStorage]);

  // Periodic session check
  useEffect(() => {
    if (!isAuthenticated) {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
        sessionCheckRef.current = null;
      }
      return;
    }

    const checkSession = async () => {
      const isValid = await verifySession();
      if (isValid === false) {
        clearAuthStorage();
        setIsAuthenticated(false);
        setSessionError("Session expired. Please log in again.");
      }
    };

    // Start periodic checks
    sessionCheckRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    // Also check on tab visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, verifySession, clearAuthStorage]);

  const login = useCallback((rememberMe = false) => {
    setIsAuthenticated((prev) => {
      if (prev === true) return prev;

      // Ensure the flag only lives in one place at a time.
      localStorage.removeItem(AUTH_KEY);
      sessionStorage.removeItem(AUTH_KEY);

      (rememberMe ? localStorage : sessionStorage).setItem(AUTH_KEY, "true");
      return true;
    });
    setSessionError(null);
  }, []);

  const logout = useCallback(async () => {
    // Clear frontend state immediately
    clearAuthStorage();
    setIsAuthenticated(false);

    // Clear navigation state - user should start fresh at dashboard
    sessionStorage.removeItem("redirectAfterLogin");
    // Reset sidebar to default expanded state
    try {
      localStorage.setItem("isSidebarOpen", JSON.stringify(true));
    } catch (err) {
      console.warn("Failed to reset sidebar state on logout", err);
    }

    // Clear interval
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
      sessionCheckRef.current = null;
    }
  }, [clearAuthStorage]);

  const clearSessionError = useCallback(() => {
    setSessionError(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        sessionError,
        login,
        logout,
        clearSessionError,
        verifySession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
