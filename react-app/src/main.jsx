import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { SidebarProvider } from "./layout/Sidebar/Context.jsx";
import { AuthProvider } from "./utils/AuthContext.jsx";

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <SidebarProvider>
      <App />
    </SidebarProvider>
  </AuthProvider>
);
