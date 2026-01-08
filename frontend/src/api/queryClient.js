/**
 * React Query Configuration
 *
 * Centralized React Query setup for client-side caching and data fetching.
 * Configured to work in tandem with backend Redis caching.
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Default stale times aligned with backend cache TTLs.
 * Frontend stale times are slightly less than backend TTLs
 * to ensure fresh data is fetched before server cache expires.
 */
export const STALE_TIMES = {
  // Weather data - backend caches for 5-15 min
  weather: 4 * 60 * 1000, // 4 minutes
  weatherForecast: 10 * 60 * 1000, // 10 minutes
  weatherAqi: 25 * 60 * 1000, // 25 minutes

  // Financials - backend caches for 5-10 min
  financials: 4 * 60 * 1000, // 4 minutes
  financialsSummary: 5 * 60 * 1000, // 5 minutes

  // Subscriptions - backend caches for 5-10 min
  subscriptions: 4 * 60 * 1000, // 4 minutes
  subscriptionsSummary: 5 * 60 * 1000, // 5 minutes

  // Travel - backend caches for 10 min
  travel: 8 * 60 * 1000, // 8 minutes

  // Profile - backend caches for 5 min
  profile: 4 * 60 * 1000, // 4 minutes

  // Calendar events - frequently updated
  events: 2 * 60 * 1000, // 2 minutes

  // Static data - rarely changes
  static: 60 * 60 * 1000, // 1 hour

  // API status - cached for 1 hour
  apiStatus: 55 * 60 * 1000, // 55 minutes
};

/**
 * Cache times - how long to keep data in React Query cache
 * after it becomes inactive (no components using it).
 */
export const GC_TIMES = {
  default: 10 * 60 * 1000, // 10 minutes
  weather: 15 * 60 * 1000, // 15 minutes
  static: 60 * 60 * 1000, // 1 hour
};

/**
 * Create and configure the QueryClient
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time - data is considered fresh for 3 minutes
      staleTime: 3 * 60 * 1000,

      // Keep inactive data in cache for 10 minutes
      gcTime: GC_TIMES.default,

      // Don't refetch on window focus for most data
      refetchOnWindowFocus: false,

      // Don't refetch on reconnect unless stale
      refetchOnReconnect: "always",

      // Retry failed requests once
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

      // Use error boundaries for error handling
      throwOnError: false,

      // Network mode - only fetch when online
      networkMode: "online",
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,

      // Network mode for mutations
      networkMode: "online",
    },
  },
});

/**
 * Query key factory for consistent key generation.
 * Using arrays allows for partial invalidation.
 */
export const queryKeys = {
  // Auth
  auth: {
    session: ["auth", "session"],
    user: ["auth", "user"],
  },

  // Profile
  profile: {
    all: ["profile"],
    detail: () => [...queryKeys.profile.all, "detail"],
    settings: () => [...queryKeys.profile.all, "settings"],
  },

  // Weather
  weather: {
    all: ["weather"],
    current: (location) => [...queryKeys.weather.all, "current", location],
    forecast: (location) => [...queryKeys.weather.all, "forecast", location],
    full: (location) => [...queryKeys.weather.all, "full", location],
    savedLocations: () => [...queryKeys.weather.all, "savedLocations"],
    apiStatus: () => [...queryKeys.weather.all, "apiStatus"],
  },

  // Financials
  financials: {
    all: ["financials"],
    accounts: () => [...queryKeys.financials.all, "accounts"],
    account: (id) => [...queryKeys.financials.all, "account", id],
    summary: () => [...queryKeys.financials.all, "summary"],
    timeline: (range) => [...queryKeys.financials.all, "timeline", range],
    dashboard: (range) => [...queryKeys.financials.all, "dashboard", range],
    milestones: () => [...queryKeys.financials.all, "milestones"],
  },

  // Subscriptions
  subscriptions: {
    all: ["subscriptions"],
    list: (filters) => [...queryKeys.subscriptions.all, "list", filters],
    detail: (id) => [...queryKeys.subscriptions.all, "detail", id],
    summary: () => [...queryKeys.subscriptions.all, "summary"],
    dashboard: () => [...queryKeys.subscriptions.all, "dashboard"],
    upcoming: (days) => [...queryKeys.subscriptions.all, "upcoming", days],
  },

  // Travel
  travel: {
    all: ["travel"],
    trips: (filters) => [...queryKeys.travel.all, "trips", filters],
    trip: (id) => [...queryKeys.travel.all, "trip", id],
    analytics: () => [...queryKeys.travel.all, "analytics"],
    goals: () => [...queryKeys.travel.all, "goals"],
  },

  // Calendar/Events
  events: {
    all: ["events"],
    list: (range) => [...queryKeys.events.all, "list", range],
    detail: (id) => [...queryKeys.events.all, "detail", id],
  },
};

/**
 * Utility to invalidate related queries after mutations.
 * Use this in mutation onSuccess callbacks.
 */
export const invalidateQueries = {
  // Invalidate all weather-related queries
  weather: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.weather.all });
  },

  // Invalidate all financial queries
  financials: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.financials.all });
  },

  // Invalidate all subscription queries
  subscriptions: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all });
  },

  // Invalidate all travel queries
  travel: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.travel.all });
  },

  // Invalidate all event queries
  events: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.events.all });
  },

  // Invalidate profile
  profile: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.all });
  },

  // Invalidate everything (use sparingly)
  all: () => {
    queryClient.invalidateQueries();
  },
};

export default queryClient;
