import { Outlet } from "react-router-dom";
import SidebarProvider from "./Sidebar/SidebarProvider";

const AppShell = () => {
  return (
    <div className="app">
      <SidebarProvider />
      <Outlet />
    </div>
  );
};

export default AppShell;
