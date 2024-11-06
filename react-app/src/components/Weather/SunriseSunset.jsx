import "./SunriseSunset.css";
import { useState, useEffect } from "react";

const SunriseSunset = ({ sunData }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  // console.log("Sun data", sunData);

  useEffect(() => {
    // Set interval to update the current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    setCurrentTime(new Date());
    return () => clearInterval(interval);
  }, []);

  const parseTime = (timeString) => {
    if (!timeString) return null; // Handle undefined time strings
    return new Date(timeString);
  };

  // Function to calculate sun position based on current time, sunrise, and sunset
  const calculateSunPosition = () => {
    const sunrise = parseTime(sunData.sunrise);
    const sunset = parseTime(sunData.sunset);
    const current = currentTime;

    if (!sunrise || !sunset || !current) {
      return null;
    }

    const totalDaylightMinutes = (sunset - sunrise) / (1000 * 60);
    const elapsedMinutes = (current - sunrise) / (1000 * 60);

    if (elapsedMinutes < 0 || elapsedMinutes > totalDaylightMinutes) {
      return null; // The sun is not visible if the current time is not in range
    }

    return Math.max(
      0,
      Math.min(100, (elapsedMinutes / totalDaylightMinutes) * 100)
    );
  };

  // Function to calculate time until next sunrise or sunset
  const calculateTimeUntilEvent = () => {
    const current = currentTime;
    const sunrise = parseTime(sunData.sunrise);
    const sunset = parseTime(sunData.sunset);

    if (!sunrise || !sunset || !current) {
      return "";
    }

    if (current < sunrise) {
      // Time until sunrise
      const diff = sunrise - current;
      const minutesUntilSunrise = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutesUntilSunrise / 60);
      const minutes = minutesUntilSunrise % 60;
      return `Time until sunrise: ${hours}h ${minutes}m`;
    } else if (current > sunset) {
      // Time until next sunrise (next day)
      const tomorrowSunrise = new Date(sunrise.getTime() + 24 * 60 * 60 * 1000);
      const diff = tomorrowSunrise - current;
      const minutesUntilNextSunrise = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutesUntilNextSunrise / 60);
      const minutes = minutesUntilNextSunrise % 60;
      return `Time until sunrise: ${hours}h ${minutes}m`;
    } else {
      // Time until sunset
      const diff = sunset - current;
      const minutesUntilSunset = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(minutesUntilSunset / 60);
      const minutes = minutesUntilSunset % 60;
      return `Time until sunset: ${hours}h ${minutes}m`;
    }
  };

  // Calculate sun position and time until event
  const sunPosition = calculateSunPosition();
  const timeUntilEvent = calculateTimeUntilEvent();

  // Determine if it's night time
  const isNightTime = sunPosition === null;

  // Calculate sun position styling for visual representation
  let sunStyle = {};
  if (!isNightTime) {
    const angle = (sunPosition / 100) * Math.PI;

    // Calculate x and y positions based on angle
    const radius = 110; // Assuming the arc has a radius of 110px
    const centerX = radius; // Center of the arc along x-axis
    const centerY = radius; // Center of the arc along y-axis

    const left = centerX + radius * Math.cos(angle - Math.PI); // Calculate horizontal position
    const top = centerY - radius * Math.sin(angle); // Calculate vertical position

    sunStyle = {
      left: `${left}px`,
      top: `${top}px`,
    };
  }

  // Convert sunrise and sunset times to AM/PM format
  const formatToAmPm = (timeString) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formattedSunrise = sunData.sunrise ? formatToAmPm(sunData.sunrise) : "";
  const formattedSunset = sunData.sunset ? formatToAmPm(sunData.sunset) : "";

  return (
    <div
      className={`highlight ${
        !sunData || Object.keys(sunData).length === 0 ? "skeleton" : ""
      }`}
    >
      <h4>Sunrise & Sunset</h4>
      {!sunData || Object.keys(sunData).length === 0 ? null : (
        <>
          <div className="card sunrise-sunset">
            <div className="sunrise-sunset-visual">
              <div className="arc">
                <div className={`moon ${isNightTime ? "" : "hidden"}`} />
                <p className="time-until-event">{timeUntilEvent}</p>
                {!isNightTime && <div className="sun" style={sunStyle} />}
              </div>
            </div>
            <div className="time-info">
              <div className="time sunrise-time">
                <i className="bi bi-sunrise"></i>
                <p style={{ color: "#aaa", fontSize: "15px" }}>Sunrise</p>
                <p>{formattedSunrise}</p>
              </div>

              <div className="time sunset-time">
                <i className="bi bi-sunset"></i>
                <p style={{ color: "#aaa", fontSize: "15px" }}>Sunset</p>
                <p>{formattedSunset}</p>
              </div>
            </div>
          </div>
          <div className="local-time">
            <p>Local time: {formatToAmPm(currentTime)}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default SunriseSunset;
