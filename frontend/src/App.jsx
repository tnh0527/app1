import "./styles/global.css";
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
import { ProfileProvider, ConnectionProvider } from "./contexts";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedLayout } from "./components";
import ConnectionStatus from "./components/shared/ConnectionStatus";
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
  ResetPassword,
  VerifyEmail,
} from "./pages";

function App() {
  const route = createBrowserRouter([
    {
      path: "/",
      element: <Login />,
    },
    {
      path: "/login",
      element: <Navigate to="/" replace />,
    },
    {
      path: "/reset-password/:uid/:token",
      element: <ResetPassword />,
    },
    {
      path: "/verify-email/:uid/:token",
      element: <VerifyEmail />,
    },
    {
      element: <ProtectedLayout />,
      children: [
        {
          element: <AppShell />,
          children: [
            {
              path: "/dashboard",
              element: <Dashboard />,
            },
            {
              path: "/dashboard/:tab",
              element: <Dashboard />,
            },
            {
              path: "/home",
              element: <Navigate to="/dashboard" replace />,
            },
            {
              path: "/home/*",
              element: <Navigate to="/dashboard" replace />,
            },
            {
              path: "/calendar",
              element: <Calendar />,
            },
            {
              path: "/calendar/:view",
              element: <Calendar />,
            },
            {
              path: "/schedule",
              element: <Navigate to="/calendar" replace />,
            },
            {
              path: "/schedule/*",
              element: <Navigate to="/calendar" replace />,
            },
            {
              path: "/weather",
              element: <Weather />,
            },
            {
              path: "/weather/:location",
              element: <Weather />,
            },
            {
              path: "/financials",
              element: <Financials />,
            },
            {
              path: "/financials/:tab",
              element: <Financials />,
            },
            {
              path: "/networth",
              element: <Navigate to="/financials" replace />,
            },
            {
              path: "/networth/*",
              element: <Navigate to="/financials" replace />,
            },
            {
              path: "/subscriptions",
              element: <Subscriptions />,
            },
            {
              path: "/subscriptions/:filter",
              element: <Subscriptions />,
            },
            {
              path: "/travel",
              element: <Travel />,
            },
            {
              path: "/travel/:tab",
              element: <Travel />,
            },
            {
              path: "/travel/:tab/:tripId",
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
            {
              path: "/profile/:section",
              element: <Profile />,
            },
          ],
        },
      ],
    },
    // Catch-all route - redirect to dashboard if authenticated, login otherwise
    {
      path: "*",
      element: <Navigate to="/dashboard" replace />,
    },
  ]);

  return (
    <div className="app">
      <AuthProvider>
        <ConnectionProvider>
          <ProfileProvider>
            <ConnectionStatus />
            <RouterProvider router={route} />
          </ProfileProvider>
        </ConnectionProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
