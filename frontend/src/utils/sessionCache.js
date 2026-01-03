/**
 * Session Cache Utility
 *
 * Provides in-memory + sessionStorage caching for app data.
 * Data persists across navigation but clears on browser reload/tab close.
 *
 * Best practices:
 * - Data is cached in memory for fastest access
 * - sessionStorage is used as backup when component unmounts/remounts
 * - Cache keys are namespaced to avoid collisions
 * - Stale data is automatically cleared on session start
 */

const CACHE_PREFIX = "nexus_cache_";
const SESSION_ID_KEY = "nexus_session_id";

// In-memory cache for fastest access during navigation
const memoryCache = new Map();

/**
 * Clear all cache entries
 */
function clearAllCache() {
  memoryCache.clear();

  // Clear only our namespaced keys from sessionStorage
  const keysToRemove = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}

// Generate a session ID on first load (clears cache on browser reload)
const initSession = () => {
  const existingId = sessionStorage.getItem(SESSION_ID_KEY);
  const newId = Date.now().toString(36) + Math.random().toString(36).slice(2);

  if (!existingId) {
    // New session - clear any stale cache from previous sessions
    clearAllCache();
    sessionStorage.setItem(SESSION_ID_KEY, newId);
  }

  return existingId || newId;
};

// Initialize session on module load (guarded to avoid throwing during module evaluation)
let sessionId;
try {
  sessionId = initSession();
} catch (e) {
  // Log and recover with a fallback session id to avoid blocking app startup
  // (This prevents a module-evaluation error from stopping the entire bundle.)
  // eslint-disable-next-line no-console
  console.error("sessionCache init failed:", e);
  sessionId =
    sessionStorage.getItem(SESSION_ID_KEY) ||
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  try {
    sessionStorage.setItem(SESSION_ID_KEY, sessionId);
  } catch (err) {
    // ignore
  }
}

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if not found
 */
export const getCache = (key) => {
  const fullKey = CACHE_PREFIX + key;

  // Check memory cache first (fastest)
  if (memoryCache.has(fullKey)) {
    return memoryCache.get(fullKey);
  }

  // Fall back to sessionStorage
  try {
    const stored = sessionStorage.getItem(fullKey);
    if (stored) {
      const data = JSON.parse(stored);
      // Restore to memory cache for faster subsequent access
      memoryCache.set(fullKey, data);
      return data;
    }
  } catch (e) {
    console.warn("Failed to read from session cache:", e);
  }

  return null;
};

/**
 * Set data in cache
 * @param {string} key - Cache key
 * @param {any} data - Data to cache (must be JSON serializable)
 */
export const setCache = (key, data) => {
  const fullKey = CACHE_PREFIX + key;

  // Store in memory cache
  memoryCache.set(fullKey, data);

  // Also persist to sessionStorage for cross-mount survival
  try {
    sessionStorage.setItem(fullKey, JSON.stringify(data));
  } catch (e) {
    // sessionStorage might be full or disabled
    console.warn("Failed to write to session cache:", e);
  }
};

/**
 * Check if cache exists for a key
 * @param {string} key - Cache key
 * @returns {boolean}
 */
export const hasCache = (key) => {
  const fullKey = CACHE_PREFIX + key;
  return memoryCache.has(fullKey) || sessionStorage.getItem(fullKey) !== null;
};

/**
 * Remove specific cache entry
 * @param {string} key - Cache key
 */
export const removeCache = (key) => {
  const fullKey = CACHE_PREFIX + key;
  memoryCache.delete(fullKey);
  sessionStorage.removeItem(fullKey);
};

/**
 * (clearAllCache is declared earlier as a hoisted function)
 */

/**
 * Get or fetch data with caching
 * @param {string} key - Cache key
 * @param {Function} fetcher - Async function to fetch data if not cached
 * @param {Object} options - Options
 * @param {boolean} options.forceRefresh - Skip cache and fetch fresh data
 * @returns {Promise<any>} - Cached or freshly fetched data
 */
export const getOrFetch = async (key, fetcher, options = {}) => {
  const { forceRefresh = false } = options;

  // Return cached data if available and not forcing refresh
  if (!forceRefresh && hasCache(key)) {
    return getCache(key);
  }

  // Fetch fresh data
  try {
    const data = await fetcher();
    setCache(key, data);
    return data;
  } catch (error) {
    // If fetch fails but we have stale cache, return it
    const stale = getCache(key);
    if (stale !== null) {
      console.warn(`Fetch failed for ${key}, returning stale cache`);
      return stale;
    }
    throw error;
  }
};

// Cache keys as constants to avoid typos
export const CACHE_KEYS = {
  // Home/Dashboard data
  HOME_FINANCIALS: "home_financials",
  HOME_SUBSCRIPTIONS: "home_subscriptions",
  HOME_TRAVEL: "home_travel",
  HOME_WEATHER: "home_weather",

  // Calendar data
  CALENDAR_EVENTS: "calendar_events",
  CALENDAR_REMINDERS: "calendar_reminders",

  // Weather page data (by location)
  WEATHER_DATA: "weather_data", // Append location hash for uniqueness

  // Financials page
  FINANCIALS_DATA: "financials_data",

  // Subscriptions page
  SUBSCRIPTIONS_DATA: "subscriptions_data",

  // Travel page
  TRAVEL_DATA: "travel_data",
};

/**
 * Create a location-specific cache key for weather
 * @param {string} location - Location string
 * @returns {string} - Cache key
 */
export const getWeatherCacheKey = (location) => {
  // Simple hash of location string for cache key
  const hash = location
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .slice(0, 50);
  return `${CACHE_KEYS.WEATHER_DATA}_${hash}`;
};

export default {
  getCache,
  setCache,
  hasCache,
  removeCache,
  clearAllCache,
  getOrFetch,
  CACHE_KEYS,
  getWeatherCacheKey,
};
