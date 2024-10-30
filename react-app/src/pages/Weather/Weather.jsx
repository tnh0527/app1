import "./Weather.css";
import { forecastData } from "../../data/data";
import WindStatus from "../../components/Weather/WindStatus";
import UVIndex from "../../components/Weather/UVIndex";
import SunriseSunset from "../../components/Weather/SunriseSunset";
import FeelsLike from "../../components/Weather/FeelsLike";
import AirQuality from "../../components/Weather/AirQuality";
import Humidity from "../../components/Weather/Humidity";
import { weatherImgs } from "../../utils/images";
import { useState, useEffect, useRef } from "react";

const Weather = () => {
  // Sample weather data
  const [currentWeather, setCurrentWeather] = useState({
    city: "Richmond, Texas",
    date: "Sunday, 04 Aug 2024",
    temperature: 28,
    highTemp: 35,
    lowTemp: 10,
    weather: "Partly Cloudy",
    weatherIcon: weatherImgs.cloudy, // default
    unit: "C",
  });
  // Create a reference for the video element
  const videoRef = useRef(null);

  useEffect(() => {
    // Set playback speed of the video to slow down the loop
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.35;
    }
  }, []);

  useEffect(() => {
    // Set the appropriate weather icon based on the weather description
    let icon;
    switch (currentWeather.weather.toLowerCase()) {
      case "rain":
      case "heavy rain":
        icon = weatherImgs.rainy;
        break;
      case "light rain":
        icon = weatherImgs.slight_rain;
        break;
      case "cloudy":
        icon = weatherImgs.cloudy;
        break;
      case "sunny":
        icon = weatherImgs.sunny;
        break;
      case "snow":
        icon = weatherImgs.snowy;
        break;
      case "storm":
      case "thunderstorm":
        icon = weatherImgs.storm;
        break;
      case "partly cloudy":
        icon = weatherImgs.partly_cloudy;
        break;
      default:
        icon = weatherImgs.cloudy;
    }
    setCurrentWeather((prevWeather) => ({ ...prevWeather, weatherIcon: icon }));
  }, [currentWeather.weather]);

  // Fahrenheit / Celsius toggle
  const handleToggle = () => {
    setCurrentWeather((prevWeather) => {
      if (prevWeather.unit === "C") {
        return {
          ...prevWeather,
          temperature: Math.round((prevWeather.temperature * 9) / 5 + 32),
          highTemp: Math.round((prevWeather.highTemp * 9) / 5 + 32),
          lowTemp: Math.round((prevWeather.lowTemp * 9) / 5 + 32),
          unit: "F",
        };
      } else {
        return {
          ...prevWeather,
          temperature: Math.round(((prevWeather.temperature - 32) * 5) / 9),
          highTemp: Math.round(((prevWeather.highTemp - 32) * 5) / 9),
          lowTemp: Math.round(((prevWeather.lowTemp - 32) * 5) / 9),
          unit: "C",
        };
      }
    });
  };

  return (
    <div className="weather-dashboard">
      {/* Top searchbar */}
      <div className="search-bar">
        <h1>Hi, Tuan</h1>
        <div className="search-input-wrapper">
          <i className="bi bi-search search-icon"></i>
          <input
            type="text"
            placeholder="Search a location . . ."
            className="search-input"
          />
        </div>
      </div>

      {/* Current Weather */}
      <div className="current-weather">
        <div className="current-weather-details">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="weather-video"
          >
            <source src="/videos/cloudy-video.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <h2>{currentWeather.city}</h2>
          <p>{currentWeather.date}</p>
          <div className="temperature">
            <img src={currentWeather.weatherIcon} alt="weather icon" />
            <div className="temp-info">
              <h1>
                {currentWeather.temperature}°{currentWeather.unit}
              </h1>
              <p>{currentWeather.weather}</p>
            </div>
            <div className="high-low-temp">
              <span>H: {currentWeather.highTemp}°</span>{" "}
              <span>L: {currentWeather.lowTemp}°</span>
            </div>
          </div>

          <div className="temp-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={currentWeather.unit === "F"}
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
        <div className="current-weather-feature">
          <h2>Feature</h2> {/* Placeholder for future content */}
        </div>
      </div>

      {/* Today's Highlights */}
      <div className="highlights-container">
        <h3>Today's Highlights</h3>
        <div className="highlights">
          <div className="highlight">
            <h4>WindStatus</h4>
            <WindStatus />
          </div>
          <div className="highlight">
            <h4>UV Index</h4>
            <UVIndex />
          </div>
          <div className="highlight">
            <h4>Sunrise & Sunset</h4>
            <SunriseSunset />
          </div>
          <div className="highlight">
            <h4>Humidity</h4>
            <Humidity />
          </div>
          <div className="highlight">
            <h4>Air Quality</h4>
            <AirQuality />
          </div>
          <div className="highlight">
            <h4>Feels Like</h4>
            <FeelsLike />
          </div>
        </div>
      </div>

      {/* 10 Day Forecast */}
      <div className="forecast">
        <h3>10 Days Forecast</h3>
        <div className="forecast-cards">
          {forecastData.map((forecast, index) => (
            <div className="forecast-card" key={index}>
              <div className="forecase-info">
                <span className="forecast-day">{forecast.day}</span>
                <p>{forecast.temperature}</p>
              </div>
              <div className="forecast-icon">
                <img src={forecast.icon} alt={forecast.day} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Weather;
