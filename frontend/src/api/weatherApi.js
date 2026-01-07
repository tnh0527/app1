/**
 * Weather API Service for Frontend
 * Handles caching and provides fallback support for map components
 *
 * All external API calls are now proxied through the backend for security.
 * API keys are NOT exposed in the frontend.
 *
 * APIs used (via backend proxy):
 * - OpenWeatherMap: Map tiles (precipitation, temperature, clouds, pressure)
 * - OpenWeatherMap: Wind grid for particle animation
 * - WAQI: Air quality index with station data (preferred over OpenWeatherMap AQI)
 * - OpenWeatherMap: Air pollution overlay (fallback)
 */

import {
  fetchOpenWeather,
  fetchOpenWeatherAirPollution,
  fetchWAQI as fetchWAQIProxy,
  fetchTileConfig,
} from "./mapProxyApi";

// Cache TTLs (in milliseconds)
const CACHE_TTL = {
  weather: 15 * 60 * 1000, // 15 minutes
  aqi: 30 * 60 * 1000, // 30 minutes
  wind: 10 * 60 * 1000, // 10 minutes
  mapTiles: 60 * 60 * 1000, // 1 hour (tiles don't change often)
};

// Simple in-memory cache
const weatherCache = new Map();

/**
 * Get cached data or fetch new data
 * @param {string} key - Cache key
 * @param {number} ttl - Time to live in ms
 * @param {Function} fetchFn - Function to fetch data if cache miss
 */
const getCachedOrFetch = async (key, ttl, fetchFn) => {
  const cached = weatherCache.get(key);

  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  try {
    const data = await fetchFn();
    weatherCache.set(key, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    // Return stale cache data if fetch fails
    if (cached) {
      console.warn(`Fetch failed for ${key}, using stale cache`);
      return cached.data;
    }
    throw error;
  }
};

/**
 * Clear cache for a specific key or all keys matching a prefix
 * @param {string} keyOrPrefix - Key or prefix to clear
 */
export const clearWeatherCache = (keyOrPrefix) => {
  if (!keyOrPrefix) {
    weatherCache.clear();
    return;
  }

  for (const key of weatherCache.keys()) {
    if (key.startsWith(keyOrPrefix)) {
      weatherCache.delete(key);
    }
  }
};

// ==================== AIR QUALITY METHODS ====================

/**
 * Fetch Air Quality data using WAQI API (preferred) with OWM fallback
 * All API calls go through backend proxy for security
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} AQI data
 */
export const fetchAirQuality = async (lat, lng) => {
  const cacheKey = `aqi:${lat.toFixed(2)}:${lng.toFixed(2)}`;

  return getCachedOrFetch(cacheKey, CACHE_TTL.aqi, async () => {
    // Try WAQI first (more detailed, station-based) via backend proxy
    try {
      const waqiData = await fetchWAQIFromProxy(lat, lng);
      if (waqiData) {
        return { ...waqiData, source: "WAQI" };
      }
    } catch (error) {
      console.warn("WAQI fetch failed, trying OpenWeatherMap:", error);
    }

    // Fallback to OpenWeatherMap Air Pollution via backend proxy
    try {
      const owmData = await fetchOWMAirPollution(lat, lng);
      return { ...owmData, source: "OpenWeatherMap" };
    } catch (error) {
      console.warn("OpenWeatherMap AQI failed, using estimated data:", error);
    }

    // Final fallback: use mock data based on location
    return generateMockAQI(lat, lng);
  });
};

/**
 * Fetch from World Air Quality Index API via backend proxy
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
const fetchWAQIFromProxy = async (lat, lng) => {
  const data = await fetchWAQIProxy(lat, lng);

  if (data.status !== "ok" || !data.data) {
    return null;
  }

  const feed = data.data;
  const iaqi = feed.iaqi || {};

  return {
    aqi: feed.aqi,
    aqiLevel: getAQILevel(feed.aqi),
    dominantPollutant: feed.dominentpol,
    station: {
      name: feed.city?.name,
      url: feed.city?.url,
    },
    pollutants: {
      pm25: iaqi.pm25?.v,
      pm10: iaqi.pm10?.v,
      o3: iaqi.o3?.v,
      no2: iaqi.no2?.v,
      so2: iaqi.so2?.v,
      co: iaqi.co?.v,
    },
    forecast: feed.forecast?.daily,
    time: feed.time?.s,
  };
};

/**
 * Fetch from OpenWeatherMap Air Pollution API via backend proxy
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
const fetchOWMAirPollution = async (lat, lng) => {
  const data = await fetchOpenWeatherAirPollution(lat, lng);
  const current = data.list?.[0];

  if (!current) {
    return null;
  }

  // OpenWeatherMap AQI is 1-5, convert to US AQI-like scale
  const owmAqi = current.main?.aqi || 1;
  const usAqiEstimate = [0, 25, 75, 125, 175, 250][owmAqi] || 0;

  return {
    aqi: usAqiEstimate,
    aqiLevel: owmAqi, // 1-5 scale
    pollutants: {
      pm25: current.components?.pm2_5,
      pm10: current.components?.pm10,
      o3: current.components?.o3,
      no2: current.components?.no2,
      so2: current.components?.so2,
      co: current.components?.co,
    },
  };
};

/**
 * Generate mock AQI data based on location (for when API fails/rate limited)
 * Uses a pseudo-random but consistent algorithm based on coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Object} Mock AQI data
 */
const generateMockAQI = (lat, lng) => {
  // Generate consistent "random" AQI based on coordinates
  // This ensures the same location always gets the same mock data
  const seed = Math.abs(Math.sin(lat * 1000) * Math.cos(lng * 1000));
  const aqi = Math.floor(seed * 150) + 20; // Range: 20-170 (Good to Unhealthy)

  return {
    aqi,
    aqiLevel: getAQILevel(aqi),
    dominantPollutant: ["pm25", "pm10", "o3"][Math.floor(seed * 3)],
    station: {
      name: "Estimated Data",
      url: null,
    },
    pollutants: {
      pm25: Math.floor(seed * 50),
      pm10: Math.floor(seed * 80),
      o3: Math.floor(seed * 60),
      no2: Math.floor(seed * 40),
      so2: Math.floor(seed * 20),
      co: Math.floor(seed * 500),
    },
    source: "Estimated",
    isMock: true,
  };
};

/**
 * Get AQI level description
 * @param {number} aqi - AQI value
 * @returns {Object} Level info
 */
const getAQILevel = (aqi) => {
  if (aqi <= 50) return { level: 1, label: "Good", color: "#10b981" };
  if (aqi <= 100) return { level: 2, label: "Moderate", color: "#eab308" };
  if (aqi <= 150)
    return {
      level: 3,
      label: "Unhealthy for Sensitive Groups",
      color: "#f97316",
    };
  if (aqi <= 200) return { level: 4, label: "Unhealthy", color: "#ef4444" };
  if (aqi <= 300)
    return { level: 5, label: "Very Unhealthy", color: "#a855f7" };
  return { level: 6, label: "Hazardous", color: "#7f1d1d" };
};

// Client-side AQI cache to reduce backend requests
const aqiCache = new Map();
const AQI_CACHE_DURATION = 120000; // 2 minutes
const AQI_CACHE_MAX_SIZE = 500; // Prevent memory leaks

// Cleanup old cache entries periodically
const cleanupAQICache = () => {
  const now = Date.now();
  const entries = Array.from(aqiCache.entries());

  // Remove expired entries
  for (const [key, value] of entries) {
    if (now - value.timestamp > AQI_CACHE_DURATION) {
      aqiCache.delete(key);
    }
  }

  // If still too large, remove oldest entries
  if (aqiCache.size > AQI_CACHE_MAX_SIZE) {
    const sorted = Array.from(aqiCache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );
    const toRemove = sorted.slice(0, aqiCache.size - AQI_CACHE_MAX_SIZE);
    toRemove.forEach(([key]) => aqiCache.delete(key));
  }
};

// Run cleanup every 5 minutes
setInterval(cleanupAQICache, 300000);

/**
 * Fetch AQI grid for heatmap overlay via backend proxy with client-side caching
 * Uses OWM Air Pollution API for grid efficiency
 * @param {Object} bounds - Map bounds { north, south, east, west }
 * @param {number} gridPoints - Number of grid points per axis
 */
export const fetchAQIGrid = async (bounds, gridPoints = 5) => {
  const { north, south, east, west } = bounds;
  const latStep = (north - south) / (gridPoints - 1);
  const lngStep = (east - west) / (gridPoints - 1);

  // For grid data, use OWM via backend proxy
  const fetchPromises = [];
  const now = Date.now();

  for (let i = 0; i < gridPoints; i++) {
    for (let j = 0; j < gridPoints; j++) {
      const lat = south + latStep * i;
      const lng = west + lngStep * j;

      // Round to 1 decimal for cache consistency (matches backend rounding)
      const latKey = lat.toFixed(1);
      const lngKey = lng.toFixed(1);
      const cacheKey = `${latKey},${lngKey}`;

      // Check client cache first
      const cached = aqiCache.get(cacheKey);
      if (cached && now - cached.timestamp < AQI_CACHE_DURATION) {
        fetchPromises.push(Promise.resolve({ ...cached.data, lat, lng }));
        continue;
      }

      fetchPromises.push(
        fetchOpenWeatherAirPollution(lat, lng)
          .then((data) => {
            const result = {
              lat,
              lng,
              aqi: data.list?.[0]?.main?.aqi || 1,
              components: data.list?.[0]?.components,
            };
            // Cache successful result
            aqiCache.set(cacheKey, { data: result, timestamp: now });
            return result;
          })
          .catch(() => {
            // If rate limited, use last cached value if available
            if (cached) {
              console.warn(`Using stale AQI cache for ${cacheKey}`);
              return { ...cached.data, lat, lng };
            }
            // Use mock data for this grid point
            const mockData = generateMockAQI(lat, lng);
            return {
              lat,
              lng,
              aqi: Math.min(Math.floor(mockData.aqi / 50) + 1, 5), // Convert to 1-5 scale
              isMock: true,
            };
          })
      );
    }
  }

  const results = await Promise.all(fetchPromises);

  return results;
};

// ==================== WIND DATA METHODS ====================

/**
 * Fetch wind grid for particle animation via backend proxy
 * @param {Object} bounds - Map bounds { north, south, east, west }
 * @param {number} gridPoints - Number of grid points per axis
 */
export const fetchWindGrid = async (bounds, gridPoints = 5) => {
  const cacheKey = `wind:${bounds.north.toFixed(1)}:${bounds.west.toFixed(1)}`;

  return getCachedOrFetch(cacheKey, CACHE_TTL.wind, async () => {
    const { north, south, east, west } = bounds;
    const latStep = (north - south) / (gridPoints - 1);
    const lngStep = (east - west) / (gridPoints - 1);

    const fetchPromises = [];

    for (let i = 0; i < gridPoints; i++) {
      for (let j = 0; j < gridPoints; j++) {
        const lat = south + latStep * i;
        const lng = west + lngStep * j;

        fetchPromises.push(
          fetchOpenWeather(lat, lng, "imperial")
            .then((data) => ({
              lat,
              lng,
              speed: data.wind?.speed || 0,
              deg: data.wind?.deg || 0,
            }))
            .catch(() => ({ lat, lng, speed: 5, deg: 270 }))
        );
      }
    }

    const results = await Promise.all(fetchPromises);
    return {
      points: results,
      bounds,
      gridPoints,
    };
  });
};

// ==================== MAP TILE URLS ====================

// Cache for tile config from backend
let tileConfigCache = null;
let tileConfigFetchPromise = null;

/**
 * Get tile configuration from backend (cached)
 * This returns the tile URLs with API keys already included
 */
const getTileConfigFromBackend = async () => {
  if (tileConfigCache) {
    return tileConfigCache;
  }

  // Avoid multiple simultaneous requests
  if (tileConfigFetchPromise) {
    return tileConfigFetchPromise;
  }

  tileConfigFetchPromise = fetchTileConfig()
    .then((config) => {
      tileConfigCache = config;
      return config;
    })
    .catch((error) => {
      console.error("Failed to fetch tile config:", error);
      // Return empty config on failure
      return {};
    })
    .finally(() => {
      tileConfigFetchPromise = null;
    });

  return tileConfigFetchPromise;
};

/**
 * Get OpenWeatherMap tile URL for a specific layer
 * Note: This is now async and fetches the URL pattern from backend
 * @param {string} layer - Layer type (precipitation_new, temp_new, clouds_new, pressure_new)
 */
export const getOWMTileUrl = async (layer) => {
  const config = await getTileConfigFromBackend();
  const layerMapping = {
    precipitation_new: "radar",
    temp_new: "temperature",
    clouds_new: "clouds",
    pressure_new: "pressure",
  };
  const configKey = layerMapping[layer] || layer;
  return config[configKey]?.url || "";
};

/**
 * Get tile layer configurations for Mapbox (async)
 * Fetches URLs from backend to avoid exposing API keys
 */
export const getTileLayerConfigs = async () => {
  const config = await getTileConfigFromBackend();
  return {
    radar: {
      url: config.radar?.url || "",
      opacity: 0.7,
    },
    temperature: {
      url: config.temperature?.url || "",
      opacity: 0.6,
    },
    clouds: {
      url: config.clouds?.url || "",
      opacity: 0.5,
    },
    pressure: {
      url: config.pressure?.url || "",
      opacity: 0.5,
    },
  };
};

// ==================== CACHE UTILITIES ====================

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  const stats = {
    totalEntries: weatherCache.size,
    entries: [],
  };

  for (const [key, value] of weatherCache.entries()) {
    stats.entries.push({
      key,
      age: Math.round((Date.now() - value.timestamp) / 1000),
    });
  }

  return stats;
};

/**
 * Check API status - now uses backend proxy so always available
 */
export const getAPIStatus = () => ({
  openWeatherMap: {
    available: true, // API keys are on backend
    uses: ["Map tiles", "Wind grid", "AQI fallback"],
  },
  waqi: {
    available: true, // API keys are on backend
    uses: ["Air Quality (primary)"],
  },
});

export default {
  fetchAirQuality,
  fetchAQIGrid,
  fetchWindGrid,
  getOWMTileUrl,
  getTileLayerConfigs,
  clearWeatherCache,
  getCacheStats,
  getAPIStatus,
};
