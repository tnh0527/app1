import { Routes, Route, Navigate } from "react-router-dom";
import Schedule from "../../pages/Schedule/Schedule";
import SidebarProvider from "../Sidebar/SidebarProvider";

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
