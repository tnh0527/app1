import { Outlet } from "react-router-dom";
import { Sidebar } from "../components";
import { useContext } from "react";
import { SidebarContext } from "../contexts/SidebarContext";

const AppShell = () => {
  const { isSidebarOpen } = useContext(SidebarContext);

  return (
    <div className="app">
      <Sidebar />
      {/* Spacer to offset the fixed sidebar */}
      <div className={`sidebar-spacer ${!isSidebarOpen ? "collapsed" : ""}`} />
      <Outlet />
    </div>
  );
};

export default AppShell;
