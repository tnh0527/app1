import { Routes, Route, Navigate } from "react-router-dom";
import SidebarProvider from "../Sidebar/SidebarProvider";
import Schedule from "../../pages/Schedule/Schedule";

const ScheduleContent = () => {
  return (
    <div className="app">
      <SidebarProvider />
      <Routes>
        <Route path="" element={<Schedule />}></Route>
      </Routes>
    </div>
  );
};

export default ScheduleContent;
