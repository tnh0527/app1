import { useState, useEffect, useRef } from "react";
import moment from "moment-timezone";
import {
  getSavedLocations,
  deleteSavedLocation,
} from "../../api/weatherLocationsApi";
import { iconMap, videoMap } from "../../utils/weatherMapping";
import api from "../../api/axios";
import "./SavedLocations.css";

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
}) => {
  const [savedLocations, setSavedLocations] = useState([]);
  const [locationPreviews, setLocationPreviews] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

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
    const fetchPreviews = async () => {
      // Prefill from cache so UI shows immediately while we refetch
      const initialPreviews = {};
      for (const location of savedLocations) {
        try {
          const cacheKey = `weather_preview_${location.name}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const { data } = JSON.parse(cached);
            initialPreviews[location.id] = data;
          }
        } catch {
          // ignore cache parse errors
        }
      }

      if (Object.keys(initialPreviews).length > 0) {
        setLocationPreviews((prev) => ({ ...prev, ...initialPreviews }));
      }

      // Now fetch fresh previews for all saved locations (always)
      const previews = {};
      for (const location of savedLocations) {
        try {
          const response = await api.get("/api/weather/", {
            params: { location: location.name },
          });
          const data = response.data;
          const currentTime = new Date();
          const currentMinuteIndex = Math.floor(
            (currentTime.getHours() * 60 + currentTime.getMinutes()) / 15
          );
          const minutelyData = data.weather_data?.minutely_15 || [];
          const currentData =
            minutelyData[currentMinuteIndex] || minutelyData[0] || {};
          const dailyData = data.weather_data?.daily || [];

          const previewData = {
            temperature: currentData.temperature,
            condition: currentData.weather_code,
            tempMax: dailyData[0]?.max_temperature,
            tempMin: dailyData[0]?.min_temperature,
            is_day: currentData.is_day,
            sunrise: dailyData[0]?.sunrise,
            sunset: dailyData[0]?.sunset,
            time_zone: data.time_zone_data || null,
          };

          previews[location.id] = previewData;

          // Update cache with fresh data
          try {
            const cacheKey = `weather_preview_${location.name}`;
            localStorage.setItem(
              cacheKey,
              JSON.stringify({ data: previewData, timestamp: Date.now() })
            );
          } catch {
            // Ignore sessionStorage errors
          }
        } catch (error) {
          console.error(`Failed to fetch preview for ${location.name}:`, error);
        }
      }

      // Merge fresh previews into state so UI updates
      setLocationPreviews((prev) => ({ ...prev, ...previews }));
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
  // supports keys that are objects with day/night variants)
  const findPreviewVideo = (condition, isDay) => {
    if (!condition) return (videoMap.default && videoMap.default.clear) || "";
    const conditionLower = String(condition).toLowerCase();

    // Try exact match first (case-insensitive)
    const exactKey = Object.keys(videoMap).find(
      (k) => k.toLowerCase() === conditionLower
    );
    if (exactKey) {
      const v = videoMap[exactKey];
      return typeof v === "object" ? (isDay ? v.day : v.night) : v;
    }

    // Try partial match: condition includes map key or vice-versa
    const partialKey = Object.keys(videoMap).find((k) => {
      const kl = k.toLowerCase();
      return conditionLower.includes(kl) || kl.includes(conditionLower);
    });
    if (partialKey) {
      const v = videoMap[partialKey];
      return typeof v === "object" ? (isDay ? v.day : v.night) : v;
    }

    // Fallback to default clear/night
    if (videoMap.default)
      return isDay
        ? videoMap.default.clear || ""
        : videoMap.default.night || "";
    return "";
  };

  // Compute day/night from saved sunrise/sunset timestamps using current real time with timezone
  const computeIsDayFromSun = (
    sunriseISO,
    sunsetISO,
    timezone,
    // eslint-disable-next-line no-unused-vars
    fallbackIsDay
  ) => {
    if (sunriseISO && sunsetISO && timezone) {
      try {
        const tz = timezone.time_zone || timezone;
        const currentTime = moment().tz(tz);
        const sunrise = moment.tz(sunriseISO, tz);
        const sunset = moment.tz(sunsetISO, tz);
        return currentTime.isAfter(sunrise) && currentTime.isBefore(sunset);
      } catch {
        // fallthrough to fallback
      }
    }
    // Always use current time calculation, don't rely on stored is_day flag
    // Default to daytime (true) if we can't determine
    return true;
  };

  /* background gradient removed: previews use MP4 video instead */

  // Loading skeleton: show cached previews (if any) alongside skeleton slots
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
      const previewVideo = findPreviewVideo(preview.condition, isDayLocal);
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

          // Robust helper: find the best matching video for a condition (case-insensitive,
          // supports keys that are objects with day/night variants)
          const findPreviewVideo = (condition, isDay) => {
            if (!condition)
              return (videoMap.default && videoMap.default.clear) || "";
            const conditionLower = String(condition).toLowerCase();

            // Try exact match first (case-insensitive)
            const exactKey = Object.keys(videoMap).find(
              (k) => k.toLowerCase() === conditionLower
            );
            if (exactKey) {
              const v = videoMap[exactKey];
              return typeof v === "object" ? (isDay ? v.day : v.night) : v;
            }

            // Try partial match: condition includes map key or vice-versa
            const partialKey = Object.keys(videoMap).find((k) => {
              const kl = k.toLowerCase();
              return conditionLower.includes(kl) || kl.includes(conditionLower);
            });
            if (partialKey) {
              const v = videoMap[partialKey];
              return typeof v === "object" ? (isDay ? v.day : v.night) : v;
            }

            // Fallback to default clear/night
            if (videoMap.default)
              return isDay
                ? videoMap.default.clear || ""
                : videoMap.default.night || "";
            return "";
          };

          const isDayLocal = computeIsDayFromSun(
            preview.sunrise,
            preview.sunset,
            preview.time_zone,
            preview.is_day
          );

          const previewVideo = findPreviewVideo(preview.condition, isDayLocal);
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
