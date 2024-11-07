import "./Weather.css";
import LocationSearch from "../../components/Weather/LocationSearch";
import CurrentWeather from "../../components/Weather/CurrentWeather";
import WindStatus from "../../components/Weather/WindStatus";
import UVIndex from "../../components/Weather/UVIndex";
import SunriseSunset from "../../components/Weather/SunriseSunset";
import FeelsLike from "../../components/Weather/FeelsLike";
import AirQuality from "../../components/Weather/AirQuality";
import Humidity from "../../components/Weather/Humidity";
import Forecast from "../../components/Weather/Forecast";
import { useState, useEffect, useRef, useContext } from "react";
import { ProfileContext } from "../../utils/ProfileContext";
import { SidebarContext } from "../../layout/Sidebar/Context";

const Weather = () => {
  const [currentWeather, setCurrentWeather] = useState({});
  const [dailyTemps, setDailyTemps] = useState({});
  const [forecastData, setForecastData] = useState([]);
  const [sunriseSunset, setSunriseSunset] = useState([]);
  const [uvData, setUvData] = useState([]);
  const [feelsLikeData, setFeelsLikeData] = useState([]);
  const [humidData, setHumidData] = useState([]);
  const [windData, setWindData] = useState([]);
  const [AQI, setAQI] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [timeOfDay, setTimeOfDay] = useState();
  const [isLoading, setIsLoading] = useState(false);
  const { profile } = useContext(ProfileContext);
  const { toggleSidebar } = useContext(SidebarContext);

  // Handle user input / selection for location search
  const handleInputChange = (e) => {
    const value = e.target.value;
    setLocationSuggestions(value);
    fetchSuggestions(value);
  };
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      if (suggestions.length > 0) {
        // If suggestions exist, use the first suggestion
        const firstSuggestion = suggestions[0].place_name;
        setCurrentLocation(firstSuggestion);
        setSuggestions([]);
      } else {
        // If no suggestions, reset input
        setLocationSuggestions("");
      }
    }
  };
  const handleSuggestionClick = (suggestion) => {
    const locationName = suggestion;
    console.log("Location clicked:", locationName);
    setCurrentLocation(locationName);
    setSuggestions([]);
  };
  const handleBlur = () => {
    setTimeout(() => {
      setSuggestions([]);
      setLocationSuggestions("");
    }, 100); // Adding a slight delay to ensure click event is captured
  };

  // Helper
  const convertTemperature = (value, unit) => {
    return unit === "C"
      ? ((value * 9) / 5 + 32).toFixed(1)
      : (((value - 32) * 5) / 9).toFixed(1);
  };

  // Fahrenheit / Celsius toggle
  const handleToggle = () => {
    setCurrentWeather((prevWeather) => {
      const newUnit = prevWeather.unit === "C" ? "F" : "C";

      return {
        ...prevWeather,
        temperature: convertTemperature(
          prevWeather.temperature,
          prevWeather.unit
        ),
        unit: newUnit,
      };
    });
    setDailyTemps((prevTemps) => {
      const newUnit = prevTemps.unit === "C" ? "F" : "C";
      return {
        ...prevTemps,
        tempMax: convertTemperature(prevTemps.tempMax, prevTemps.unit),
        tempMin: convertTemperature(prevTemps.tempMin, prevTemps.unit),
        unit: newUnit,
      };
    });
    setForecastData((prevForecast) => {
      const newUnit = prevForecast[0].unit === "C" ? "F" : "C";
      return prevForecast.map((day) => ({
        ...day,
        tempMax: convertTemperature(day.tempMax, day.unit),
        tempMin: convertTemperature(day.tempMin, day.unit),
        unit: newUnit,
      }));
    });
    setFeelsLikeData((prevFeels) => {
      const newUnit = prevFeels[0].unit === "C" ? "F" : "C";
      return prevFeels.map((feelsTemp) => ({
        ...feelsTemp,
        temperature: convertTemperature(feelsTemp.temperature, feelsTemp.unit),
        apparent_temperature: convertTemperature(
          feelsTemp.apparent_temperature,
          feelsTemp.unit
        ),
        unit: newUnit,
      }));
    });
  };

  // Function to fetch location suggestions
  const fetchSuggestions = async (input) => {
    if (!input) {
      setSuggestions([]);
      return;
    }
    const response = await fetch(
      `http://localhost:8000/api/place/?input=${input}`
    );
    if (response.ok) {
      const data = await response.json();

      const suggestionsArray = data.suggestions || [];
      const descriptions = suggestionsArray.map(
        (suggestion) => suggestion.description
      );
      // console.log("Descriptions", descriptions);
      setSuggestions(descriptions);
    } else {
      console.error(
        "Error fetching location suggestions:",
        response.statusText
      );
      setSuggestions([]);
    }
  };

  const fetchWeatherData = async (location) => {
    if (!location) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8000/api/weather/?location=${encodeURIComponent(
          location
        )}`
      );
      if (response.ok) {
        const weatherData = await response.json();

        // Set AQI and UV data
        setAQI(weatherData.air_uv_data["aqi_data"]);
        setUvData(weatherData.air_uv_data["uv_data"]);

        // Set sunrise and sunset data
        const dailyData = weatherData.weather_data["daily"];
        setSunriseSunset({
          sunrise: dailyData[0].sunrise,
          sunset: dailyData[0].sunset,
        });
        // set 10-day forecast data
        setForecastData(
          dailyData.map((day) => ({
            date: day.date,
            condition: day.weather_code,
            tempMax: day.max_temperature,
            tempMin: day.min_temperature,
            unit: "F",
          }))
        );
        const hourlyData = weatherData.weather_data["hourly"];

        // Feelslike data
        const temperatureData = hourlyData.map((hour) => ({
          time: hour.time,
          temperature: hour.temperature,
          apparent_temperature: hour.apparent_temperature,
          unit: "F",
        }));
        setFeelsLikeData(temperatureData);

        // Humidity and Dewpoint data
        const humidDewData = hourlyData.map((hour) => ({
          time: hour.time,
          humidity: hour.humidity,
          dewpoint: hour.dew_point,
        }));
        setHumidData(humidDewData);

        // Wind data
        const hourlyWindData = hourlyData.map((hour) => ({
          time: hour.time,
          windspeed: hour.wind_speed,
        }));
        setWindData(hourlyWindData);

        // Fetch 15-minute data
        const minutelyData = weatherData.weather_data["minutely_15"];
        // console.log("15-mins:", minutelyData);

        // Set current weather data based on 15-minute interval
        const currentTime = new Date();
        const currentMinuteIndex = Math.floor(
          (currentTime.getHours() * 60 + currentTime.getMinutes()) / 15
        );
        const currentMinuteData = minutelyData[currentMinuteIndex];

        const currentWeatherData = minutelyData.map((minute_15) => ({
          temperature: minute_15.temperature,
          condition: minute_15.weather_code,
          is_day: minute_15.is_day,
          unit: "F",
        }));
        setCurrentWeather(currentWeatherData);
        setDailyTemps({
          tempMax: dailyData[0].max_temperature,
          tempMin: dailyData[0].min_temperature,
          unit: "F",
        });

        // data for Mapbox
        const mapboxGeoData = {
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [
                  weatherData.coordinates["lng"],
                  weatherData.coordinates["lat"],
                ], // Use coordinates from weather data
              },
              properties: {
                precip: currentMinuteData.precipitation,
              },
            },
          ],
        };
        setMapData(mapboxGeoData);
      } else {
        console.error("Error fetching weather data:", response.statusText);
      }
    } catch (error) {
      console.error("Error from data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (profile) {
      const { city, state } = profile;
      if (city && state) {
        setCurrentLocation(`${city}, ${state}`);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (currentLocation) {
      fetchWeatherData(currentLocation);
    }
  }, [currentLocation]);

  return (
    <div className="weather-dashboard">
      {/* LocationSearch */}
      <LocationSearch
        location={locationSuggestions}
        handleInputChange={handleInputChange}
        handleKeyDown={handleKeyDown}
        handleBlur={handleBlur}
        suggestions={suggestions}
        handleSuggestionClick={handleSuggestionClick}
      />
      {/* Current Weather */}
      <CurrentWeather
        currentWeather={currentWeather}
        setCurrentWeather={setCurrentWeather}
        location={currentLocation}
        dailyTemps={dailyTemps}
        handleToggle={handleToggle}
        mapData={mapData}
        timeOfDay={timeOfDay}
      />
      {/* Today's Highlights */}
      <div className={`highlights-container ${isLoading ? "skeleton" : ""}`}>
        <h3>Today's Highlights</h3>
        <div className="highlights">
          <WindStatus windstatusData={windData} />
          <UVIndex hourlyUVIndex={uvData} />
          <SunriseSunset sunData={sunriseSunset} />
          <Humidity humidDewData={humidData} />
          <AirQuality airQuality={AQI} />
          <FeelsLike
            feels={feelsLikeData}
            actualTemp={currentWeather.temperature}
          />
        </div>
      </div>
      {/* 10 Day Forecast */}
      <div className={`forecast ${isLoading ? "skeleton" : ""}`}>
        <h3>10-Day Forecast</h3>
        <Forecast forecast={forecastData} />
      </div>
    </div>
  );
};

export default Weather;
