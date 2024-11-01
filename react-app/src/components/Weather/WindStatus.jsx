import "./WindStatus.css";
import { useState, useEffect } from "react";

const WindStatus = ({ windstatusData = [], nextDayWindstatusData = [] }) => {
  // console.log("Wind", windstatusData);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if windstatusData and nextDayWindstatusData have enough data
    if (windstatusData.length >= 6 || nextDayWindstatusData.length >= 5) {
      setIsLoading(false);
    }
  }, [windstatusData, nextDayWindstatusData]);

  const currentHour = new Date().getHours();
  const currentIndex = 5; // Middle index for the current wind speed

  // Get past and current day data
  const pastData = windstatusData.slice(
    Math.max(0, currentHour - 5),
    currentHour
  );
  const currentData = windstatusData[currentHour] || {
    speed: 0,
    height: 0,
    time: `${currentHour}:00`,
  };

  // Get future data with fallback to the next day's data if out of bounds
  const futureData = [
    ...windstatusData.slice(currentHour + 1),
    ...nextDayWindstatusData.slice(
      0,
      Math.max(0, 6 - (windstatusData.length - currentHour - 1))
    ),
  ].slice(0, 5); // Limit future data to 5 points

  // Fill past and future data if they have less than 5 points
  const windData = [
    ...Array(Math.max(0, 5 - pastData.length)).fill({
      speed: 0,
      height: 0,
      time: "",
    }),
    ...pastData,
    currentData,
    ...futureData,
    ...Array(Math.max(0, 5 - futureData.length)).fill({
      speed: 0,
      height: 0,
      time: "",
    }),
  ].map((data, index) => ({
    ...data,
    height: data.speed,
    time: `${(currentHour - currentIndex + index + 24) % 24}:00`, // Local hour for each point
  }));

  const pathData = windData
    .map((data, index) => {
      const x = 5 + index * 10;
      const y = 30 - data.height;
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

  return (
    <div className={`highlight ${isLoading ? "skeleton" : ""}`}>
      <h4>Wind Status</h4>
      {isLoading ? null : (
        <div className="card wind-status">
          <div className="wind-visual">
            <div className="wind-chart">
              <svg viewBox="0 0 111 40" className="wind-line-chart">
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
                      offset="43%"
                      style={{ stopColor: "#00FFFF", stopOpacity: 1 }}
                    />
                    <stop
                      offset="53%"
                      style={{ stopColor: "#FFFFFF", stopOpacity: 1 }}
                    />
                    <stop
                      offset="63%"
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
                    y={30 - data.height}
                    width="5"
                    height={data.height}
                    rx="2"
                    ry="2"
                    fill={
                      index === currentIndex
                        ? "#00FFFF"
                        : index === currentIndex - 1 ||
                          index === currentIndex + 1
                        ? "#005f69"
                        : "#404040"
                    }
                  />
                ))}
              </svg>
            </div>
          </div>
          <div className="wind-speed-info">
            <div className="wind-data-unit">
              <span className="wind-speed">{windData[currentIndex].speed}</span>
              <span className="speed-unit">km/h</span>
            </div>
          </div>

          <div className="wind-time-data">
            <span className="wind-time">
              Last updated: {formatToAmPm(windData[currentIndex].time)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WindStatus;
