import { useState, useEffect, useContext } from "react";
import { ProfileContext } from "../../../contexts/ProfileContext";
import { iconMap } from "../../../utils/weatherMapping";
import "./WeatherWidget.css";

export const WeatherWidget = ({ onNavigate, onDataUpdate }) => {
  const { profile } = useContext(ProfileContext);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState("");

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      try {
        const weatherLocation = profile?.location || "Richmond, Texas, USA";
        setLocation(weatherLocation);

        const response = await fetch(
          `http://localhost:8000/api/weather/?location=${encodeURIComponent(
            weatherLocation
          )}`
        );

        if (!response.ok) {
          throw new Error(
            `Weather request failed with status ${response.status}`
          );
        }

        const data = await response.json();
        setWeatherData(data);
        if (onDataUpdate) onDataUpdate(data);
      } catch (error) {
        console.error("Failed to fetch weather:", error);
        setWeatherData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [profile?.location, onDataUpdate]);

  // Get icon from description string (backend already converts code to description)
  const getWeatherIcon = (description, isDay = 1) => {
    if (!description) return "bi-cloud";

    const iconInfo = iconMap[description];
    if (!iconInfo) return "bi-cloud";

    if (typeof iconInfo === "object") {
      return isDay
        ? iconInfo.day?.replace("bi ", "")
        : iconInfo.night?.replace("bi ", "");
    }
    return iconInfo.replace("bi ", "");
  };

  // Get weather effect type for background
  const getWeatherEffectType = (condition, temp, isDay) => {
    if (!condition) return "clear";
    const c = String(condition).toLowerCase();
    const temperature = temp || 70;

    // Temperature-based effects (highest priority)
    if (temperature >= 100) return "extreme-heat";
    if (temperature >= 95) return "very-hot";
    if (temperature <= 5) return "extreme-cold";
    if (temperature <= 20) return "very-cold";

    // Weather condition-based effects
    if (c.includes("thunder") || c.includes("storm")) return "thunderstorm";
    if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) {
      return c.includes("heavy") ||
        c.includes("violent") ||
        c.includes("moderate")
        ? "rain-heavy"
        : "rain";
    }
    if (
      c.includes("snow") ||
      c.includes("sleet") ||
      c.includes("ice") ||
      c.includes("hail")
    ) {
      return c.includes("heavy") || c.includes("blizzard")
        ? "snow-heavy"
        : "snow";
    }
    if (
      c.includes("fog") ||
      c.includes("mist") ||
      c.includes("haze") ||
      c.includes("smoke")
    ) {
      return "fog";
    }
    if (c.includes("clear") || c.includes("sunny") || c.includes("fair")) {
      return isDay ? "clear" : "clear-night";
    }
    if (
      c.includes("overcast") ||
      c.includes("cloud") ||
      c.includes("partly") ||
      c.includes("mostly")
    ) {
      return "cloudy";
    }
    return "clear";
  };

  // Extract data from backend response
  const hourly = weatherData?.weather_data?.hourly || [];
  const daily = weatherData?.weather_data?.daily || [];
  const minutely = weatherData?.weather_data?.minutely_15 || [];
  const airUv = weatherData?.air_uv_data;

  // Choose the hourly entry closest to now so widget matches the Weather page
  const findClosestByTime = (arr) => {
    if (!arr || !arr.length) return null;
    // prefer items with an ISO time string in `time` property
    const now = new Date();
    let best = null;
    let bestDiff = Infinity;
    for (let i = 0; i < arr.length; i++) {
      const item = arr[i];
      const timeStr = item?.time || item?.timestamp || item?.dt;
      if (!timeStr) continue;
      const t = new Date(timeStr).getTime();
      const diff = Math.abs(t - now.getTime());
      if (diff < bestDiff) {
        bestDiff = diff;
        best = item;
      }
    }
    // Fallback to first element if no time fields found
    return best || arr[0];
  };

  const current =
    findClosestByTime(hourly) ||
    findClosestByTime(minutely) ||
    hourly[0] ||
    minutely[0] ||
    null;
  const currentIndex =
    current && hourly ? hourly.findIndex((h) => h.time === current.time) : -1;

  // Get weather effect type for background (after current is defined)
  const weatherEffectType = current
    ? getWeatherEffectType(
        current.weather_code,
        current.temperature,
        current.is_day
      )
    : "clear";

  // Find today's date in the daily array
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayFormatted = `${today.getFullYear()}-${String(
    today.getMonth() + 1
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Find today's index in the daily array
  const todayIndex = daily.findIndex((day) => day.date === todayFormatted);
  const todayDaily = todayIndex >= 0 ? daily[todayIndex] : daily[0];

  // Get forecast starting from today (today + next 2 days)
  const forecastStartIndex = todayIndex >= 0 ? todayIndex : 0;
  const forecast = daily.slice(forecastStartIndex, forecastStartIndex + 3);

  // Helper function to round temperature
  const roundTemp = (temp) => {
    return Math.round(temp);
  };

  // Calculate global min/max for forecast heat bars
  const forecastTemps = forecast
    .map((d) => ({
      min: Number(d.min_temperature),
      max: Number(d.max_temperature),
    }))
    .filter((t) => Number.isFinite(t.min) && Number.isFinite(t.max));
  const globalMin =
    forecastTemps.length > 0
      ? Math.min(...forecastTemps.map((t) => t.min))
      : null;
  const globalMax =
    forecastTemps.length > 0
      ? Math.max(...forecastTemps.map((t) => t.max))
      : null;
  const globalRange =
    globalMin != null && globalMax != null
      ? Math.max(1, globalMax - globalMin)
      : 1;

  // Helper function to get color based on temperature (cold to hot gradient)
  const getTempColor = (temp, min, max) => {
    if (min === max) return "rgb(100, 150, 255)"; // Default blue if no range
    const normalized = (temp - min) / (max - min);

    // Color gradient: blue (cold) -> cyan -> yellow -> orange -> red (hot)
    if (normalized < 0.25) {
      // Blue to cyan
      const t = normalized / 0.25;
      return `rgb(${100 + t * 100}, ${150 + t * 105}, 255)`;
    } else if (normalized < 0.5) {
      // Cyan to yellow
      const t = (normalized - 0.25) / 0.25;
      return `rgb(${200 - t * 100}, ${255 - t * 55}, ${255 - t * 255})`;
    } else if (normalized < 0.75) {
      // Yellow to orange
      const t = (normalized - 0.5) / 0.25;
      return `rgb(${255}, ${200 - t * 100}, ${0})`;
    } else {
      // Orange to red
      const t = (normalized - 0.75) / 0.25;
      return `rgb(${255}, ${100 - t * 100}, ${0})`;
    }
  };

  // Get current UV index (find closest time)
  const getCurrentUV = () => {
    if (!airUv?.uv_data?.length) return 0;
    // If the uv_data items have timestamps, pick the closest by time
    const uvData = airUv.uv_data;
    const hasTime =
      uvData[0] && (uvData[0].time || uvData[0].timestamp || uvData[0].dt);
    if (hasTime) {
      const closest = findClosestByTime(uvData);
      return closest?.uv_index || 0;
    }
    // Otherwise align by index with the hourly array (use currentIndex)
    if (currentIndex >= 0 && uvData[currentIndex])
      return uvData[currentIndex].uv_index || 0;
    return uvData[0]?.uv_index || 0;
  };

  // Get current AQI (find closest time)
  const getCurrentAQI = () => {
    if (!airUv?.aqi_data?.length) return 0;
    const aqiData = airUv.aqi_data;
    const hasTime =
      aqiData[0] && (aqiData[0].time || aqiData[0].timestamp || aqiData[0].dt);
    if (hasTime) {
      const closest = findClosestByTime(aqiData);
      return closest?.us_aqi || closest?.aqi || 0;
    }
    if (currentIndex >= 0 && aqiData[currentIndex])
      return aqiData[currentIndex].us_aqi || aqiData[currentIndex].aqi || 0;
    return aqiData[0]?.us_aqi || aqiData[0]?.aqi || 0;
  };

  return (
    <div
      className={`home-widget weather-widget weather-effect-${weatherEffectType}`}
    >
      <div className="weather-widget-bg"></div>
      <div className="widget-header">
        <div className="widget-title-section">
          <div className="widget-icon weather">
            <i className="bi bi-cloud-sun"></i>
          </div>
          <div>
            <h3 className="widget-title">Weather</h3>
            <p className="widget-subtitle">
              {location.split(",")[0] || "Current Location"}
            </p>
          </div>
        </div>
        <div className="widget-arrow" onClick={onNavigate}>
          <i className="bi bi-chevron-right"></i>
        </div>
      </div>

      <div className="widget-content">
        {loading ? (
          <div className="widget-loading"></div>
        ) : !current ? (
          <div className="widget-empty">
            <i className="bi bi-cloud-slash"></i>
            <p>Weather unavailable</p>
          </div>
        ) : (
          <div className="weather-grid-layout">
            {/* Left: Current Weather Card */}
            <div className="weather-current-card">
              <div className="current-main">
                <i
                  className={`bi ${getWeatherIcon(
                    current.weather_code,
                    current.is_day
                  )} weather-icon-large`}
                ></i>
                <div className="temp-display">
                  <span className="current-temp">
                    {Math.round(current.temperature)}
                  </span>
                  <span className="temp-unit">°F</span>
                </div>
              </div>
              <div className="current-condition">
                {current.weather_code || "Unknown"}
              </div>
              {todayDaily && (
                <div className="temp-range">
                  <span className="high">
                    <i className="bi bi-arrow-up"></i>
                    {Math.round(todayDaily.max_temperature)}°
                  </span>
                  <span className="low">
                    <i className="bi bi-arrow-down"></i>
                    {Math.round(todayDaily.min_temperature)}°
                  </span>
                </div>
              )}
            </div>

            {/* Right: Stats + Forecast */}
            <div className="weather-details-card">
              {/* Weather Stats Grid */}
              <div className="weather-stats-grid">
                <div className="weather-stat-item">
                  <div className="stat-info">
                    <span className="stat-value">
                      {Math.round(
                        current?.humidity || current?.relative_humidity || 0
                      )}
                      %
                    </span>
                    <span className="stat-label">Humidity</span>
                  </div>
                  <i className="bi bi-droplet-fill"></i>
                </div>
                <div className="weather-stat-item">
                  <div className="stat-info">
                    <span className="stat-value">
                      {Math.round(current?.wind_speed || current?.wind || 0)}
                    </span>
                    <span className="stat-label">mph Wind</span>
                  </div>
                  <i className="bi bi-wind"></i>
                </div>
                <div className="weather-stat-item">
                  <div className="stat-info">
                    <span className="stat-value">
                      {Math.round(getCurrentUV())}
                    </span>
                    <span className="stat-label">UV Index</span>
                  </div>
                  <i className="bi bi-sun-fill"></i>
                </div>
                <div className="weather-stat-item">
                  <div className="stat-info">
                    <span className="stat-value">
                      {Math.round(getCurrentAQI())}
                    </span>
                    <span className="stat-label">Air Quality</span>
                  </div>
                  <i className="bi bi-lungs-fill"></i>
                </div>
              </div>

              {/* Mini Forecast */}
              {forecast.length > 0 && (
                <div className="mini-forecast">
                  {forecast.map((day, index) => {
                    const date = new Date(day.date + "T00:00:00");
                    const todayDate = new Date();
                    todayDate.setHours(0, 0, 0, 0);
                    const dayDate = new Date(date);
                    dayDate.setHours(0, 0, 0, 0);
                    const isToday = day.date === todayFormatted;
                    // First item should be "Today" if it matches today's date, rest show weekday
                    const dayName = isToday
                      ? "Today"
                      : date.toLocaleDateString("en-US", {
                          weekday: "short",
                        });
                    // Calculate heat bar for this day
                    const min = Number(day.min_temperature);
                    const max = Number(day.max_temperature);
                    const hasValidTemps =
                      globalMin != null &&
                      globalMax != null &&
                      Number.isFinite(min) &&
                      Number.isFinite(max);

                    let heatBarContent = null;
                    if (hasValidTemps) {
                      // Calculate positions for the heat bar
                      const minPos = ((min - globalMin) / globalRange) * 100;
                      const maxPos = ((max - globalMin) / globalRange) * 100;
                      const clampedMinPos = Math.max(0, Math.min(100, minPos));
                      const clampedMaxPos = Math.max(0, Math.min(100, maxPos));
                      const barWidth = Math.max(
                        4,
                        clampedMaxPos - clampedMinPos
                      );

                      // Get colors for min and max temperatures
                      const minColor = getTempColor(min, globalMin, globalMax);
                      const maxColor = getTempColor(max, globalMin, globalMax);

                      heatBarContent = (
                        <div className="mini-forecast-heat-bar-container">
                          <div className="mini-forecast-heat-bar-track">
                            <div
                              className="mini-forecast-heat-bar"
                              style={{
                                left: `${clampedMinPos}%`,
                                width: `${barWidth}%`,
                                background: `linear-gradient(to right, ${minColor}, ${maxColor})`,
                              }}
                            />
                          </div>
                          <div className="mini-forecast-temp-labels">
                            <span className="mini-forecast-temp-label mini-forecast-temp-low">
                              {roundTemp(min)}°
                            </span>
                            <span className="mini-forecast-temp-label mini-forecast-temp-high">
                              {roundTemp(max)}°
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={index} className="forecast-day">
                        <span className="forecast-day-name">{dayName}</span>
                        <i
                          className={`bi ${getWeatherIcon(
                            day.weather_code,
                            1
                          )}`}
                        ></i>
                        {heatBarContent || (
                          <div
                            className="forecast-temps"
                            aria-hidden="true"
                          ></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
