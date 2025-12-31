import { useState, useEffect } from "react";
import {
  getSavedLocations,
  deleteSavedLocation,
} from "../../api/weatherLocationsApi";
import { iconMap, videoMap } from "../../utils/weatherMapping";
import "./SavedLocations.css";

const MAX_SAVED_LOCATIONS = 5;

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
        } catch (err) {
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
          const response = await fetch(
            `http://localhost:8000/api/weather/?location=${encodeURIComponent(
              location.name
            )}`
          );
          if (response.ok) {
            const data = await response.json();
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
            } catch (err) {}
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

  // Compute day/night from saved sunrise/sunset timestamps (fallback to flag)
  const computeIsDayFromSun = (sunriseISO, sunsetISO, fallbackIsDay) => {
    if (sunriseISO && sunsetISO) {
      try {
        const now = new Date();
        const sunrise = new Date(sunriseISO);
        const sunset = new Date(sunsetISO);
        // If parsed correctly, compare
        if (!isNaN(sunrise) && !isNaN(sunset)) {
          return now >= sunrise && now < sunset;
        }
      } catch (err) {
        // fallthrough to fallback
      }
    }
    return fallbackIsDay === 1;
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
        } catch (err) {
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
        preview.is_day
      );
      const previewVideo = findPreviewVideo(preview.condition, isDayLocal);
      const weatherIcon = getWeatherIcon(preview.condition, isDayLocal);
      const itemParts = (item.name || "").split(",").map((s) => s.trim());
      const itemCountry = itemParts.length > 2 ? itemParts.slice(2).join(", ") : itemParts[1] || "";

      slots.push(
        <div key={`cached-${i}`} className={`saved-location-card skeleton`}> 
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
        <div className="saved-locations-scroll">{slots}</div>
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

      <div className="saved-locations-scroll">
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

          // Determine day/night using saved preview's sunrise/sunset if available
          const computeIsDayFromSun = (
            sunriseISO,
            sunsetISO,
            fallbackIsDay
          ) => {
            if (sunriseISO && sunsetISO) {
              try {
                const now = new Date();
                const sunrise = new Date(sunriseISO);
                const sunset = new Date(sunsetISO);
                // If parsed correctly, compare
                if (!isNaN(sunrise) && !isNaN(sunset)) {
                  return now >= sunrise && now < sunset;
                }
              } catch (err) {
                // fallthrough to fallback
              }
            }
            // fallback to explicit is_day flag if present, otherwise assume night
            return fallbackIsDay === 1;
          };

          const isDayLocal = computeIsDayFromSun(
            preview.sunrise,
            preview.sunset,
            preview.is_day
          );

          const previewVideo = findPreviewVideo(preview.condition, isDayLocal);
          const weatherIcon = getWeatherIcon(preview.condition, isDayLocal);

          return (
            <div
              key={location.id}
              className={`saved-location-card ${isActive ? "active" : ""}`}
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
                  } catch (err) {}
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
                        <h4 className="location-city">{location.name.split(",")[0]}</h4>
                        <span className="location-region">
                          {location.name.split(",").slice(1, 2).join("").trim()}
                        </span>
                      </div>
                      <div className="location-country">
                        {(() => {
                          const parts = (location.name || "").split(",").map((s) => s.trim());
                          return parts.length > 2 ? parts.slice(2).join(", ") : parts[1] || "";
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
