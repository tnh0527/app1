import { Outlet } from "react-router-dom";
import { Sidebar } from "../components";
import { useContext } from "react";
import { SidebarContext } from "../contexts/SidebarContext";

const AppShell = () => {
  const { isSidebarOpen } = useContext(SidebarContext);

  return (
    <div className="app">
      {/* Global Animated Background */}
      <div className="app-bg">
        <div className="bg-gradient-orb bg-orb-1"></div>
        <div className="bg-gradient-orb bg-orb-2"></div>
        <div className="bg-gradient-orb bg-orb-3"></div>
        <div className="bg-gradient-orb bg-orb-4"></div>
        <div className="bg-gradient-orb bg-orb-5"></div>
        <div className="bg-gradient-orb bg-orb-6"></div>
        <div className="bg-gradient-orb bg-orb-7"></div>
        <div className="bg-gradient-orb bg-orb-8"></div>
        <div className="bg-mesh"></div>
        <div className="bg-noise"></div>
      </div>

      <Sidebar />
      {/* Spacer to offset the fixed sidebar */}
      <div className={`sidebar-spacer ${!isSidebarOpen ? "collapsed" : ""}`} />
      <Outlet />
    </div>
  );
};

export default AppShell;
