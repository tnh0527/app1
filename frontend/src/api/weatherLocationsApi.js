import api from "./axios";

/**
 * Get all saved locations for the current user
 */
export const getSavedLocations = async () => {
  const response = await api.get("/api/locations/");
  return response.data;
};

/**
 * Add a new saved location
 * @param {Object} locationData - { name, latitude, longitude, is_primary? }
 */
export const addSavedLocation = async (locationData) => {
  const response = await api.post("/api/locations/", locationData);
  return response.data;
};

/**
 * Update a saved location
 * @param {number} id - Location ID
 * @param {Object} locationData - Updated location data
 */
export const updateSavedLocation = async (id, locationData) => {
  const response = await api.patch(`/api/locations/${id}/`, locationData);
  return response.data;
};

/**
 * Delete a saved location
 * @param {number} id - Location ID
 */
export const deleteSavedLocation = async (id) => {
  await api.delete(`/api/locations/${id}/`);
};

/**
 * Reorder saved locations
 * @param {Array} locations - Array of { id, order } objects
 */
export const reorderSavedLocations = async (locations) => {
  const response = await api.post("/api/locations/reorder/", { locations });
  return response.data;
};

/**
 * Set a location as primary
 * @param {number} id - Location ID
 */
export const setLocationAsPrimary = async (id) => {
  const response = await api.post(`/api/locations/${id}/set-primary/`);
  return response.data;
};

/**
 * Get coordinates for a location name using the place API
 * @param {string} locationName - Name of the location
 */
export const getLocationCoordinates = async (locationName) => {
  // Use Google Geocoding API via backend
  const response = await api.get(
    `/api/weather/?location=${encodeURIComponent(locationName)}`
  );
  return response.data.coordinates;
};
