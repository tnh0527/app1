import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { SidebarProvider, AuthProvider } from "./contexts";
import ErrorBoundary from "./components/shared/ErrorBoundary/ErrorBoundary.jsx";
import { initErrorHandlers } from "./utils/errorHandlers.js";

// Initialize global error handlers
initErrorHandlers();

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <AuthProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </AuthProvider>
  </ErrorBoundary>
);
