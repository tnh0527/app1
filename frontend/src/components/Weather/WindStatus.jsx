import "./WindStatus.css";
import { useState, useRef } from "react";
import PropTypes from "prop-types";

const WindStatus = ({ windstatusData = [] }) => {
  const chartContainerRef = useRef(null);
  const [tooltip, setTooltip] = useState({
    visible: false,
    value: 0,
    x: 0,
    y: 0,
  });

  // No-op effect removed; keep file lean and lint-clean

  const currentHour = new Date().getHours();
  const currentIndex = 5; // Middle index for the current wind speed

  // Set past data
  let pastData = [];
  if (currentHour >= 5) {
    // If we have enough hours in the current day, simply slice
    pastData = windstatusData.slice(currentHour - 5, currentHour);
  } else {
    // If not enough hours, combine data from previous day (end of array) and current day
    const previousHours = 5 - currentHour;
    pastData = [
      ...windstatusData.slice(-previousHours),
      ...windstatusData.slice(0, currentHour),
    ];
  }
  // Set current data
  const currentData = windstatusData[currentHour] || {
    windspeed: 0,
    height: 0,
    time: `${currentHour}:00`,
  };

  // Get future data directly from windstatusData, using data from the next 5 hours
  const futureData = windstatusData.slice(currentHour + 1, currentHour + 6);

  const maxWindSpeed = Math.max(
    ...windstatusData.map((data) => data.windspeed),
    20
  ); // Fallback to 20 if no data
  const chartHeight = 20;

  // Fill past and future data if they have less than 5 points
  const windData = [
    ...Array(Math.max(0, 5 - pastData.length)).fill({
      windspeed: 0,
      height: 0,
      time: "",
    }),
    ...pastData,
    currentData,
    ...futureData,
    ...Array(Math.max(0, 5 - futureData.length)).fill({
      windspeed: 0,
      height: 0,
      time: "",
    }),
  ].map((data, index) => ({
    ...data,
    height: (data.windspeed / maxWindSpeed) * chartHeight, // Normalize the height
    time: `${(currentHour - currentIndex + index + 24) % 24}:00`, // Local hour for each point
  }));

  const pathData = windData
    .map((data, index) => {
      const x = 5 + index * 10;
      const y = Math.max(0, chartHeight - data.height); // Ensure it stays within bounds
      return [x, y];
    })
    .reduce((acc, point, index, array) => {
      if (index === 0) {
        return `M${point[0]},${point[1]}`;
      } else {
        const prevPoint = array[index - 1];
        const controlX1 = prevPoint[0] + (point[0] - prevPoint[0]) / 3;
        const controlY1 = prevPoint[1];
        const controlX2 = prevPoint[0] + (2 * (point[0] - prevPoint[0])) / 3;
        const controlY2 = point[1];
        return `${acc} C${controlX1},${controlY1} ${controlX2},${controlY2} ${point[0]},${point[1]}`;
      }
    }, "");

  const formatToAmPm = (timeString) => {
    if (!timeString) return "";
    const date = new Date();
    const parts = timeString.split(":");
    const hours = parseInt(parts[0] || "0", 10);
    const minutes = parseInt(parts[1] || "0", 10);
    date.setHours(Number.isFinite(hours) ? hours : 0);
    date.setMinutes(Number.isFinite(minutes) ? minutes : 0);
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleMouseEnter = (e, value) => {
    const rect = e.target.getBoundingClientRect();
    const containerRect = chartContainerRef.current?.getBoundingClientRect();

    if (containerRect) {
      // Position tooltip above the bar, relative to the container
      setTooltip({
        visible: true,
        value,
        x: rect.left - containerRect.left + rect.width / 2,
        y: rect.top - containerRect.top - 8,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, value: 0, x: 0, y: 0 });
  };

  return (
    <div className="highlight">
      <div className="highlight-header">
        <h4>Wind Status</h4>
        <div className="highlight-icon wind-icon">
          <i className="bi bi-wind"></i>
        </div>
      </div>
      <div className="card wind-status">
        <div className="wind-visual" ref={chartContainerRef}>
          <div className="wind-chart">
            <svg viewBox="-2 0 111 20" className="wind-line-chart">
              <defs>
                <linearGradient
                  id="lineGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop
                    offset="0%"
                    style={{ stopColor: "#404040", stopOpacity: 0.2 }}
                  />
                  <stop
                    offset="40%"
                    style={{ stopColor: "#00FFFF", stopOpacity: 0.4 }}
                  />
                  <stop
                    offset="45%"
                    style={{ stopColor: "#00FFFF", stopOpacity: 1 }}
                  />
                  <stop
                    offset="51%"
                    style={{ stopColor: "#FFFFFF", stopOpacity: 1 }}
                  />
                  <stop
                    offset="52%"
                    style={{ stopColor: "#404040", stopOpacity: 0.1 }}
                  />
                </linearGradient>
                <filter
                  id="glowFilter"
                  x="-350%"
                  y="-350%"
                  width="1000%"
                  height="1000%"
                >
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter
                  id="shadowFilter"
                  x="-20%"
                  y="-20%"
                  width="140%"
                  height="140%"
                >
                  <feGaussianBlur in="SourceAlpha" stdDeviation="1.5" />
                  <feOffset dx="1" dy="1" result="offsetblur" />
                  <feFlood floodColor="rgba(0,0,0,0.6)" />
                  <feComposite in2="offsetblur" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d={pathData}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
                filter="url(#glowFilter)"
              />
            </svg>
          </div>
          <div className="wind-bars">
            <svg viewBox="0 0 111 30" className="wind-bar-chart">
              {windData.map((data, index) => (
                <rect
                  key={index}
                  x={5 + index * 10}
                  y={chartHeight - data.height}
                  width="5"
                  height={data.height}
                  rx="1.5"
                  ry="1.5"
                  fill={
                    index === currentIndex
                      ? "#00FFFF"
                      : index === currentIndex - 1 || index === currentIndex + 1
                      ? "#005f69"
                      : "#404040"
                  }
                  filter="url(#shadowFilter)"
                  onMouseEnter={(e) => handleMouseEnter(e, data.windspeed)}
                  onMouseLeave={handleMouseLeave}
                />
              ))}
            </svg>
          </div>
          {tooltip.visible && (
            <div
              className="wind-tooltip"
              style={{
                top: tooltip.y + "px",
                left: tooltip.x + "px",
              }}
            >
              {tooltip.value} km/h
            </div>
          )}
        </div>
        <div className="wind-speed-info">
          <div className="wind-data-unit">
            <span className="wind-speed">
              {windData[currentIndex].windspeed}
            </span>
            <span className="speed-unit">km/h</span>
          </div>
          <div className="wind-time-data">
            <span className="wind-time">Last updated:</span>
            <span>{formatToAmPm(windData[currentIndex].time)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

WindStatus.propTypes = {
  windstatusData: PropTypes.arrayOf(
    PropTypes.shape({
      windspeed: PropTypes.number,
      height: PropTypes.number,
      time: PropTypes.string,
    })
  ),
};

export default WindStatus;
