import "./App.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import Login from "./pages/Login/Login";
import Dashboard from "./layout/Dashboard/Dashboard";
import { ProfileProvider } from "./utils/ProfileContext";
import Settings from "./pages/Settings/Settings";
import AppShell from "./layout/AppShell";
import ProtectedLayout from "./utils/ProtectedLayout";
import Schedule from "./pages/Schedule/Schedule";
import Weather from "./pages/Weather/Weather";
import Insight from "./pages/Insight/Insight";
import EditProfile from "./pages/Account/EditProfile";

function App() {
  const route = createBrowserRouter([
    {
      path: "/",
      element: <Login />,
    },
    {
      element: <ProtectedLayout />,
      children: [
        {
          element: <AppShell />,
          children: [
            {
              path: "/home/*",
              element: <Dashboard />,
            },
            {
              path: "/schedule/*",
              element: <Schedule />,
            },
            {
              path: "/weather/*",
              element: <Weather />,
            },
            {
              path: "/insight/*",
              element: <Insight />,
            },
            {
              path: "/settings/*",
              element: <Settings />,
            },
            {
              path: "/account",
              element: <EditProfile />,
            },
          ],
        },
      ],
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
