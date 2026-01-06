import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useEffect } from "react";

const ProtectedLayout = () => {
  const { isAuthenticated, isLoading, sessionError, clearSessionError } =
    useAuth();
  const location = useLocation();

  // Store the intended destination for redirect after login
  // BUT do NOT store if user was just logged out - they should go to dashboard
  useEffect(() => {
    if (!isAuthenticated && !isLoading && location.pathname !== "/") {
      const justLoggedOut = sessionStorage.getItem("justLoggedOut");

      if (!justLoggedOut) {
        // Only store redirect path if user navigated to protected route while logged out
        // NOT if they were auto-logged out or clicked logout
        sessionStorage.setItem(
          "redirectAfterLogin",
          location.pathname + location.search
        );
      } else {
        // Don't remove `justLoggedOut` here — let the Login page read and
        // clear it so the signing-out animation can run. We still clear any
        // stored redirect path.
        sessionStorage.removeItem("redirectAfterLogin");
      }
    }
  }, [isAuthenticated, isLoading, location]);

  // Clear session error when navigating away
  useEffect(() => {
    return () => {
      if (sessionError) {
        clearSessionError?.();
      }
    };
  }, [sessionError, clearSessionError]);

  // Don't show loading spinner - let components handle their own initial render
  // This allows instant page rendering with component-level loading states
  // Authentication check happens in background

  if (!isAuthenticated) {
    // Pass session error state to login page
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location, sessionExpired: !!sessionError }}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedLayout;
