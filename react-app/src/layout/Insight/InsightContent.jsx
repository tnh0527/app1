import SidebarProvider from "../Sidebar/SidebarProvider";
import Insight from "../../pages/Insight/Insight";
import { Route, Routes } from "react-router-dom";

const InsightContent = () => {
  return (
    <div className="app">
      <SidebarProvider />
      <Routes>
        <Route path="" element={<Insight />}></Route>
      </Routes>
    </div>
  );
};

export default InsightContent;
