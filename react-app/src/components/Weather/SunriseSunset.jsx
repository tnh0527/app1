import "./SunriseSunset.css";

const SunriseSunset = ({
  currentTime = "12:00 AM",
  sunriseTime = "5:30 AM",
  sunsetTime = "6:30 PM",
}) => {
  const parseTime = (timeString) => {
    if (!timeString) return { hours: 0, minutes: 0 }; // Handle undefined time strings

    const [hours, minutes] = timeString.split(/:| /);
    const isPM = timeString.toLowerCase().includes("pm");
    return {
      hours: parseInt(hours) + (isPM && hours !== "12" ? 12 : 0),
      minutes: parseInt(minutes),
    };
  };

  const timeToMinutes = (time) => time.hours * 60 + time.minutes;

  const calculateSunPosition = () => {
    const sunrise = parseTime(sunriseTime);
    const sunset = parseTime(sunsetTime);
    const current = parseTime(currentTime);

    const totalMinutes = timeToMinutes(sunset) - timeToMinutes(sunrise);
    const elapsedMinutes = timeToMinutes(current) - timeToMinutes(sunrise);

    if (elapsedMinutes < 0 || elapsedMinutes > totalMinutes) {
      return null; // The sun is not visible if the current time is not in range
    }

    return Math.max(0, Math.min(100, (elapsedMinutes / totalMinutes) * 100));
  };

  const calculateTimeUntilEvent = () => {
    const current = parseTime(currentTime);
    const sunrise = parseTime(sunriseTime);
    const sunset = parseTime(sunsetTime);

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

  const sunPosition = calculateSunPosition();
  const timeUntilEvent = calculateTimeUntilEvent();

  const isNightTime = sunPosition === null;

  let sunStyle = {};
  if (!isNightTime) {
    // Calculate the angle for the sun along the arc
    const angle = (sunPosition / 100) * Math.PI; // Convert percentage to radians (0 to π for the arc)

    // Calculate x and y positions based on angle
    const radius = 100; // Assuming the arc has a radius of 100px
    const left = radius + radius * Math.cos(angle - Math.PI); // Calculate horizontal position
    const top = radius - radius * Math.sin(angle); // Calculate vertical position

    sunStyle = {
      left: `${left}px`,
      top: `${top}px`,
    };
  }

  return (
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
          <p>{sunriseTime}</p>
        </div>
        <div className="time sunset-time">
          <p>Sunset</p>
          <p>{sunsetTime}</p>
        </div>
      </div>
    </div>
  );
};

export default SunriseSunset;
