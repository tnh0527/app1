import "./WeatherModal.css";

const WeatherModal = ({ isOpen, onClose, title, data }) => {
  if (!isOpen) return null;

  // Get icon for each data type
  const getIcon = (key) => {
    const iconMap = {
      time: "bi-clock",
      temperature: "bi-thermometer-half",
      humidity: "bi-droplet",
      dewpoint: "bi-moisture",
      dew_point: "bi-moisture",
      wind_speed: "bi-wind",
      windspeed: "bi-wind",
      wind_direction: "bi-compass",
      winddirection: "bi-compass",
      uv_index: "bi-sun",
      us_aqi: "bi-lungs",
      visibility: "bi-eye",
      pressure: "bi-speedometer2",
      cloud_cover: "bi-clouds",
      apparent_temperature: "bi-thermometer",
      sunrise: "bi-sunrise",
      sunset: "bi-sunset",
      tomorrowsunrise: "bi-sunrise",
      tomorrowsunset: "bi-sunset",
      sundata: "bi-sun",
      timezone: "bi-globe",
      time_zone: "bi-globe",
      utc_offset: "bi-clock-history",
    };
    return iconMap[key.toLowerCase()] || "bi-circle";
  };

  // Format time nicely
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    const date = new Date(timeStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Format datetime for sunrise/sunset
  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return "N/A";
    const date = new Date(dateTimeStr);
    return date.toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Format value with units
  const formatValue = (key, value) => {
    if (value === null || value === undefined) return "N/A";
    const lowerKey = key.toLowerCase();

    // Handle sunrise/sunset datetime strings
    if (
      lowerKey.includes("sunrise") ||
      lowerKey.includes("sunset") ||
      lowerKey === "tomorrowsunrise" ||
      lowerKey === "tomorrowsunset"
    ) {
      return formatDateTime(value);
    }
    if (lowerKey === "time") {
      return formatTime(value);
    }
    // Check if value is a number before doing math
    if (typeof value !== "number") {
      return String(value);
    }
    if (
      lowerKey.includes("temperature") ||
      lowerKey === "dewpoint" ||
      lowerKey === "dew_point"
    ) {
      return `${Math.round(value)}°`;
    }
    if (lowerKey === "humidity") {
      return `${Math.round(value)}%`;
    }
    if (lowerKey.includes("wind_speed") || lowerKey === "windspeed") {
      return `${Math.round(value)} mph`;
    }
    if (lowerKey.includes("wind_direction") || lowerKey === "winddirection") {
      const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      const index = Math.round(value / 45) % 8;
      return `${directions[index]} (${Math.round(value)}°)`;
    }
    if (lowerKey === "uv_index") {
      return value.toFixed(1);
    }
    if (lowerKey === "us_aqi") {
      return Math.round(value);
    }
    if (lowerKey === "visibility") {
      return `${(value / 1000).toFixed(1)} km`;
    }
    if (lowerKey === "pressure") {
      return `${Math.round(value)} hPa`;
    }
    if (lowerKey === "cloud_cover") {
      return `${Math.round(value)}%`;
    }
    if (lowerKey === "utc_offset" || lowerKey.includes("offset")) {
      const hours = value / 3600;
      return `UTC${hours >= 0 ? "+" : ""}${hours}`;
    }
    return value.toFixed(1);
  };

  // Get the title display name
  const getTitleName = () => {
    const titleMap = {
      wind: "Wind Status",
      uv: "UV Index",
      sunrise: "Sunrise & Sunset",
      humidity: "Humidity",
      air_quality: "Air Quality",
      feels_like: "Feels Like",
      visibility: "Visibility",
      pressure: "Atmospheric Pressure",
      cloud_cover: "Cloud Cover",
    };
    return titleMap[title] || title.replace(/_/g, " ").toUpperCase();
  };

  // Special render for sunrise/sunset data
  const renderSunriseData = (sunData, timeZone) => {
    const formatSunTime = (dateTimeStr) => {
      if (!dateTimeStr) return "N/A";
      const date = new Date(dateTimeStr);
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    };

    const formatSunDate = (dateTimeStr) => {
      if (!dateTimeStr) return "";
      const date = new Date(dateTimeStr);
      return date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    };

    return (
      <div className="sunrise-modal-content">
        <div className="sun-times-grid">
          {/* Today */}
          <div className="sun-day-section">
            <h4 className="sun-day-title">
              <i className="bi bi-calendar-day"></i>
              Today
            </h4>
            <div className="sun-times-row">
              <div className="sun-time-card sunrise">
                <div className="sun-icon-wrapper">
                  <i className="bi bi-sunrise-fill"></i>
                </div>
                <div className="sun-time-info">
                  <span className="sun-label">Sunrise</span>
                  <span className="sun-time">
                    {formatSunTime(sunData?.sunrise)}
                  </span>
                  <span className="sun-date">
                    {formatSunDate(sunData?.sunrise)}
                  </span>
                </div>
              </div>
              <div className="sun-time-card sunset">
                <div className="sun-icon-wrapper">
                  <i className="bi bi-sunset-fill"></i>
                </div>
                <div className="sun-time-info">
                  <span className="sun-label">Sunset</span>
                  <span className="sun-time">
                    {formatSunTime(sunData?.sunset)}
                  </span>
                  <span className="sun-date">
                    {formatSunDate(sunData?.sunset)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tomorrow */}
          {(sunData?.tomorrowSunrise || sunData?.tomorrowSunset) && (
            <div className="sun-day-section">
              <h4 className="sun-day-title">
                <i className="bi bi-calendar-plus"></i>
                Tomorrow
              </h4>
              <div className="sun-times-row">
                <div className="sun-time-card sunrise">
                  <div className="sun-icon-wrapper">
                    <i className="bi bi-sunrise-fill"></i>
                  </div>
                  <div className="sun-time-info">
                    <span className="sun-label">Sunrise</span>
                    <span className="sun-time">
                      {formatSunTime(sunData?.tomorrowSunrise)}
                    </span>
                    <span className="sun-date">
                      {formatSunDate(sunData?.tomorrowSunrise)}
                    </span>
                  </div>
                </div>
                <div className="sun-time-card sunset">
                  <div className="sun-icon-wrapper">
                    <i className="bi bi-sunset-fill"></i>
                  </div>
                  <div className="sun-time-info">
                    <span className="sun-label">Sunset</span>
                    <span className="sun-time">
                      {formatSunTime(sunData?.tomorrowSunset)}
                    </span>
                    <span className="sun-date">
                      {formatSunDate(sunData?.tomorrowSunset)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Timezone Info */}
        {timeZone && (
          <div className="timezone-info-card">
            <div className="timezone-item">
              <i className="bi bi-globe"></i>
              <span className="timezone-label">Time Zone</span>
              <span className="timezone-value">
                {timeZone.time_zone || "N/A"}
              </span>
            </div>
            {timeZone.utc_offset !== undefined && (
              <div className="timezone-item">
                <i className="bi bi-clock-history"></i>
                <span className="timezone-label">UTC Offset</span>
                <span className="timezone-value">
                  {(() => {
                    const hours = timeZone.utc_offset / 3600;
                    return `UTC${hours >= 0 ? "+" : ""}${hours}`;
                  })()}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Helper to render data
  const renderData = (inputData) => {
    // Check if this is sunrise data (has sunData and timeZone keys)
    if (title === "sunrise" && inputData?.sunData) {
      return renderSunriseData(inputData.sunData, inputData.timeZone);
    }

    if (inputData === undefined || inputData === null)
      return <p className="no-data">No data available</p>;

    let dataToRender = inputData;

    // Unwrap if it's a single key object containing an array
    if (typeof inputData === "object" && !Array.isArray(inputData)) {
      const keys = Object.keys(inputData);
      if (keys.length === 1 && Array.isArray(inputData[keys[0]])) {
        dataToRender = inputData[keys[0]];
      }
    }

    if (Array.isArray(dataToRender)) {
      if (dataToRender.length === 0)
        return <p className="no-data">Empty data set</p>;

      // Check if items are objects
      if (typeof dataToRender[0] === "object" && dataToRender[0] !== null) {
        const headers = Object.keys(dataToRender[0]);
        const displayData = dataToRender.slice(0, 24);

        return (
          <div className="modal-data-section">
            <div className="data-summary">
              <div className="summary-item">
                <i className="bi bi-list-ol"></i>
                <span>{dataToRender.length} total entries</span>
              </div>
              <div className="summary-item">
                <i className="bi bi-eye"></i>
                <span>Showing next 24 hours</span>
              </div>
            </div>
            <div className="data-cards-grid">
              {displayData.map((item, index) => (
                <div key={index} className="modal-data-card">
                  <div className="card-time-header">
                    <i className="bi bi-clock"></i>
                    <span>{formatTime(item.time)}</span>
                  </div>
                  <div className="card-values">
                    {headers
                      .filter((key) => key !== "time")
                      .map((key) => (
                        <div key={key} className="value-item">
                          <i className={`bi ${getIcon(key)}`}></i>
                          <div className="value-content">
                            <span className="value-label">
                              {key.replace(/_/g, " ")}
                            </span>
                            <span className="value-number">
                              {formatValue(key, item[key])}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      } else {
        // Array of primitives
        return (
          <div className="data-cards-grid simple">
            {dataToRender.map((item, idx) => (
              <div key={idx} className="modal-data-card simple">
                <span>{item}</span>
              </div>
            ))}
          </div>
        );
      }
    } else if (typeof dataToRender === "object") {
      return (
        <div className="data-cards-grid">
          {Object.entries(dataToRender).map(([key, value]) => {
            const isArray = Array.isArray(value);

            return (
              <div
                key={key}
                className={`modal-data-card ${isArray ? "full-width" : ""}`}
              >
                <div className="value-item standalone">
                  <i className={`bi ${getIcon(key)}`}></i>
                  <div className="value-content">
                    <span className="value-label">
                      {key.replace(/_/g, " ")}
                    </span>
                    {typeof value === "object" && value !== null ? (
                      <div className="nested-data">{renderData(value)}</div>
                    ) : (
                      <span className="value-number">
                        {formatValue(key, value)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    return <span>{String(dataToRender)}</span>;
  };

  return (
    <div className="weather-modal-overlay" onClick={onClose}>
      <div
        className="weather-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{getTitleName()} Details</h2>
          <button className="close-button" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        <div className="modal-body">{renderData(data)}</div>
      </div>
    </div>
  );
};

export default WeatherModal;
