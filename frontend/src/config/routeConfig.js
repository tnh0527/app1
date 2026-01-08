/**
 * Route Configuration for Dynamic Header
 *
 * Centralized configuration for route-specific header content.
 * This configuration drives the dynamic header component.
 */

import { iconsImgs } from "../utils/images";

/**
 * Route metadata configuration
 *
 * Each route can have:
 * - title: Static string or function(params) => string
 * - subtitle: Static string or function(params, currentDate) => string
 * - icon: Iconify icon name
 * - actions: Array of action buttons to show
 * - breadcrumbs: Array of breadcrumb items
 * - showSearch: Whether to show search in header
 */
export const ROUTE_CONFIG = {
  // Dashboard
  "/dashboard": {
    title: "Dashboard",
    subtitle: (params, date) => date,
    icon: iconsImgs.home,
    actions: ["refresh"],
    showSearch: false,
  },

  // Calendar
  "/calendar": {
    title: "Calendar",
    subtitle: "Manage your schedule and events.",
    icon: iconsImgs.calendar,
    actions: ["addEvent", "refresh"],
    showSearch: false,
  },
  "/calendar/:view": {
    title: "Calendar",
    subtitle: (params) => {
      const viewNames = {
        month: "Monthly View",
        week: "Weekly View",
        day: "Daily View",
        agenda: "Agenda View",
      };
      return viewNames[params.view] || "Manage your schedule and events.";
    },
    icon: iconsImgs.calendar,
    actions: ["addEvent", "refresh"],
  },

  // Weather
  "/weather": {
    title: "Weather",
    subtitle: "Current conditions and forecasts.",
    icon: iconsImgs.weather,
    actions: ["addLocation", "refresh"],
    showSearch: true,
    searchPlaceholder: "Search location...",
  },
  "/weather/:location": {
    title: "Weather",
    subtitle: (params) => decodeURIComponent(params.location || ""),
    icon: iconsImgs.weather,
    actions: ["saveLocation", "refresh"],
    showSearch: true,
    searchPlaceholder: "Search location...",
  },

  // Financials
  "/financials": {
    title: "Financials",
    subtitle: "Track your wealth and investments.",
    icon: iconsImgs.wallet,
    actions: ["addAccount", "refresh"],
    showSearch: false,
  },
  "/financials/:tab": {
    title: "Financials",
    subtitle: (params) => {
      const tabNames = {
        overview: "Net worth overview",
        accounts: "Manage accounts",
        timeline: "Historical data",
        goals: "Financial goals",
      };
      return tabNames[params.tab] || "Track your wealth and investments.";
    },
    icon: iconsImgs.wallet,
    actions: ["addAccount", "refresh"],
  },

  // Subscriptions
  "/subscriptions": {
    title: "Subscriptions",
    subtitle: "Manage your recurring payments.",
    icon: iconsImgs.bills,
    actions: ["addSubscription", "refresh"],
    showSearch: true,
    searchPlaceholder: "Search subscriptions...",
  },
  "/subscriptions/:filter": {
    title: "Subscriptions",
    subtitle: (params) => {
      const filterNames = {
        active: "Active subscriptions",
        paused: "Paused subscriptions",
        cancelled: "Cancelled subscriptions",
        all: "All subscriptions",
      };
      return filterNames[params.filter] || "Manage your recurring payments.";
    },
    icon: iconsImgs.bills,
    actions: ["addSubscription", "refresh"],
  },

  // Travel
  "/travel": {
    title: "Travel",
    subtitle: "Plan and track your trips.",
    icon: iconsImgs.plane,
    actions: ["addTrip", "refresh"],
    showSearch: false,
  },
  "/travel/:tab": {
    title: "Travel",
    subtitle: (params) => {
      const tabNames = {
        upcoming: "Upcoming trips",
        past: "Past trips",
        planning: "Trip planning",
        goals: "Travel goals",
      };
      return tabNames[params.tab] || "Plan and track your trips.";
    },
    icon: iconsImgs.plane,
    actions: ["addTrip", "refresh"],
  },
  "/travel/:tab/:tripId": {
    title: "Trip Details",
    subtitle: "View and manage trip details.",
    icon: iconsImgs.plane,
    actions: ["editTrip", "deleteTrip"],
    breadcrumbs: [
      { label: "Travel", path: "/travel" },
      { label: "Trip Details", path: null },
    ],
  },

  // AI Foundry
  "/ai-foundry": {
    title: "AI Foundry",
    subtitle: "Craft your own personalized AI models.",
    icon: iconsImgs.report,
    actions: ["newChat"],
    showSearch: false,
  },

  // Profile
  "/profile": {
    title: "Profile",
    subtitle: "Manage your account settings.",
    icon: iconsImgs.user,
    actions: ["editProfile"],
    showSearch: false,
  },
  "/profile/:section": {
    title: "Profile",
    subtitle: (params) => {
      const sectionNames = {
        general: "General settings",
        security: "Security settings",
        notifications: "Notification preferences",
        appearance: "Appearance settings",
      };
      return sectionNames[params.section] || "Manage your account settings.";
    },
    icon: iconsImgs.user,
    actions: ["editProfile"],
  },
};

/**
 * Action button configurations
 */
export const ACTION_BUTTONS = {
  refresh: {
    id: "refresh",
    icon: "bi:arrow-clockwise",
    label: "Refresh",
    tooltip: "Refresh data",
  },
  addEvent: {
    id: "addEvent",
    icon: "bi:plus-circle",
    label: "Add Event",
    tooltip: "Create new event",
  },
  addLocation: {
    id: "addLocation",
    icon: "bi:geo-alt-fill",
    label: "Add Location",
    tooltip: "Add saved location",
  },
  saveLocation: {
    id: "saveLocation",
    icon: "bi:bookmark-plus",
    label: "Save",
    tooltip: "Save this location",
  },
  addAccount: {
    id: "addAccount",
    icon: "bi:plus-circle",
    label: "Add Account",
    tooltip: "Add financial account",
  },
  addSubscription: {
    id: "addSubscription",
    icon: "bi:plus-circle",
    label: "Add",
    tooltip: "Add subscription",
  },
  addTrip: {
    id: "addTrip",
    icon: "bi:plus-circle",
    label: "New Trip",
    tooltip: "Plan a new trip",
  },
  editTrip: {
    id: "editTrip",
    icon: "bi:pencil",
    label: "Edit",
    tooltip: "Edit trip",
  },
  deleteTrip: {
    id: "deleteTrip",
    icon: "bi:trash",
    label: "Delete",
    tooltip: "Delete trip",
    variant: "danger",
  },
  newChat: {
    id: "newChat",
    icon: "bi:chat-dots",
    label: "New Chat",
    tooltip: "Start new AI chat",
  },
  editProfile: {
    id: "editProfile",
    icon: "bi:pencil",
    label: "Edit",
    tooltip: "Edit profile",
  },
};

/**
 * Get route configuration for a given path
 *
 * @param {string} pathname - Current pathname
 * @param {Object} params - Route params from useParams()
 * @returns {Object} Route configuration
 */
export function getRouteConfig(pathname, params = {}) {
  // Try exact match first
  if (ROUTE_CONFIG[pathname]) {
    return ROUTE_CONFIG[pathname];
  }

  // Try pattern matching with params
  // Extract the base path (e.g., "/dashboard" from "/dashboard/overview")
  const pathParts = pathname.split("/").filter(Boolean);
  const basePath = "/" + pathParts[0];

  // Check for parameterized routes
  for (const [pattern, config] of Object.entries(ROUTE_CONFIG)) {
    const patternParts = pattern.split("/").filter(Boolean);

    // Skip if different number of parts
    if (patternParts.length !== pathParts.length) continue;

    // Check if pattern matches
    let matches = true;
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(":")) continue; // Parameter placeholder
      if (patternParts[i] !== pathParts[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      return config;
    }
  }

  // Fallback to base path config
  return ROUTE_CONFIG[basePath] || ROUTE_CONFIG["/dashboard"];
}

/**
 * Resolve dynamic values in route config
 *
 * @param {Object} config - Route configuration
 * @param {Object} params - Route params
 * @param {string} currentDate - Formatted current date
 * @returns {Object} Resolved configuration
 */
export function resolveRouteConfig(config, params = {}, currentDate = "") {
  return {
    ...config,
    title:
      typeof config.title === "function"
        ? config.title(params, currentDate)
        : config.title,
    subtitle:
      typeof config.subtitle === "function"
        ? config.subtitle(params, currentDate)
        : config.subtitle,
  };
}

export default {
  ROUTE_CONFIG,
  ACTION_BUTTONS,
  getRouteConfig,
  resolveRouteConfig,
};
