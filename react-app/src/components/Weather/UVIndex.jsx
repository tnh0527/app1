import "./UVIndex.css";
import { useState, useEffect } from "react";

const UVIndex = ({ hourlyUVIndex }) => {
  const maxUVIndex = 12;
  const [currentUVIndex, setCurrentUVIndex] = useState(null);
  const [peakUVData, setPeakUVData] = useState(null);

  useEffect(() => {
    const updateUVIndex = () => {
      const currentHour = new Date().getHours();
      const currentData = hourlyUVIndex.find((hourData) => {
        const hour = parseInt(hourData.time.split(":")[0], 10);
        return hour === currentHour;
      });
      // console.log("Hour:", currentHour);
      // console.log("UV:", currentData);
      setCurrentUVIndex(currentData);
      const peakData = hourlyUVIndex.reduce((prev, curr) => {
        return curr.uvIndex > prev.uvIndex ? curr : prev;
      }, hourlyUVIndex[0]);
      setPeakUVData(peakData);
    };
    updateUVIndex();
    const interval = setInterval(() => {
      updateUVIndex();
    }, 3600000); // Update every hour

    return () => clearInterval(interval);
  }, [hourlyUVIndex]);

  const peakUVTime = peakUVData
    ? // Placeholder date for format
      new Date(`1970-01-01T${peakUVData.time}`).toLocaleTimeString([], {
        hour: "2-digit",
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
                    "--percent": (currentUVIndex.uvIndex / maxUVIndex) * 100,
                    "--stroke-color": uvLevelColor(currentUVIndex.uvIndex),
                  }}
                ></circle>
              </svg>
              <div className="number">
                <h1>
                  <span> Current </span>
                </h1>
                <h3>
                  {currentUVIndex.uvIndex}
                  <span> UV</span>
                </h3>
                <h2>
                  <span> Index </span>
                </h2>
              </div>
            </div>
          </div>

          <div
            className="uv-level"
            style={{ color: uvLevelColor(currentUVIndex.uvIndex) }}
          >
            <h2>{uvLevelText(currentUVIndex.uvIndex)}</h2>
            {peakUVData && (
              <p className="peak-uv-description">
                Peak UV Index: {peakUVData.uvIndex} at {peakUVTime}
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
    ? "green"
    : uvIndex <= 4
    ? "yellow"
    : uvIndex <= 7
    ? "orange"
    : uvIndex <= 9
    ? "red"
    : "purple";
};

export default UVIndex;
