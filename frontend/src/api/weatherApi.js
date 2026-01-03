/**
 * Weather API Service for Frontend
 * Handles caching and provides fallback support for map components
 *
 * APIs used:
 * - Backend: Primary weather data (with fallbacks to Tomorrow.io, VisualCrossing, OpenWeather)
 * - OpenWeatherMap: Map tiles (precipitation, temperature, clouds, pressure)
 * - OpenWeatherMap: Wind grid for particle animation
 * - WAQI: Air quality index with station data (preferred over OpenWeatherMap AQI)
 * - OpenWeatherMap: Air pollution overlay (fallback)
 */

// API Keys
const OWM_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "";
const WAQI_API_KEY = import.meta.env.VITE_REACT_APP_WAQI_KEY || "";

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
    console.log(`Cache hit for ${key}`);
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
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<Object>} AQI data
 */
export const fetchAirQuality = async (lat, lng) => {
  const cacheKey = `aqi:${lat.toFixed(2)}:${lng.toFixed(2)}`;

  return getCachedOrFetch(cacheKey, CACHE_TTL.aqi, async () => {
    // Try WAQI first (more detailed, station-based)
    if (WAQI_API_KEY) {
      try {
        const waqiData = await fetchWAQI(lat, lng);
        if (waqiData) {
          return { ...waqiData, source: "WAQI" };
        }
      } catch (error) {
        console.warn("WAQI fetch failed, trying OpenWeatherMap:", error);
      }
    }

    // Fallback to OpenWeatherMap Air Pollution
    if (OWM_API_KEY) {
      try {
        const owmData = await fetchOWMAirPollution(lat, lng);
        return { ...owmData, source: "OpenWeatherMap" };
      } catch (error) {
        console.warn("OpenWeatherMap AQI failed, using estimated data:", error);
      }
    }

    // Final fallback: use mock data based on location
    console.info(
      "Using estimated AQI data for",
      lat.toFixed(2),
      lng.toFixed(2)
    );
    return generateMockAQI(lat, lng);
  });
};

/**
 * Fetch from World Air Quality Index API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
const fetchWAQI = async (lat, lng) => {
  const response = await fetch(
    `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${WAQI_API_KEY}`
  );

  const data = await response.json();

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
 * Fetch from OpenWeatherMap Air Pollution API
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
const fetchOWMAirPollution = async (lat, lng) => {
  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${OWM_API_KEY}`
  );

  const data = await response.json();
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

/**
 * Fetch AQI grid for heatmap overlay
 * Uses WAQI for individual points, OWM for grid efficiency
 * @param {Object} bounds - Map bounds { north, south, east, west }
 * @param {number} gridPoints - Number of grid points per axis
 */
export const fetchAQIGrid = async (bounds, gridPoints = 5) => {
  const { north, south, east, west } = bounds;
  const latStep = (north - south) / (gridPoints - 1);
  const lngStep = (east - west) / (gridPoints - 1);

  // For grid data, use OWM (more API calls but still under free tier)
  // WAQI is better for single point detailed data
  const fetchPromises = [];
  let apiFailureCount = 0;

  for (let i = 0; i < gridPoints; i++) {
    for (let j = 0; j < gridPoints; j++) {
      const lat = south + latStep * i;
      const lng = west + lngStep * j;

      fetchPromises.push(
        fetch(
          `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lng}&appid=${OWM_API_KEY}`
        )
          .then((res) => {
            if (!res.ok) {
              apiFailureCount++;
              throw new Error(`API returned ${res.status}`);
            }
            return res.json();
          })
          .then((data) => ({
            lat,
            lng,
            aqi: data.list?.[0]?.main?.aqi || 1,
            components: data.list?.[0]?.components,
          }))
          .catch(() => {
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

  // Log if using significant amount of mock data
  const mockCount = results.filter((r) => r.isMock).length;
  if (mockCount > 0) {
    console.info(
      `AQI Grid: Using ${mockCount}/${results.length} estimated data points`
    );
  }

  return results;
};

// ==================== WIND DATA METHODS ====================

/**
 * Fetch wind grid for particle animation
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
          fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OWM_API_KEY}&units=imperial`
          )
            .then((res) => res.json())
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

/**
 * Get OpenWeatherMap tile URL for a specific layer
 * @param {string} layer - Layer type (precipitation_new, temp_new, clouds_new, pressure_new)
 * @param {number} z - Zoom level
 * @param {number} x - Tile X
 * @param {number} y - Tile Y
 */
export const getOWMTileUrl = (layer, z, x, y) => {
  return `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`;
};

/**
 * Get tile layer configurations for Mapbox
 */
export const getTileLayerConfigs = () => ({
  radar: {
    url: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    opacity: 0.7,
  },
  temperature: {
    url: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    opacity: 0.6,
  },
  clouds: {
    url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    opacity: 0.5,
  },
  pressure: {
    url: `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
    opacity: 0.5,
  },
});

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
 * Check if we have valid API keys
 */
export const getAPIStatus = () => ({
  openWeatherMap: {
    available: !!OWM_API_KEY,
    uses: ["Map tiles", "Wind grid", "AQI fallback"],
  },
  waqi: {
    available: !!WAQI_API_KEY,
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
