import WeatherMap from "./WeatherMap";
import "./CurrentWeather.css";
import { useRef, useEffect, useState } from "react";
import { videoMap, iconMap } from "../../utils/weatherMapping";

const CurrentWeather = ({
  currentWeather,
  setCurrentWeather,
  location,
  dailyTemps,
  handleToggle,
  mapData,
}) => {
  // State to track the current 15-minute interval index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    if (currentWeather && Object.keys(currentWeather).length > 0) {
      setIsLoading(false);
    }
  }, [currentWeather]);

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
      // Make sure the index is within the bounds of the currentWeather array
      const newIndex = currentMinuteIndex % currentWeather.length;

      setCurrentIndex(newIndex);
    };
    updateCurrentWeather();
    const interval = setInterval(() => {
      updateCurrentWeather();
    }, 15 * 60 * 1000); // Update every 15 minutes
    console.log("Interval:", interval);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [currentWeather.length]);

  // Update weather icon and video based on condition and time of day
  useEffect(() => {
    const condition = currentWeather[currentIndex]?.condition;
    if (!condition) {
      return;
    }
    // Determine the appropriate icon
    let icon;
    if (typeof iconMap[condition] === "object") {
      icon = currentWeather[currentIndex].is_day
        ? iconMap[condition].day
        : iconMap[condition].night;
    } else {
      icon = iconMap[condition] || weatherImgs.undefined;
    }
    // Determine the appropriate video
    let video;
    if (typeof videoMap[condition] === "object") {
      video = currentWeather[currentIndex].is_day
        ? videoMap[condition].day
        : videoMap[condition].night;
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
        is_day: currentWeather[currentIndex].is_day,
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
            <img src={currentWeather.weatherIcon} alt="weather icon" />
            <div className="temp-info">
              <h1>
                {currentWeather.temperature}°{currentWeather.unit || "F"}
              </h1>
              <p>{currentWeather.condition}</p>
            </div>
            <div className="high-low-temp">
              <span>H: {dailyTemps.tempMax}°</span>{" "}
              <span>L: {dailyTemps.tempMin}°</span>
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
