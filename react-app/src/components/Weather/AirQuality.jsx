import { useEffect, useState } from "react";
import "./AirQuality.css";

const AirQuality = ({ airQuality }) => {
  const [currentAQI, setCurrentAQI] = useState(null);

  useEffect(() => {
    const updateAQI = () => {
      const currentHour = new Date().getHours();
      const currentData = airQuality.find((hourData) => {
        const hour = parseInt(hourData.time.split(":")[0], 10);
        return hour === currentHour;
      });
      setCurrentAQI(currentData);
      console.log("AQI:", currentData);
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
      : "Hazardous";
  };

  return (
    <div className={`highlight ${!currentAQI ? "skeleton" : ""}`}>
      <h4>Air Quality</h4>
      {currentAQI && (
        <div className="card air-quality">
          <div className="air-quality-info">
            <span className="air-quality-value">{currentAQI}</span>
            <span className="air-quality-description">
              {" "}
              - {airDescription(currentAQI)}
            </span>
          </div>
          <div className="air-quality-bar">
            <div className="air-quality-level" style={{ left: "25%" }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AirQuality;
