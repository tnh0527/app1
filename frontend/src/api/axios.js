import axios from "axios";

// Helper to get CSRF token from cookies
const getCsrfToken = () => {
  const name = "csrftoken";
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

// Resolve effective API base URL with a localhost fallback when running the
// frontend on localhost. This lets you set VITE_API_BASE_URL to your
// production backend for deployments while still running the frontend
// locally against a local backend during development.
const _envBase = import.meta.env.VITE_API_BASE_URL || null;

function _isLocalHostHost(host) {
  if (!host) return false;
  return ["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(host);
}

function _hostnameFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}

function getApiBase() {
  const defaultLocal = "http://localhost:8000";

  // If no env override, use local default
  if (!_envBase) return defaultLocal;

  // If running in a browser on localhost, prefer the local backend to avoid
  // accidentally calling production. This provides the fallback the user asked for.
  if (typeof window !== "undefined") {
    const frontendHost = window.location.hostname;
    if (_isLocalHostHost(frontendHost)) {
      // If env base is not localhost, use local fallback.
      const envHostname = _hostnameFromUrl(_envBase);
      if (!envHostname || !_isLocalHostHost(envHostname)) {
        return defaultLocal;
      }
      return _envBase;
    }
  }

  // Otherwise use the env-configured base
  return _envBase;
}

const api = axios.create({
  baseURL: getApiBase(),
  withCredentials: true, // Important for session cookies
});

// Interceptor to add CSRF token to every request
api.interceptors.request.use(
  (config) => {
    const method = (config.method || "get").toLowerCase();
    // Only send CSRF token for unsafe methods.
    // Sending it on GET/HEAD triggers CORS preflight and can break if the server redirects.
    const needsCsrf = !["get", "head", "options"].includes(method);
    if (needsCsrf) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        config.headers["X-CSRFToken"] = csrfToken;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle authentication errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Network errors are handled by ConnectionContext
    // We just pass them through so they can be detected

    // Handle 401 Unauthorized responses
    if (error.response?.status === 401) {
      // Don't redirect for auth endpoints (login, register, etc.)
      const authEndpoints = [
        "/auth/login/",
        "/auth/register/",
        "/auth/google/",
        "/auth/session/",
      ];
      const isAuthEndpoint = authEndpoints.some((endpoint) =>
        error.config?.url?.includes(endpoint)
      );

      if (!isAuthEndpoint) {
        // Clear auth state and redirect to login
        const AUTH_KEY = "isAuthenticated";
        localStorage.removeItem(AUTH_KEY);
        sessionStorage.removeItem(AUTH_KEY);

        // Store current location for redirect after login
        if (window.location.pathname !== "/") {
          sessionStorage.setItem(
            "redirectAfterLogin",
            window.location.pathname + window.location.search
          );
        }

        // Redirect to login page
        window.location.href = "/";
      }
    }

    // Handle 403 Forbidden (CSRF or permission errors)
    if (error.response?.status === 403) {
      console.error("Forbidden: CSRF token may be invalid or missing");
    }

    return Promise.reject(error);
  }
);

export default api;
export { getApiBase };
