import "./styles/global.css";
import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
} from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./api/queryClient";
import { ProfileProvider, ConnectionProvider } from "./contexts";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedLayout } from "./components";
import ConnectionStatus from "./components/shared/ConnectionStatus";
import { SpeedInsights } from "@vercel/speed-insights/react";
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
import TitleLayout from "./components/TitleUpdater/TitleLayout";

function App() {
  const route = createBrowserRouter([
    {
      element: <TitleLayout />,
      children: [
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
      ],
    },
  ]);

  return (
    <div className="app">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ConnectionProvider>
            <ProfileProvider>
              <ConnectionStatus />
              <RouterProvider router={route} />
              <SpeedInsights />
            </ProfileProvider>
          </ConnectionProvider>
        </AuthProvider>
        {/* React Query DevTools - only shows in development */}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </div>
  );
}

export default App;
