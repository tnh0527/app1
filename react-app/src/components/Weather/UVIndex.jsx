import "./UVIndex.css";
import { useState, useEffect } from "react";

const UVIndex = ({ hourlyUVIndex }) => {
  const maxUVIndex = 12;
  const [currentUVIndex, setCurrentUVIndex] = useState(null);
  const [peakUVData, setPeakUVData] = useState(null);

  useEffect(() => {
    const updateUVIndex = () => {
      if (!hourlyUVIndex) return;
      const currentHour = new Date().getHours();
      const currentData = hourlyUVIndex.find((hourData) => {
        const hour = parseInt(hourData.time.split("T")[1].split(":")[0], 10);
        return hour === currentHour;
      });
      if (currentData) {
        currentData.uv_index = (
          Math.ceil(currentData.uv_index * 10) / 10
        ).toFixed(1);
      }
      setCurrentUVIndex(currentData);
      // console.log("UV:", currentData);

      const peakData = hourlyUVIndex.reduce((prev, curr) => {
        return curr.uv_index > prev.uv_index ? curr : prev;
      }, hourlyUVIndex[0]);
      if (peakData) {
        peakData.uv_index = (Math.ceil(peakData.uv_index * 10) / 10).toFixed(1);
      }
      setPeakUVData(peakData);
    };
    updateUVIndex();
    const interval = setInterval(() => {
      updateUVIndex();
    }, 3600000); // Update every hour

    return () => clearInterval(interval);
  }, [hourlyUVIndex]);

  const peakUVTime = peakUVData
    ? new Date(peakUVData.time).toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    : "";

  return (
    <div className={`highlight ${!currentUVIndex ? "skeleton" : ""}`}>
      <h4>UV Index</h4>
      {!currentUVIndex ? null : (
        <div className="card uv-index">
          <div className="index-gauge">
            <div className="percent">
              <svg viewBox="0 0 260 260" width="180" height="180">
                <circle
                  cx="130"
                  cy="130"
                  r="105"
                  className="bg-circle"
                ></circle>
                <circle
                  cx="130"
                  cy="130"
                  r="105"
                  className="fill-circle"
                  style={{
                    "--percent": (currentUVIndex.uv_index / maxUVIndex) * 100,
                    "--stroke-color": uvLevelColor(currentUVIndex.uv_index),
                  }}
                ></circle>
              </svg>
              <div className="number">
                <h1>
                  <span> Current </span>
                </h1>
                <h3>{currentUVIndex.uv_index}</h3>

                <h2>
                  <span> UV</span>
                  <span> Index </span>
                </h2>
              </div>
            </div>
          </div>

          <div
            className="uv-level"
            style={{ color: uvLevelColor(currentUVIndex.uv_index) }}
          >
            <h2>{uvLevelText(currentUVIndex.uv_index)}</h2>
            {peakUVData && (
              <p className="peak-uv-description">
                Peak UV Index: {peakUVData.uv_index} at {peakUVTime}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const uvLevelText = (uvIndex) => {
  return uvIndex <= 2
    ? "Low"
    : uvIndex <= 5
    ? "Moderate"
    : uvIndex <= 7
    ? "High"
    : uvIndex <= 10
    ? "Very High"
    : "Extreme";
};

const uvLevelColor = (uvIndex) => {
  return uvIndex <= 2
    ? "#00FF00" // Lime Green
    : uvIndex <= 4
    ? "yellow"
    : uvIndex <= 7
    ? "orange"
    : uvIndex <= 9
    ? "red"
    : "purple";
};

export default UVIndex;
