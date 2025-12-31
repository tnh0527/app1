import { useState, useEffect, useRef } from "react";
import { iconMap, videoMap } from "../../../utils/weatherMapping";
import "./WeatherWidget.css";

export const WeatherWidget = ({
  initialWeather = null,
  onNavigate,
  onDataUpdate,
}) => {
  const [weatherData, setWeatherData] = useState(initialWeather || null);
  const [loading, setLoading] = useState(initialWeather ? false : true);
  const [location, setLocation] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [tempUnit, setTempUnit] = useState("F"); // "F" or "C"
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const videoRef = useRef(null);

  // Fetch weather based on browser geolocation
  useEffect(() => {
    const fetchWeatherByCoords = async (latitude, longitude) => {
      try {
        // Reverse geocode to get location name
        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const geoData = await geoResponse.json();
        const city =
          geoData.address?.city ||
          geoData.address?.town ||
          geoData.address?.village ||
          "";
        const state = geoData.address?.state || "";
        const locationName =
          city && state
            ? `${city}, ${state}`
            : city || state || "Current Location";
        setLocation(locationName);

        // Fetch weather using coordinates
        const response = await fetch(
          `http://localhost:8000/api/weather/?lat=${latitude}&lon=${longitude}`
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

    const fetchWeatherByIP = async () => {
      try {
        // Get location from IP address as fallback
        const ipResponse = await fetch("https://ipapi.co/json/");
        const ipData = await ipResponse.json();

        if (ipData.latitude && ipData.longitude) {
          const locationName =
            ipData.city && ipData.region
              ? `${ipData.city}, ${ipData.region}`
              : ipData.city || "Current Location";
          setLocation(locationName);

          const response = await fetch(
            `http://localhost:8000/api/weather/?lat=${ipData.latitude}&lon=${ipData.longitude}`
          );

          if (!response.ok) {
            throw new Error(
              `Weather request failed with status ${response.status}`
            );
          }

          const data = await response.json();
          setWeatherData(data);
          if (onDataUpdate) onDataUpdate(data);
        }
      } catch (error) {
        console.error("Failed to fetch weather by IP:", error);
        setWeatherData(null);
      } finally {
        setLoading(false);
      }
    };

    const getLocationAndFetchWeather = () => {
      if (initialWeather) {
        setWeatherData(initialWeather);
        setLoading(false);
        if (onDataUpdate) onDataUpdate(initialWeather);
        return;
      }

      setLoading(true);

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            fetchWeatherByCoords(
              position.coords.latitude,
              position.coords.longitude
            );
          },
          (error) => {
            console.warn(
              "Geolocation denied or unavailable, falling back to IP:",
              error.message
            );
            fetchWeatherByIP();
          },
          { timeout: 10000, maximumAge: 300000 } // 10s timeout, cache for 5 minutes
        );
      } else {
        fetchWeatherByIP();
      }
    };

    getLocationAndFetchWeather();
  }, [onDataUpdate, initialWeather]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Toggle video play/pause
  const toggleVideo = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsVideoPlaying(!isVideoPlaying);
    }
  };

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

  // Get video URL from description string
  const getWeatherVideo = (description, isDay = 1) => {
    if (!description) return videoMap.default?.clear || "";

    const videoInfo = videoMap[description];
    if (!videoInfo) return videoMap.default?.clear || "";

    if (typeof videoInfo === "object") {
      return isDay ? videoInfo.day : videoInfo.night;
    }
    return videoInfo;
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

  // Get feels like from minutely data (more accurate)
  const currentMinutely = findClosestByTime(minutely) || minutely[0] || null;
  const feelsLikeTemp =
    currentMinutely?.apparent_temperature || current?.apparent_temperature;

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

  // Temperature conversion functions
  const fahrenheitToCelsius = (f) => {
    return ((f - 32) * 5) / 9;
  };

  const celsiusToFahrenheit = (c) => {
    return (c * 9) / 5 + 32;
  };

  // Convert temperature based on current unit
  const convertTemp = (temp) => {
    if (tempUnit === "C") {
      return fahrenheitToCelsius(temp);
    }
    return temp;
  };

  // Helper function to round temperature to one decimal place
  const roundTemp = (temp) => {
    const converted = convertTemp(temp);
    return Number(converted).toFixed(1);
  };

  // Toggle temperature unit
  const toggleTempUnit = () => {
    setTempUnit((prev) => (prev === "F" ? "C" : "F"));
  };

  // Calculate global min/max for forecast heat bars (using converted temperatures)
  const forecastTemps = forecast
    .map((d) => ({
      min: convertTemp(Number(d.min_temperature)),
      max: convertTemp(Number(d.max_temperature)),
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
    <div className={`home-widget weather-widget`}>
      <div className="weather-widget-bg"></div>
      <div className="widget-header">
        <div className="widget-title-section">
          <div className="widget-icon weather">
            <i className="bi bi-cloud-sun"></i>
          </div>
          <div>
            <h3 className="widget-title">Weather</h3>
            <p className="widget-subtitle">{location || "Current Location"}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div className="temp-unit-toggle" onClick={toggleTempUnit}>
            <button
              className={`unit-btn ${tempUnit === "F" ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setTempUnit("F");
              }}
            >
              F
            </button>
            <button
              className={`unit-btn ${tempUnit === "C" ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setTempUnit("C");
              }}
            >
              C
            </button>
          </div>
          <div className="widget-arrow" onClick={onNavigate}>
            <i className="bi bi-chevron-right"></i>
          </div>
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
              <video
                key={getWeatherVideo(current.weather_code, current.is_day)}
                ref={videoRef}
                autoPlay
                loop
                muted
                playsInline
                className="weather-video"
              >
                <source
                  src={getWeatherVideo(current.weather_code, current.is_day)}
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
              <div className="weather-card-top-bar">
                <button
                  className="video-toggle-btn"
                  onClick={toggleVideo}
                  title={
                    isVideoPlaying ? "Pause background" : "Play background"
                  }
                >
                  <i
                    className={`bi ${
                      isVideoPlaying ? "bi-pause-fill" : "bi-play-fill"
                    }`}
                  ></i>
                </button>
                <div className="weather-current-time">
                  {currentTime.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </div>
              </div>
              <div className="current-main">
                <div className="current-main-left">
                  <i
                    className={`bi ${getWeatherIcon(
                      current.weather_code,
                      current.is_day
                    )} weather-icon-large`}
                  ></i>
                  <div className="temp-display">
                    <span style={{ fontSize: "42px" }} className="current-temp">
                      {roundTemp(current.temperature)}
                    </span>
                    <span className="temp-unit">°{tempUnit}</span>
                  </div>
                </div>
                <div className="current-condition">
                  {current.weather_code || "Unknown"}
                </div>
              </div>
              {todayDaily &&
                (() => {
                  const min = Number(todayDaily.min_temperature);
                  const max = Number(todayDaily.max_temperature);
                  const hasValidTemps =
                    Number.isFinite(min) && Number.isFinite(max);

                  if (!hasValidTemps) return null;

                  // Convert temperatures for display
                  const convertedMin = convertTemp(min);
                  const convertedMax = convertTemp(max);

                  // Calculate range for heat bar (use a reasonable range around the temps)
                  const rangePadding = tempUnit === "C" ? 5.5 : 10; // ~10F = ~5.5C
                  const globalMin = Math.max(
                    tempUnit === "C" ? -20 : 0,
                    convertedMin - rangePadding
                  );
                  const globalMax = convertedMax + rangePadding;
                  const globalRange = Math.max(1, globalMax - globalMin);

                  // Calculate positions for the heat bar
                  // Limit the bar to 50% of container width
                  const minPos =
                    ((convertedMin - globalMin) / globalRange) * 100;
                  const maxPos =
                    ((convertedMax - globalMin) / globalRange) * 100;
                  const rawBarWidth = maxPos - minPos;
                  const maxBarWidth = 50; // Maximum 50% of container
                  const actualBarWidth = Math.min(
                    maxBarWidth,
                    Math.max(4, rawBarWidth)
                  );

                  // Center the bar or position it from the left
                  const barLeft = Math.max(
                    0,
                    Math.min(100 - actualBarWidth, minPos)
                  );

                  // Get colors for min and max temperatures (using original F temps for color calculation)
                  const minColor = getTempColor(
                    min,
                    min - rangePadding,
                    max + rangePadding
                  );
                  const maxColor = getTempColor(
                    max,
                    min - rangePadding,
                    max + rangePadding
                  );

                  return (
                    <div className="widget-heat-bar-container">
                      <div className="widget-heat-bar-track">
                        <div
                          className="widget-heat-bar"
                          style={{
                            left: `${barLeft}%`,
                            width: `${actualBarWidth}%`,
                            background: `linear-gradient(to right, ${minColor}, ${maxColor})`,
                          }}
                        />
                        <span className="widget-temp-label widget-temp-low">
                          L: {roundTemp(min)}°
                        </span>
                        <span className="widget-temp-label widget-temp-high">
                          H: {roundTemp(max)}°
                        </span>
                      </div>
                    </div>
                  );
                })()}
              {current?.visibility != null && (
                <div className="weather-visibility">
                  <i className="bi bi-eye"></i>
                  <span>
                    {current.visibility >= 10
                      ? "10+"
                      : current.visibility.toFixed(1)}{" "}
                    mi
                  </span>
                </div>
              )}
              {feelsLikeTemp != null && (
                <div className="weather-feels-like">
                  Feels like {roundTemp(feelsLikeTemp)}°
                </div>
              )}
            </div>

            {/* Right: Stats + Forecast */}
            <div className="weather-details-card">
              {/* Weather Stats Grid */}
              <div className="weather-stats-grid">
                <div className="weather-stat-item">
                  <i className="bi bi-droplet-fill"></i>
                  <div className="stat-info">
                    <span className="stat-value">
                      {Math.round(
                        current?.humidity || current?.relative_humidity || 0
                      )}
                      %
                    </span>
                    <span className="stat-label">Humidity</span>
                  </div>
                </div>
                <div className="weather-stat-item">
                  <i className="bi bi-wind"></i>
                  <div className="stat-info">
                    <span className="stat-value">
                      {(current?.wind_speed || current?.wind || 0).toFixed(1)}
                    </span>
                    <span className="stat-label">mph Wind</span>
                  </div>
                </div>
                <div className="weather-stat-item">
                  <i className="bi bi-sun-fill"></i>
                  <div className="stat-info">
                    <span className="stat-value">
                      {Number(getCurrentUV()).toFixed(1)}
                    </span>
                    <span className="stat-label">UV Index</span>
                  </div>
                </div>
                <div className="weather-stat-item">
                  <i className="bi bi-lungs-fill"></i>
                  <div className="stat-info">
                    <span className="stat-value">
                      {Math.round(getCurrentAQI())}
                    </span>
                    <span className="stat-label">Air Quality</span>
                  </div>
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
                    const convertedMin = convertTemp(min);
                    const convertedMax = convertTemp(max);
                    const hasValidTemps =
                      globalMin != null &&
                      globalMax != null &&
                      Number.isFinite(convertedMin) &&
                      Number.isFinite(convertedMax);

                    let heatBarContent = null;
                    if (hasValidTemps) {
                      // Calculate positions for the heat bar (using converted temps)
                      const minPos =
                        ((convertedMin - globalMin) / globalRange) * 100;
                      const maxPos =
                        ((convertedMax - globalMin) / globalRange) * 100;
                      const clampedMinPos = Math.max(0, Math.min(100, minPos));
                      const clampedMaxPos = Math.max(0, Math.min(100, maxPos));
                      const barWidth = Math.max(
                        4,
                        clampedMaxPos - clampedMinPos
                      );

                      // Get colors for min and max temperatures (using original F temps for color)
                      // Calculate original F range for color gradient
                      const originalMin = Math.min(
                        ...forecast.map((d) => Number(d.min_temperature))
                      );
                      const originalMax = Math.max(
                        ...forecast.map((d) => Number(d.max_temperature))
                      );
                      const originalRange = Math.max(
                        1,
                        originalMax - originalMin
                      );
                      const minColor = getTempColor(
                        min,
                        originalMin - originalRange * 0.1,
                        originalMax + originalRange * 0.1
                      );
                      const maxColor = getTempColor(
                        max,
                        originalMin - originalRange * 0.1,
                        originalMax + originalRange * 0.1
                      );

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
                      <div
                        key={index}
                        className={`forecast-day ${
                          isToday ? "forecast-day--today" : ""
                        }`}
                      >
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
