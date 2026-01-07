/**
 * Map Proxy API Service
 *
 * This service proxies external API calls through the backend to keep API keys secure.
 * API keys are stored on the backend and never exposed to the browser.
 *
 * Proxied services:
 * - Geoapify Autocomplete (primary for route suggestions)
 * - Google Places Autocomplete (legacy)
 * - Geoapify Routing
 * - Geoapify Places (nearby search)
 * - OpenWeatherMap
 * - WAQI (Air Quality)
 * - Mapbox Geocoding (fallback)
 */

import { getApiBase } from "./axios";

const API_BASE_URL = getApiBase();

/**
 * Geoapify Geocoding Autocomplete via backend proxy
 * Primary method for route location suggestions - provides rich POI data
 * @param {string} text - Search query
 * @param {number} latitude - Bias latitude (optional)
 * @param {number} longitude - Bias longitude (optional)
 * @param {number} limit - Max results (default 5)
 * @param {string} type - Place type filter (optional, e.g., 'city', 'street', 'amenity')
 * @returns {Promise<Array>} Suggestions array with name, address, and coordinates
 */
export const fetchGeoapifyAutocomplete = async (
  text,
  latitude = null,
  longitude = null,
  limit = 5,
  type = ""
) => {
  try {
    const params = new URLSearchParams({
      text,
      limit: limit.toString(),
    });

    if (latitude !== null && longitude !== null) {
      params.append("lat", latitude.toString());
      params.append("lon", longitude.toString());
    }

    if (type) {
      params.append("type", type);
    }

    const response = await fetch(
      `${API_BASE_URL}/api/proxy/geoapify-autocomplete/?${params}`,
      {
        credentials: "omit",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error("Geoapify autocomplete proxy error:", error);
    return [];
  }
};

/**
 * Google Places Autocomplete via backend proxy (legacy)
 * @param {string} input - Search query
 * @param {number} latitude - Bias latitude
 * @param {number} longitude - Bias longitude
 * @param {number} radius - Search radius in meters (default 50000)
 * @returns {Promise<Array>} Suggestions array
 */
export const fetchPlacesAutocomplete = async (
  input,
  latitude,
  longitude,
  radius = 50000
) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/proxy/places-autocomplete/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Do not include cookies/session on these public proxy calls to avoid CSRF 403 from Django
        credentials: "omit",
        body: JSON.stringify({
          input,
          latitude,
          longitude,
          radius,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.suggestions || [];
  } catch (error) {
    console.error("Places autocomplete proxy error:", error);
    return [];
  }
};

/**
 * Geoapify Routing via backend proxy
 * @param {string} waypoints - Waypoints in format "lat1,lon1|lat2,lon2"
 * @param {string} mode - Routing mode: "drive", "walk", "bicycle", "transit"
 * @param {string} avoid - Optional avoid params: "tolls", "highways", or "tolls|highways"
 * @returns {Promise<Object>} Route data
 */
export const fetchRouting = async (waypoints, mode = "drive", avoid = "") => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/proxy/routing/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "omit",
      body: JSON.stringify({
        waypoints,
        mode,
        avoid,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Routing proxy error:", error);
    throw error;
  }
};

/**
 * Geoapify Nearby Places via backend proxy
 * @param {string} categories - Comma-separated Geoapify categories
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} radius - Search radius in meters
 * @param {number} limit - Max results (default 20)
 * @returns {Promise<Object>} Places GeoJSON
 */
export const fetchNearbyPlaces = async (
  categories,
  lat,
  lon,
  radius = 5000,
  limit = 20
) => {
  try {
    const params = new URLSearchParams({
      categories,
      lat: lat.toString(),
      lon: lon.toString(),
      radius: radius.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(
      `${API_BASE_URL}/api/proxy/nearby-places/?${params}`,
      {
        credentials: "omit",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Nearby places proxy error:", error);
    return { features: [] };
  }
};

/**
 * OpenWeatherMap Weather Data via backend proxy
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {string} units - Units: "metric", "imperial", or "standard" (default)
 * @returns {Promise<Object>} Weather data
 */
// Client-side weather cache to reduce backend requests
const weatherCache = new Map();
const WEATHER_CACHE_DURATION = 300000; // 5 minutes
const WEATHER_CACHE_MAX_SIZE = 200;

// Cleanup stale weather cache entries
const cleanupWeatherCache = () => {
  const now = Date.now();
  for (const [key, value] of weatherCache.entries()) {
    if (now - value.timestamp > WEATHER_CACHE_DURATION) {
      weatherCache.delete(key);
    }
  }
  if (weatherCache.size > WEATHER_CACHE_MAX_SIZE) {
    const sorted = Array.from(weatherCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    sorted
      .slice(0, weatherCache.size - WEATHER_CACHE_MAX_SIZE)
      .forEach(([key]) => weatherCache.delete(key));
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupWeatherCache, 300000);

export const fetchOpenWeather = async (lat, lon, units = "metric") => {
  // Round coordinates to 2 decimal places for cache key (~1km accuracy)
  const latKey = lat.toFixed(2);
  const lonKey = lon.toFixed(2);
  const cacheKey = `weather_${latKey}_${lonKey}_${units}`;
  const now = Date.now();

  // Check client cache first
  const cached = weatherCache.get(cacheKey);
  if (cached && now - cached.timestamp < WEATHER_CACHE_DURATION) {
    return cached.data;
  }

  try {
    const params = new URLSearchParams({
      endpoint: "weather",
      lat: lat.toString(),
      lon: lon.toString(),
      units,
    });

    const response = await fetch(
      `${API_BASE_URL}/api/proxy/openweather/?${params}`,
      {
        credentials: "omit",
      }
    );

    if (!response.ok) {
      // On rate limit, return stale cache if available
      if (response.status === 429 && cached) {
        console.warn(`Using stale weather cache for ${cacheKey}`);
        return cached.data;
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    // Cache successful response
    weatherCache.set(cacheKey, { data, timestamp: now });
    return data;
  } catch (error) {
    // Return stale cache on any error if available
    if (cached) {
      console.warn(`Using stale weather cache due to error: ${error.message}`);
      return cached.data;
    }
    console.error("OpenWeather proxy error:", error);
    throw error;
  }
};

/**
 * OpenWeatherMap Air Pollution via backend proxy
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} Air pollution data
 */
export const fetchOpenWeatherAirPollution = async (lat, lon) => {
  try {
    const params = new URLSearchParams({
      endpoint: "air_pollution",
      lat: lat.toString(),
      lon: lon.toString(),
    });

    const response = await fetch(
      `${API_BASE_URL}/api/proxy/openweather/?${params}`,
      {
        credentials: "omit",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("OpenWeather AQI proxy error:", error);
    throw error;
  }
};

/**
 * Get OpenWeatherMap tile URL via backend proxy
 * @param {string} layer - Layer type (precipitation_new, temp_new, etc.)
 * @returns {Promise<string>} Tile URL template with API key
 */
export const fetchTileUrl = async (layer) => {
  try {
    const params = new URLSearchParams({ layer });

    const response = await fetch(
      `${API_BASE_URL}/api/proxy/tile-url/?${params}`,
      {
        credentials: "omit",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.tileUrl;
  } catch (error) {
    console.error("Tile URL proxy error:", error);
    return null;
  }
};

/**
 * Get all tile configurations via backend proxy
 * @returns {Promise<Object>} Tile configurations with URLs
 */
export const fetchTileConfig = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/proxy/tile-config/`, {
      credentials: "omit",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Tile config proxy error:", error);
    return null;
  }
};

/**
 * WAQI Air Quality via backend proxy
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<Object>} WAQI data
 */
export const fetchWAQI = async (lat, lon) => {
  try {
    const params = new URLSearchParams({
      lat: lat.toString(),
      lon: lon.toString(),
    });

    const response = await fetch(`${API_BASE_URL}/api/proxy/waqi/?${params}`, {
      credentials: "omit",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("WAQI proxy error:", error);
    throw error;
  }
};

/**
 * Mapbox Geocoding via backend proxy (fallback for places)
 * @param {string} query - Search query
 * @param {number} proximityLon - Bias longitude (optional)
 * @param {number} proximityLat - Bias latitude (optional)
 * @param {number} limit - Max results (default 5)
 * @returns {Promise<Object>} Geocoding result
 */
export const fetchMapboxGeocode = async (
  query,
  proximityLon = null,
  proximityLat = null,
  limit = 5
) => {
  try {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
    });

    if (proximityLon !== null && proximityLat !== null) {
      params.append("proximity_lon", proximityLon.toString());
      params.append("proximity_lat", proximityLat.toString());
    }

    const response = await fetch(
      `${API_BASE_URL}/api/proxy/mapbox-geocode/?${params}`,
      {
        credentials: "omit",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Mapbox geocode proxy error:", error);
    return { features: [] };
  }
};

export default {
  fetchGeoapifyAutocomplete,
  fetchPlacesAutocomplete,
  fetchRouting,
  fetchNearbyPlaces,
  fetchOpenWeather,
  fetchOpenWeatherAirPollution,
  fetchTileUrl,
  fetchTileConfig,
  fetchWAQI,
  fetchMapboxGeocode,
};
