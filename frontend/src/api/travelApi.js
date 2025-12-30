/**
 * Travel Management API Client
 *
 * Provides a clean interface to the backend travel endpoints.
 */

import api from "./axios";

const BASE_URL = "/api/travel";

/**
 * Dashboard API - Aggregated data endpoints
 */
export const dashboardApi = {
  /**
   * Get full dashboard data
   */
  getDashboard: async () => {
    const response = await api.get(`${BASE_URL}/dashboard/`);
    return response.data;
  },

  /**
   * Get travel analytics
   */
  getAnalytics: async () => {
    const response = await api.get(`${BASE_URL}/analytics/`);
    return response.data;
  },

  /**
   * Get map data for world visualization
   */
  getMapData: async () => {
    const response = await api.get(`${BASE_URL}/map/`);
    return response.data;
  },
};

/**
 * Trips API
 */
export const tripsApi = {
  /**
   * Get all trips
   */
  getAll: async (params = {}) => {
    const response = await api.get(`${BASE_URL}/trips/`, { params });
    return response.data;
  },

  /**
   * Get single trip with full details
   */
  get: async (id) => {
    const response = await api.get(`${BASE_URL}/trips/${id}/`);
    return response.data;
  },

  /**
   * Create new trip
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/trips/`, data);
    return response.data;
  },

  /**
   * Update trip
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/trips/${id}/`, data);
    return response.data;
  },

  /**
   * Delete trip
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/trips/${id}/`);
  },

  /**
   * Get upcoming trips
   */
  getUpcoming: async () => {
    const response = await api.get(`${BASE_URL}/trips/upcoming/`);
    return response.data;
  },

  /**
   * Get active trip (currently in progress)
   */
  getActive: async () => {
    const response = await api.get(`${BASE_URL}/trips/active/`);
    return response.data;
  },

  /**
   * Get recent completed trips
   */
  getRecent: async () => {
    const response = await api.get(`${BASE_URL}/trips/recent/`);
    return response.data;
  },

  /**
   * Archive trip
   */
  archive: async (id) => {
    const response = await api.post(`${BASE_URL}/trips/${id}/archive/`);
    return response.data;
  },

  /**
   * Unarchive trip
   */
  unarchive: async (id) => {
    const response = await api.post(`${BASE_URL}/trips/${id}/unarchive/`);
    return response.data;
  },

  /**
   * Duplicate trip
   */
  duplicate: async (id, data = {}) => {
    const response = await api.post(`${BASE_URL}/trips/${id}/duplicate/`, data);
    return response.data;
  },

  /**
   * Update trip status
   */
  updateStatus: async (id, status) => {
    const response = await api.post(`${BASE_URL}/trips/${id}/update_status/`, {
      status,
    });
    return response.data;
  },

  /**
   * Get budget breakdown for a trip
   */
  getBudgetBreakdown: async (id) => {
    const response = await api.get(`${BASE_URL}/trips/${id}/budget_breakdown/`);
    return response.data;
  },

  /**
   * Get daily spending for a trip
   */
  getDailySpending: async (id) => {
    const response = await api.get(`${BASE_URL}/trips/${id}/daily_spending/`);
    return response.data;
  },

  /**
   * Generate itinerary for a trip
   */
  generateItinerary: async (id) => {
    const response = await api.post(
      `${BASE_URL}/trips/${id}/generate_itinerary/`
    );
    return response.data;
  },

  /**
   * Generate packing list for a trip
   */
  generatePackingList: async (id) => {
    const response = await api.post(
      `${BASE_URL}/trips/${id}/generate_packing_list/`
    );
    return response.data;
  },
};

/**
 * Expenses API
 */
export const expensesApi = {
  /**
   * Get all expenses (optionally filtered by trip)
   */
  getAll: async (tripId = null) => {
    const params = tripId ? { trip: tripId } : {};
    const response = await api.get(`${BASE_URL}/expenses/`, { params });
    return response.data;
  },

  /**
   * Get single expense
   */
  get: async (id) => {
    const response = await api.get(`${BASE_URL}/expenses/${id}/`);
    return response.data;
  },

  /**
   * Create expense
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/expenses/`, data);
    return response.data;
  },

  /**
   * Update expense
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/expenses/${id}/`, data);
    return response.data;
  },

  /**
   * Delete expense
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/expenses/${id}/`);
  },

  /**
   * Get expenses by category for a trip
   */
  getByCategory: async (tripId) => {
    const response = await api.get(`${BASE_URL}/expenses/by_category/`, {
      params: { trip: tripId },
    });
    return response.data;
  },

  /**
   * Get daily expense summary for a trip
   */
  getDailySummary: async (tripId) => {
    const response = await api.get(`${BASE_URL}/expenses/daily_summary/`, {
      params: { trip: tripId },
    });
    return response.data;
  },
};

/**
 * Documents API
 */
export const documentsApi = {
  /**
   * Get all documents (optionally filtered by trip)
   */
  getAll: async (tripId = null) => {
    const params = tripId ? { trip: tripId } : {};
    const response = await api.get(`${BASE_URL}/documents/`, { params });
    return response.data;
  },

  /**
   * Get single document
   */
  get: async (id) => {
    const response = await api.get(`${BASE_URL}/documents/${id}/`);
    return response.data;
  },

  /**
   * Create document
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/documents/`, data);
    return response.data;
  },

  /**
   * Update document
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/documents/${id}/`, data);
    return response.data;
  },

  /**
   * Delete document
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/documents/${id}/`);
  },

  /**
   * Get expiring documents
   */
  getExpiring: async () => {
    const response = await api.get(`${BASE_URL}/documents/expiring/`);
    return response.data;
  },
};

/**
 * Packing Lists API
 */
export const packingListsApi = {
  /**
   * Get all packing lists
   */
  getAll: async () => {
    const response = await api.get(`${BASE_URL}/packing-lists/`);
    return response.data;
  },

  /**
   * Get single packing list
   */
  get: async (id) => {
    const response = await api.get(`${BASE_URL}/packing-lists/${id}/`);
    return response.data;
  },

  /**
   * Create packing list
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/packing-lists/`, data);
    return response.data;
  },

  /**
   * Delete packing list
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/packing-lists/${id}/`);
  },

  /**
   * Save as template
   */
  saveAsTemplate: async (id, templateName) => {
    const response = await api.post(
      `${BASE_URL}/packing-lists/${id}/save_as_template/`,
      { template_name: templateName }
    );
    return response.data;
  },

  /**
   * Get all templates
   */
  getTemplates: async () => {
    const response = await api.get(`${BASE_URL}/packing-lists/templates/`);
    return response.data;
  },
};

/**
 * Packing Items API
 */
export const packingItemsApi = {
  /**
   * Get items for a packing list
   */
  getAll: async (listId) => {
    const response = await api.get(`${BASE_URL}/packing-items/`, {
      params: { list: listId },
    });
    return response.data;
  },

  /**
   * Create item
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/packing-items/`, data);
    return response.data;
  },

  /**
   * Update item
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/packing-items/${id}/`, data);
    return response.data;
  },

  /**
   * Delete item
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/packing-items/${id}/`);
  },

  /**
   * Toggle packed status
   */
  togglePacked: async (id) => {
    const response = await api.post(
      `${BASE_URL}/packing-items/${id}/toggle_packed/`
    );
    return response.data;
  },

  /**
   * Bulk toggle packed status
   */
  bulkToggle: async (itemIds, isPacked) => {
    const response = await api.post(`${BASE_URL}/packing-items/bulk_toggle/`, {
      item_ids: itemIds,
      is_packed: isPacked,
    });
    return response.data;
  },
};

/**
 * Itinerary API
 */
export const itineraryApi = {
  /**
   * Get all itinerary days for a trip
   */
  getAll: async (tripId) => {
    const response = await api.get(`${BASE_URL}/itinerary/`, {
      params: { trip: tripId },
    });
    return response.data;
  },

  /**
   * Get single itinerary day
   */
  get: async (id) => {
    const response = await api.get(`${BASE_URL}/itinerary/${id}/`);
    return response.data;
  },

  /**
   * Update itinerary day
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/itinerary/${id}/`, data);
    return response.data;
  },

  /**
   * Copy activities from another day
   */
  copyActivities: async (id, sourceDayId) => {
    const response = await api.post(
      `${BASE_URL}/itinerary/${id}/copy_activities/`,
      { source_day_id: sourceDayId }
    );
    return response.data;
  },

  /**
   * Reorder activities within a day
   */
  reorderActivities: async (id, orders) => {
    const response = await api.post(
      `${BASE_URL}/itinerary/${id}/reorder_activities/`,
      { orders }
    );
    return response.data;
  },
};

/**
 * Activities API
 */
export const activitiesApi = {
  /**
   * Get all activities for an itinerary day
   */
  getAll: async (itineraryId) => {
    const response = await api.get(`${BASE_URL}/activities/`, {
      params: { itinerary: itineraryId },
    });
    return response.data;
  },

  /**
   * Get single activity
   */
  get: async (id) => {
    const response = await api.get(`${BASE_URL}/activities/${id}/`);
    return response.data;
  },

  /**
   * Create activity
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/activities/`, data);
    return response.data;
  },

  /**
   * Update activity
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/activities/${id}/`, data);
    return response.data;
  },

  /**
   * Delete activity
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/activities/${id}/`);
  },
};

/**
 * Travel Goals API
 */
export const goalsApi = {
  /**
   * Get all travel goals
   */
  getAll: async (achieved = null) => {
    const params = {};
    if (achieved !== null) {
      params.achieved = achieved ? "true" : "false";
    }
    const response = await api.get(`${BASE_URL}/goals/`, { params });
    return response.data;
  },

  /**
   * Get single goal
   */
  get: async (id) => {
    const response = await api.get(`${BASE_URL}/goals/${id}/`);
    return response.data;
  },

  /**
   * Create goal
   */
  create: async (data) => {
    const response = await api.post(`${BASE_URL}/goals/`, data);
    return response.data;
  },

  /**
   * Update goal
   */
  update: async (id, data) => {
    const response = await api.patch(`${BASE_URL}/goals/${id}/`, data);
    return response.data;
  },

  /**
   * Delete goal
   */
  delete: async (id) => {
    await api.delete(`${BASE_URL}/goals/${id}/`);
  },

  /**
   * Mark goal as achieved
   */
  markAchieved: async (id, tripId = null) => {
    const data = tripId ? { trip_id: tripId } : {};
    const response = await api.post(
      `${BASE_URL}/goals/${id}/mark_achieved/`,
      data
    );
    return response.data;
  },

  /**
   * Get goal statistics
   */
  getStats: async () => {
    const response = await api.get(`${BASE_URL}/goals/stats/`);
    return response.data;
  },

  /**
   * Reorder goals by priority
   */
  reorder: async (priorities) => {
    const response = await api.post(`${BASE_URL}/goals/reorder/`, {
      priorities,
    });
    return response.data;
  },
};

/**
 * Budget API
 */
export const budgetApi = {
  /**
   * Get budget suggestion
   */
  getSuggestion: async (destination, durationDays, tripType) => {
    const response = await api.post(`${BASE_URL}/budget/suggest/`, {
      destination,
      duration_days: durationDays,
      trip_type: tripType,
    });
    return response.data;
  },
};

/**
 * Exchange Rate API
 */
export const exchangeApi = {
  /**
   * Get exchange rate
   */
  getRate: async (base, target) => {
    const response = await api.get(`${BASE_URL}/exchange/`, {
      params: { base, target },
    });
    return response.data;
  },

  /**
   * Convert amount
   */
  convert: async (amount, fromCurrency, toCurrency) => {
    const response = await api.post(`${BASE_URL}/exchange/`, {
      amount,
      from: fromCurrency,
      to: toCurrency,
    });
    return response.data;
  },
};

// Default export with all APIs
export default {
  dashboard: dashboardApi,
  trips: tripsApi,
  expenses: expensesApi,
  documents: documentsApi,
  packingLists: packingListsApi,
  packingItems: packingItemsApi,
  itinerary: itineraryApi,
  activities: activitiesApi,
  goals: goalsApi,
  budget: budgetApi,
  exchange: exchangeApi,
};

