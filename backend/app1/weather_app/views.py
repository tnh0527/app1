import requests
import hashlib
import logging
from django.conf import settings
from django.core.cache import cache
from rest_framework.views import APIView

from .weather_codes import weather_code_descriptions
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateDestroyAPIView
from .weather_codes import weather_code_descriptions
from .models import SavedLocation
from .serializers import SavedLocationSerializer, SavedLocationReorderSerializer
from .services import weather_service
from datetime import datetime, timedelta, timezone
from app1.cache_utils import cached_api_view, CacheableMixin, generate_cache_key

logger = logging.getLogger(__name__)


class SavedLocationListCreateView(ListCreateAPIView):
    """List all saved locations for the user or create a new one"""

    serializer_class = SavedLocationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedLocation.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Auto-assign order based on current count
        current_count = SavedLocation.objects.filter(user=self.request.user).count()
        serializer.save(user=self.request.user, order=current_count)


class SavedLocationDetailView(RetrieveUpdateDestroyAPIView):
    """Retrieve, update, or delete a specific saved location"""

    serializer_class = SavedLocationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedLocation.objects.filter(user=self.request.user)


class SavedLocationReorderView(APIView):
    """Reorder saved locations"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = SavedLocationReorderSerializer(data=request.data)
        if serializer.is_valid():
            locations_data = serializer.validated_data["locations"]
            for item in locations_data:
                SavedLocation.objects.filter(user=request.user, id=item["id"]).update(
                    order=item["order"]
                )
            return Response(
                {"message": "Locations reordered successfully"},
                status=status.HTTP_200_OK,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SavedLocationSetPrimaryView(APIView):
    """Set a location as primary"""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            location = SavedLocation.objects.get(pk=pk, user=request.user)
            # Unset all other primary locations
            SavedLocation.objects.filter(user=request.user, is_primary=True).update(
                is_primary=False
            )
            # Set this one as primary
            location.is_primary = True
            location.save()
            return Response(
                SavedLocationSerializer(location).data, status=status.HTTP_200_OK
            )
        except SavedLocation.DoesNotExist:
            return Response(
                {"error": "Location not found"}, status=status.HTTP_404_NOT_FOUND
            )


class PlaceSuggestionsView(APIView):
    """Get location suggestions from Google Places API with input validation."""
    permission_classes = [AllowAny]

    def get(self, request):
        user_input = request.query_params.get("input", "").strip()

        # Input validation
        if not user_input:
            return Response(
                {"error": "Search input is required.", "suggestions": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Length validation
        if len(user_input) < 2:
            return Response(
                {
                    "error": "Search input must be at least 2 characters.",
                    "suggestions": [],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if len(user_input) > 100:
            return Response(
                {"error": "Search input is too long.", "suggestions": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Basic XSS/injection prevention
        import re

        suspicious_patterns = re.compile(r"<script|javascript:|data:|on\w+=", re.I)
        if suspicious_patterns.search(user_input):
            return Response(
                {"error": "Invalid search input.", "suggestions": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # URL-encode the input for safe API call
        from urllib.parse import quote

        encoded_input = quote(user_input)
        url = f"https://maps.googleapis.com/maps/api/place/autocomplete/json?input={encoded_input}&types=geocode&key={settings.GOOGLE_API_KEY}"

        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            predictions = data.get("predictions", [])
            suggestions = [
                {
                    "description": prediction["description"],
                    "place_id": prediction["place_id"],
                }
                for prediction in predictions[:10]  # Limit to 10 suggestions
            ]
            return Response({"suggestions": suggestions}, status=status.HTTP_200_OK)

        except requests.exceptions.Timeout:
            return Response(
                {"error": "Request timed out. Please try again."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except requests.exceptions.RequestException:
            return Response(
                {"error": "Could not retrieve place suggestions"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WeatherView(APIView):
    """
    Weather API endpoint with multi-API fallbacks and intelligent caching.

    API Priority:
    1. Open-Meteo (Primary) - Unlimited free, excellent accuracy
    2. Tomorrow.io (1st Fallback) - 500/day, hyperlocal
    3. VisualCrossing (2nd Fallback) - 1000/day, comprehensive
    4. OpenWeatherMap (3rd Fallback) - 1000/day, reliable

    Air Quality:
    1. WAQI (Primary) - Detailed station data
    2. Open-Meteo AQI (Fallback)
    
    Caching Strategy:
    - Weather data cached for 5-15 minutes depending on type
    - Geocode/timezone cached for 24 hours (static data)
    - Cache keys based on location coordinates
    """
    permission_classes = [AllowAny]

    # Cache TTLs (in seconds)
    GEOCODE_CACHE_TTL = settings.CACHE_TTL.get("weather_geocode", 86400)  # 24 hours
    TIMEZONE_CACHE_TTL = settings.CACHE_TTL.get("weather_timezone", 86400)  # 24 hours
    WEATHER_CACHE_TTL = settings.CACHE_TTL.get("weather_forecast", 900)  # 15 minutes
    COMBINED_CACHE_TTL = settings.WEATHER_CACHE_TTL.get("forecast", 900)

    # Lightweight server-side mapping for background videos (aligns with frontend assets)
    VIDEO_MAP = {
        "Fog": "/videos/foggy.mp4",
        "Depositing rime fog": "/videos/foggy.mp4",
        "Windy": "/videos/cloudy.mp4",
        "Drizzle: Light": "/videos/slight-rain.mp4",
        "Drizzle: Moderate": "/videos/slight-rain.mp4",
        "Drizzle: Dense": {
            "day": "/videos/day-rainy.mp4",
            "night": "/videos/night-rainy.mp4",
        },
        "Freezing drizzle: Light": "/videos/snowy.mp4",
        "Freezing drizzle: Dense": "/videos/snowy.mp4",
        "Rain: Slight": "/videos/slight-rain.mp4",
        "Rain: Moderate": {
            "day": "/videos/day-rainy.mp4",
            "night": "/videos/night-rainy.mp4",
        },
        "Rain: Heavy": {
            "day": "/videos/day-rainy.mp4",
            "night": "/videos/night-rainy.mp4",
        },
        "Freezing rain: Light": "/videos/snowy.mp4",
        "Freezing rain: Heavy": "/videos/snowy.mp4",
        "Snow fall: Slight": "/videos/snowy.mp4",
        "Snow fall: Moderate": "/videos/snowy.mp4",
        "Snow fall: Heavy": "/videos/snowy.mp4",
        "Rain showers: Slight": "/videos/slight-rain.mp4",
        "Rain showers: Moderate": {
            "day": "/videos/day-rainy.mp4",
            "night": "/videos/night-rainy.mp4",
        },
        "Rain showers: Violent": "/videos/thunderstorm.mp4",
        "Thunderstorm: Slight or moderate": "/videos/thunderstorm.mp4",
        "Thunderstorm with slight hail": "/videos/thunderstorm.mp4",
        "Thunderstorm with heavy hail": "/videos/thunderstorm.mp4",
        "Clear sky": {"day": "/videos/sunny-sky.mp4", "night": "/videos/night-sky.mp4"},
        "Mainly clear": {"day": "/videos/sunny-sky.mp4", "night": "/videos/night-sky.mp4"},
        "Partly cloudy": {"day": "/videos/partly-cloudy.mp4", "night": "/videos/cloudy-night.mp4"},
        "Overcast": {"day": "/videos/cloudy.mp4", "night": "/videos/cloudy-night.mp4"},
        "default": {"day": "/videos/sunny-sky.mp4", "night": "/videos/night-sky.mp4"},
    }

    def _select_video(self, description, is_day=1):
        mapping = self.VIDEO_MAP.get(description) or self.VIDEO_MAP.get("default")
        if isinstance(mapping, dict):
            return mapping.get("day" if is_day else "night") or mapping.get("day")
        return mapping

    def _find_closest_by_time(self, entries):
        if not entries:
            return None
        now = datetime.now(timezone.utc)
        best = None
        best_diff = None
        for item in entries:
            t_str = item.get("time") or item.get("timestamp") or item.get("dt")
            if not t_str:
                continue
            try:
                # datetime.fromisoformat handles offset-aware strings; fallback to parse naive
                parsed = datetime.fromisoformat(t_str.replace("Z", "+00:00"))
            except Exception:
                try:
                    parsed = datetime.strptime(t_str, "%Y-%m-%d %H:%M")
                except Exception:
                    continue
            if parsed.tzinfo is None:
                parsed = parsed.replace(tzinfo=timezone.utc)
            diff = abs((parsed - now).total_seconds())
            if best_diff is None or diff < best_diff:
                best_diff = diff
                best = item
        return best or entries[0]

    def _compute_is_day(self, current, daily, time_zone_data):
        if current and "is_day" in current:
            return 1 if current.get("is_day") else 0

        tzid = None
        if time_zone_data:
            tzid = time_zone_data.get("time_zone") or time_zone_data.get("timezone")
        tz = timezone.utc
        if tzid:
            try:
                # Python 3.9+ standard library
                from zoneinfo import ZoneInfo

                tz = ZoneInfo(tzid)
            except Exception:
                tz = timezone.utc

        try:
            now = datetime.now(tz)
            if daily:
                today = daily[0]
                sunrise = today.get("sunrise")
                sunset = today.get("sunset")
                if sunrise and sunset:
                    sunrise_dt = datetime.fromisoformat(sunrise.replace("Z", "+00:00"))
                    sunset_dt = datetime.fromisoformat(sunset.replace("Z", "+00:00"))
                    if sunrise_dt.tzinfo is None:
                        sunrise_dt = sunrise_dt.replace(tzinfo=timezone.utc)
                    if sunset_dt.tzinfo is None:
                        sunset_dt = sunset_dt.replace(tzinfo=timezone.utc)
                    sunrise_local = sunrise_dt.astimezone(tz)
                    sunset_local = sunset_dt.astimezone(tz)
                    return 1 if sunrise_local <= now <= sunset_local else 0
        except Exception:
            pass
        return 1

    def _compute_ui_meta(self, weather_data, time_zone_data=None):
        hourly = weather_data.get("hourly") or []
        minutely = weather_data.get("minutely_15") or []
        daily = weather_data.get("daily") or []

        current = self._find_closest_by_time(hourly) or self._find_closest_by_time(minutely) or (hourly[0] if hourly else (minutely[0] if minutely else None))
        # `weather_code` may be either a numeric WMO code (int) or an already
        # human-readable description (string) depending on which upstream API
        # produced the data. Handle both.
        raw_weather_code = current.get("weather_code") if current else None
        condition_code = None
        condition = None
        if raw_weather_code is not None and raw_weather_code != "":
            if isinstance(raw_weather_code, (int, float)):
                try:
                    condition_code = int(raw_weather_code)
                except Exception:
                    condition_code = None
                if condition_code is not None:
                    condition = weather_code_descriptions.get(condition_code)
            else:
                # Assume it's already a description string
                condition = str(raw_weather_code)
        is_day = self._compute_is_day(current, daily, time_zone_data)

        temps = [
            (d.get("min_temperature"), d.get("max_temperature"))
            for d in daily
            if d.get("min_temperature") is not None and d.get("max_temperature") is not None
        ]
        if temps:
            min_vals = [t[0] for t in temps]
            max_vals = [t[1] for t in temps]
            global_min = min(min_vals)
            global_max = max(max_vals)
            global_range = max(1, global_max - global_min)
        else:
            global_min = None
            global_max = None
            global_range = None

        return {
            "current_condition": condition,
            # Preserve the numeric code when available; otherwise leave null.
            "current_condition_code": condition_code,
            "is_day": is_day,
            "video_src": self._select_video(condition, is_day),
            "heatbar": {
                "min": global_min,
                "max": global_max,
                "range": global_range,
            },
        }

    def _get_cache_key(self, prefix, *args):
        """Generate a cache key from prefix and arguments"""
        key_string = f"{prefix}:{':'.join(str(a) for a in args)}"
        return hashlib.md5(key_string.encode()).hexdigest()

    def get_coordinates(self, location):
        """Get coordinates from Google Geocoding with caching"""
        cache_key = self._get_cache_key("geocode", location.lower())
        cached = cache.get(cache_key)
        if cached:
            logger.info(f"Geocode cache hit for {location}")
            return cached

        url = f"https://maps.googleapis.com/maps/api/geocode/json?address={location}&key={settings.GOOGLE_API_KEY}"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data["results"]:
                coords = data["results"][0]["geometry"]["location"]
                cache.set(cache_key, coords, self.GEOCODE_CACHE_TTL)
                return coords
            else:
                logger.warning(f"No results found for location: {location}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error in get_coordinates: {e}")
        return None

    def get_time_zone(self, lat, lng):
        """Get timezone from Google Timezone API with caching"""
        # Round coordinates for cache key (timezone doesn't vary by minor coord changes)
        cache_key = self._get_cache_key("timezone", round(lat, 2), round(lng, 2))
        cached = cache.get(cache_key)
        if cached:
            logger.info(f"Timezone cache hit for {lat}, {lng}")
            return cached

        timestamp = int(datetime.now().timestamp())
        url = f"https://maps.googleapis.com/maps/api/timezone/json?location={lat},{lng}&timestamp={timestamp}&key={settings.GOOGLE_API_KEY}"
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()

            time_zone_id, raw_offset, dst_offset = (
                data["timeZoneId"],
                data["rawOffset"],
                data["dstOffset"],
            )
            total_offset = raw_offset + dst_offset

            time_zone_data = {
                "time_zone": time_zone_id,
                "utc_offset": total_offset,
            }

            cache.set(cache_key, time_zone_data, self.TIMEZONE_CACHE_TTL)
            return time_zone_data

        except requests.exceptions.RequestException as e:
            logger.error(f"Error in get_time_zone: {e}")

        return None

    def get_air_uv(self, lat, lng):
        """Get air quality and UV data using weather service (WAQI primary, Open-Meteo fallback)"""
        return weather_service.get_air_quality_data(lat, lng)

    def get_weather_data(self, lat, lng):
        """Get weather data using weather service with multi-API fallbacks"""
        return weather_service.get_weather_data(lat, lng)

    def get(self, request):
        location = request.query_params.get("location", "").strip()
        lat_param = request.query_params.get("lat")
        lon_param = request.query_params.get("lon")

        # Support direct lat/lon parameters for geolocation-based requests
        if lat_param and lon_param:
            try:
                lat = float(lat_param)
                lng = float(lon_param)

                # Validate coordinate ranges
                if lat < -90 or lat > 90:
                    return Response(
                        {"error": "Latitude must be between -90 and 90 degrees"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if lng < -180 or lng > 180:
                    return Response(
                        {"error": "Longitude must be between -180 and 180 degrees"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                coordinates = {"lat": lat, "lng": lng}
            except ValueError:
                return Response(
                    {"error": "Invalid latitude or longitude values"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        elif location:
            # Validate location string
            if len(location) < 2:
                return Response(
                    {"error": "Location must be at least 2 characters"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if len(location) > 255:
                return Response(
                    {"error": "Location name is too long"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Basic XSS/injection prevention
            import re

            suspicious_patterns = re.compile(r"<script|javascript:|data:|on\w+=", re.I)
            if suspicious_patterns.search(location):
                return Response(
                    {"error": "Invalid location input"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            coordinates = self.get_coordinates(location)
            if not coordinates:
                return Response(
                    {"error": "Could not retrieve coordinates for location"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
            lat, lng = coordinates["lat"], coordinates["lng"]
        else:
            return Response(
                {"error": "Location or lat/lon parameters are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lat, lng = coordinates["lat"], coordinates["lng"]

        cache_key = generate_cache_key(
            "weather_combined",
            round(lat, 3),
            round(lng, 3),
        )
        cached_combined = cache.get(cache_key)
        if cached_combined:
            # Recompute UI meta so day/night and video change immediately without waiting for cache expiry
            try:
                weather_data_cached = cached_combined.get("weather_data") or {}
                tz_data_cached = cached_combined.get("time_zone_data") or {}
                cached_combined = {
                    **cached_combined,
                    "ui_meta": self._compute_ui_meta(weather_data_cached, tz_data_cached),
                }
            except Exception:
                pass

            response = Response(cached_combined, status=status.HTTP_200_OK)
            response['Cache-Control'] = f'public, max-age={self.WEATHER_CACHE_TTL}'
            response['Vary'] = 'Accept'
            return response

        time_zone_data = self.get_time_zone(lat, lng)
        if time_zone_data is None:
            return Response(
                {"error": "Could not retrieve time zone data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        air_uv_data = self.get_air_uv(lat, lng)
        if air_uv_data is None:
            return Response(
                {"error": "Could not retrieve air quality and UV data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        weather_data = self.get_weather_data(lat, lng)
        if weather_data is None:
            return Response(
                {"error": "Could not retrieve weather data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        combined_data = {
            "time_zone_data": time_zone_data,
            "coordinates": coordinates,
            "air_uv_data": air_uv_data,
            "weather_data": weather_data,
            "ui_meta": self._compute_ui_meta(weather_data, time_zone_data),
            "data_sources": {
                "weather": weather_data.get("source", "Unknown"),
                "air_quality": air_uv_data.get("source", "Unknown"),
                "geocoding": "Google",
                "timezone": "Google",
            },
        }

        cache.set(cache_key, combined_data, timeout=self.COMBINED_CACHE_TTL)

        # Add HTTP cache headers
        response = Response(combined_data, status=status.HTTP_200_OK)
        response['Cache-Control'] = f'public, max-age={self.WEATHER_CACHE_TTL}'
        response['Vary'] = 'Accept'
        return response


class WeatherAPIStatusView(APIView):
    """
    Endpoint to check the status of all weather APIs.
    Useful for debugging and monitoring.
    """

    permission_classes = [AllowAny]
    
    @cached_api_view(ttl=3600, key_prefix="weather_status")  # 1 hour cache

    def get(self, request):
        api_status = weather_service.get_api_status()
        return Response(
            {
                "apis": api_status,
                "architecture": {
                    "weather": {
                        "primary": "Open-Meteo (unlimited free)",
                        "fallbacks": [
                            "Tomorrow.io (500/day, hyperlocal)",
                            "VisualCrossing (1000/day, comprehensive)",
                            "OpenWeatherMap (1000/day, map tiles)",
                        ],
                    },
                    "air_quality": {
                        "primary": "WAQI (station-based AQI)",
                        "fallback": "Open-Meteo AQI",
                    },
                    "location_services": {
                        "geocoding": "Google Geocoding API",
                        "timezone": "Google Timezone API",
                        "places": "Google Places Autocomplete",
                    },
                    "map_tiles": {
                        "provider": "OpenWeatherMap",
                        "layers": [
                            "precipitation",
                            "temperature",
                            "clouds",
                            "pressure",
                            "wind",
                        ],
                    },
                },
                "caching": {
                    "forecast": "15 minutes",
                    "current_conditions": "5 minutes",
                    "air_quality": "30 minutes",
                    "geocoding": "24 hours",
                    "timezone": "24 hours",
                },
            },
            status=status.HTTP_200_OK,
        )
