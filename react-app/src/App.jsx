import "./App.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./utils/ProtectedRoute";
import Login from "./pages/Login/Login";
import SidebarProvider from "./layout/Sidebar/SidebarProvider";
import Dashboard from "./layout/Dashboard/Dashboard";
import Account from "./layout/Account/AccountContent";
import ScheduleContent from "./layout/Schedule/ScheduleContent";
import WeatherContent from "./layout/Weather/WeatherContent";
import InsightContent from "./layout/Insight/InsightContent";
import { ProfileProvider } from "./utils/ProfileContext";

function App() {
  const route = createBrowserRouter([
    {
      path: "/",
      element: <Login />,
    },
    {
      path: "/home/*",
      element: (
        <ProtectedRoute
          element={
            <div className="app">
              <SidebarProvider />
              <Dashboard />
            </div>
          }
        />
      ),
    },
    {
      path: "/schedule/*",
      element: <ProtectedRoute element={<ScheduleContent />} />,
    },

    {
      path: "/weather/*",
      element: <ProtectedRoute element={<WeatherContent />} />,
    },
    {
      path: "/insight/*",
      element: <ProtectedRoute element={<InsightContent />} />,
    },

    {
      path: "/account/*",
      element: <ProtectedRoute element={<Account />} />,
    },
  ]);

  return (
    <div className="App">
      <ProfileProvider>
        <RouterProvider router={route} />
      </ProfileProvider>
    </div>
  );
}

export default App;
