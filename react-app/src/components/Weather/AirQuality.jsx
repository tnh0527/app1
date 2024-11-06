import { useEffect, useState } from "react";
import "./AirQuality.css";

const AirQuality = ({ airQuality }) => {
  const [currentAQI, setCurrentAQI] = useState(null);

  useEffect(() => {
    const updateAQI = () => {
      const currentHour = new Date().getHours();
      const currentData = airQuality.find((hourData) => {
        const hour = parseInt(hourData.time.split("T")[1].split(":")[0], 10);
        return hour === currentHour;
      });
      setCurrentAQI(currentData);
      // console.log("AQI:", currentData);
    };
    updateAQI();
    const interval = setInterval(() => {
      updateAQI();
    }, 3600000); // Update every hour
    return () => clearInterval(interval);
  }, [airQuality]);

  const airDescription = (aqi) => {
    return aqi <= 50
      ? "Good"
      : aqi <= 100
      ? "Moderate"
      : aqi <= 150
      ? "Unhealthy for Sensitive Groups"
      : aqi <= 200
      ? "Unhealthy"
      : aqi <= 300
      ? "Very Unhealthy"
      : aqi <= 500
      ? "Hazardous"
      : "Fatal";
  };
  // position on AQI bar
  const getAQILevelPosition = (aqi) => {
    if (aqi <= 50) {
      return "10%";
    } else if (aqi <= 100) {
      return "30%";
    } else if (aqi <= 150) {
      return "50%";
    } else if (aqi <= 200) {
      return "70%";
    } else if (aqi <= 300) {
      return "85%";
    } else {
      return "95%";
    }
  };

  const getAQIColor = (aqi) => {
    if (aqi <= 50) {
      return "#00e400";
    } else if (aqi <= 100) {
      return "#ffff00";
    } else if (aqi <= 150) {
      return "#ff7e00";
    } else if (aqi <= 200) {
      return "#ff0000";
    } else if (aqi <= 300) {
      return "#99004c";
    } else {
      return "#7e0023";
    }
  };

  return (
    <div className={`highlight ${!currentAQI ? "skeleton" : ""}`}>
      <h4>Air Quality</h4>
      {currentAQI && (
        <div className="card air-quality">
          <div
            className="air-quality-info"
            style={{ color: getAQIColor(currentAQI.us_aqi) }}
          >
            <span className="air-quality-value">{currentAQI.us_aqi}</span>
            <span
              className="air-quality-description"
              style={{ fontStyle: "italic" }}
            >
              {" "}
              - {airDescription(currentAQI.us_aqi)}
            </span>
          </div>
          <div className="air-quality-bar">
            <div
              className="air-quality-level"
              style={{ left: getAQILevelPosition(currentAQI.us_aqi) }}
            ></div>
          </div>
          <span
            style={{ fontSize: "12px", color: "#aaa", fontStyle: "italic" }}
          >
            {" "}
            AQI{" "}
          </span>
        </div>
      )}
    </div>
  );
};

export default AirQuality;
