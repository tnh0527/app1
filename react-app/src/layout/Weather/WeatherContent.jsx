import SidebarProvider from "../Sidebar/SidebarProvider";
import Weather from "../../pages/Weather/Weather";
import { Routes, Route } from "react-router-dom";

const WeatherContent = () => {
  return (
    <div className="app">
      <SidebarProvider />
      <Routes>
        <Route path="" element={<Weather />}></Route>
      </Routes>
    </div>
  );
};

export default WeatherContent;
