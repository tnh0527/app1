import { useState, useEffect } from "react";
import "./FeelsLike.css";

const FeelsLike = ({ feels }) => {
  const [currentFeels, setCurrentFeels] = useState(null);

  useEffect(() => {
    const updateFeels = () => {
      const currentHour = new Date().getHours();
      const currentData = feels.find((hourData) => {
        const hour = parseInt(hourData.time.split("T")[1].split(":")[0], 10);
        return hour === currentHour;
      });
      setCurrentFeels(currentData);
      // console.log("Feels:", currentData);
    };
    updateFeels();
    const interval = setInterval(() => {
      updateFeels();
    }, 3600000); // Update every hour
    return () => clearInterval(interval);
  }, [feels]);

  const getTemperatureColor = (temperature, unit) => {
    const temp = unit === "F" ? (temperature - 32) * (5 / 9) : temperature;
    if (temp >= 30) {
      return "hot";
    } else if (temp >= 20) {
      return "warm";
    } else if (temp >= 10) {
      return "cool";
    } else {
      return "cold";
    }
  };

  return (
    <div className={`highlight ${!currentFeels ? "skeleton" : ""}`}>
      <h4>Feels Like</h4>
      {currentFeels && (
        <div className="card feels-like">
          <div className="feels-like-content">
            <div
              className={`feels-like-icon ${getTemperatureColor(
                currentFeels.apparent_temperature,
                currentFeels.unit
              )}`}
            >
              <i className="bi bi-thermometer-half"></i>
            </div>
            <div
              className={`feels-like-temp ${getTemperatureColor(
                currentFeels.apparent_temperature,
                currentFeels.unit
              )}`}
            >
              {currentFeels.apparent_temperature}°
            </div>
          </div>
          <div className="feels-like-description">
            {currentFeels.apparent_temperature > currentFeels.temperature
              ? "Humidity is making it feel warmer."
              : "Humidity is making it feel cooler."}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeelsLike;
