import { useState, useEffect, useRef } from "react";
import moment from "moment-timezone";
import {
  getSavedLocations,
  deleteSavedLocation,
} from "../../api/weatherLocationsApi";
import { iconMap, videoMap } from "../../utils/weatherMapping";
import api from "../../api/axios";
import "./SavedLocations.css";

const PREVIEW_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const PREVIEW_CACHE_VERSION = 3;

const MAX_SAVED_LOCATIONS = 5;

// Small helper component: displays live local time for a given timezone
const LocalTime = ({ timeZone }) => {
  const [time, setTime] = useState("");
  const intervalRef = useRef(null);

  useEffect(() => {
    const tz = timeZone && (timeZone.time_zone || timeZone);
    if (!tz) {
      setTime("");
      return;
    }

    const update = () => {
      try {
        // show hours:minutes:seconds with am/pm (e.g. 4:21:09 pm)
        setTime(moment().tz(tz).format("h:mm:ss a"));
      } catch {
        setTime("");
      }
    };

    update();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(update, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") update();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [timeZone]);

  if (!time) return null;
  return (
    <div className="location-local-time" aria-hidden>
      {time}
    </div>
  );
};

const SavedLocations = ({
  currentLocation,
  onLocationSelect,
  refreshTrigger, // Trigger to refresh saved locations when a new one is added
  onLocationsChanged, // optional callback to notify parent about changes (delete/add)
}) => {
  const [savedLocations, setSavedLocations] = useState([]);
  const [locationPreviews, setLocationPreviews] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [, setTick] = useState(0); // forces re-render to update day/night videos
  const previewsFetchSeq = useRef(0);
  const debug =
    typeof window !== "undefined" &&
    window.localStorage &&
    window.localStorage.getItem("saved_preview_debug") === "1";

  // Clear old cache on mount to ensure fresh data with new backend fields
  useEffect(() => {
    const cachePrefix = "weather_preview_";
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith(cachePrefix)
    );
    keys.forEach((key) => {
      try {
        const cached = localStorage.getItem(key);
        if (cached) {
          const parsed = JSON.parse(cached);
          // Remove if old format/version (or missing required fields)
          if (
            parsed?.version !== PREVIEW_CACHE_VERSION ||
            !parsed?.data?.video_src ||
            !parsed?.data?.time_zone
          ) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Invalid cache, remove it
        localStorage.removeItem(key);
      }
    });
  }, []);

  // Fetch saved locations on mount and when refreshTrigger changes
  useEffect(() => {
    fetchSavedLocations();
  }, [refreshTrigger]);

  const fetchSavedLocations = async () => {
    try {
      setIsLoading(true);
      const locations = await getSavedLocations();
      // Limit to max locations
      setSavedLocations(locations.slice(0, MAX_SAVED_LOCATIONS));
      setError(null);
    } catch (err) {
      console.error("Failed to fetch saved locations:", err);
      setError("Failed to load saved locations");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch weather previews for saved locations
  // Behavior: show cached preview immediately if available, then ALWAYS refetch
  // fresh preview data for each saved location on mount/when savedLocations changes.
  useEffect(() => {
    const findClosestByTime = (arr = []) => {
      if (!arr.length) return null;
      const now = Date.now();
      let best = null;
      let bestDiff = Number.POSITIVE_INFINITY;
      for (const item of arr) {
        const tStr = item?.time || item?.timestamp || item?.dt;
        if (!tStr) continue;
        const t = new Date(tStr).getTime();
        const diff = Math.abs(t - now);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = item;
        }
      }
      return best || arr[0] || null;
    };

    const fetchPreviews = async () => {
      const seq = ++previewsFetchSeq.current;

      // Prefill from cache so UI shows immediately while we refetch
      const initialPreviews = {};
      for (const location of savedLocations) {
        try {
          const cacheKey = `weather_preview_${location.name}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            const ts = parsed?.timestamp || 0;
            if (
              parsed?.version === PREVIEW_CACHE_VERSION &&
              Date.now() - ts < PREVIEW_CACHE_TTL_MS &&
              parsed?.data
            ) {
              initialPreviews[location.id] = parsed.data;
            } else {
              localStorage.removeItem(cacheKey);
            }
          }
        } catch {
          // ignore cache parse errors
        }
      }

      if (Object.keys(initialPreviews).length > 0) {
        setLocationPreviews((prev) => {
          if (seq !== previewsFetchSeq.current) return prev;
          const next = { ...prev };
          for (const [id, preview] of Object.entries(initialPreviews)) {
            next[id] = mergePreview(prev[id], preview);
          }
          return next;
        });
      }

      // Now fetch fresh previews for all saved locations (always)
      const results = await Promise.allSettled(
        savedLocations.map(async (location) => {
          const response = await api.get("/api/weather/", {
            // Use a cache-busting param instead of custom headers so we don't
            // trigger CORS preflight (which shows up as Axios "Network Error").
            params: { location: location.name, _ts: Date.now() },
          });

          const data = response.data || {};
          const minutelyData = data.weather_data?.minutely_15 || [];
          const hourlyData = data.weather_data?.hourly || [];
          const currentData =
            findClosestByTime(minutelyData) ||
            findClosestByTime(hourlyData) ||
            {};
          const dailyData = data.weather_data?.daily || [];

          const previewData = {
            temperature: currentData.temperature,
            // Prefer backend-provided human readable condition when available
            condition:
              data.ui_meta?.current_condition || currentData.weather_code,
            tempMax: dailyData[0]?.max_temperature,
            tempMin: dailyData[0]?.min_temperature,
            // Ensure is_day is captured correctly (handling 0 as valid)
            is_day:
              data.ui_meta?.is_day !== undefined
                ? data.ui_meta.is_day
                : currentData.is_day,
            sunrise: dailyData[0]?.sunrise,
            sunset: dailyData[0]?.sunset,
            time_zone:
              data.time_zone_data?.time_zone || data.time_zone_data || null,
            video_src: data.ui_meta?.video_src,
          };

          // Debug log (temporary) to trace why defaults might override
          if (debug) {
            console.log(`[SavedLocations] Fetched ${location.name}:`, {
              ui_meta: data.ui_meta,
              previewData,
            });
          }

          // Update cache with fresh data
          try {
            const cacheKey = `weather_preview_${location.name}`;
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                version: PREVIEW_CACHE_VERSION,
                data: previewData,
                timestamp: Date.now(),
              })
            );
          } catch {
            // Ignore storage errors
          }

          return { id: location.id, previewData, name: location.name };
        })
      );

      setLocationPreviews((prev) => {
        if (seq !== previewsFetchSeq.current) return prev;
        const next = { ...prev };
        for (const r of results) {
          if (r.status !== "fulfilled") {
            if (r.reason) {
              // Keep existing preview if any request fails
              console.error("Failed to fetch preview:", r.reason);
            }
            continue;
          }
          const { id, previewData } = r.value || {};
          if (id === undefined || id === null) continue;
          next[id] = mergePreview(prev[id], previewData);
        }
        return next;
      });
    };

    if (savedLocations.length > 0) {
      fetchPreviews();
    }
  }, [savedLocations]);

  const handleDeleteLocation = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteSavedLocation(id);
      setSavedLocations((prev) => prev.filter((loc) => loc.id !== id));
      // Clear the preview cache
      const location = savedLocations.find((loc) => loc.id === id);
      if (location) {
        localStorage.removeItem(`weather_preview_${location.name}`);
      }
      // Notify parent that saved locations changed so it can refresh its list
      try {
        if (onLocationsChanged) onLocationsChanged();
      } catch (err) {
        // ignore
      }
    } catch (err) {
      console.error("Failed to delete location:", err);
      setError("Failed to delete location");
    }
  };

  const handleLocationClick = (location) => {
    onLocationSelect(location.name);
  };

  // Get weather icon based on condition
  const getWeatherIcon = (condition, isDay) => {
    if (!condition) return "bi bi-cloud";
    if (typeof iconMap[condition] === "object") {
      return isDay ? iconMap[condition].day : iconMap[condition].night;
    }
    return iconMap[condition] || "bi bi-cloud";
  };

  // Robust helper: find the best matching video for a condition (case-insensitive,
  // supports keys that are objects with day/night variants). Prefer app mapping
  // so day/night variants apply; fall back to backend `explicitVideo` ONLY when
  // no mapping exists or condition is missing.
  const findPreviewVideo = (condition, isDay, explicitVideo) => {
    // If we have a condition, try to map it using client-side logic + dynamic isDay
    // This allows the video to update dynamically (day/night) without refetching
    const hasCondition = !!condition;

    if (hasCondition) {
      const conditionLower = String(condition).toLowerCase();
      const keys = Object.keys(videoMap || {});

      // Exact match
      let mappingKey = keys.find((k) => k.toLowerCase() === conditionLower);
      // Partial match
      if (!mappingKey) {
        mappingKey = keys.find((k) => {
          const kl = k.toLowerCase();
          return conditionLower.includes(kl) || kl.includes(conditionLower);
        });
      }

      if (mappingKey) {
        const v = videoMap[mappingKey];
        return typeof v === "object" ? (isDay ? v.day : v.night) : v;
      }
    }

    // Fallback to backend-provided video if mapping failed or no condition
    if (explicitVideo) return explicitVideo;

    // Last-resort default mapping
    if (videoMap && videoMap.default)
      return isDay
        ? videoMap.default.clear || ""
        : videoMap.default.night || "";

    return "";
  };

  const mergePreview = (prevPreview = {}, nextPreview = {}) => {
    // Never let incomplete fetch results clobber previously known-good fields.
    const merged = { ...prevPreview, ...nextPreview };
    const keepIfMissing = [
      "video_src",
      "time_zone",
      "sunrise",
      "sunset",
      "condition",
      "temperature",
      "tempMax",
      "tempMin",
      "is_day",
    ];

    for (const key of keepIfMissing) {
      const nextVal = merged[key];
      const prevVal = prevPreview[key];
      if (
        (nextVal === undefined || nextVal === null || nextVal === "") &&
        !(prevVal === undefined || prevVal === null || prevVal === "")
      ) {
        merged[key] = prevVal;
      }
    }

    return merged;
  };

  // Compute day/night from saved sunrise/sunset timestamps using current real time with timezone
  const computeIsDayFromSun = (
    sunriseISO,
    sunsetISO,
    timezone
    // fallbackIsDay - ignored, calculating dynamically
  ) => {
    // We STRICTLY calculate isDay from current time vs sunrise/sunset
    // based on the location's timezone. We do NOT rely on cached/backend is_day
    // because it becomes stale instantly.

    const tz = timezone?.time_zone || timezone?.tzid || timezone;

    // Prefer astronomical calculation when we have timezone + sunrise/sunset
    if (sunriseISO && sunsetISO && tz) {
      try {
        const now = moment().tz(tz);
        const sunrise = moment.tz(sunriseISO, tz);
        const sunset = moment.tz(sunsetISO, tz);

        if (sunrise.isValid() && sunset.isValid()) {
          // Polar edge cases: if sunset precedes sunrise, treat night as the small gap
          if (sunset.isBefore(sunrise)) {
            return !(now.isAfter(sunset) && now.isBefore(sunrise));
          }
          return now.isSameOrAfter(sunrise) && now.isBefore(sunset);
        }
      } catch (err) {
        console.warn("Error computing day/night:", err);
      }
    }

    // If all else fails, assume day but still scoped per card
    return true;
  };

  /* background gradient removed: previews use MP4 video instead */

  // Loading skeleton: show cached previews (if any) alongside skeleton slots
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    // Read cached preview entries from localStorage
    const cachePrefix = "weather_preview_";
    const cachedItems = Object.keys(localStorage)
      .filter((k) => k.startsWith(cachePrefix))
      .slice(0, MAX_SAVED_LOCATIONS)
      .map((k) => {
        try {
          const parsed = JSON.parse(localStorage.getItem(k));
          return {
            cacheKey: k,
            name: k.replace(cachePrefix, ""),
            data: parsed?.data || null,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    const slots = [];
    // fill with cached items first
    for (let i = 0; i < cachedItems.length; i++) {
      const item = cachedItems[i];
      const preview = item.data || {};
      const isDayLocal = computeIsDayFromSun(
        preview.sunrise,
        preview.sunset,
        preview.time_zone,
        preview.is_day
      );
      const previewVideo = findPreviewVideo(
        preview.condition,
        isDayLocal,
        preview.video_src
      );
      const weatherIcon = getWeatherIcon(preview.condition, isDayLocal);
      const itemParts = (item.name || "").split(",").map((s) => s.trim());
      const itemCountry =
        itemParts.length > 2
          ? itemParts.slice(2).join(", ")
          : itemParts[1] || "";

      slots.push(
        <div
          key={`cached-${i}`}
          className={`saved-location-card skeleton glass-hover`}
        >
          {previewVideo && (
            <video
              key={previewVideo || `${item.name}-cached-video`}
              className="location-card-video"
              loop
              muted
              playsInline
              preload="metadata"
              aria-hidden="true"
            >
              <source src={previewVideo} type="video/mp4" />
            </video>
          )}
          <div className="location-card-overlay"></div>
          <div className="location-card-content">
            <div className="location-country">{itemCountry}</div>
            <div className="location-header">
              <div className="location-title">
                <h4 className="location-city">{item.name.split(",")[0]}</h4>
              </div>
              <div className="location-country">{itemCountry}</div>
            </div>
            <div className="location-weather">
              <span className="location-condition">
                {preview.condition || "Loading..."}
              </span>

              <div className="right-temps">
                <i className={`weather-icon ${weatherIcon}`}></i>
                <div className="location-temps">
                  <span className="current-temp">
                    {preview.temperature !== undefined
                      ? `${Math.round(preview.temperature)}°`
                      : "--°"}
                  </span>
                  <div className="temp-range">
                    <span>
                      H:
                      {preview.tempMax !== undefined
                        ? `${Math.round(preview.tempMax)}°`
                        : "--"}
                    </span>
                    <span>
                      L:
                      {preview.tempMin !== undefined
                        ? `${Math.round(preview.tempMin)}°`
                        : "--"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Local time (bottom-left) for cached preview if timezone is available */}
          <LocalTime timeZone={preview.time_zone} />
          {debug && (
            <div className="debug-overlay saved-debug">
              <small>cond: {preview.condition}</small>
              <small>is_day: {String(isDayLocal)}</small>
              <small>tz: {String(preview.time_zone)}</small>
              <small>video_src: {String(preview.video_src)}</small>
              <small>selected: {String(previewVideo)}</small>
            </div>
          )}
        </div>
      );
    }

    // fill remaining with skeletons
    for (let i = slots.length; i < MAX_SAVED_LOCATIONS; i++) {
      slots.push(
        <div key={`skeleton-${i}`} className="saved-location-card skeleton">
          <div className="skeleton-shimmer"></div>
        </div>
      );
    }

    return (
      <div className="saved-locations-container">
        <div className="saved-locations-row">{slots}</div>
      </div>
    );
  }

  // Empty state
  if (savedLocations.length === 0) {
    return (
      <div className="saved-locations-container">
        <div className="saved-locations-empty">
          <i className="bi bi-bookmark-star"></i>
          <p>No saved locations</p>
          <span>
            Save locations using the bookmark icon in the weather view
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="saved-locations-container">
      {error && <div className="location-error">{error}</div>}

      <div className="saved-locations-row">
        {savedLocations.map((location) => {
          const preview = locationPreviews[location.id] || {};
          const isActive = currentLocation
            ?.toLowerCase()
            .includes(location.name.split(",")[0].toLowerCase());
          // gradient removed; using video previews instead

          const isDayLocal = computeIsDayFromSun(
            preview.sunrise,
            preview.sunset,
            preview.time_zone,
            preview.is_day
          );

          const previewVideo = findPreviewVideo(
            preview.condition,
            isDayLocal,
            preview.video_src
          );
          const weatherIcon = getWeatherIcon(preview.condition, isDayLocal);

          return (
            <div
              key={location.id}
              className={`saved-location-card ${
                isActive ? "active" : ""
              } glass-hover`}
              onClick={() => handleLocationClick(location)}
              onMouseEnter={(e) => {
                const v = e.currentTarget.querySelector("video");
                if (v && v.paused) v.play().catch(() => {});
              }}
              onMouseLeave={(e) => {
                const v = e.currentTarget.querySelector("video");
                if (v && !v.paused) {
                  try {
                    v.pause();
                    v.currentTime = 0;
                  } catch {
                    // Ignore video control errors
                  }
                }
              }}
            >
              {/* background video for weather preview (play on hover) */}
              {previewVideo && (
                <video
                  key={previewVideo || `loc-${location.id}-video`}
                  className="location-card-video"
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                >
                  <source src={previewVideo} type="video/mp4" />
                </video>
              )}
              <div className="location-card-overlay"></div>

              <button
                className="delete-location-btn"
                onClick={(e) => handleDeleteLocation(location.id, e)}
                title="Remove location"
              >
                <i className="bi bi-x-lg"></i>
              </button>

              <div className="location-card-content">
                <div className="location-header">
                  <div className="location-title">
                    <h4 className="location-city">
                      {location.name.split(",")[0]}
                    </h4>
                    <span className="location-region">
                      {location.name.split(",").slice(1, 2).join("").trim()}
                    </span>
                  </div>
                  <div className="location-country">
                    {(() => {
                      const parts = (location.name || "")
                        .split(",")
                        .map((s) => s.trim());
                      return parts.length > 2
                        ? parts.slice(2).join(", ")
                        : parts[1] || "";
                    })()}
                  </div>
                </div>

                <div className="location-weather">
                  <span className="location-condition">
                    {preview.condition || "Loading..."}
                  </span>

                  <div className="right-temps">
                    <i className={`weather-icon ${weatherIcon}`}></i>
                    <div className="location-temps">
                      <span className="current-temp">
                        {preview.temperature !== undefined
                          ? `${Math.round(preview.temperature)}°`
                          : "--°"}
                      </span>
                      <div className="temp-range">
                        <span>
                          H:
                          {preview.tempMax !== undefined
                            ? `${Math.round(preview.tempMax)}°`
                            : "--"}
                        </span>
                        <span>
                          L:
                          {preview.tempMin !== undefined
                            ? `${Math.round(preview.tempMin)}°`
                            : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Local time (bottom-left) */}
              <LocalTime timeZone={preview.time_zone} />

              {debug && (
                <div className="debug-overlay saved-debug">
                  <small>cond: {preview.condition}</small>
                  <small>is_day: {String(isDayLocal)}</small>
                  <small>tz: {String(preview.time_zone)}</small>
                  <small>video_src: {String(preview.video_src)}</small>
                  <small>selected: {String(previewVideo)}</small>
                </div>
              )}

              {location.is_primary && (
                <div className="primary-badge" title="Primary Location">
                  <i className="bi bi-house-fill"></i>
                </div>
              )}
            </div>
          );
        })}

        {/* Empty slots to show available space */}
        {savedLocations.length < MAX_SAVED_LOCATIONS &&
          Array.from({
            length: MAX_SAVED_LOCATIONS - savedLocations.length,
          }).map((_, i) => (
            <div key={`empty-${i}`} className="saved-location-card empty-slot">
              <div className="empty-slot-content">
                <i className="bi bi-plus-lg"></i>
                <span>Saved location</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default SavedLocations;
