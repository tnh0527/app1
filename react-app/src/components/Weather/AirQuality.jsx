import React from "react";
import "./AirQuality.css";

const AirQuality = ({ airQuality = 66 }) => {
  const airDescription =
    airQuality <= 50
      ? "Good"
      : airQuality <= 100
      ? "Moderate"
      : airQuality <= 150
      ? "Unhealthy for Sensitive Groups"
      : airQuality <= 200
      ? "Unhealthy"
      : airQuality <= 300
      ? "Very Unhealthy"
      : "Hardzardous";

  return (
    <div className="card air-quality">
      <div className="air-quality-info">
        <span className="air-quality-value">{airQuality}</span>
        <span className="air-quality-description"> - {airDescription}</span>
      </div>
      <div className="air-quality-bar">
        <div className="air-quality-level" style={{ left: "25%" }}></div>
      </div>
    </div>
  );
};

export default AirQuality;
