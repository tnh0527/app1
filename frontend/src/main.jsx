import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { SidebarProvider, AuthProvider } from "./contexts";

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <SidebarProvider>
      <App />
    </SidebarProvider>
  </AuthProvider>
);
