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

  // Format value without units for compact modal display (numbers only)
  const formatValueNoUnits = (key, value) => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "number") {
      return `${Math.round(value)}`;
    }
    // For non-numeric, fall back to string
    return String(value);
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

  // Render graph for Wind Status
  const renderWindGraph = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <p className="no-data">No wind data available</p>;
    }

    const displayData = data.slice(0, 24);
    const windSpeeds = displayData.map((d) => d.windspeed || d.wind_speed || 0);
    const minWindSpeed = Math.min(...windSpeeds);
    const maxWindSpeed = Math.max(...windSpeeds);
    const windRange = maxWindSpeed - minWindSpeed || 1;
    const padding10Percent = windRange * 0.1;
    const yMin = Math.max(0, minWindSpeed - padding10Percent);
    const yMax = maxWindSpeed + padding10Percent;
    const yRange = yMax - yMin;

    const chartWidth = 700;
    const chartHeight = 200;
    const padding = 40;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;

    const points = displayData.map((item, index) => {
      const x = padding + (index / (displayData.length - 1 || 1)) * graphWidth;
      const windSpeed = item.windspeed || item.wind_speed || 0;
      const y =
        padding + graphHeight - ((windSpeed - yMin) / yRange) * graphHeight;
      return { x, y, data: item, windSpeed };
    });

    const pathData = points
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prevPoint = points[index - 1];
        const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
        const cp1y = prevPoint.y;
        const cp2x = prevPoint.x + (2 * (point.x - prevPoint.x)) / 3;
        const cp2y = point.y;
        return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${point.x} ${point.y}`;
      })
      .join(" ");

    const startTimeLabel = displayData[0]
      ? formatTime(displayData[0].time)
      : "";
    const headerLabel = `${displayData.length} entries • Starting ${startTimeLabel}`;

    return (
      <div className="graph-container">
        <div className="graph-header">
          <div className="summary-item">
            <i className="bi bi-list-ol"></i>
            <span>{data.length} total entries</span>
          </div>
          <div className="summary-item">
            <i className="bi bi-eye"></i>
            <span>{headerLabel}</span>
          </div>
        </div>
        <div className="graph-wrapper">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="weather-graph"
          >
            <defs>
              <linearGradient
                id="windGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1={padding}
                  y1={y}
                  x2={padding + graphWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
              );
            })}
            {/* Area under curve */}
            <path
              d={`${pathData} L ${points[points.length - 1].x} ${
                padding + graphHeight
              } L ${points[0].x} ${padding + graphHeight} Z`}
              fill="url(#windGradient)"
            />
            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke="#00e5ff"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Points */}
            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill="#00e5ff"
                  className="graph-point"
                />
                {/* Show time labels every 2 hours to prevent overlapping */}
                {index % 2 === 0 && (
                  <text
                    x={point.x}
                    y={padding + graphHeight + 20}
                    textAnchor="middle"
                    fill="rgba(255, 255, 255, 0.6)"
                    fontSize="10"
                  >
                    {formatTime(point.data.time)}
                  </text>
                )}
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  fill="#00e5ff"
                  fontSize="11"
                  fontWeight="600"
                >
                  {Math.round(point.windSpeed)}
                </text>
              </g>
            ))}
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              const value = Math.round(yMin + yRange * ratio);
              return (
                <text
                  key={ratio}
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.5)"
                  fontSize="10"
                >
                  {value}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="graph-legend">
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: "#00e5ff" }}
            ></span>
            <span>Wind Speed (mph)</span>
          </div>
        </div>
      </div>
    );
  };

  // Render graph for UV Index
  const renderUVGraph = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <p className="no-data">No UV data available</p>;
    }

    const displayData = data.slice(0, 24);
    const uvValues = displayData.map((d) => Number(d.uv_index) || 0);
    const minUV = Math.min(...uvValues);
    const maxUV = Math.max(...uvValues);
    const uvRange = maxUV - minUV || 1;
    const padding10Percent = uvRange * 0.1;
    const yMin = Math.max(0, minUV - padding10Percent);
    const yMax = maxUV + padding10Percent;
    const yRange = yMax - yMin;

    const chartWidth = 700;
    const chartHeight = 200;
    const padding = 40;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;

    const points = displayData.map((item, index) => {
      const x = padding + (index / (displayData.length - 1 || 1)) * graphWidth;
      const uvVal = Number(item.uv_index) || 0;
      const y = padding + graphHeight - ((uvVal - yMin) / yRange) * graphHeight;
      return { x, y, data: item };
    });

    const pathData = points
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prevPoint = points[index - 1];
        const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
        const cp1y = prevPoint.y;
        const cp2x = prevPoint.x + (2 * (point.x - prevPoint.x)) / 3;
        const cp2y = point.y;
        return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${point.x} ${point.y}`;
      })
      .join(" ");

    const getUVColor = (uv) => {
      if (uv <= 2) return "#00FF00";
      if (uv <= 5) return "yellow";
      if (uv <= 7) return "orange";
      if (uv <= 10) return "red";
      return "purple";
    };

    const startTimeLabel = displayData[0]
      ? formatTime(displayData[0].time)
      : "";
    const headerLabel = `${displayData.length} entries • Starting ${startTimeLabel}`;

    return (
      <div className="graph-container">
        <div className="graph-header">
          <div className="summary-item">
            <i className="bi bi-list-ol"></i>
            <span>{data.length} total entries</span>
          </div>
          <div className="summary-item">
            <i className="bi bi-eye"></i>
            <span>{headerLabel}</span>
          </div>
        </div>
        <div className="graph-wrapper">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="weather-graph"
          >
            <defs>
              <linearGradient id="uvGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#00FF00" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00FF00" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1={padding}
                  y1={y}
                  x2={padding + graphWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
              );
            })}
            {/* Area under curve */}
            <path
              d={`${pathData} L ${points[points.length - 1].x} ${
                padding + graphHeight
              } L ${points[0].x} ${padding + graphHeight} Z`}
              fill="url(#uvGradient)"
            />
            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke="#00FF00"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Points */}
            {points.map((point, index) => {
              const uvValue = Number(point.data.uv_index) || 0;
              const color = getUVColor(uvValue);
              return (
                <g key={index}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4"
                    fill={color}
                    className="graph-point"
                  />
                  {/* Show time labels every 2 hours to prevent overlapping */}
                  {index % 2 === 0 && (
                    <text
                      x={point.x}
                      y={padding + graphHeight + 20}
                      textAnchor="middle"
                      fill="rgba(255, 255, 255, 0.6)"
                      fontSize="10"
                    >
                      {formatTime(point.data.time)}
                    </text>
                  )}
                  <text
                    x={point.x}
                    y={point.y - 10}
                    textAnchor="middle"
                    fill={color}
                    fontSize="11"
                    fontWeight="600"
                  >
                    {uvValue.toFixed(1)}
                  </text>
                </g>
              );
            })}
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              const value = (yMin + yRange * ratio).toFixed(1);
              return (
                <text
                  key={ratio}
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.5)"
                  fontSize="10"
                >
                  {value}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="graph-legend">
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: "#00FF00" }}
            ></span>
            <span>UV Index</span>
          </div>
        </div>
      </div>
    );
  };

  // Render graph for Humidity
  const renderHumidityGraph = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <p className="no-data">No humidity data available</p>;
    }

    const displayData = data.slice(0, 24);
    const humidityValues = displayData.map((d) => d.humidity || 0);
    const dewpointValues = displayData.map((d) => d.dewpoint || 0);
    const allValues = [...humidityValues, ...dewpointValues];
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue || 1;
    const padding10Percent = valueRange * 0.1;
    const yMin = Math.max(0, minValue - padding10Percent);
    const yMax = maxValue + padding10Percent;
    const yRange = yMax - yMin;

    const chartWidth = 700;
    const chartHeight = 200;
    const padding = 40;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;

    const humidityPoints = displayData.map((item, index) => {
      const x = padding + (index / (displayData.length - 1 || 1)) * graphWidth;
      const y =
        padding +
        graphHeight -
        (((item.humidity || 0) - yMin) / yRange) * graphHeight;
      return { x, y, data: item };
    });

    const dewpointPoints = displayData.map((item, index) => {
      const x = padding + (index / (displayData.length - 1 || 1)) * graphWidth;
      const y =
        padding +
        graphHeight -
        (((item.dewpoint || 0) - yMin) / yRange) * graphHeight;
      return { x, y, data: item };
    });

    const humidityPath = humidityPoints
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prevPoint = humidityPoints[index - 1];
        const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
        const cp1y = prevPoint.y;
        const cp2x = prevPoint.x + (2 * (point.x - prevPoint.x)) / 3;
        const cp2y = point.y;
        return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${point.x} ${point.y}`;
      })
      .join(" ");

    const dewpointPath = dewpointPoints
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prevPoint = dewpointPoints[index - 1];
        const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
        const cp1y = prevPoint.y;
        const cp2x = prevPoint.x + (2 * (point.x - prevPoint.x)) / 3;
        const cp2y = point.y;
        return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${point.x} ${point.y}`;
      })
      .join(" ");

    const startTimeLabel = displayData[0]
      ? formatTime(displayData[0].time)
      : "";
    const headerLabel = `${displayData.length} entries • Starting ${startTimeLabel}`;

    return (
      <div className="graph-container">
        <div className="graph-header">
          <div className="summary-item">
            <i className="bi bi-list-ol"></i>
            <span>{data.length} total entries</span>
          </div>
          <div className="summary-item">
            <i className="bi bi-eye"></i>
            <span>{headerLabel}</span>
          </div>
        </div>
        <div className="graph-wrapper">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="weather-graph"
          >
            <defs>
              <linearGradient
                id="humidityGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#64b5f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#64b5f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1={padding}
                  y1={y}
                  x2={padding + graphWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
              );
            })}
            {/* Humidity area */}
            <path
              d={`${humidityPath} L ${
                humidityPoints[humidityPoints.length - 1].x
              } ${padding + graphHeight} L ${humidityPoints[0].x} ${
                padding + graphHeight
              } Z`}
              fill="url(#humidityGradient)"
            />
            {/* Humidity line */}
            <path
              d={humidityPath}
              fill="none"
              stroke="#64b5f6"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Dewpoint line */}
            <path
              d={dewpointPath}
              fill="none"
              stroke="#ff9800"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="5,5"
            />
            {/* Points */}
            {humidityPoints.map((point, index) => (
              <g key={`humidity-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="#64b5f6"
                  className="graph-point"
                />
                {/* Value label for humidity (number only) */}
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  fill="#64b5f6"
                  fontSize="11"
                  fontWeight="600"
                >
                  {Math.round(point.data.humidity)}
                </text>
                {/* Show time labels every 2 hours to prevent overlapping */}
                {index % 2 === 0 && (
                  <text
                    x={point.x}
                    y={padding + graphHeight + 20}
                    textAnchor="middle"
                    fill="rgba(255, 255, 255, 0.6)"
                    fontSize="10"
                  >
                    {formatTime(point.data.time)}
                  </text>
                )}
              </g>
            ))}
            {dewpointPoints.map((point, index) => (
              <g key={`dewpoint-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="#ff9800"
                  className="graph-point"
                />
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  fill="#ff9800"
                  fontSize="11"
                  fontWeight="600"
                >
                  {Math.round(point.data.dewpoint)}
                </text>
              </g>
            ))}
          </svg>
        </div>
        <div className="graph-legend">
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: "#64b5f6" }}
            ></span>
            <span>Humidity (%)</span>
          </div>
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: "#ff9800", border: "2px dashed #ff9800" }}
            ></span>
            <span>Dew Point (°)</span>
          </div>
        </div>
      </div>
    );
  };

  // Render graph for Air Quality
  const renderAirQualityGraph = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <p className="no-data">No air quality data available</p>;
    }

    const displayData = data.slice(0, 24);
    const aqiValues = displayData.map((d) => d.us_aqi || d.aqi || 0);
    const minAQI = Math.min(...aqiValues);
    const maxAQI = Math.max(...aqiValues);
    const aqiRange = maxAQI - minAQI || 1;
    const padding10Percent = aqiRange * 0.1;
    const yMin = Math.max(0, minAQI - padding10Percent);
    const yMax = maxAQI + padding10Percent;
    const yRange = yMax - yMin;

    const chartWidth = 700;
    const chartHeight = 200;
    const padding = 40;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;

    const getAQIColor = (aqi) => {
      if (aqi <= 50) return "#00e400";
      if (aqi <= 100) return "#ffff00";
      if (aqi <= 150) return "#ff7e00";
      if (aqi <= 200) return "#ff0000";
      if (aqi <= 300) return "#99004c";
      return "#7e0023";
    };

    const points = displayData.map((item, index) => {
      const x = padding + (index / (displayData.length - 1 || 1)) * graphWidth;
      const aqi = item.us_aqi || item.aqi || 0;
      const y = padding + graphHeight - ((aqi - yMin) / yRange) * graphHeight;
      return { x, y, data: item, color: getAQIColor(aqi), aqi };
    });

    const pathData = points
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prevPoint = points[index - 1];
        const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
        const cp1y = prevPoint.y;
        const cp2x = prevPoint.x + (2 * (point.x - prevPoint.x)) / 3;
        const cp2y = point.y;
        return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${point.x} ${point.y}`;
      })
      .join(" ");

    return (
      <div className="graph-container">
        <div className="graph-header">
          <div className="summary-item">
            <i className="bi bi-list-ol"></i>
            <span>{data.length} total entries</span>
          </div>
          <div className="summary-item">
            <i className="bi bi-eye"></i>
            <span>Showing next 24 hours</span>
          </div>
        </div>
        <div className="graph-wrapper">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="weather-graph"
          >
            <defs>
              <linearGradient
                id="aqiGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#00e400" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#00e400" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1={padding}
                  y1={y}
                  x2={padding + graphWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
              );
            })}
            {/* Area under curve */}
            <path
              d={`${pathData} L ${points[points.length - 1].x} ${
                padding + graphHeight
              } L ${points[0].x} ${padding + graphHeight} Z`}
              fill="url(#aqiGradient)"
            />
            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke="#00e400"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Points */}
            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="4"
                  fill={point.color}
                  className="graph-point"
                />
                {/* Show time labels every 2 hours to prevent overlapping */}
                {index % 2 === 0 && (
                  <text
                    x={point.x}
                    y={padding + graphHeight + 20}
                    textAnchor="middle"
                    fill="rgba(255, 255, 255, 0.6)"
                    fontSize="10"
                  >
                    {formatTime(point.data.time)}
                  </text>
                )}
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  fill={point.color}
                  fontSize="11"
                  fontWeight="600"
                >
                  {Math.round(point.aqi)}
                </text>
              </g>
            ))}
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              const value = Math.round(yMin + yRange * ratio);
              return (
                <text
                  key={ratio}
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.5)"
                  fontSize="10"
                >
                  {value}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="graph-legend">
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: "#00e400" }}
            ></span>
            <span>Air Quality Index (AQI)</span>
          </div>
        </div>
      </div>
    );
  };

  // Render graph for Feels Like
  const renderFeelsLikeGraph = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <p className="no-data">No feels like data available</p>;
    }

    const displayData = data.slice(0, 24);
    const temps = displayData.map((d) => d.temperature || 0);
    const feelsTemps = displayData.map((d) => d.apparent_temperature || 0);
    const allTemps = [...temps, ...feelsTemps];
    const minTemp = Math.min(...allTemps);
    const maxTemp = Math.max(...allTemps);
    const tempRange = maxTemp - minTemp || 1;
    const padding10Percent = tempRange * 0.1;
    const yMin = minTemp - padding10Percent;
    const yMax = maxTemp + padding10Percent;
    const yRange = yMax - yMin;

    const chartWidth = 700;
    const chartHeight = 200;
    const padding = 40;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;

    const tempPoints = displayData.map((item, index) => {
      const x = padding + (index / (displayData.length - 1 || 1)) * graphWidth;
      const y =
        padding +
        graphHeight -
        ((item.temperature - yMin) / yRange) * graphHeight;
      return { x, y, data: item };
    });

    const feelsPoints = displayData.map((item, index) => {
      const x = padding + (index / (displayData.length - 1 || 1)) * graphWidth;
      const y =
        padding +
        graphHeight -
        ((item.apparent_temperature - yMin) / yRange) * graphHeight;
      return { x, y, data: item };
    });

    const tempPath = tempPoints
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prevPoint = tempPoints[index - 1];
        const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
        const cp1y = prevPoint.y;
        const cp2x = prevPoint.x + (2 * (point.x - prevPoint.x)) / 3;
        const cp2y = point.y;
        return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${point.x} ${point.y}`;
      })
      .join(" ");

    const feelsPath = feelsPoints
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prevPoint = feelsPoints[index - 1];
        const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
        const cp1y = prevPoint.y;
        const cp2x = prevPoint.x + (2 * (point.x - prevPoint.x)) / 3;
        const cp2y = point.y;
        return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${point.x} ${point.y}`;
      })
      .join(" ");

    return (
      <div className="graph-container">
        <div className="graph-header">
          <div className="summary-item">
            <i className="bi bi-list-ol"></i>
            <span>{data.length} total entries</span>
          </div>
          <div className="summary-item">
            <i className="bi bi-eye"></i>
            <span>Showing next 24 hours</span>
          </div>
        </div>
        <div className="graph-wrapper">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="weather-graph"
          >
            <defs>
              <linearGradient
                id="tempGradient"
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#64b5f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#64b5f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1={padding}
                  y1={y}
                  x2={padding + graphWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
              );
            })}
            {/* Temperature area */}
            <path
              d={`${tempPath} L ${tempPoints[tempPoints.length - 1].x} ${
                padding + graphHeight
              } L ${tempPoints[0].x} ${padding + graphHeight} Z`}
              fill="url(#tempGradient)"
            />
            {/* Temperature line */}
            <path
              d={tempPath}
              fill="none"
              stroke="#64b5f6"
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Feels like line */}
            <path
              d={feelsPath}
              fill="none"
              stroke="#ff9800"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="5,5"
            />
            {/* Points */}
            {tempPoints.map((point, index) => (
              <g key={`temp-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="#64b5f6"
                  className="graph-point"
                />
                {/* Numeric label for temperature (no unit) */}
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  fill="#64b5f6"
                  fontSize="11"
                  fontWeight="600"
                >
                  {Math.round(point.data.temperature)}
                </text>
                {/* Show time labels every 2 hours to prevent overlapping */}
                {index % 2 === 0 && (
                  <text
                    x={point.x}
                    y={padding + graphHeight + 20}
                    textAnchor="middle"
                    fill="rgba(255, 255, 255, 0.6)"
                    fontSize="10"
                  >
                    {formatTime(point.data.time)}
                  </text>
                )}
              </g>
            ))}
            {feelsPoints.map((point, index) => (
              <g key={`feels-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill="#ff9800"
                  className="graph-point"
                />
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  fill="#ff9800"
                  fontSize="11"
                  fontWeight="600"
                >
                  {Math.round(point.data.apparent_temperature)}
                </text>
              </g>
            ))}
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              const value = (yMin + yRange * ratio).toFixed(1);
              return (
                <text
                  key={ratio}
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.5)"
                  fontSize="10"
                >
                  {value}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="graph-legend">
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: "#64b5f6" }}
            ></span>
            <span>Temperature (°)</span>
          </div>
          <div className="legend-item">
            <span
              className="legend-color"
              style={{ background: "#ff9800", border: "2px dashed #ff9800" }}
            ></span>
            <span>Feels Like (°)</span>
          </div>
        </div>
      </div>
    );
  };

  // Generic single-metric line graph renderer (number-only labels)
  const renderSingleMetricGraph = (data, key, color, label) => {
    if (!Array.isArray(data) || data.length === 0) {
      return <p className="no-data">No {label.toLowerCase()} data available</p>;
    }

    const displayData = data.slice(0, 24);
    const values = displayData.map((d) => Number(d[key]) || 0);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;
    const padding10Percent = range * 0.1;
    const yMin = Math.max(0, minVal - padding10Percent);
    const yMax = maxVal + padding10Percent;
    const yRange = yMax - yMin;

    const chartWidth = 700;
    const chartHeight = 200;
    const padding = 40;
    const graphWidth = chartWidth - padding * 2;
    const graphHeight = chartHeight - padding * 2;

    const points = displayData.map((item, index) => {
      const x = padding + (index / (displayData.length - 1 || 1)) * graphWidth;
      const y =
        padding +
        graphHeight -
        (((Number(item[key]) || 0) - yMin) / yRange) * graphHeight;
      return { x, y, data: item };
    });

    const pathData = points
      .map((point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;
        const prevPoint = points[index - 1];
        const cp1x = prevPoint.x + (point.x - prevPoint.x) / 3;
        const cp1y = prevPoint.y;
        const cp2x = prevPoint.x + (2 * (point.x - prevPoint.x)) / 3;
        const cp2y = point.y;
        return `C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${point.x} ${point.y}`;
      })
      .join(" ");

    const startTimeLabel = displayData[0]
      ? formatTime(displayData[0].time)
      : "";
    const headerLabel = `${displayData.length} entries • Starting ${startTimeLabel}`;

    return (
      <div className="graph-container">
        <div className="graph-header">
          <div className="summary-item">
            <i className="bi bi-list-ol"></i>
            <span>{data.length} total entries</span>
          </div>
          <div className="summary-item">
            <i className="bi bi-eye"></i>
            <span>{headerLabel}</span>
          </div>
        </div>
        <div className="graph-wrapper">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="weather-graph"
          >
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              return (
                <line
                  key={ratio}
                  x1={padding}
                  y1={y}
                  x2={padding + graphWidth}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="1"
                />
              );
            })}
            {/* Line */}
            <path
              d={pathData}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Points */}
            {points.map((point, index) => (
              <g key={index}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3"
                  fill={color}
                  className="graph-point"
                />
                {/* Numeric label, no unit */}
                <text
                  x={point.x}
                  y={point.y - 10}
                  textAnchor="middle"
                  fill={color}
                  fontSize="11"
                  fontWeight="600"
                >
                  {Math.round(point.data[key])}
                </text>
                {/* Time label every 2 points to avoid overlap */}
                {index % 2 === 0 && (
                  <text
                    x={point.x}
                    y={padding + graphHeight + 20}
                    textAnchor="middle"
                    fill="rgba(255, 255, 255, 0.6)"
                    fontSize="10"
                  >
                    {formatTime(point.data.time)}
                  </text>
                )}
              </g>
            ))}
            {/* Y-axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + graphHeight - graphHeight * ratio;
              const value = Math.round(yMin + yRange * ratio);
              return (
                <text
                  key={ratio}
                  x={padding - 10}
                  y={y + 4}
                  textAnchor="end"
                  fill="rgba(255, 255, 255, 0.5)"
                  fontSize="10"
                >
                  {value}
                </text>
              );
            })}
          </svg>
        </div>
        <div className="graph-legend">
          <div className="legend-item">
            <span className="legend-color" style={{ background: color }}></span>
            <span>{label}</span>
          </div>
        </div>
      </div>
    );
  };

  // Helper to render data
  const renderData = (inputData) => {
    // Check if this is sunrise data (has sunData and timeZone keys)
    if (title === "sunrise" && inputData?.sunData) {
      return renderSunriseData(inputData.sunData, inputData.timeZone);
    }

    // Extract data from props object based on card type
    let dataArray = null;
    if (title === "wind" && inputData?.windstatusData) {
      dataArray = inputData.windstatusData;
    } else if (title === "uv" && inputData?.hourlyUVIndex) {
      dataArray = inputData.hourlyUVIndex;
    } else if (title === "humidity" && inputData?.humidDewData) {
      dataArray = inputData.humidDewData;
    } else if (title === "air_quality" && inputData?.airQuality) {
      dataArray = inputData.airQuality;
    } else if (title === "feels_like" && inputData?.feels) {
      dataArray = inputData.feels;
    } else if (title === "visibility" && inputData?.visibilityData) {
      dataArray = inputData.visibilityData;
    } else if (title === "pressure" && inputData?.pressureData) {
      dataArray = inputData.pressureData;
    } else if (title === "cloud_cover" && inputData?.cloudCoverData) {
      dataArray = inputData.cloudCoverData;
    }

    // Render graphs for specific card types
    if (
      title === "wind" &&
      dataArray &&
      Array.isArray(dataArray) &&
      dataArray.length > 0
    ) {
      return renderWindGraph(dataArray);
    }

    if (
      title === "uv" &&
      dataArray &&
      Array.isArray(dataArray) &&
      dataArray.length > 0
    ) {
      return renderUVGraph(dataArray);
    }

    if (
      title === "humidity" &&
      dataArray &&
      Array.isArray(dataArray) &&
      dataArray.length > 0
    ) {
      return renderHumidityGraph(dataArray);
    }

    if (
      title === "air_quality" &&
      dataArray &&
      Array.isArray(dataArray) &&
      dataArray.length > 0
    ) {
      return renderAirQualityGraph(dataArray);
    }

    if (
      title === "feels_like" &&
      dataArray &&
      Array.isArray(dataArray) &&
      dataArray.length > 0
    ) {
      return renderFeelsLikeGraph(dataArray);
    }

    if (
      title === "visibility" &&
      dataArray &&
      Array.isArray(dataArray) &&
      dataArray.length > 0
    ) {
      return renderSingleMetricGraph(
        dataArray,
        "visibility",
        "#64b5f6",
        "Visibility"
      );
    }

    if (
      title === "pressure" &&
      dataArray &&
      Array.isArray(dataArray) &&
      dataArray.length > 0
    ) {
      return renderSingleMetricGraph(
        dataArray,
        "pressure",
        "#ff9800",
        "Pressure"
      );
    }

    if (
      title === "cloud_cover" &&
      dataArray &&
      Array.isArray(dataArray) &&
      dataArray.length > 0
    ) {
      return renderSingleMetricGraph(
        dataArray,
        "cloud_cover",
        "#9c27b0",
        "Cloud Cover"
      );
    }

    // If we have a card type but no data, show error message
    if (
      ["wind", "uv", "humidity", "air_quality", "feels_like"].includes(title)
    ) {
      return <p className="no-data">No data available for {getTitleName()}</p>;
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
                              {formatValueNoUnits(key, item[key])}
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
