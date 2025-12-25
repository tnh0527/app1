import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

const AUTH_KEY = "isAuthenticated";

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem(AUTH_KEY) === "true" ||
      sessionStorage.getItem(AUTH_KEY) === "true"
  );

  const login = (rememberMe = false) => {
    setIsAuthenticated(true);

    // Ensure the flag only lives in one place at a time.
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);

    (rememberMe ? localStorage : sessionStorage).setItem(AUTH_KEY, "true");
  };

  const logout = () => {
    setIsAuthenticated(false);

    // Only clear auth state; don't wipe unrelated caches/preferences.
    localStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(AUTH_KEY);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
