/**
 * Net Worth Dashboard API Client
 *
 * Provides a clean interface to the backend net worth endpoints.
 */

import api from "./axios";

const BASE_URL = "/api/networth";

/**
 * Dashboard API - Aggregated data endpoints
 */
export const dashboardApi = {
  /**
   * Get full dashboard data in one request
   */
  getFullDashboard: async (range = "1y") => {
    const response = await api.get(`${BASE_URL}/dashboard/`, {
      params: { range },
    });
    return response.data;
  },

  /**
   * Get dashboard summary (hero section data)
   */
  getSummary: async () => {
    const response = await api.get(`${BASE_URL}/dashboard/summary/`);
    return response.data;
  },

  /**
   * Get timeline data for charts
   */
  getTimeline: async (range = "1y") => {
    const response = await api.get(`${BASE_URL}/dashboard/timeline/`, {
      params: { range },
    });
    return response.data;
  },

  /**
   * Get forecast data
   */
  getForecast: async (months = 12) => {
    const response = await api.get(`${BASE_URL}/dashboard/forecast/`, {
      params: { months },
    });
    return response.data;
  },

  /**
   * Get insights and recent changes
   */
  getInsights: async (limit = 10) => {
    const response = await api.get(`${BASE_URL}/dashboard/insights/`, {
      params: { limit },
    });
    return response.data;
  },
};

/**
 * Financial Accounts API
 */
export const accountsApi = {
  /**
   * Get all accounts
   */
  getAll: async () => {
    const response = await api.get(`${BASE_URL}/accounts/`);
    return response.data;
  },

  /**
   * Get accounts grouped by type
   */
  getByType: async () => {
    const response = await api.get(`${BASE_URL}/accounts/by_type/`);
    return response.data;
  },

  /**
   * Get single account
   */
  get: async (id) => {
    const response = await api.get(`${BASE_URL}/accounts/${id}/`);
    return response.data;
  },

  /**
   * Create new account
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/accounts/`, data);
    return response.data;
  },

  /**
   * Update account
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/accounts/${id}/`, data);
    return response.data;
  },

  /**
   * Delete account
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/accounts/${id}/`);
  },

  /**
   * Quick update account value
   */
  updateValue: async (id, value, recordedAt = null) => {
    const data = { value };
    if (recordedAt) data.recorded_at = recordedAt;

    const response = await api.post(
      `${BASE_URL}/accounts/${id}/update_value/`,
      data
    );
    return response.data;
  },

  /**
   * Get account history
   */
  getHistory: async (id, limit = 30) => {
    const response = await api.get(`${BASE_URL}/accounts/${id}/history/`, {
      params: { limit },
    });
    return response.data;
  },
};

/**
 * Snapshots API
 */
export const snapshotsApi = {
  /**
   * Get account snapshots
   */
  getAll: async () => {
    const response = await api.get(`${BASE_URL}/snapshots/`);
    return response.data;
  },

  /**
   * Create snapshot
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/snapshots/`, data);
    return response.data;
  },

  /**
   * Bulk update snapshots
   */
  bulkUpdate: async (snapshots, recordedAt) => {
    const response = await api.post(`${BASE_URL}/snapshots/bulk_update/`, {
      snapshots,
      recorded_at: recordedAt,
    });
    return response.data;
  },

  /**
   * Generate net worth snapshot
   */
  generateNetWorth: async (recordedAt = null) => {
    const data = recordedAt ? { recorded_at: recordedAt } : {};
    const response = await api.post(
      `${BASE_URL}/networth-snapshots/generate/`,
      data
    );
    return response.data;
  },
};

/**
 * Subscriptions API
 */
export const subscriptionsApi = {
  /**
   * Get all subscriptions
   */
  getAll: async () => {
    const response = await api.get(`${BASE_URL}/subscriptions/`);
    return response.data;
  },

  /**
   * Get subscription summary
   */
  getSummary: async () => {
    const response = await api.get(`${BASE_URL}/subscriptions/summary/`);
    return response.data;
  },

  /**
   * Create subscription
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/subscriptions/`, data);
    return response.data;
  },

  /**
   * Update subscription
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/subscriptions/${id}/`, data);
    return response.data;
  },

  /**
   * Delete subscription
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/subscriptions/${id}/`);
  },

  /**
   * Toggle subscription active status
   */
  toggleActive: async (id) => {
    const response = await api.post(
      `${BASE_URL}/subscriptions/${id}/toggle_active/`
    );
    return response.data;
  },
};

/**
 * Cash Flow API
 */
export const cashFlowApi = {
  /**
   * Get all cash flow entries
   */
  getAll: async () => {
    const response = await api.get(`${BASE_URL}/cashflow/`);
    return response.data;
  },

  /**
   * Get monthly summary
   */
  getMonthlySummary: async (year = null, month = null) => {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;

    const response = await api.get(`${BASE_URL}/cashflow/monthly_summary/`, {
      params,
    });
    return response.data;
  },

  /**
   * Create cash flow entry
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/cashflow/`, data);
    return response.data;
  },

  /**
   * Update cash flow entry
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/cashflow/${id}/`, data);
    return response.data;
  },

  /**
   * Delete cash flow entry
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/cashflow/${id}/`);
  },
};

/**
 * Milestones API
 */
export const milestonesApi = {
  /**
   * Get all milestones with progress
   */
  getAllWithProgress: async () => {
    const response = await api.get(`${BASE_URL}/milestones/with_progress/`);
    return response.data;
  },

  /**
   * Get all milestones
   */
  getAll: async () => {
    const response = await api.get(`${BASE_URL}/milestones/`);
    return response.data;
  },

  /**
   * Create milestone
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/milestones/`, data);
    return response.data;
  },

  /**
   * Update milestone
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/milestones/${id}/`, data);
    return response.data;
  },

  /**
   * Delete milestone
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/milestones/${id}/`);
  },

  /**
   * Mark milestone as celebrated
   */
  celebrate: async (id) => {
    const response = await api.post(`${BASE_URL}/milestones/${id}/celebrate/`);
    return response.data;
  },
};

/**
 * Change Log API
 */
export const changeLogApi = {
  /**
   * Get recent changes
   */
  getRecent: async (limit = 10) => {
    const response = await api.get(`${BASE_URL}/changelog/`, {
      params: { limit },
    });
    return response.data;
  },
};

// Default export with all APIs
export default {
  dashboard: dashboardApi,
  accounts: accountsApi,
  snapshots: snapshotsApi,
  subscriptions: subscriptionsApi,
  cashFlow: cashFlowApi,
  milestones: milestonesApi,
  changeLog: changeLogApi,
};

