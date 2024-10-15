import "./App.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Login from "./components/Login/Login";
import SidebarProvider from "./layout/Sidebar/SidebarProvider";
import Dashboard from "./layout/Dashboard/Dashboard";
import Account from "./layout/Account/AccountContent";
import ScheduleContent from "./layout/Schedule/ScheduleContent";

function App() {
  const route = createBrowserRouter([
    {
      path: "/",
      element: <Login />,
    },
    {
      path: "/home",
      element: (
        <div className="app">
          <SidebarProvider />
          <Dashboard />
        </div>
      ),
    },
    {
      path: "/schedule/*",
      element: <ScheduleContent />,
    },

    {
      path: "/account/*",
      element: <Account />,
    },
  ]);

  return (
    <div className="App">
      <RouterProvider router={route} />
    </div>
  );
}

export default App;
