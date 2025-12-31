import "./styles/global.css";
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
import { ProfileProvider } from "./contexts";
import { ProtectedLayout } from "./components";
import {
  AppShell,
  Dashboard,
  Profile,
  Login,
  Financials,
  Calendar,
  Subscriptions,
  Travel,
  Weather,
  AIFoundry,
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
              path: "/dashboard/*",
              element: <Dashboard />,
            },
            {
              path: "/home/*",
              element: <Navigate to="/dashboard" replace />,
            },
            {
              path: "/calendar/*",
              element: <Calendar />,
            },
            {
              path: "/schedule/*",
              element: <Navigate to="/calendar" replace />,
            },
            {
              path: "/weather/*",
              element: <Weather />,
            },
            {
              path: "/financials/*",
              element: <Financials />,
            },
            {
              path: "/networth/*",
              element: <Navigate to="/financials" replace />,
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
              path: "/ai-foundry",
              element: <AIFoundry />,
            },
            {
              path: "/profile",
              element: <Profile />,
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
