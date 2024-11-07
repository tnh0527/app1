import "./WindStatus.css";
import { useState, useEffect } from "react";

const WindStatus = ({ windstatusData = [] }) => {
  // console.log("Wind", windstatusData);

  const [tooltip, setTooltip] = useState({
    visible: false,
    value: 0,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    // Check if windstatusData has enough data (48 points for two days)
    if (windstatusData.length >= 48) {
    }
  }, [windstatusData]);

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
    height: data.windspeed * 1.2,
    time: `${(currentHour - currentIndex + index + 24) % 24}:00`, // Local hour for each point
  }));

  const pathData = windData
    .map((data, index) => {
      const x = 5 + index * 10;
      const y = Math.max(0, 20 - data.height * 0.6); // adjusting line height within view
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
    const date = new Date();
    const [hours, minutes] = timeString.split(":");
    date.setHours(parseInt(hours));
    date.setMinutes(parseInt(minutes));
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleMouseEnter = (e, value) => {
    const { clientX, clientY } = e;
    setTooltip({
      visible: true,
      value,
      x: clientX,
      y: clientY,
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, value: 0, x: 0, y: 0 });
  };

  return (
    <div className="highlight">
      <h4>Wind Status</h4>
      <div className="card wind-status">
        <div className="wind-visual">
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
                    offset="41%"
                    style={{ stopColor: "#00FFFF", stopOpacity: 1 }}
                  />
                  <stop
                    offset="51%"
                    style={{ stopColor: "#FFFFFF", stopOpacity: 1 }}
                  />
                  <stop
                    offset="61%"
                    style={{ stopColor: "#00FFFF", stopOpacity: 1 }}
                  />
                  <stop
                    offset="100%"
                    style={{ stopColor: "#404040", stopOpacity: 0.2 }}
                  />
                </linearGradient>
              </defs>
              <path
                d={pathData}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="wind-bars">
            <svg viewBox="0 0 111 40" className="wind-bar-chart">
              {windData.map((data, index) => (
                <rect
                  key={index}
                  x={5 + index * 10}
                  y={25 - data.height}
                  width="5"
                  height={data.height}
                  rx="2"
                  ry="2"
                  fill={
                    index === currentIndex
                      ? "#00FFFF"
                      : index === currentIndex - 1 || index === currentIndex + 1
                      ? "#005f69"
                      : "#404040"
                  }
                  onMouseEnter={(e) => handleMouseEnter(e, data.windspeed)}
                  onMouseLeave={handleMouseLeave}
                />
              ))}
            </svg>
          </div>
        </div>
        {tooltip.visible && (
          <div
            className="tooltip"
            style={{
              top: tooltip.y + "px",
              left: tooltip.x + "px",
              transform: "translate(-50%, -100%)",
            }}
          >
            {tooltip.value}
          </div>
        )}
        <div className="wind-speed-info">
          <div className="wind-data-unit">
            <span className="wind-speed">
              {windData[currentIndex].windspeed}
            </span>
            <span className="speed-unit">km/h</span>
          </div>
        </div>

        <div className="wind-time-data">
          <span className="wind-time">
            Last updated: {formatToAmPm(windData[currentIndex].time)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default WindStatus;
