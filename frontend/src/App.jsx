import "./styles/global.css";
import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { ProfileProvider } from "./contexts";
import { ProtectedLayout } from "./components";
import {
  AppShell,
  Dashboard,
  EditProfile,
  Login,
  NetWorth,
  Schedule,
  Settings,
  Subscriptions,
  Travel,
  Weather,
} from "./pages";

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
              path: "/networth/*",
              element: <NetWorth />,
            },
            {
              path: "/subscriptions/*",
              element: <Subscriptions />,
            },
            {
              path: "/travel/*",
              element: <Travel />,
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
    <div className="app">
      <ProfileProvider>
        <RouterProvider router={route} />
      </ProfileProvider>
    </div>
  );
}

export default App;
