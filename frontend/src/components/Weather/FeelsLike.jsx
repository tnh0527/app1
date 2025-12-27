import { useState, useEffect } from "react";
import "./FeelsLike.css";

const FeelsLike = ({ feels }) => {
  const [currentFeels, setCurrentFeels] = useState(null);
  // console.log("Feels:", feels);

  useEffect(() => {
    const updateFeels = () => {
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();

      const currentData = feels.find((hourData) => {
        const [hourStr, minuteStr] = hourData.time.split("T")[1].split(":");
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        return (
          hour === currentHour && minute === Math.floor(currentMinute / 15) * 15
        );
      });

      setCurrentFeels(currentData);
      console.log("Feels:", currentData);
    };
    updateFeels();

    const currentTime = new Date();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    const milliseconds = currentTime.getMilliseconds();

    const msToNextQuarterHour =
      (15 - (minutes % 15)) * 60 * 1000 - seconds * 1000 - milliseconds;

    const timeout = setTimeout(() => {
      updateFeels();
      const interval = setInterval(updateFeels, 15 * 60 * 1000);
      return () => clearInterval(interval);
    }, msToNextQuarterHour);

    return () => clearTimeout(timeout);
  }, [feels]);

  const getTemperatureColor = (temperature, unit) => {
    const temp = unit === "C" ? (temperature * 9) / 5 + 32 : temperature;
    if (temp >= 90) {
      return "hot";
    } else if (temp >= 68) {
      return "warm";
    } else if (temp >= 50) {
      return "cool";
    } else {
      return "cold";
    }
  };

  return (
    <div className={`highlight ${!currentFeels ? "skeleton" : ""}`}>
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
