"""
Weather Service with Multi-API Fallback and Caching

API Priority (based on accuracy, free tier, and data availability):
1. Open-Meteo (Primary) - Unlimited free for non-commercial, excellent accuracy
2. Tomorrow.io (1st Fallback) - 500 calls/day, hyperlocal accuracy, 80+ data fields
3. VisualCrossing (2nd Fallback) - 1,000 records/day, comprehensive historical
4. OpenWeatherMap (3rd Fallback) - 1,000 calls/day, good for map tiles

Air Quality Priority:
1. WAQI - Detailed station-based AQI with forecasts
2. Open-Meteo Air Quality - Fallback for AQI/UV

Location Services:
- Google Geocoding, Timezone, Places
"""

import requests
import hashlib
import logging
from datetime import datetime, timedelta
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)


class WeatherAPIService:
    """Centralized weather service with caching and multi-API fallbacks"""

    # Weather code mappings for different APIs
    TOMORROW_IO_CODES = {
        0: "Unknown",
        1000: "Clear",
        1001: "Cloudy",
        1100: "Mostly Clear",
        1101: "Partly Cloudy",
        1102: "Mostly Cloudy",
        2000: "Fog",
        2100: "Light Fog",
        3000: "Light Wind",
        3001: "Wind",
        3002: "Strong Wind",
        4000: "Drizzle",
        4001: "Rain",
        4200: "Light Rain",
        4201: "Heavy Rain",
        5000: "Snow",
        5001: "Flurries",
        5100: "Light Snow",
        5101: "Heavy Snow",
        6000: "Freezing Drizzle",
        6001: "Freezing Rain",
        6200: "Light Freezing Rain",
        6201: "Heavy Freezing Rain",
        7000: "Ice Pellets",
        7101: "Heavy Ice Pellets",
        7102: "Light Ice Pellets",
        8000: "Thunderstorm",
    }

    def __init__(self):
        self.apis = {
            "open_meteo": {
                "name": "Open-Meteo",
                "daily_limit": float("inf"),  # Unlimited for non-commercial
                "priority": 1,
            },
            "tomorrow_io": {
                "name": "Tomorrow.io",
                "daily_limit": 500,
                "priority": 2,
                "api_key": getattr(settings, "TOMORROWIO_API_KEY", ""),
            },
            "visual_crossing": {
                "name": "VisualCrossing",
                "daily_limit": 1000,
                "priority": 3,
                "api_key": getattr(settings, "VISUALCROSSING_API_KEY", ""),
            },
            "openweather": {
                "name": "OpenWeatherMap",
                "daily_limit": 1000,
                "priority": 4,
                "api_key": getattr(settings, "OPENWEATHER_API_KEY", ""),
            },
        }

        self.waqi_api_key = getattr(settings, "WAQI_API_KEY", "")
        self.cache_ttls = getattr(
            settings,
            "WEATHER_CACHE_TTL",
            {
                "forecast": 900,
                "current": 300,
                "air_quality": 1800,
                "geocode": 86400,
                "timezone": 86400,
            },
        )

    def _get_cache_key(self, prefix, *args):
        """Generate a cache key from prefix and arguments"""
        key_string = f"{prefix}:{':'.join(str(a) for a in args)}"
        return hashlib.md5(key_string.encode()).hexdigest()

    def _get_cached(self, cache_key):
        """Get cached data if available"""
        return cache.get(cache_key)

    def _set_cache(self, cache_key, data, ttl_type="forecast"):
        """Set cache with appropriate TTL"""
        ttl = self.cache_ttls.get(ttl_type, 900)
        cache.set(cache_key, data, ttl)

    # ==================== WEATHER DATA METHODS ====================

    def get_weather_data(self, lat, lng):
        """
        Get weather data with intelligent fallback chain.
        Returns normalized weather data from the first successful API.
        """
        cache_key = self._get_cache_key("weather", round(lat, 3), round(lng, 3))
        cached = self._get_cached(cache_key)
        if cached:
            logger.info(f"Weather cache hit for {lat}, {lng}")
            return cached

        # Try APIs in priority order
        fetchers = [
            ("open_meteo", self.fetch_open_meteo),
            ("tomorrow_io", self.fetch_tomorrow_io),
            ("visual_crossing", self.fetch_visual_crossing),
            ("openweather", self.fetch_openweather),
        ]

        for api_name, fetcher in fetchers:
            try:
                data = fetcher(lat, lng)
                if data:
                    data["source"] = self.apis[api_name]["name"]
                    self._set_cache(cache_key, data, "forecast")
                    logger.info(f"Weather data fetched from {api_name}")
                    return data
            except Exception as e:
                logger.warning(f"Failed to fetch from {api_name}: {e}")
                continue

        logger.error("All weather APIs failed")
        return None

    def fetch_open_meteo(self, lat, lng):
        """Fetch from Open-Meteo API (Primary - unlimited free)"""
        url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lng}"
            f"&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,weather_code,"
            f"wind_speed_10m,wind_direction_10m,visibility,surface_pressure,cloud_cover,is_day"
            f"&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,"
            f"precipitation_sum,precipitation_probability_max,wind_speed_10m_max"
            f"&minutely_15=temperature_2m,precipitation,weather_code,apparent_temperature,"
            f"is_day,visibility,surface_pressure,cloud_cover"
            f"&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=10"
        )

        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        return self._normalize_open_meteo(data)

    def _normalize_open_meteo(self, data):
        """Normalize Open-Meteo data to standard format"""
        from .weather_codes import weather_code_descriptions

        hourly_data = data.get("hourly", {})
        times = hourly_data.get("time", [])[:48]

        hourly_weather_data = [
            {
                "time": times[i],
                "temperature": hourly_data.get("temperature_2m", [None] * 48)[i],
                "humidity": hourly_data.get("relative_humidity_2m", [None] * 48)[i],
                "dew_point": hourly_data.get("dew_point_2m", [None] * 48)[i],
                "weather_code": weather_code_descriptions.get(
                    hourly_data.get("weather_code", [0] * 48)[i], "Unknown"
                ),
                "wind_speed": hourly_data.get("wind_speed_10m", [None] * 48)[i],
                "wind_direction": hourly_data.get("wind_direction_10m", [None] * 48)[i],
                "visibility": hourly_data.get("visibility", [None] * 48)[i],
                "pressure": hourly_data.get("surface_pressure", [None] * 48)[i],
                "cloud_cover": hourly_data.get("cloud_cover", [None] * 48)[i],
                "is_day": hourly_data.get("is_day", [1] * 48)[i],
            }
            for i in range(min(48, len(times)))
        ]

        daily_data = data.get("daily", {})
        daily_times = daily_data.get("time", [])

        daily_weather_data = [
            {
                "date": daily_times[i],
                "weather_code": weather_code_descriptions.get(
                    daily_data.get("weather_code", [0] * 10)[i], "Unknown"
                ),
                "max_temperature": daily_data.get("temperature_2m_max", [None] * 10)[i],
                "min_temperature": daily_data.get("temperature_2m_min", [None] * 10)[i],
                "sunrise": daily_data.get("sunrise", [None] * 10)[i],
                "sunset": daily_data.get("sunset", [None] * 10)[i],
                "precipitation": daily_data.get("precipitation_sum", [0] * 10)[i],
                "precipitation_probability": daily_data.get(
                    "precipitation_probability_max", [0] * 10
                )[i],
                "wind_speed_max": daily_data.get("wind_speed_10m_max", [None] * 10)[i],
            }
            for i in range(len(daily_times))
        ]

        # 15-minute data
        minutely_15_data = data.get("minutely_15", {})
        minutely_times = minutely_15_data.get("time", [])[:96]

        minutely_weather_data = [
            {
                "time": minutely_times[i],
                "temperature": minutely_15_data.get("temperature_2m", [None] * 96)[i],
                "precipitation": minutely_15_data.get("precipitation", [0] * 96)[i],
                "weather_code": weather_code_descriptions.get(
                    minutely_15_data.get("weather_code", [0] * 96)[i], "Unknown"
                ),
                "is_day": minutely_15_data.get("is_day", [1] * 96)[i],
                "apparent_temperature": minutely_15_data.get(
                    "apparent_temperature", [None] * 96
                )[i],
                "visibility": minutely_15_data.get("visibility", [None] * 96)[i],
                "pressure": minutely_15_data.get("surface_pressure", [None] * 96)[i],
                "cloud_cover": minutely_15_data.get("cloud_cover", [None] * 96)[i],
            }
            for i in range(min(96, len(minutely_times)))
        ]

        return {
            "hourly": hourly_weather_data,
            "daily": daily_weather_data,
            "minutely_15": minutely_weather_data,
        }

    def fetch_tomorrow_io(self, lat, lng):
        """Fetch from Tomorrow.io API (1st Fallback - hyperlocal accuracy)"""
        api_key = self.apis["tomorrow_io"].get("api_key")
        if not api_key:
            return None

        # Timeline API for comprehensive data
        url = (
            f"https://api.tomorrow.io/v4/timelines?"
            f"location={lat},{lng}"
            f"&fields=temperature,temperatureApparent,humidity,dewPoint,weatherCode,"
            f"windSpeed,windDirection,visibility,pressureSurfaceLevel,cloudCover,"
            f"precipitationProbability,precipitationIntensity,uvIndex"
            f"&timesteps=1h,1d"
            f"&units=imperial"
            f"&apikey={api_key}"
        )

        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        return self._normalize_tomorrow_io(data)

    def _normalize_tomorrow_io(self, data):
        """Normalize Tomorrow.io data to standard format"""
        timelines = data.get("data", {}).get("timelines", [])

        hourly_data = []
        daily_data = []

        for timeline in timelines:
            timestep = timeline.get("timestep")
            intervals = timeline.get("intervals", [])

            if timestep == "1h":
                for interval in intervals[:48]:
                    values = interval.get("values", {})
                    hourly_data.append(
                        {
                            "time": interval.get("startTime", "")[:19].replace(
                                "T", " "
                            ),
                            "temperature": values.get("temperature"),
                            "humidity": values.get("humidity"),
                            "dew_point": values.get("dewPoint"),
                            "weather_code": self.TOMORROW_IO_CODES.get(
                                values.get("weatherCode", 0), "Unknown"
                            ),
                            "wind_speed": values.get("windSpeed"),
                            "wind_direction": values.get("windDirection"),
                            "visibility": values.get("visibility"),
                            "pressure": values.get("pressureSurfaceLevel"),
                            "cloud_cover": values.get("cloudCover"),
                            "is_day": 1,  # Tomorrow.io doesn't provide this directly
                            "uv_index": values.get("uvIndex"),
                        }
                    )

            elif timestep == "1d":
                for interval in intervals[:10]:
                    values = interval.get("values", {})
                    start_time = interval.get("startTime", "")[:10]
                    daily_data.append(
                        {
                            "date": start_time,
                            "weather_code": self.TOMORROW_IO_CODES.get(
                                values.get("weatherCode", 0), "Unknown"
                            ),
                            "max_temperature": values.get(
                                "temperatureMax", values.get("temperature")
                            ),
                            "min_temperature": values.get(
                                "temperatureMin", values.get("temperature")
                            ),
                            "sunrise": None,  # Tomorrow.io free tier doesn't include this
                            "sunset": None,
                            "precipitation_probability": values.get(
                                "precipitationProbability", 0
                            ),
                        }
                    )

        return {
            "hourly": hourly_data,
            "daily": daily_data,
            "minutely_15": [],  # Tomorrow.io doesn't provide 15-min data in free tier
        }

    def fetch_visual_crossing(self, lat, lng):
        """Fetch from VisualCrossing API (2nd Fallback - comprehensive)"""
        api_key = self.apis["visual_crossing"].get("api_key")
        if not api_key:
            return None

        url = (
            f"https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/"
            f"{lat},{lng}?unitGroup=us&include=hours,days"
            f"&key={api_key}&contentType=json"
        )

        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        return self._normalize_visual_crossing(data)

    def _normalize_visual_crossing(self, data):
        """Normalize VisualCrossing data to standard format"""
        days = data.get("days", [])

        hourly_data = []
        daily_data = []

        # Collect hourly data from each day
        for day in days[:2]:  # First 2 days = 48 hours
            hours = day.get("hours", [])
            for hour in hours:
                hourly_data.append(
                    {
                        "time": f"{day.get('datetime')} {hour.get('datetime')}",
                        "temperature": hour.get("temp"),
                        "humidity": hour.get("humidity"),
                        "dew_point": hour.get("dew"),
                        "weather_code": hour.get("conditions", "Unknown"),
                        "wind_speed": hour.get("windspeed"),
                        "wind_direction": hour.get("winddir"),
                        "visibility": hour.get("visibility"),
                        "pressure": hour.get("pressure"),
                        "cloud_cover": hour.get("cloudcover"),
                        "is_day": (
                            1
                            if hour.get("datetime", "12:00:00") > "06:00:00"
                            and hour.get("datetime", "12:00:00") < "20:00:00"
                            else 0
                        ),
                    }
                )

        # Collect daily data
        for day in days[:10]:
            daily_data.append(
                {
                    "date": day.get("datetime"),
                    "weather_code": day.get("conditions", "Unknown"),
                    "max_temperature": day.get("tempmax"),
                    "min_temperature": day.get("tempmin"),
                    "sunrise": day.get("sunrise"),
                    "sunset": day.get("sunset"),
                    "precipitation": day.get("precip", 0),
                    "precipitation_probability": day.get("precipprob", 0),
                }
            )

        return {
            "hourly": hourly_data[:48],
            "daily": daily_data,
            "minutely_15": [],  # VisualCrossing doesn't provide 15-min data
        }

    def fetch_openweather(self, lat, lng):
        """Fetch from OpenWeatherMap API (3rd Fallback)"""
        api_key = self.apis["openweather"].get("api_key")
        if not api_key:
            return None

        # One Call API 3.0
        url = (
            f"https://api.openweathermap.org/data/3.0/onecall?"
            f"lat={lat}&lon={lng}"
            f"&exclude=minutely,alerts"
            f"&units=imperial"
            f"&appid={api_key}"
        )

        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        return self._normalize_openweather(data)

    def _normalize_openweather(self, data):
        """Normalize OpenWeatherMap data to standard format"""
        hourly = data.get("hourly", [])
        daily = data.get("daily", [])

        hourly_data = [
            {
                "time": datetime.fromtimestamp(hour.get("dt", 0)).strftime(
                    "%Y-%m-%d %H:%M"
                ),
                "temperature": hour.get("temp"),
                "humidity": hour.get("humidity"),
                "dew_point": hour.get("dew_point"),
                "weather_code": hour.get("weather", [{}])[0].get(
                    "description", "Unknown"
                ),
                "wind_speed": hour.get("wind_speed"),
                "wind_direction": hour.get("wind_deg"),
                "visibility": (
                    hour.get("visibility", 10000) / 1000
                    if hour.get("visibility")
                    else None
                ),
                "pressure": hour.get("pressure"),
                "cloud_cover": hour.get("clouds"),
                "is_day": (
                    1
                    if hour.get("dt", 0) > data.get("current", {}).get("sunrise", 0)
                    and hour.get("dt", 0) < data.get("current", {}).get("sunset", 86400)
                    else 0
                ),
            }
            for hour in hourly[:48]
        ]

        daily_data = [
            {
                "date": datetime.fromtimestamp(day.get("dt", 0)).strftime("%Y-%m-%d"),
                "weather_code": day.get("weather", [{}])[0].get(
                    "description", "Unknown"
                ),
                "max_temperature": day.get("temp", {}).get("max"),
                "min_temperature": day.get("temp", {}).get("min"),
                "sunrise": datetime.fromtimestamp(day.get("sunrise", 0)).strftime(
                    "%Y-%m-%dT%H:%M"
                ),
                "sunset": datetime.fromtimestamp(day.get("sunset", 0)).strftime(
                    "%Y-%m-%dT%H:%M"
                ),
                "precipitation": day.get("rain", 0) + day.get("snow", 0),
                "precipitation_probability": day.get("pop", 0) * 100,
            }
            for day in daily[:10]
        ]

        return {
            "hourly": hourly_data,
            "daily": daily_data,
            "minutely_15": [],
        }

    # ==================== AIR QUALITY METHODS ====================

    def get_air_quality_data(self, lat, lng):
        """
        Get air quality data with WAQI as primary, Open-Meteo as fallback.
        WAQI provides detailed station-based AQI with forecasts.
        """
        cache_key = self._get_cache_key("aqi", round(lat, 3), round(lng, 3))
        cached = self._get_cached(cache_key)
        if cached:
            logger.info(f"AQI cache hit for {lat}, {lng}")
            return cached

        # Try WAQI first (more detailed station data)
        try:
            data = self.fetch_waqi(lat, lng)
            if data:
                data["source"] = "WAQI"
                self._set_cache(cache_key, data, "air_quality")
                logger.info("AQI data fetched from WAQI")
                return data
        except Exception as e:
            logger.warning(f"WAQI failed: {e}")

        # Fallback to Open-Meteo Air Quality
        try:
            data = self.fetch_open_meteo_aqi(lat, lng)
            if data:
                data["source"] = "Open-Meteo"
                self._set_cache(cache_key, data, "air_quality")
                logger.info("AQI data fetched from Open-Meteo")
                return data
        except Exception as e:
            logger.warning(f"Open-Meteo AQI failed: {e}")

        logger.error("All AQI APIs failed")
        return None

    def fetch_waqi(self, lat, lng):
        """Fetch from World Air Quality Index API (detailed station data)"""
        if not self.waqi_api_key:
            return None

        url = f"https://api.waqi.info/feed/geo:{lat};{lng}/?token={self.waqi_api_key}"

        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data.get("status") != "ok":
            return None

        feed_data = data.get("data", {})
        iaqi = feed_data.get("iaqi", {})
        forecast = feed_data.get("forecast", {}).get("daily", {})

        # Get current time for the AQI data
        current_time = datetime.now().strftime("%Y-%m-%dT%H:%M")

        # Extract pollutant data
        aqi_data = [
            {
                "time": current_time,
                "us_aqi": feed_data.get("aqi"),
                "pm25": iaqi.get("pm25", {}).get("v"),
                "pm10": iaqi.get("pm10", {}).get("v"),
                "o3": iaqi.get("o3", {}).get("v"),
                "no2": iaqi.get("no2", {}).get("v"),
                "so2": iaqi.get("so2", {}).get("v"),
                "co": iaqi.get("co", {}).get("v"),
            }
        ]

        # Add forecast data if available
        if forecast.get("o3") or forecast.get("pm25") or forecast.get("pm10"):
            for i, day in enumerate(forecast.get("o3", [])[:7]):
                forecast_entry = {
                    "time": day.get("day"),
                    "us_aqi": None,  # WAQI forecast doesn't include overall AQI
                    "o3_avg": day.get("avg"),
                    "o3_max": day.get("max"),
                    "o3_min": day.get("min"),
                }

                # Add PM2.5 forecast
                pm25_forecast = forecast.get("pm25", [])
                if i < len(pm25_forecast):
                    forecast_entry["pm25_avg"] = pm25_forecast[i].get("avg")
                    forecast_entry["pm25_max"] = pm25_forecast[i].get("max")

                # Add PM10 forecast
                pm10_forecast = forecast.get("pm10", [])
                if i < len(pm10_forecast):
                    forecast_entry["pm10_avg"] = pm10_forecast[i].get("avg")
                    forecast_entry["pm10_max"] = pm10_forecast[i].get("max")

                aqi_data.append(forecast_entry)

        # Get UV data from Open-Meteo since WAQI doesn't provide it
        uv_data = self._get_uv_from_open_meteo(lat, lng)

        # Supplement WAQI with Open-Meteo hourly AQI so the frontend has 24 points
        try:
            open_meteo = self.fetch_open_meteo_aqi(lat, lng)
            if open_meteo and open_meteo.get("aqi_data"):
                # Prefer higher-resolution hourly series (keep WAQI station metadata)
                aqi_data = open_meteo["aqi_data"][:24] or aqi_data
                # Prefer Open-Meteo UV series if available; otherwise fall back to the ad-hoc fetch
                uv_data = open_meteo.get("uv_data") or uv_data
        except Exception as e:  # pragma: no cover - defensive
            logger.warning(f"Open-Meteo AQI supplement failed: {e}")

        return {
            "aqi_data": aqi_data,
            "uv_data": uv_data,
            "station": {
                "name": feed_data.get("city", {}).get("name"),
                "url": feed_data.get("city", {}).get("url"),
            },
            "dominant_pollutant": feed_data.get("dominentpol"),
        }

    def _get_uv_from_open_meteo(self, lat, lng):
        """Get UV data from Open-Meteo (WAQI doesn't provide UV)"""
        try:
            url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=uv_index&timezone=auto&forecast_days=1"
            response = requests.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()

            hourly = data.get("hourly", {})
            times = hourly.get("time", [])
            uv_indices = hourly.get("uv_index", [])

            return [
                {"time": time, "uv_index": uv} for time, uv in zip(times, uv_indices)
            ]
        except Exception:
            return []

    def fetch_open_meteo_aqi(self, lat, lng):
        """Fetch from Open-Meteo Air Quality API (Fallback)"""
        url = (
            f"https://air-quality-api.open-meteo.com/v1/air-quality?"
            f"latitude={lat}&longitude={lng}"
            f"&hourly=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,uv_index"
            f"&timezone=auto&forecast_days=3"
        )

        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        hourly = data.get("hourly", {})
        times = hourly.get("time", [])

        aqi_data = [
            {
                "time": times[i],
                "us_aqi": hourly.get("us_aqi", [None] * len(times))[i],
                "pm25": hourly.get("pm2_5", [None] * len(times))[i],
                "pm10": hourly.get("pm10", [None] * len(times))[i],
                "o3": hourly.get("ozone", [None] * len(times))[i],
                "no2": hourly.get("nitrogen_dioxide", [None] * len(times))[i],
                "so2": hourly.get("sulphur_dioxide", [None] * len(times))[i],
                "co": hourly.get("carbon_monoxide", [None] * len(times))[i],
            }
            for i in range(len(times))
        ]

        uv_data = [
            {
                "time": times[i],
                "uv_index": hourly.get("uv_index", [None] * len(times))[i],
            }
            for i in range(len(times))
        ]

        return {
            "aqi_data": aqi_data,
            "uv_data": uv_data,
        }

    # ==================== UTILITY METHODS ====================

    def get_api_status(self):
        """Get status of all weather APIs (useful for monitoring)"""
        status = {}
        for api_name, api_info in self.apis.items():
            status[api_name] = {
                "name": api_info["name"],
                "has_key": bool(
                    api_info.get("api_key", True)
                ),  # Open-Meteo doesn't need key
                "daily_limit": api_info["daily_limit"],
                "priority": api_info["priority"],
            }

        status["waqi"] = {
            "name": "World Air Quality Index",
            "has_key": bool(self.waqi_api_key),
            "purpose": "Air Quality",
        }

        return status


# Singleton instance
weather_service = WeatherAPIService()
