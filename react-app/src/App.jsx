import "./App.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "./utils/ProtectedRoute";
import Login from "./pages/Login/Login";
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
      path: "/account/*",
      element: <ProtectedRoute element={<Account />} />,
    },
  ]);

  return (
    <div className="App">
      <RouterProvider router={route} />
    </div>
  );
}

export default App;
