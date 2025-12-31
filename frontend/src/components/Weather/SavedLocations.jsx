import { useState, useEffect } from "react";
import {
  getSavedLocations,
  deleteSavedLocation,
} from "../../api/weatherLocationsApi";
import { iconMap } from "../../utils/weatherMapping";
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
  useEffect(() => {
    const fetchPreviews = async () => {
      const previews = {};
      for (const location of savedLocations) {
        try {
          // Check cache first
          const cacheKey = `weather_preview_${location.name}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            // Cache valid for 30 minutes
            if (Date.now() - timestamp < 30 * 60 * 1000) {
              previews[location.id] = data;
              continue;
            }
          }

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
            };

            previews[location.id] = previewData;

            // Cache the preview
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                data: previewData,
                timestamp: Date.now(),
              })
            );
          }
        } catch (error) {
          console.error(`Failed to fetch preview for ${location.name}:`, error);
        }
      }
      setLocationPreviews(previews);
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

  // Get background gradient based on weather condition
  const getConditionGradient = (condition, isDay) => {
    if (!condition) return "linear-gradient(135deg, #4a90d9 0%, #67b8de 100%)";

    const conditionLower = condition.toLowerCase();

    if (conditionLower.includes("rain") || conditionLower.includes("drizzle")) {
      return "linear-gradient(135deg, #4a5568 0%, #667eea 100%)";
    }
    if (
      conditionLower.includes("thunder") ||
      conditionLower.includes("storm")
    ) {
      return "linear-gradient(135deg, #2d3748 0%, #4a5568 100%)";
    }
    if (
      conditionLower.includes("cloud") ||
      conditionLower.includes("overcast")
    ) {
      return isDay
        ? "linear-gradient(135deg, #94b8d1 0%, #b8c9d9 100%)"
        : "linear-gradient(135deg, #3a4a5c 0%, #5a6a7c 100%)";
    }
    if (conditionLower.includes("snow")) {
      return "linear-gradient(135deg, #e8f4f8 0%, #d1e8f0 100%)";
    }
    if (conditionLower.includes("fog") || conditionLower.includes("mist")) {
      return "linear-gradient(135deg, #9ca3af 0%, #d1d5db 100%)";
    }
    // Clear/sunny
    return isDay
      ? "linear-gradient(135deg, #4a90d9 0%, #87ceeb 100%)"
      : "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)";
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="saved-locations-container">
        <div className="saved-locations-scroll">
          {Array.from({ length: MAX_SAVED_LOCATIONS }).map((_, i) => (
            <div key={i} className="saved-location-card skeleton">
              <div className="skeleton-shimmer"></div>
            </div>
          ))}
        </div>
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
          const gradient = getConditionGradient(
            preview.condition,
            preview.is_day !== 0
          );
          const weatherIcon = getWeatherIcon(
            preview.condition,
            preview.is_day !== 0
          );

          return (
            <div
              key={location.id}
              className={`saved-location-card ${isActive ? "active" : ""}`}
              style={{ background: gradient }}
              onClick={() => handleLocationClick(location)}
            >
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
                  <h4 className="location-city">
                    {location.name.split(",")[0]}
                  </h4>
                  <span className="location-region">
                    {location.name.split(",").slice(1, 2).join("").trim()}
                  </span>
                </div>

                <div className="location-weather">
                  <span className="location-condition">
                    {preview.condition || "Loading..."}
                  </span>
                  <i className={`weather-icon ${weatherIcon}`}></i>
                </div>

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
                <span>Save a location</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default SavedLocations;
