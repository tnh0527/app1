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

const api = axios.create({
  baseURL: "http://localhost:8000", // Change this to your Supabase/Production URL later
  withCredentials: true, // Important for session cookies
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor to add CSRF token to every request
api.interceptors.request.use(
  (config) => {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
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
