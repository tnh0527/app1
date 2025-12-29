import { Outlet } from "react-router-dom";
import { Sidebar } from "../components";

const AppShell = () => {
  return (
    <div className="app">
      <Sidebar />
      <Outlet />
    </div>
  );
};

export default AppShell;
