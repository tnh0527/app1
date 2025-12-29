import "./Weather.css";
import LocationSearch from "../../components/Weather/LocationSearch";
import CurrentWeather from "../../components/Weather/CurrentWeather";
import Forecast from "../../components/Weather/Forecast";
import CardSlot from "../../components/Weather/CardSlot";
import WeatherModal from "../../components/Weather/WeatherModal";
import WeatherEffects from "../../components/Weather/WeatherEffects";
import { useState, useEffect, useRef, useContext } from "react";
import { ProfileContext } from "../../contexts/ProfileContext";
import { transformLocationInput } from "../../utils/capitalCities";

const TOP_CARD_OPTIONS = [
  { value: "wind", label: "Wind Status" },
  { value: "uv", label: "UV Index" },
  { value: "sunrise", label: "Sunrise & Sunset" },
];

const BOTTOM_CARD_OPTIONS = [
  { value: "humidity", label: "Humidity" },
  { value: "air_quality", label: "Air Quality" },
  { value: "feels_like", label: "Feels Like" },
  { value: "visibility", label: "Visibility" },
  { value: "cloud_cover", label: "Cloud Cover" },
  { value: "pressure", label: "Pressure" },
];

const Weather = () => {
  const DEFAULT_LOCATION = "Richmond, Texas, USA";

  const [currentWeather, setCurrentWeather] = useState({});
  const [dailyTemps, setDailyTemps] = useState({});
  const [forecastData, setForecastData] = useState([]);
  const [sunriseSunset, setSunriseSunset] = useState([]);
  const [timeZone, setTimeZone] = useState({});
  const [uvData, setUvData] = useState([]);
  const [feelsLikeData, setFeelsLikeData] = useState([]);
  const [humidData, setHumidData] = useState([]);
  const [windData, setWindData] = useState([]);
  const [AQI, setAQI] = useState([]);
  const [visibilityData, setVisibilityData] = useState([]);
  const [pressureData, setPressureData] = useState([]);
  const [cloudCoverData, setCloudCoverData] = useState([]);
  const [mapData, setMapData] = useState([]);
  const [hourlyForecast, setHourlyForecast] = useState([]);
  const [locationSuggestions, setLocationSuggestions] = useState("");
  const [currentLocation, setCurrentLocation] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [weatherCondition, setWeatherCondition] = useState(null);
  const [currentTemp, setCurrentTemp] = useState(null);
  const [currentWindSpeed, setCurrentWindSpeed] = useState(null);
  const [currentFeelsLike, setCurrentFeelsLike] = useState(null);
  const { profile } = useContext(ProfileContext);

  const [cardSlots, setCardSlots] = useState({
    slot1: "wind",
    slot2: "uv",
    slot3: "sunrise",
    slot4: "humidity",
    slot5: "air_quality",
    slot6: "feels_like",
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", data: null });

  const [currentConditions, setCurrentConditions] = useState({
    visibility: null,
    pressure: null,
    cloud_cover: null,
  });

  const handleCardChange = (slotId, newType) => {
    setCardSlots((prev) => ({
      ...prev,
      [slotId]: newType,
    }));
  };

  const handleCardClick = (type, data) => {
    setModalContent({ title: type, data: data });
    setModalOpen(true);
  };

  // Cache weather data in localStorage
  const cacheWeatherData = (location, data) => {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`weather_${location}`, JSON.stringify(cacheEntry));
  };

  // Retrieve cached weather data from localStorage
  const getCachedWeatherData = (location) => {
    const cacheEntry = localStorage.getItem(`weather_${location}`);
    if (cacheEntry) {
      const { data, timestamp } = JSON.parse(cacheEntry);
      // Expiration time for cache data
      const cacheExpiration = 120 * 60 * 1000;
      if (Date.now() - timestamp < cacheExpiration) {
        return data;
      } else {
        localStorage.removeItem(`weather_${location}`);
      }
    }
    return null;
  };

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
        const firstSuggestion = suggestions[0];
        // Transform in case it's a country name
        const transformedLocation = transformLocationInput(firstSuggestion);
        setCurrentLocation(transformedLocation);
        setSuggestions([]);
      } else if (locationSuggestions.trim()) {
        // No suggestions but user typed something - try transforming (e.g., "USA" -> capital)
        const transformedLocation = transformLocationInput(
          locationSuggestions.trim()
        );
        setCurrentLocation(transformedLocation);
        setSuggestions([]);
      } else {
        // If no input, reset
        setLocationSuggestions("");
      }
    }
  };
  const handleSuggestionClick = (suggestion) => {
    // Transform in case it's a country name -> use capital city
    const transformedLocation = transformLocationInput(suggestion);
    console.log(
      "Location clicked:",
      suggestion,
      "-> transformed:",
      transformedLocation
    );
    setCurrentLocation(transformedLocation);
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
    setHourlyForecast((prevHourly) => {
      if (!prevHourly || prevHourly.length === 0) return [];
      const newUnit = prevHourly[0].unit === "C" ? "F" : "C";
      return prevHourly.map((hour) => ({
        ...hour,
        temperature: convertTemperature(hour.temperature, hour.unit),
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
    // Check for cached data
    try {
      const cachedData = getCachedWeatherData(location);
      // Ensure cache has the new 'currentConditions' and 'hourlyForecast' fields
      if (
        cachedData &&
        cachedData.currentConditions &&
        cachedData.hourlyForecast
      ) {
        setWeatherStates(cachedData);
        setIsLoading(false);
        return;
      }
      // Fetch fresh data otherwise
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

        // Set sunrise and sunset data (today and tomorrow for hourly forecast)
        const dailyData = weatherData.weather_data["daily"];
        setSunriseSunset({
          sunrise: dailyData[0].sunrise,
          sunset: dailyData[0].sunset,
          tomorrowSunrise: dailyData[1]?.sunrise || null,
          tomorrowSunset: dailyData[1]?.sunset || null,
        });
        setTimeZone(weatherData.time_zone_data);
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
          winddirection: hour.wind_direction,
        }));
        setWindData(hourlyWindData);

        // Visibility data
        const visibilityData = hourlyData.map((hour) => ({
          time: hour.time,
          visibility: hour.visibility,
        }));
        setVisibilityData(visibilityData);

        // Pressure data
        const pressureData = hourlyData.map((hour) => ({
          time: hour.time,
          pressure: hour.pressure,
        }));
        setPressureData(pressureData);

        // Cloud Cover data
        const cloudCoverData = hourlyData.map((hour) => ({
          time: hour.time,
          cloud_cover: hour.cloud_cover,
        }));
        setCloudCoverData(cloudCoverData);

        // Hourly Forecast Data (including wind speed for windy detection)
        const hourlyForecastData = hourlyData.map((hour) => ({
          time: hour.time,
          temperature: hour.temperature,
          condition: hour.weather_code,
          is_day: hour.is_day,
          wind_speed: hour.wind_speed,
          unit: "F",
        }));
        setHourlyForecast(hourlyForecastData);

        // Fetch 15-minute data
        const minutelyData = weatherData.weather_data["minutely_15"];
        // console.log("15-mins:", minutelyData);

        // Set current weather data based on 15-minute interval
        const currentTime = new Date();
        const currentMinuteIndex = Math.floor(
          (currentTime.getHours() * 60 + currentTime.getMinutes()) / 15
        );
        const currentMinuteData =
          minutelyData[currentMinuteIndex] || minutelyData[0] || {};

        const currentWeatherData = minutelyData.map((minute_15) => ({
          temperature: minute_15.temperature,
          condition: minute_15.weather_code,
          is_day: minute_15.is_day,
          feels_like: minute_15.apparent_temperature,
          unit: "F",
        }));
        setCurrentWeather(currentWeatherData);

        // Set weather condition and current values for effects
        if (currentMinuteData.weather_code) {
          setWeatherCondition(currentMinuteData.weather_code);
        }
        // Set current temperature for effects
        if (currentMinuteData.temperature !== undefined) {
          setCurrentTemp(currentMinuteData.temperature);
        }
        // Set current feels like for effects
        if (currentMinuteData.apparent_temperature !== undefined) {
          setCurrentFeelsLike(currentMinuteData.apparent_temperature);
        }

        // Store current conditions for cards
        const newCurrentConditions = {
          visibility: currentMinuteData.visibility,
          pressure: currentMinuteData.pressure,
          cloud_cover: currentMinuteData.cloud_cover,
        };
        setCurrentConditions(newCurrentConditions);

        setVisibilityData(visibilityData);
        setPressureData(pressureData);
        setCloudCoverData(cloudCoverData);

        // Feelslike data
        const temperatureData = minutelyData.map((minute_15) => ({
          time: minute_15.time,
          temperature: minute_15.temperature,
          apparent_temperature: minute_15.apparent_temperature,
          unit: "F",
        }));
        setFeelsLikeData(temperatureData);

        setDailyTemps({
          tempMax: dailyData[0].max_temperature,
          tempMin: dailyData[0].min_temperature,
          unit: "F",
        });

        // data for Map (coordinates + a couple properties used by overlays)
        const currentHourIndex = new Date().getHours();
        const currentHour = hourlyData[currentHourIndex] || {};

        // Set current wind speed for effects (from hourly since 15-min doesn't have wind)
        if (currentHour.wind_speed !== undefined) {
          setCurrentWindSpeed(currentHour.wind_speed);
        }

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
                wind_speed: currentHour.wind_speed,
                wind_direction: currentHour.wind_direction,
              },
            },
          ],
        };
        setMapData(mapboxGeoData);
        // Cache the fetched data
        cacheWeatherData(location, {
          AQI: weatherData.air_uv_data["aqi_data"],
          uvData: weatherData.air_uv_data["uv_data"],
          sunriseSunset: {
            sunrise: dailyData[0].sunrise,
            sunset: dailyData[0].sunset,
            tomorrowSunrise: dailyData[1]?.sunrise || null,
            tomorrowSunset: dailyData[1]?.sunset || null,
          },
          timeZone: weatherData.time_zone_data,
          forecastData: dailyData.map((day) => ({
            date: day.date,
            condition: day.weather_code,
            tempMax: day.max_temperature,
            tempMin: day.min_temperature,
            unit: "F",
          })),
          feelsLikeData: temperatureData,
          humidData: humidDewData,
          windData: hourlyWindData,
          visibilityData: visibilityData,
          pressureData: pressureData,
          cloudCoverData: cloudCoverData,
          currentWeather: currentWeatherData,
          currentConditions: newCurrentConditions,
          dailyTemps: {
            tempMax: dailyData[0].max_temperature,
            tempMin: dailyData[0].min_temperature,
            unit: "F",
          },
          hourlyForecast: hourlyForecastData,
          mapData: mapboxGeoData,
          // Weather effects data
          weatherCondition: currentMinuteData.weather_code,
          currentTemp: currentMinuteData.temperature,
          currentWindSpeed: currentHour.wind_speed,
          currentFeelsLike: currentMinuteData.apparent_temperature,
        });
      } else {
        console.error("Error fetching weather data:", response.statusText);
      }
    } catch (error) {
      console.error("Error from data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to set weather states
  const setWeatherStates = (data) => {
    setAQI(data.AQI);
    setUvData(data.uvData);
    setSunriseSunset(data.sunriseSunset);
    setTimeZone(data.timeZone);
    setForecastData(data.forecastData);
    setFeelsLikeData(data.feelsLikeData);
    setHumidData(data.humidData);
    setWindData(data.windData);
    setVisibilityData(data.visibilityData);
    setPressureData(data.pressureData);
    setCloudCoverData(data.cloudCoverData);
    setCurrentWeather(data.currentWeather);
    if (data.currentConditions) {
      setCurrentConditions(data.currentConditions);
    }
    setDailyTemps(data.dailyTemps);
    setHourlyForecast(data.hourlyForecast);
    setMapData(data.mapData);
    // Set weather effects data
    if (data.weatherCondition) {
      setWeatherCondition(data.weatherCondition);
    }
    if (data.currentTemp !== undefined) {
      setCurrentTemp(data.currentTemp);
    }
    if (data.currentWindSpeed !== undefined) {
      setCurrentWindSpeed(data.currentWindSpeed);
    }
    if (data.currentFeelsLike !== undefined) {
      setCurrentFeelsLike(data.currentFeelsLike);
    }
  };

  useEffect(() => {
    const street = profile?.street_address;
    const city = profile?.city;
    const state = profile?.state;
    const zip = profile?.zip_code;

    const locationParts = [street, city, state, zip].filter(Boolean);

    if (locationParts.length > 0) {
      setCurrentLocation(locationParts.join(", "));
      return;
    }

    // If user hasn't provided a location yet, default to Richmond, TX.
    setCurrentLocation((prev) => prev || DEFAULT_LOCATION);
  }, [profile]);

  useEffect(() => {
    if (currentLocation) {
      fetchWeatherData(currentLocation);
    }
  }, [currentLocation]);

  const allWeatherData = {
    windData,
    uvData,
    sunriseSunset,
    timeZone,
    humidData,
    AQI,
    feelsLikeData,
    visibilityData,
    pressureData,
    cloudCoverData,
    currentConditions,
  };

  const getAvailableOptions = (slotId, isTop) => {
    const options = isTop ? TOP_CARD_OPTIONS : BOTTOM_CARD_OPTIONS;
    const currentSlots = cardSlots;

    // Get all currently selected values
    const selectedValues = Object.values(currentSlots);

    // Filter options: keep the one currently in this slot, or ones not selected anywhere else
    return options.filter(
      (opt) =>
        opt.value === currentSlots[slotId] ||
        !selectedValues.includes(opt.value)
    );
  };

  return (
    <div className="weather-dashboard">
      {/* Weather Effects Overlay */}
      <WeatherEffects
        condition={weatherCondition}
        temperature={currentTemp}
        windSpeed={currentWindSpeed}
        feelsLike={currentFeelsLike}
      />

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
        timezone={timeZone.time_zone}
        sunData={sunriseSunset}
        hourlyForecast={hourlyForecast}
        isLoadingWeather={isLoading}
      />
      {/* Today's Highlights */}
      <div className={`highlights-container ${isLoading ? "skeleton" : ""}`}>
        <h3>Today's Highlights</h3>
        <div className="highlights">
          <CardSlot
            slotId="slot1"
            type={cardSlots.slot1}
            data={allWeatherData}
            onChange={handleCardChange}
            onCardClick={handleCardClick}
            options={[]}
          />
          <CardSlot
            slotId="slot2"
            type={cardSlots.slot2}
            data={allWeatherData}
            onChange={handleCardChange}
            onCardClick={handleCardClick}
            options={[]}
          />
          <CardSlot
            slotId="slot3"
            type={cardSlots.slot3}
            data={allWeatherData}
            onChange={handleCardChange}
            onCardClick={handleCardClick}
            options={[]}
          />
          <CardSlot
            slotId="slot4"
            type={cardSlots.slot4}
            data={allWeatherData}
            onChange={handleCardChange}
            onCardClick={handleCardClick}
            options={getAvailableOptions("slot4", false)}
          />
          <CardSlot
            slotId="slot5"
            type={cardSlots.slot5}
            data={allWeatherData}
            onChange={handleCardChange}
            onCardClick={handleCardClick}
            options={getAvailableOptions("slot5", false)}
          />
          <CardSlot
            slotId="slot6"
            type={cardSlots.slot6}
            data={allWeatherData}
            onChange={handleCardChange}
            onCardClick={handleCardClick}
            options={getAvailableOptions("slot6", false)}
          />
        </div>
      </div>
      {/* 10 Day Forecast */}
      <div className={`forecast ${isLoading ? "skeleton" : ""}`}>
        <h3>10-Day Forecast</h3>
        <Forecast forecast={forecastData} />
      </div>
      <WeatherModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalContent.title}
        data={modalContent.data}
      />
    </div>
  );
};

export default Weather;
