import WeatherMap from "./WeatherMap";
import "./CurrentWeather.css";
import { useRef, useEffect, useState } from "react";
import { videoMap, iconMap } from "../../utils/weatherMapping";
import moment from "moment-timezone";

const CurrentWeather = ({
  currentWeather,
  setCurrentWeather,
  location,
  dailyTemps,
  handleToggle,
  mapData,
  timezone,
  sunData,
}) => {
  // State to track the current 15-minute interval index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDay, setIsDay] = useState(null);
  // console.log("time:", timezone);

  useEffect(() => {
    if (currentWeather && Object.keys(currentWeather).length > 0) {
      setIsLoading(false);
    }
  }, [currentWeather]);

  useEffect(() => {
    if (sunData && sunData.sunrise && sunData.sunset) {
      const currentTime = moment().tz(timezone);
      const sunrise = moment.tz(sunData.sunrise, timezone);
      const sunset = moment.tz(sunData.sunset, timezone);
      setIsDay(currentTime.isAfter(sunrise) && currentTime.isBefore(sunset));
    }
  }, [timezone, sunData, currentIndex]);

  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      let rate = 0.5;
      const interval = setInterval(() => {
        if (rate > 0.3) {
          rate -= 0.005;
          videoRef.current.playbackRate = rate;
        } else {
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, []);

  // Set an interval to update the weather data every 15 minutes
  useEffect(() => {
    const updateCurrentWeather = () => {
      const currentTime = new Date();
      const currentMinuteIndex = Math.floor(
        (currentTime.getHours() * 60 + currentTime.getMinutes()) / 15
      );
      const newIndex = currentMinuteIndex % currentWeather.length;

      setCurrentIndex(newIndex);
    };
    updateCurrentWeather();

    // Calculate the time until the next 15-minute interval
    const currentTime = new Date();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    const milliseconds = currentTime.getMilliseconds();

    const msToNextQuarterHour =
      (15 - (minutes % 15)) * 60 * 1000 - seconds * 1000 - milliseconds;

    // Set a timeout to synchronize with the next quarter-hour
    const timeout = setTimeout(() => {
      updateCurrentWeather();

      // Set interval to update every 15 minutes after the first synchronization
      const interval = setInterval(updateCurrentWeather, 15 * 60 * 1000); // 15 minutes

      return () => clearInterval(interval);
    }, msToNextQuarterHour);

    return () => clearTimeout(timeout);
  }, [currentWeather]);

  // Update weather icon and video based on condition and time of day
  useEffect(() => {
    const condition = currentWeather[currentIndex]?.condition;
    if (!condition) {
      return;
    }
    // Determine the appropriate icon
    let icon;
    if (typeof iconMap[condition] === "object") {
      icon = isDay ? iconMap[condition].day : iconMap[condition].night;
    } else {
      icon = iconMap[condition] || weatherImgs.undefined;
    }
    // Determine the appropriate video
    let video;
    if (typeof videoMap[condition] === "object") {
      video = isDay ? videoMap[condition].day : videoMap[condition].night;
    } else {
      video = videoMap[condition] || videoMap.default.clear;
    }

    setCurrentWeather((prevWeather) => {
      if (
        prevWeather.weatherIcon === icon &&
        prevWeather.video === video &&
        prevWeather.temperature === currentWeather[currentIndex].temperature
      )
        return prevWeather;

      return {
        ...prevWeather,
        weatherIcon: icon,
        video: video,
        temperature: currentWeather[currentIndex].temperature,
        condition: currentWeather[currentIndex].condition,
      };
    });
  }, [currentIndex, currentWeather, setCurrentWeather]);

  // Format today's date as a readable string
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isLoading) {
    return (
      <div className="current-weather">
        <div className="weather-container skeleton">
          <div className="current-weather-details">
            <h2>Current weather...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="current-weather">
      <div className="weather-container">
        <div className="current-weather-details">
          <video
            key={currentWeather.video}
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="weather-video"
          >
            <source src={currentWeather.video} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <h2>{location}</h2>
          <p className="current-date">{formattedDate}</p>
          <div className="temperature">
            <div className="temp-info">
              <h1>
                {currentWeather.temperature}°{currentWeather.unit || "F"}
              </h1>
              <p>{currentWeather.condition}</p>
            </div>
            <div className="high-low-temp">
              <img src={currentWeather.weatherIcon} alt="weather icon" />
              <span>
                <span style={{ fontSize: "0.8em", color: "#aaa" }}>L:</span>{" "}
                {dailyTemps.tempMin ? `${dailyTemps.tempMin}°` : "Sample"}{" "}
                <span style={{ fontSize: "0.8em", color: "#aaa" }}>H:</span>{" "}
                {dailyTemps.tempMax ? `${dailyTemps.tempMax}°` : "Sample"}
              </span>
            </div>
          </div>

          <div className="temp-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={currentWeather.unit === "C"}
                onChange={handleToggle}
              />
              <span className="slider"></span>
              <div className="labels">
                <span>F</span>
                <span>C</span>
              </div>
            </label>
          </div>
        </div>
        <div className="weather-map">
          <WeatherMap mapData={mapData} />
        </div>
      </div>
    </div>
  );
};

export default CurrentWeather;
