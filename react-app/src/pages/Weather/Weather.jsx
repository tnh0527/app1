import "./Weather.css";
import WindStatus from "../../components/Weather/WindStatus";
import UVIndex from "../../components/Weather/UVIndex";
import SunriseSunset from "../../components/Weather/SunriseSunset";
import FeelsLike from "../../components/Weather/FeelsLike";
import AirQuality from "../../components/Weather/AirQuality";
import Humidity from "../../components/Weather/Humidity";
import WeatherMap from "../../components/Weather/WeatherMap";
import Forecast from "../../components/Weather/Forecast";
import { weatherImgs } from "../../utils/images";
import { useState, useEffect, useRef } from "react";
import { csrfToken } from "../../data/data";

const Weather = () => {
  // Sample weather data
  const [currentWeather, setCurrentWeather] = useState({
    // default
    city: "Richmond, Texas",
    date: "Sunday, 04 Aug 2024",
    temperature: 28,
    highTemp: 35,
    lowTemp: 10,
    weather: "cloudy",
    weatherIcon: weatherImgs.cloudy,
    unit: "C",
    video: "/videos/snowy.mp4",
  });
  const [forecastData, setForecastData] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  // Create a reference for the video element
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      let rate = 0.5; // Start speed
      const interval = setInterval(() => {
        if (rate > 0.3) {
          rate -= 0.005;
          videoRef.current.playbackRate = rate;
        } else {
          clearInterval(interval);
        }
      }, 300); // Adjust for a smoother transition
      return () => clearInterval(interval);
    }
  }, []);

  // Determine if it's day or night based on current local time
  const [timeOfDay, setTimeOfDay] = useState("day");
  useEffect(() => {
    const currentHour = new Date().getHours();
    // console.log(currentHour);
    if (currentHour >= 6 && currentHour < 18) {
      setTimeOfDay("day");
    } else {
      setTimeOfDay("night");
    }
  }, []);

  // Icon lookup
  const iconMap = {
    clear: weatherImgs.sunny,
    sunny: weatherImgs.sunny,
    "partially cloudy": weatherImgs.partly_cloudy,
    "mostly cloudy": weatherImgs.partly_cloudy,
    cloudy: weatherImgs.cloudy,
    "rain, partially cloudy": weatherImgs.slight_rain,
    rain: weatherImgs.rainy,
    "light rain": weatherImgs.rainy,
    showers: weatherImgs.rainy,
    thunderstorm: weatherImgs.storm,
    storm: weatherImgs.storm,
    snow: weatherImgs.snowy,
    "slight snow": weatherImgs.snowy,
  };
  const getWeatherIcon = (condition) =>
    iconMap[condition.toLowerCase()] || weatherImgs.undefined;

  // Combined weather icon and video setting effect
  useEffect(() => {
    const condition = currentWeather.weather.toLowerCase();

    // Determine the appropriate icon
    const icon = iconMap[condition] || weatherImgs.undefined;
    // Determine the appropriate video
    let video;
    if (condition.includes("rain") || condition.includes("showers")) {
      video = "/videos/rainy.mp4";
    } else if (condition.includes("snow")) {
      video = "/videos/snowy.mp4";
    } else if (condition.includes("storm")) {
      video = "/videos/thunderstorm.mp4";
    } else if (condition.includes("cloudy")) {
      video =
        timeOfDay === "day" ? "/videos/cloudy.mp4" : "/videos/cloudy-night.mp4";
    } else if (condition === "clear" || condition === "sunny") {
      video =
        timeOfDay === "day" ? "/videos/sunny-sky.mp4" : "/videos/night-sky.mp4";
    } else {
      video = "/videos/snow.mp4"; // Default video
    }

    setCurrentWeather((prevWeather) => ({
      ...prevWeather,
      weatherIcon: icon,
      video: video,
    }));
  }, [currentWeather.weather, timeOfDay]);

  // Location suggestions
  const fetchSuggestions = async (query) => {
    if (!query) {
      setSuggestions([]);
      return;
    }
    const accessToken = import.meta.env.VITE_REACT_APP_MAPBOX_ACCESS_TOKEN;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${accessToken}&limit=5`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch suggestions.");
      }
      const data = await response.json();
      setSuggestions(data.features);
    } catch (error) {
      console.error("Error fetching suggestions.", error);
    }
  };

  // Handle user input / selection for location search
  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocation(value);
    fetchSuggestions(value);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (suggestions.length > 0) {
        // If suggestions exist, use the first suggestion
        const firstSuggestion = suggestions[0].place_name;
        setLocation(firstSuggestion);
        setSuggestions([]);
        fetchWeatherData(firstSuggestion);
      } else {
        // If no suggestions, reset input
        setLocation("");
      }
    }
  };
  const handleSuggestionClick = (suggestion) => {
    const locationName = suggestion.place_name;
    setLocation(locationName);
    setSuggestions([]);
    fetchWeatherData(locationName);
  };
  const handleBlur = () => {
    setTimeout(() => {
      setSuggestions([]);
      setLocation("");
    }, 100); // Adding a slight delay to ensure click event is captured
  };

  // Helper
  const convertToFahrenheit = (tempC) => ((tempC * 9) / 5 + 32).toFixed(1);
  const convertToCelsius = (tempF) => (((tempF - 32) * 5) / 9).toFixed(1);

  // Fahrenheit / Celsius toggle
  const handleToggle = () => {
    //convert current data
    setCurrentWeather((prevWeather) => {
      if (prevWeather.unit === "C") {
        return {
          ...prevWeather,
          temperature: convertToFahrenheit(prevWeather.temperature),
          highTemp: convertToFahrenheit(prevWeather.highTemp),
          lowTemp: convertToFahrenheit(prevWeather.lowTemp),
          unit: "F",
        };
      } else {
        return {
          ...prevWeather,
          temperature: convertToCelsius(prevWeather.temperature),
          highTemp: convertToCelsius(prevWeather.highTemp),
          lowTemp: convertToCelsius(prevWeather.lowTemp),
          unit: "C",
        };
      }
    });
    //convert forecast data
    setForecastData((prevForecast) =>
      prevForecast.map((day) => {
        if (currentWeather.unit === "C") {
          return { ...day, tempMax: convertToFahrenheit(day.tempMax) };
        } else {
          return { ...day, tempMax: convertToCelsius(day.tempMax) };
        }
      })
    );
  };

  const [firstName, setFirstName] = useState("User");
  const fetchUserData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:8000/profile/edit-profile/",
        {
          method: "GET",
          headers: {
            "X-CSRFToken": csrfToken,
          },
          credentials: "include",
        }
      );
      if (response.ok) {
        const profile = await response.json();
        setFirstName(profile.first_name);
        fetchWeatherData(`${profile.city}, ${profile.state}`);
      } else {
        console.error("Failed fetching user profile:", error);
      }
    } catch (error) {
      console.error("Error while fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchUserData();
  }, []);

  const apiKey = import.meta.env.VITE_REACT_APP_VISUALCROSSING_API_KEY;
  // Fetch from API
  const fetchWeatherData = async (location) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(
          location
        )}?unitGroup=metric&key=${apiKey}&contentType=json`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }
      const data = await response.json();

      // Prepare data in GeoJSON format for the map
      const forecastFeatures = data.days.map((day) => ({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [data.longitude, data.latitude],
        },
        properties: {
          date: day.datetime,
          precip: day.precip || 0,
          precipprob: day.precipprob,
          preciptype: day.preciptype || "none", // Default to "none" if null
          tempMax: day.tempmax,
          tempMin: day.tempmin,
        },
      }));
      // Save the data in a structure suitable for Mapbox
      setMapData({
        type: "FeatureCollection",
        features: forecastFeatures,
      });

      // Update state with fetched data
      setCurrentWeather({
        city: data.resolvedAddress,
        date: new Date(
          data.currentConditions.datetimeEpoch * 1000
        ).toDateString(),
        temperature: data.currentConditions.temp,
        highTemp: data.days[0].tempmax,
        lowTemp: data.days[0].tempmin,
        weather: data.currentConditions.conditions,
        weatherIcon: currentWeather.weatherIcon,
        unit: "C",
      });

      // Prepare data for forecast for the next 10 days
      const forecast = data.days.slice(0, 10).map((day) => {
        // Convert day.datetime to a Date object
        const dateObj = new Date(day.datetime);
        // Get the weekday and day/month parts
        const options = { weekday: "long" };
        const weekday = dateObj.toLocaleDateString("en-US", options);
        const dayMonth = dateObj.toLocaleDateString("en-US", {
          month: "short",
          day: "2-digit",
        });
        return {
          date: {
            weekday,
            dayMonth,
          },
          tempMax: day.tempmax, // maximum temperature for that day
          condition: day.conditions, // general weather condition
          icon: getWeatherIcon(day.conditions), // icon based on the condition
        };
      });
      setForecastData(forecast);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="weather-dashboard">
      {/* Top search bar */}
      <div className="search-bar">
        <h1>Hi, {firstName}</h1>
        <div className="search-input-wrapper">
          <i className="bi bi-search search-icon"></i>
          <input
            type="text"
            placeholder="Search a location . . ."
            className="search-input"
            value={location}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown} // Enter to search location weather
            onBlur={handleBlur}
          />
          {suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onMouseDown={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion.place_name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Current Weather */}
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

            {loading ? (
              <div>Loading...</div>
            ) : (
              <>
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
              </>
            )}
          </div>
          <div className="weather-map">
            <WeatherMap mapData={mapData} />
          </div>
        </div>
      </div>

      {/* Today's Highlights */}
      <div className="highlights-container">
        <h3>Today's Highlights</h3>
        <div className="highlights">
          <WindStatus />
          <UVIndex />
          <SunriseSunset />
          <Humidity />
          <AirQuality />
          <FeelsLike />
        </div>
      </div>

      {/* 10 Day Forecast */}
      <Forecast forecast={forecastData} />
    </div>
  );
};

export default Weather;
