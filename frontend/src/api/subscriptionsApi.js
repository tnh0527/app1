/**
 * Subscriptions API Client
 */

import api from "./axios";

const BASE_URL = "/api/subscriptions";

/**
 * Dashboard API
 */
export const dashboardApi = {
  getFullDashboard: async () => {
    const response = await api.get(`${BASE_URL}/dashboard/`);
    return response.data;
  },

  getSummary: async () => {
    const response = await api.get(`${BASE_URL}/dashboard/summary/`);
    return response.data;
  },

  getUpcoming: async (days = 30) => {
    const response = await api.get(`${BASE_URL}/dashboard/upcoming/`, {
      params: { days },
    });
    return response.data;
  },

  getUnused: async (days = 60) => {
    const response = await api.get(`${BASE_URL}/dashboard/unused/`, {
      params: { days },
    });
    return response.data;
  },

  getHistory: async (months = 12) => {
    const response = await api.get(`${BASE_URL}/dashboard/history/`, {
      params: { months },
    });
    return response.data;
  },

  getCategories: async () => {
    const response = await api.get(`${BASE_URL}/dashboard/categories/`);
    return response.data;
  },

  // Convenience methods that delegate to subscriptions API
  createSubscription: async (data) => {
    const response = await api.post(`${BASE_URL}/subscriptions/`, data);
    return response.data;
  },

  updateSubscription: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/subscriptions/${id}/`, data);
    return response.data;
  },

  deleteSubscription: async (id) => {
    await api.delete(`${BASE_URL}/subscriptions/${id}/`);
  },

  logUsage: async (id, data = {}) => {
    const response = await api.post(
      `${BASE_URL}/subscriptions/${id}/record_usage/`,
      data
    );
    return response.data;
  },
};

/**
 * Subscriptions CRUD
 */
export const subscriptionsApi = {
  getAll: async () => {
    const response = await api.get(`${BASE_URL}/subscriptions/`);
    return response.data;
  },

  getByCategory: async () => {
    const response = await api.get(`${BASE_URL}/subscriptions/by_category/`);
    return response.data;
  },

  get: async (id) => {
    const response = await api.get(`${BASE_URL}/subscriptions/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post(`${BASE_URL}/subscriptions/`, data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/subscriptions/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`${BASE_URL}/subscriptions/${id}/`);
  },

  pause: async (id) => {
    const response = await api.post(`${BASE_URL}/subscriptions/${id}/pause/`);
    return response.data;
  },

  resume: async (id) => {
    const response = await api.post(`${BASE_URL}/subscriptions/${id}/resume/`);
    return response.data;
  },

  cancel: async (id) => {
    const response = await api.post(`${BASE_URL}/subscriptions/${id}/cancel/`);
    return response.data;
  },

  recordUsage: async (id, data = {}) => {
    const response = await api.post(
      `${BASE_URL}/subscriptions/${id}/record_usage/`,
      data
    );
    return response.data;
  },

  getCharges: async (id) => {
    const response = await api.get(`${BASE_URL}/subscriptions/${id}/charges/`);
    return response.data;
  },

  getUsageHistory: async (id) => {
    const response = await api.get(
      `${BASE_URL}/subscriptions/${id}/usage_history/`
    );
    return response.data;
  },

  syncToCalendar: async (id) => {
    const response = await api.post(
      `${BASE_URL}/subscriptions/${id}/sync_to_calendar/`
    );
    return response.data;
  },

  syncAllToCalendar: async () => {
    const response = await api.post(
      `${BASE_URL}/subscriptions/sync_all_to_calendar/`
    );
    return response.data;
  },
};

/**
 * Alerts API
 */
export const alertsApi = {
  getAll: async () => {
    const response = await api.get(`${BASE_URL}/alerts/`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post(`${BASE_URL}/alerts/`, data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/alerts/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    await api.delete(`${BASE_URL}/alerts/${id}/`);
  },

  evaluateAll: async () => {
    const response = await api.post(`${BASE_URL}/alerts/evaluate_all/`);
    return response.data;
  },

  getActiveEvents: async () => {
    const response = await api.get(`${BASE_URL}/alert-events/active/`);
    return response.data;
  },

  dismissEvent: async (id, notes = "") => {
    const response = await api.post(`${BASE_URL}/alert-events/${id}/dismiss/`, {
      notes,
    });
    return response.data;
  },

  markEventRead: async (id) => {
    const response = await api.post(
      `${BASE_URL}/alert-events/${id}/mark_read/`
    );
    return response.data;
  },
};

export default {
  dashboard: dashboardApi,
  subscriptions: subscriptionsApi,
  alerts: alertsApi,
};

