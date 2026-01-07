import { useState, useEffect } from "react";
import "./FeelsLike.css";

const FeelsLike = ({ feels, windData, humidData }) => {
  const [currentFeels, setCurrentFeels] = useState(null);

  useEffect(() => {
    const updateFeels = () => {
      const currentTime = new Date();
      const currentHour = currentTime.getHours();
      const currentMinute = currentTime.getMinutes();

      const currentData = feels.find((hourData) => {
        if (!hourData || !hourData.time) return false;
        const [hourStr, minuteStr] = hourData.time.split("T")[1].split(":");
        const hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        return (
          hour === currentHour && minute === Math.floor(currentMinute / 15) * 15
        );
      });

      setCurrentFeels(currentData || null);
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

  const findHourlyValue = (timeStr, array, key) => {
    if (!timeStr || !array) return null;
    const hour = parseInt(timeStr.split("T")[1].split(":")[0], 10);
    const match = array.find((d) => {
      if (!d || !d.time) return false;
      const h = parseInt(d.time.split("T")[1].split(":")[0], 10);
      return h === hour;
    });
    return match ? Number(match[key]) : null;
  };

  const buildDescription = (current) => {
    if (!current) return "";
    const temp = Number(current.temperature);
    const apparent = Number(
      current.apparent_temperature ??
        current.feels_like ??
        current.apparentTemp ??
        current.apparent
    );
    const delta = Math.round(apparent - temp);

    // Primary short phrase
    let primary = "Feels near actual";
    if (delta > 1) primary = "Feels warmer";
    else if (delta < -1) primary = "Feels cooler";

    // Secondary short cue (humidity or wind)
    let humidity = null;
    let wind = null;
    if (current.humidity !== undefined) humidity = Number(current.humidity);
    if (!humidity && humidData) {
      humidity = findHourlyValue(current.time, humidData, "humidity");
    }
    if (current.wind_speed !== undefined) wind = Number(current.wind_speed);
    if (!wind && windData) {
      wind =
        findHourlyValue(current.time, windData, "windspeed") ||
        findHourlyValue(current.time, windData, "wind_speed");
    }

    let secondary = "";
    if (humidity !== null && !isNaN(humidity)) {
      if (humidity >= 65) secondary = "High humidity";
      else if (humidity <= 30) secondary = "Low humidity";
    }
    if (!secondary && wind !== null && !isNaN(wind)) {
      if (wind >= 25) secondary = "Windy";
      else if (wind >= 12) secondary = "Breezy";
    }

    return secondary ? `${primary} · ${secondary}` : primary;
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
            {buildDescription(currentFeels)}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeelsLike;
