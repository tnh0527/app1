import "./Weather.css";
import "../../components/shared/LoadingStates/LoadingStates.css";
import SearchModal from "../../components/Weather/SearchModal";
import CurrentWeather from "../../components/Weather/CurrentWeather";
import Forecast from "../../components/Weather/Forecast";
import CardSlot from "../../components/Weather/CardSlot";
import WeatherModal from "../../components/Weather/WeatherModal";
import SavedLocations from "../../components/Weather/SavedLocations";
import AdvancedWeatherMap from "../../components/Weather/AdvancedWeatherMap";
import ErrorBoundary from "../../components/shared/ErrorBoundary";
import { useState, useEffect, useRef, useContext, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProfileContext } from "../../contexts/ProfileContext";
import { transformLocationInput } from "../../utils/capitalCities";
import api from "../../api/axios";
import {
  addSavedLocation,
  getSavedLocations,
} from "../../api/weatherLocationsApi";
import { useAutoRetry } from "../../utils/connectionHooks";
import {
  getCache,
  setCache,
  getWeatherCacheKey,
} from "../../utils/sessionCache";

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

const WeatherContent = () => {
  const { location: urlLocation } = useParams();
  const navigate = useNavigate();

  // Decode URL location parameter (replace hyphens with spaces, commas, etc.)
  const decodeLocation = (encoded) => {
    if (!encoded) return null;
    return decodeURIComponent(encoded).replace(/-/g, " ");
  };

  const encodeLocation = (location) => {
    if (!location) return null;
    return encodeURIComponent(location).replace(/%20/g, "-");
  };

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
  const [currentLocation, setCurrentLocation] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [_weatherCondition, setWeatherCondition] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [_currentTemp, setCurrentTemp] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [_currentWindSpeed, setCurrentWindSpeed] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [_currentFeelsLike, setCurrentFeelsLike] = useState(null);
  const { profile } = useContext(ProfileContext);

  // State for saved locations
  const [savedLocationsRefresh, setSavedLocationsRefresh] = useState(0);
  const [isLocationSaved, setIsLocationSaved] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [savedLocationsList, setSavedLocationsList] = useState([]);
  const [currentCoordinates, setCurrentCoordinates] = useState(null);

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
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const [currentConditions, setCurrentConditions] = useState({
    visibility: null,
    pressure: null,
    cloud_cover: null,
  });

  // Refs to prevent infinite loops
  const isInitialMount = useRef(true);
  const isNavigatingRef = useRef(false);
  const hasUrlLocationRef = useRef(false); // Track if URL had a location on mount

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
    const transformedLocation = transformLocationInput(suggestion);
    setCurrentLocation(transformedLocation);
    setSuggestions([]);
  };
  // eslint-disable-next-line no-unused-vars
  const _handleBlur = () => {
    setTimeout(() => {
      setSuggestions([]);
      setLocationSuggestions("");
    }, 100); // Adding a slight delay to ensure click event is captured
  };

  const handleSearchClick = () => {
    setSearchModalOpen(true);
  };

  // Fetch saved locations to check if current location is saved
  const fetchSavedLocations = useCallback(async () => {
    try {
      const locations = await getSavedLocations();
      setSavedLocationsList(locations);
    } catch (error) {
      console.error("Failed to fetch saved locations:", error);
    }
  }, []);

  useEffect(() => {
    fetchSavedLocations();
  }, [savedLocationsRefresh, fetchSavedLocations]);

  // Retry saved locations fetch when connection restored
  // Import useAutoRetry at top and use it below

  // Check if current location is already saved
  useEffect(() => {
    if (currentLocation && savedLocationsList.length > 0) {
      const isSaved = savedLocationsList.some(
        (loc) => loc.name.toLowerCase() === currentLocation.toLowerCase()
      );
      setIsLocationSaved(isSaved);
    } else {
      setIsLocationSaved(false);
    }
  }, [currentLocation, savedLocationsList]);

  // Validate location name
  const validateLocationName = (name) => {
    if (!name || typeof name !== "string")
      return { valid: false, error: "Location name is required" };

    const trimmed = name.trim();
    if (trimmed.length < 2)
      return {
        valid: false,
        error: "Location name must be at least 2 characters",
      };
    if (trimmed.length > 255)
      return { valid: false, error: "Location name is too long" };

    // Check for suspicious patterns
    const suspiciousPatterns = /<script|javascript:|data:|on\w+=/i;
    if (suspiciousPatterns.test(trimmed)) {
      return { valid: false, error: "Invalid location name" };
    }

    return { valid: true, name: trimmed };
  };

  // Validate coordinates
  const validateCoordinates = (coords) => {
    if (!coords || typeof coords !== "object")
      return { valid: false, error: "Invalid coordinates" };

    const { lat, lng } = coords;

    // Latitude must be between -90 and 90
    if (typeof lat !== "number" || lat < -90 || lat > 90) {
      return { valid: false, error: "Invalid latitude" };
    }

    // Longitude must be between -180 and 180
    if (typeof lng !== "number" || lng < -180 || lng > 180) {
      return { valid: false, error: "Invalid longitude" };
    }

    return { valid: true };
  };

  // Handle save current location
  const handleSaveLocation = async () => {
    if (!currentLocation || isLocationSaved || isSavingLocation) return;

    // Validate location name
    const nameValidation = validateLocationName(currentLocation);
    if (!nameValidation.valid) {
      alert(nameValidation.error);
      return;
    }

    // Check if we've reached the maximum (5 locations)
    if (savedLocationsList.length >= 5) {
      alert(
        "Maximum 5 locations can be saved. Please remove one to add a new location."
      );
      return;
    }

    setIsSavingLocation(true);
    try {
      // Get coordinates from current weather data
      let coordinates = currentCoordinates;

      if (!coordinates && mapData?.features?.[0]?.geometry?.coordinates) {
        const [lng, lat] = mapData.features[0].geometry.coordinates;
        coordinates = { lat, lng };
      }

      if (!coordinates) {
        // Fetch fresh coordinates using axios
        try {
          const response = await api.get("/api/weather/", {
            params: { location: nameValidation.name },
          });
          if (response.data.coordinates) {
            coordinates = response.data.coordinates;
          }
        } catch (err) {
          console.error("Failed to fetch coordinates:", err);
        }
      }

      // Validate coordinates before saving
      const coordValidation = validateCoordinates(coordinates);
      if (!coordValidation.valid) {
        alert("Could not get valid location coordinates. Please try again.");
        setIsSavingLocation(false);
        return;
      }

      if (coordinates) {
        const locationData = {
          name: nameValidation.name,
          latitude: parseFloat(coordinates.lat.toFixed(6)),
          longitude: parseFloat(coordinates.lng.toFixed(6)),
          is_primary: savedLocationsList.length === 0,
        };

        await addSavedLocation(locationData);
        setIsLocationSaved(true);
        // Trigger refresh of saved locations component
        setSavedLocationsRefresh((prev) => prev + 1);
      } else {
        alert("Could not get location coordinates. Please try again.");
      }
    } catch (error) {
      console.error("Failed to save location:", error);
      if (error.response?.data?.name) {
        alert(error.response.data.name[0] || "Location already saved.");
      } else {
        alert("Failed to save location. Please try again.");
      }
    } finally {
      setIsSavingLocation(false);
    }
  };

  // Handle clicking on a saved location
  const handleSavedLocationClick = (locationName) => {
    const transformedLocation = transformLocationInput(locationName);
    setCurrentLocation(transformedLocation);
  };

  // Check if user has home address in profile
  const hasHomeAddress = !!(
    profile?.street_address ||
    profile?.city ||
    profile?.state ||
    profile?.zip_code
  );

  // Handle Home button click - navigate to profile address
  const handleHomeClick = () => {
    if (!hasHomeAddress) return;

    const street = profile?.street_address;
    const city = profile?.city;
    const state = profile?.state;
    const zip = profile?.zip_code;

    const locationParts = [street, city, state, zip].filter(Boolean);
    if (locationParts.length > 0) {
      const profileLocation = locationParts.join(", ");
      setCurrentLocation(profileLocation);
    }
  };

  // Helper
  const convertTemperature = (value, unit) => {
    // Ensure we return a Number (not a string) so callers can reliably
    // compare numeric values and avoid visual flicker when toggling units.
    if (value === null || value === undefined || value === "") return value;
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    const result =
      unit === "C"
        ? (num * 9) / 5 + 32 // C -> F
        : ((num - 32) * 5) / 9; // F -> C
    // Keep one decimal of precision but return a Number
    return parseFloat(result.toFixed(1));
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
    // Validate input
    const trimmedInput = input?.trim();
    if (!trimmedInput) {
      setSuggestions([]);
      return;
    }

    // Input validation: min 2 characters, max 100 characters
    if (trimmedInput.length < 2) {
      setSuggestions([]);
      return;
    }

    if (trimmedInput.length > 100) {
      console.warn("Search input too long, truncating...");
      return;
    }

    // Basic XSS prevention - reject suspicious patterns
    const suspiciousPatterns = /<script|javascript:|data:|on\w+=/i;
    if (suspiciousPatterns.test(trimmedInput)) {
      console.warn("Suspicious input detected");
      setSuggestions([]);
      return;
    }

    try {
      const response = await api.get("/api/place/", {
        params: { input: trimmedInput },
      });
      const suggestionsArray = response.data.suggestions || [];
      const descriptions = suggestionsArray.map(
        (suggestion) => suggestion.description
      );
      setSuggestions(descriptions);
    } catch (error) {
      console.error("Error fetching location suggestions:", error);
      setSuggestions([]);
    }
  };

  /* eslint-disable react-hooks/exhaustive-deps */
  const fetchWeatherData = useCallback(
    async (location, forceRefresh = false) => {
      if (!location) {
        return;
      }
      setIsLoading(true);

      const sessionCacheKey = getWeatherCacheKey(location);

      // Check session cache first (fastest, within-session navigation)
      if (!forceRefresh) {
        const sessionCachedData = getCache(sessionCacheKey);
        if (sessionCachedData) {
          setWeatherStates(sessionCachedData);
          setIsLoading(false);
          return;
        }
      }

      // Check for localStorage cached data (120min expiration)
      try {
        const cachedData = getCachedWeatherData(location);
        // Ensure cache has the new 'currentConditions' and 'hourlyForecast' fields
        if (
          !forceRefresh &&
          cachedData &&
          cachedData.currentConditions &&
          cachedData.hourlyForecast
        ) {
          setWeatherStates(cachedData);
          // Also store in session cache for faster subsequent loads
          setCache(sessionCacheKey, cachedData);
          setIsLoading(false);
          return;
        }
        // Fetch fresh data using axios
        const response = await api.get("/api/weather/", {
          params: { location },
        });
        const weatherData = response.data;

        // Store coordinates for save location feature
        if (weatherData.coordinates) {
          setCurrentCoordinates(weatherData.coordinates);
        }

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
        // Prepare cache data object
        const cacheData = {
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
        };

        // Cache in both localStorage (long-term) and session cache (navigation)
        cacheWeatherData(location, cacheData);
        setCache(sessionCacheKey, cacheData);
      } catch (error) {
        console.error("Error fetching weather data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Retry current weather fetch when connection is restored
  const retryFetchCurrentWeather = useCallback(() => {
    if (currentLocation) {
      fetchWeatherData(currentLocation);
    }
  }, [currentLocation, fetchWeatherData]);

  useAutoRetry(retryFetchCurrentWeather, [currentLocation], { enabled: true });

  // Retry saved locations fetch when connection restored
  useAutoRetry(fetchSavedLocations, [savedLocationsRefresh], { enabled: true });

  /* eslint-enable react-hooks/exhaustive-deps */

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

  // Initialize from URL on mount
  useEffect(() => {
    if (!isInitialMount.current) return;

    const decodedUrlLoc = decodeLocation(urlLocation);

    if (decodedUrlLoc) {
      // URL has location - use it (e.g., browser reload or direct navigation)
      hasUrlLocationRef.current = true; // Mark that we have a URL location
      setCurrentLocation(decodedUrlLoc);
      isInitialMount.current = false;
    } else {
      // No URL location - detect location using IP first, then browser geolocation
      hasUrlLocationRef.current = false;

      const detectLocation = async () => {
        let detectedLocation = null;

        // Try IP-based lookup first
        try {
          const ipResponse = await fetch("https://ipapi.co/json/");
          const ipData = await ipResponse.json();

          if (ipData.city && ipData.region && ipData.country_name) {
            detectedLocation = `${ipData.city}, ${ipData.region}, ${ipData.country_name}`;
          }
        } catch (error) {
          console.warn("IP-based location detection failed:", error);
        }

        // If IP lookup failed, try browser geolocation as fallback
        if (!detectedLocation && "geolocation" in navigator) {
          try {
            const pos = await new Promise((resolve, reject) => {
              const opts = { timeout: 10000, maximumAge: 300000 };
              navigator.geolocation.getCurrentPosition(resolve, reject, opts);
            });

            // Reverse geocode to get location name
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
            );
            const geoData = await geoResponse.json();
            const city =
              geoData.address?.city ||
              geoData.address?.town ||
              geoData.address?.village ||
              "";
            const state = geoData.address?.state || "";
            const country = geoData.address?.country || "";

            if (city && state && country) {
              detectedLocation = `${city}, ${state}, ${country}`;
            } else if (city && country) {
              detectedLocation = `${city}, ${country}`;
            }
          } catch (error) {
            console.warn("Browser geolocation detection failed:", error);
          }
        }

        // If both methods failed, open search modal for user input
        if (detectedLocation) {
          setCurrentLocation(detectedLocation);
          const encodedLoc = encodeLocation(detectedLocation);
          isNavigatingRef.current = true;
          navigate(`/weather/${encodedLoc}`, { replace: true });
        } else {
          // No location detected - prompt user to search
          setSearchModalOpen(true);
        }
        isInitialMount.current = false;
      };

      detectLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen to URL changes for browser back/forward navigation
  useEffect(() => {
    if (isInitialMount.current) return;
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    const decodedUrlLoc = decodeLocation(urlLocation);
    const normalize = (s) =>
      (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

    if (
      decodedUrlLoc &&
      normalize(decodedUrlLoc) !== normalize(currentLocation)
    ) {
      setCurrentLocation(decodedUrlLoc);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLocation]);

  // Sync to URL when location state changes (user clicks saved location, searches, etc.)
  useEffect(() => {
    if (isInitialMount.current || !currentLocation) return;

    const encodedLoc = encodeLocation(currentLocation);
    const decodedUrlLoc = decodeLocation(urlLocation);
    const encodedUrlLoc = encodeLocation(decodedUrlLoc || "");

    // Only navigate if encoded locations differ
    if (encodedLoc && encodedLoc !== encodedUrlLoc) {
      isNavigatingRef.current = true;
      navigate(`/weather/${encodedLoc}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation]);

  // Fetch weather data when location changes
  useEffect(() => {
    if (currentLocation && !isInitialMount.current) {
      fetchWeatherData(currentLocation);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation]);

  // Update from profile (only if NO URL location was provided on mount)
  // This allows profile to set default location, but won't override user navigation
  useEffect(() => {
    if (isInitialMount.current) return;

    // Don't override if user navigated to a specific location via URL
    if (hasUrlLocationRef.current) return;

    const street = profile?.street_address;
    const city = profile?.city;
    const state = profile?.state;
    const zip = profile?.zip_code;

    const locationParts = [street, city, state, zip].filter(Boolean);

    if (locationParts.length > 0) {
      const profileLocation = locationParts.join(", ");
      const normalize = (s) =>
        (s || "").toString().trim().toLowerCase().replace(/\s+/g, " ");

      if (normalize(profileLocation) !== normalize(currentLocation)) {
        setCurrentLocation(profileLocation);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

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
    <div className="main-content">
      <div className="weather-page-wrapper">
        <div className="weather-dashboard">
          {/* Search Modal */}
          <SearchModal
            isOpen={searchModalOpen}
            onClose={() => setSearchModalOpen(false)}
            location={locationSuggestions}
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            suggestions={suggestions}
            handleSuggestionClick={handleSuggestionClick}
          />
          {/* Saved locations top-right */}
          <div className="top-right-row">
            <SavedLocations
              currentLocation={currentLocation}
              onLocationSelect={handleSavedLocationClick}
              refreshTrigger={savedLocationsRefresh}
            />
          </div>
          {/* Current Weather */}
          <CurrentWeather
            currentWeather={currentWeather}
            setCurrentWeather={setCurrentWeather}
            location={currentLocation}
            dailyTemps={dailyTemps}
            handleToggle={handleToggle}
            mapData={mapData}
            timezone={timeZone?.time_zone || "UTC"}
            sunData={sunriseSunset}
            hourlyForecast={hourlyForecast}
            isLoadingWeather={isLoading}
            onSaveLocation={handleSaveLocation}
            isLocationSaved={isLocationSaved}
            isSavingLocation={isSavingLocation}
            onSearchClick={handleSearchClick}
            onHomeClick={handleHomeClick}
            hasHomeAddress={hasHomeAddress}
          />
          {/* Today's Highlights */}
          <div className="highlights-container">
            <h3>Today&apos;s Highlights</h3>
            <div className="highlights">
              <CardSlot
                slotId="slot1"
                type={cardSlots.slot1}
                data={allWeatherData}
                onChange={handleCardChange}
                onCardClick={handleCardClick}
                isLoading={isLoading}
                options={[]}
              />
              <CardSlot
                slotId="slot2"
                type={cardSlots.slot2}
                data={allWeatherData}
                onChange={handleCardChange}
                onCardClick={handleCardClick}
                isLoading={isLoading}
                options={[]}
              />
              <CardSlot
                slotId="slot3"
                type={cardSlots.slot3}
                data={allWeatherData}
                onChange={handleCardChange}
                onCardClick={handleCardClick}
                isLoading={isLoading}
                options={[]}
              />
              <CardSlot
                slotId="slot4"
                type={cardSlots.slot4}
                data={allWeatherData}
                onChange={handleCardChange}
                onCardClick={handleCardClick}
                isLoading={isLoading}
                options={getAvailableOptions("slot4", false)}
              />
              <CardSlot
                slotId="slot5"
                type={cardSlots.slot5}
                data={allWeatherData}
                onChange={handleCardChange}
                onCardClick={handleCardClick}
                isLoading={isLoading}
                options={getAvailableOptions("slot5", false)}
              />
              <CardSlot
                slotId="slot6"
                type={cardSlots.slot6}
                data={allWeatherData}
                onChange={handleCardChange}
                onCardClick={handleCardClick}
                isLoading={isLoading}
                options={getAvailableOptions("slot6", false)}
              />
            </div>
          </div>
          {/* 10 Day Forecast */}
          <div className="forecast">
            <h3>10-Day Forecast</h3>
            <Forecast forecast={forecastData} isLoading={isLoading} />
          </div>
          {/* Advanced Weather Map - Radar & Analysis */}
          <div className="advanced-map-section">
            <AdvancedWeatherMap
              mapData={mapData}
              weatherData={currentWeather}
              windData={windData}
              airQualityData={AQI}
            />
          </div>
          <WeatherModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title={modalContent.title}
            data={modalContent.data}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Weather - Main page component
 * Includes ErrorBoundary for graceful error handling
 */
const Weather = () => {
  return (
    <ErrorBoundary pageName="Weather">
      <WeatherContent />
    </ErrorBoundary>
  );
};

export default Weather;
