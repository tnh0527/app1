import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import App from "./App.jsx";
import { SidebarProvider, AuthProvider } from "./contexts";
import ErrorBoundary from "./components/shared/ErrorBoundary/ErrorBoundary.jsx";
import { initErrorHandlers } from "./utils/errorHandlers.js";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

Sentry.init({
  dsn: sentryDsn,
  enabled: Boolean(sentryDsn),
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration({
      tracePropagationTargets: [
        window.location.origin,
        /^https?:\/\/localhost[:0-9]*/,
        /^\/api\//,
      ],
    }),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.0,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event, hint) {
    // Scrub sensitive headers from captured requests
    if (event.request?.headers) {
      delete event.request.headers.Cookie;
      delete event.request.headers.Authorization;
    }
    // Scrub from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        if (breadcrumb.data?.headers) {
          delete breadcrumb.data.headers.Cookie;
          delete breadcrumb.data.headers.Authorization;
        }
        return breadcrumb;
      });
    }
    return event;
  },
});

// Initialize global error handlers
initErrorHandlers();

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <AuthProvider>
      <SidebarProvider>
        <App />
      </SidebarProvider>
    </AuthProvider>
  </ErrorBoundary>
);
