import "./SunriseSunset.css";
import { useState, useEffect } from "react";

const SunriseSunset = ({ sunData }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Set interval to update the current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 60000 ms = 1 minute
    // Update the time initially
    setCurrentTime(new Date());
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);
  // console.log("Local time:", currentTime);

  const parseTime = (timeString) => {
    if (!timeString) return { hours: 0, minutes: 0 }; // Handle undefined time strings

    const [hours, minutes] = timeString.split(/:| /);
    const isPM = timeString.toLowerCase().includes("pm");
    return {
      hours: parseInt(hours) + (isPM && hours !== "12" ? 12 : 0),
      minutes: parseInt(minutes),
    };
  };

  // Format current time as HH:MM
  const formattedTime = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Helper function to convert time to minutes since midnight
  const timeToMinutes = (time) => time.hours * 60 + time.minutes;

  // Function to calculate sun position based on current time, sunrise, and sunset
  const calculateSunPosition = () => {
    const sunrise = parseTime(sunData.sunrise);
    const sunset = parseTime(sunData.sunset);
    const current = {
      hours: currentTime.getHours(),
      minutes: currentTime.getMinutes(),
    };

    const totalMinutes = timeToMinutes(sunset) - timeToMinutes(sunrise);
    const elapsedMinutes = timeToMinutes(current) - timeToMinutes(sunrise);

    if (elapsedMinutes < 0 || elapsedMinutes > totalMinutes) {
      return null; // The sun is not visible if the current time is not in range
    }
    return Math.max(0, Math.min(100, (elapsedMinutes / totalMinutes) * 100));
  };

  // Function to calculate time until next sunrise or sunset
  const calculateTimeUntilEvent = () => {
    const current = {
      hours: currentTime.getHours(),
      minutes: currentTime.getMinutes(),
    };
    const sunrise = parseTime(sunData.sunrise);
    const sunset = parseTime(sunData.sunset);

    const currentMinutes = timeToMinutes(current);
    const sunriseMinutes = timeToMinutes(sunrise);
    const sunsetMinutes = timeToMinutes(sunset);

    if (currentMinutes < sunriseMinutes) {
      // Time until sunrise
      const minutesUntilSunrise = sunriseMinutes - currentMinutes;
      const hours = Math.floor(minutesUntilSunrise / 60);
      const minutes = minutesUntilSunrise % 60;
      return `Time until sunrise: ${hours}h ${minutes}m`;
    } else if (currentMinutes > sunsetMinutes) {
      // Time until next sunrise (next day)
      const minutesUntilNextSunrise = 24 * 60 - currentMinutes + sunriseMinutes;
      const hours = Math.floor(minutesUntilNextSunrise / 60);
      const minutes = minutesUntilNextSunrise % 60;
      return `Time until sunrise: ${hours}h ${minutes}m`;
    } else {
      // Time until sunset
      const minutesUntilSunset = sunsetMinutes - currentMinutes;
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
    // Calculate the angle for the sun along the arc
    // Convert percentage to radians (0 to π for the arc)
    const angle = (sunPosition / 100) * Math.PI;

    // Calculate x and y positions based on angle
    const radius = 100; // Assuming the arc has a radius of 100px
    const left = radius + radius * Math.cos(angle - Math.PI); // Calculate horizontal position
    const top = radius - radius * Math.sin(angle); // Calculate vertical position

    sunStyle = {
      left: `${left}px`,
      top: `${top}px`,
    };
  }

  // Convert sunrise and sunset times to AM/PM format
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
                <p>Sunrise</p>
                <p>{formattedSunrise}</p>
              </div>
              <div className="time sunset-time">
                <p>Sunset</p>
                <p>{formattedSunset}</p>
              </div>
            </div>
          </div>
          <div className="local-time">
            <p>Local time: {formatToAmPm(formattedTime)}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default SunriseSunset;
