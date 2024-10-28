import React from "react";
import "./Weather.css";
import { forecastData } from "../../data/data";

const Weather = () => {
  return (
    <div className="weather-dashboard">
      {/* Top searchbar */}
      <div className="search-bar">
        <h1>Hi, Tuan</h1>
        <div className="search-container">
          <i className="bi bi-search search-icon"></i>
          <input
            type="text"
            placeholder="Search your location"
            className="search-input"
          />
        </div>
      </div>

      {/* Current Weather */}
      <div className="current-weather">
        <div className="current-weather-details">
          <h2>Richmond, Texas</h2>
          <p>Sunday, 04 Aug 2024</p>
          <div className="temperature">
            <img src="cloudy-icon.png" alt="weather icon" />
            <div className="temp-info">
              <h1>28°C</h1>
              <p>Heavy Rain</p>
            </div>
          </div>
        </div>
        <div className="current-weather-feature">
          <h2>Feature</h2> {/* Placeholder for future content */}
        </div>
      </div>

      {/* Today's Highlights */}
      <div className="highlights">
        <h3>Today's Highlights</h3>
        <div className="highlight">
          <p>Wind Status</p>
          <h2>7.90 km/h</h2>
        </div>
        <div className="highlight">
          <p>Humidity</p>
          <h2>85%</h2>
        </div>
        <div className="highlight">
          <p>UV Index</p>
          <h2>4 UV</h2>
        </div>
        <div className="highlight">
          <p>Visibility</p>
          <h2>5 km</h2>
        </div>
        <div className="highlight">
          <p>Sunrise</p>
          <h2>4:50 AM</h2>
        </div>
        <div className="highlight">
          <p>Sunset</p>
          <h2>6:45 PM</h2>
        </div>
      </div>

      {/* 7 Day Forecast */}
      <div className="forecast">
        <h3>7 Day Forecast</h3>
        <div className="forecast-cards">
          {forecastData.map((forecast, index) => (
            <div className="forecast-card" key={index}>
              <p>{forecast.day}</p>
              <img src={forecast.icon} alt={forecast.day} />
              <p>{forecast.temperature}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Weather;
