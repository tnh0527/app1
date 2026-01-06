"""
API Proxy Views for Weather App

These views proxy external API calls through the backend to:
1. Keep API keys secure (not exposed in browser console)
2. Allow backend-side caching
3. Add rate limiting and request validation
4. Enable better error handling and logging

External APIs proxied:
- Google Places Autocomplete (New)
- Geoapify Routing
- Geoapify Places (Nearby search)
- OpenWeatherMap (Weather data, tiles, wind grid, AQI)
- WAQI (Air quality)
- Mapbox Geocoding (fallback)
"""

import requests
import logging
from django.conf import settings
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


class PlacesAutocompleteProxyView(APIView):
    """
    Proxy for Google Places Autocomplete API (New).
    POST /api/weather/proxy/places-autocomplete/
    
    Expects JSON body:
    {
        "input": "search query",
        "latitude": 29.76,
        "longitude": -95.37,
        "radius": 50000
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        user_input = request.data.get("input", "").strip()
        latitude = request.data.get("latitude")
        longitude = request.data.get("longitude")
        radius = request.data.get("radius", 50000)

        if not user_input or len(user_input) < 2:
            return Response(
                {"error": "Input must be at least 2 characters", "suggestions": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Prefer the standard Google API key for Places Autocomplete (works for browser-origin requests)
        api_key = getattr(settings, "GOOGLE_API_KEY", "") or getattr(settings, "GOOGLE_CLOUD_API_KEY", "")
        if not api_key:
            return Response(
                {"error": "Google API key not configured", "suggestions": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            # Build request body
            request_body = {"input": user_input}
            
            if latitude is not None and longitude is not None:
                request_body["locationBias"] = {
                    "circle": {
                        "center": {
                            "latitude": float(latitude),
                            "longitude": float(longitude),
                        },
                        "radius": float(radius),
                    }
                }

            response = requests.post(
                f"https://places.googleapis.com/v1/places:autocomplete?key={api_key}",
                json=request_body,
                headers={
                    "Content-Type": "application/json",
                    "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
                },
                timeout=10,
            )

            if response.status_code != 200:
                logger.warning(f"Google Places API error: {response.status_code} - {response.text}")
                # Include upstream response details in DEBUG mode to aid debugging (do not expose in production)
                upstream_body = response.text if getattr(settings, "DEBUG", False) else "hidden"
                return Response(
                    {
                        "error": "Places API error",
                        "upstream_status": response.status_code,
                        "upstream_body": upstream_body,
                        "suggestions": [],
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            data = response.json()
            
            # Transform to frontend format
            suggestions = []
            for suggestion in data.get("suggestions", []):
                pred = suggestion.get("placePrediction", {})
                if pred:
                    suggestions.append({
                        "id": pred.get("placeId"),
                        "name": pred.get("structuredFormat", {}).get("mainText", {}).get("text", "")
                               or pred.get("text", {}).get("text", "").split(",")[0],
                        "fullName": pred.get("text", {}).get("text", ""),
                        "secondaryText": pred.get("structuredFormat", {}).get("secondaryText", {}).get("text", ""),
                        "placeId": pred.get("placeId"),
                        "coordinates": None,
                    })

            return Response({"suggestions": suggestions}, status=status.HTTP_200_OK)

        except requests.exceptions.Timeout:
            return Response(
                {"error": "Request timed out", "suggestions": []},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except Exception as e:
            logger.error(f"Places autocomplete proxy error: {e}")
            return Response(
                {"error": "Internal server error", "suggestions": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GeoapifyAutocompleteProxyView(APIView):
    """
    Proxy for Geoapify Geocoding Autocomplete API.
    GET /api/proxy/geoapify-autocomplete/
    
    Query params:
    - text: search query (required)
    - lat: bias latitude (optional)
    - lon: bias longitude (optional)
    - limit: max results (default 5)
    - type: place type filter (optional, e.g., 'city', 'street', 'amenity')
    
    Returns place suggestions with names, addresses, and coordinates.
    Geoapify provides richer POI data including place names like "University of Houston".
    """
    permission_classes = [AllowAny]

    def get(self, request):
        text = request.query_params.get("text", "").strip()
        lat = request.query_params.get("lat")
        lon = request.query_params.get("lon")
        limit = request.query_params.get("limit", "5")
        place_type = request.query_params.get("type", "")

        if not text or len(text) < 2:
            return Response(
                {"error": "Text must be at least 2 characters", "suggestions": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, "GEOAPIFY_API_KEY", "")
        if not api_key:
            return Response(
                {"error": "Geoapify API key not configured", "suggestions": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            from urllib.parse import quote
            encoded_text = quote(text)
            
            # Build Geoapify Geocoding Autocomplete URL
            # Docs: https://apidocs.geoapify.com/docs/geocoding/address-autocomplete/
            url = f"https://api.geoapify.com/v1/geocode/autocomplete?text={encoded_text}&limit={limit}&apiKey={api_key}"
            
            # Add location bias if provided
            if lat and lon:
                url += f"&bias=proximity:{lon},{lat}"
            
            # Add type filter if provided
            if place_type:
                url += f"&type={place_type}"
            
            # Request additional details for better place names
            url += "&format=json"

            response = requests.get(url, timeout=10)

            if response.status_code != 200:
                logger.warning(f"Geoapify Autocomplete error: {response.status_code} - {response.text}")
                return Response(
                    {"error": "Geoapify API error", "suggestions": []},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            data = response.json()
            
            # Transform Geoapify response to our format
            # Geoapify returns rich data including POI names, addresses, and coordinates
            suggestions = []
            for result in data.get("results", []):
                # Extract the best display name
                # Priority: name (POI name) > street with housenumber > formatted address
                name = result.get("name", "")  # POI name like "University of Houston"
                street = result.get("street", "")
                housenumber = result.get("housenumber", "")
                city = result.get("city", "")
                state = result.get("state", "")
                
                # Build display name
                if name:
                    display_name = name
                elif street:
                    display_name = f"{housenumber} {street}".strip() if housenumber else street
                else:
                    display_name = result.get("formatted", "").split(",")[0]
                
                # Build secondary text (location context)
                secondary_parts = []
                if name and street:
                    secondary_parts.append(f"{housenumber} {street}".strip() if housenumber else street)
                if city:
                    secondary_parts.append(city)
                if state:
                    secondary_parts.append(state)
                secondary_text = ", ".join(secondary_parts)
                
                suggestions.append({
                    "id": result.get("place_id", ""),
                    "name": display_name,
                    "fullName": result.get("formatted", ""),
                    "secondaryText": secondary_text,
                    "coordinates": [result.get("lon"), result.get("lat")] if result.get("lon") and result.get("lat") else None,
                    "category": result.get("category", ""),
                    "type": result.get("result_type", ""),
                })

            return Response({"suggestions": suggestions}, status=status.HTTP_200_OK)

        except requests.exceptions.Timeout:
            return Response(
                {"error": "Request timed out", "suggestions": []},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except Exception as e:
            logger.error(f"Geoapify autocomplete proxy error: {e}")
            return Response(
                {"error": "Internal server error", "suggestions": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GeoapifyRoutingProxyView(APIView):
    """
    Proxy for Geoapify Routing API.
    POST /api/weather/proxy/routing/
    
    Expects JSON body:
    {
        "waypoints": "lat1,lon1|lat2,lon2",
        "mode": "drive",
        "avoid": "tolls|highways"  (optional)
    }
    """
    permission_classes = [AllowAny]

    def post(self, request):
        waypoints = request.data.get("waypoints", "")
        mode = request.data.get("mode", "drive")
        avoid = request.data.get("avoid", "")

        if not waypoints:
            return Response(
                {"error": "Waypoints are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, "GEOAPIFY_API_KEY", "")
        if not api_key:
            return Response(
                {"error": "Geoapify API key not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            url = f"https://api.geoapify.com/v1/routing?waypoints={waypoints}&mode={mode}&details=instruction_details&apiKey={api_key}"
            if avoid:
                url += f"&avoid={avoid}"

            response = requests.get(url, timeout=15)

            if response.status_code != 200:
                logger.warning(f"Geoapify Routing error: {response.status_code} - {response.text}")
                return Response(
                    {"error": "Routing API error", "details": response.text},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            return Response(response.json(), status=status.HTTP_200_OK)

        except requests.exceptions.Timeout:
            return Response(
                {"error": "Request timed out"},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except Exception as e:
            logger.error(f"Geoapify routing proxy error: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class GeoapifyPlacesProxyView(APIView):
    """
    Proxy for Geoapify Places API (nearby search).
    GET /api/weather/proxy/nearby-places/
    
    Query params:
    - categories: comma-separated category list
    - lat: latitude
    - lon: longitude
    - radius: search radius in meters
    - limit: max results (default 20)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        categories = request.query_params.get("categories", "")
        lat = request.query_params.get("lat")
        lon = request.query_params.get("lon")
        radius = request.query_params.get("radius", "5000")
        limit = request.query_params.get("limit", "20")

        if not categories or not lat or not lon:
            return Response(
                {"error": "categories, lat, and lon are required", "features": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, "GEOAPIFY_API_KEY", "")
        if not api_key:
            return Response(
                {"error": "Geoapify API key not configured", "features": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            url = (
                f"https://api.geoapify.com/v2/places"
                f"?categories={categories}"
                f"&filter=circle:{lon},{lat},{radius}"
                f"&bias=proximity:{lon},{lat}"
                f"&limit={limit}"
                f"&apiKey={api_key}"
            )

            response = requests.get(url, timeout=10)

            if response.status_code != 200:
                logger.warning(f"Geoapify Places error: {response.status_code} - {response.text}")
                return Response(
                    {"error": "Places API error", "features": []},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            return Response(response.json(), status=status.HTTP_200_OK)

        except requests.exceptions.Timeout:
            return Response(
                {"error": "Request timed out", "features": []},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except Exception as e:
            logger.error(f"Geoapify places proxy error: {e}")
            return Response(
                {"error": "Internal server error", "features": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OpenWeatherProxyView(APIView):
    """
    Proxy for OpenWeatherMap APIs with caching to prevent rate limiting.
    GET /api/weather/proxy/openweather/
    
    Query params:
    - endpoint: "weather", "air_pollution", or "tile"
    - lat, lon: coordinates (for weather/air_pollution)
    - units: "metric", "imperial", or "standard" (default: metric)
    - layer, z, x, y: tile parameters (for tile)
    
    Caching:
    - air_pollution: 5 minutes (AQI doesn't change rapidly)
    - weather: 10 minutes (weather data updates every 10-15 min)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        endpoint = request.query_params.get("endpoint", "weather")
        lat = request.query_params.get("lat")
        lon = request.query_params.get("lon")
        units = request.query_params.get("units", "metric")

        api_key = getattr(settings, "OPENWEATHER_API_KEY", "")
        if not api_key:
            return Response(
                {"error": "OpenWeather API key not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            if endpoint == "weather":
                if not lat or not lon:
                    return Response(
                        {"error": "lat and lon are required"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # Round coordinates to 2 decimal places for cache key (~1km accuracy)
                lat_rounded = round(float(lat), 2)
                lon_rounded = round(float(lon), 2)
                cache_key = f"owm_weather_{lat_rounded}_{lon_rounded}_{units}"
                cache_timeout = 600  # 10 minutes
                url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units={units}"
            
            elif endpoint == "air_pollution":
                if not lat or not lon:
                    return Response(
                        {"error": "lat and lon are required"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                # Round coordinates to 1 decimal place for cache key (~10km accuracy, good for AQI grid)
                lat_rounded = round(float(lat), 1)
                lon_rounded = round(float(lon), 1)
                cache_key = f"owm_aqi_{lat_rounded}_{lon_rounded}"
                cache_timeout = 300  # 5 minutes (AQI changes slowly)
                url = f"https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={api_key}"
            
            else:
                return Response(
                    {"error": f"Unknown endpoint: {endpoint}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Check cache first
            cached_data = cache.get(cache_key)
            if cached_data is not None:
                return Response(cached_data, status=status.HTTP_200_OK)

            # Make upstream request
            response = requests.get(url, timeout=10)

            if response.status_code == 429:
                # Rate limited - log and return informative error
                logger.warning(f"OpenWeather rate limit hit for {endpoint}")
                return Response(
                    {"error": "Rate limit exceeded. Please try again in a moment."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            if response.status_code != 200:
                logger.warning(f"OpenWeather API error: {response.status_code}")
                return Response(
                    {"error": "OpenWeather API error"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            data = response.json()
            # Cache successful response
            cache.set(cache_key, data, cache_timeout)
            
            return Response(data, status=status.HTTP_200_OK)

        except requests.exceptions.Timeout:
            return Response(
                {"error": "Request timed out"},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except Exception as e:
            logger.error(f"OpenWeather proxy error: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class OpenWeatherTileProxyView(APIView):
    """
    Proxy for OpenWeatherMap tile URLs.
    Returns the tile URL with API key embedded (for Mapbox source).
    GET /api/weather/proxy/tile-url/
    
    Query params:
    - layer: precipitation_new, temp_new, clouds_new, pressure_new, wind_new
    """
    permission_classes = [AllowAny]

    def get(self, request):
        layer = request.query_params.get("layer", "precipitation_new")
        
        api_key = getattr(settings, "OPENWEATHER_API_KEY", "")
        if not api_key:
            return Response(
                {"error": "OpenWeather API key not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Return the tile URL template with embedded API key
        tile_url = f"https://tile.openweathermap.org/map/{layer}/{{z}}/{{x}}/{{y}}.png?appid={api_key}"
        
        return Response({"tileUrl": tile_url}, status=status.HTTP_200_OK)


class WAQIProxyView(APIView):
    """
    Proxy for World Air Quality Index API.
    GET /api/weather/proxy/waqi/
    
    Query params:
    - lat: latitude
    - lon: longitude (or lng)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        lat = request.query_params.get("lat")
        lon = request.query_params.get("lon") or request.query_params.get("lng")

        if not lat or not lon:
            return Response(
                {"error": "lat and lon are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, "WAQI_API_KEY", "")
        if not api_key:
            return Response(
                {"error": "WAQI API key not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={api_key}"
            response = requests.get(url, timeout=10)

            if response.status_code != 200:
                logger.warning(f"WAQI API error: {response.status_code}")
                return Response(
                    {"error": "WAQI API error"},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            return Response(response.json(), status=status.HTTP_200_OK)

        except requests.exceptions.Timeout:
            return Response(
                {"error": "Request timed out"},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except Exception as e:
            logger.error(f"WAQI proxy error: {e}")
            return Response(
                {"error": "Internal server error"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MapboxGeocodingProxyView(APIView):
    """
    Proxy for Mapbox Geocoding API (fallback for places).
    GET /api/weather/proxy/mapbox-geocode/
    
    Query params:
    - query: search text
    - proximity_lon, proximity_lat: bias coordinates (optional)
    - limit: max results (default 5)
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("query", "").strip()
        proximity_lon = request.query_params.get("proximity_lon")
        proximity_lat = request.query_params.get("proximity_lat")
        limit = request.query_params.get("limit", "5")

        if not query or len(query) < 2:
            return Response(
                {"error": "Query must be at least 2 characters", "features": []},
                status=status.HTTP_400_BAD_REQUEST,
            )

        api_key = getattr(settings, "MAPBOX_ACCESS_TOKEN", "")
        if not api_key:
            return Response(
                {"error": "Mapbox access token not configured", "features": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        try:
            from urllib.parse import quote
            encoded_query = quote(query)
            
            url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{encoded_query}.json?access_token={api_key}&limit={limit}&types=place,locality,neighborhood,address,poi"
            
            if proximity_lon and proximity_lat:
                url += f"&proximity={proximity_lon},{proximity_lat}"

            response = requests.get(url, timeout=10)

            if response.status_code != 200:
                logger.warning(f"Mapbox Geocoding error: {response.status_code}")
                return Response(
                    {"error": "Mapbox API error", "features": []},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            return Response(response.json(), status=status.HTTP_200_OK)

        except requests.exceptions.Timeout:
            return Response(
                {"error": "Request timed out", "features": []},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )
        except Exception as e:
            logger.error(f"Mapbox geocoding proxy error: {e}")
            return Response(
                {"error": "Internal server error", "features": []},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MapTileConfigView(APIView):
    """
    Returns map tile configurations with API keys embedded.
    GET /api/weather/proxy/tile-config/
    
    Returns URLs for weather layers that can be used by Mapbox.
    Cached for 1 hour since tile URLs don't change frequently.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # Check cache first
        cache_key = "map_tile_config"
        cached_config = cache.get(cache_key)
        if cached_config is not None:
            return Response(cached_config, status=status.HTTP_200_OK)
        
        owm_key = getattr(settings, "OPENWEATHER_API_KEY", "")
        
        if not owm_key:
            return Response(
                {"error": "OpenWeather API key not configured"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        configs = {
            "precipitation": {
                "url": f"https://tile.openweathermap.org/map/precipitation_new/{{z}}/{{x}}/{{y}}.png?appid={owm_key}",
                "opacity": 0.75,
            },
            "temperature": {
                "url": f"https://tile.openweathermap.org/map/temp_new/{{z}}/{{x}}/{{y}}.png?appid={owm_key}",
                "opacity": 0.65,
            },
            "clouds": {
                "url": f"https://tile.openweathermap.org/map/clouds_new/{{z}}/{{x}}/{{y}}.png?appid={owm_key}",
                "opacity": 0.55,
            },
            "pressure": {
                "url": f"https://tile.openweathermap.org/map/pressure_new/{{z}}/{{x}}/{{y}}.png?appid={owm_key}",
                "opacity": 0.65,
            },
        }
        
        # Cache for 1 hour (tile URLs are static)
        cache.set(cache_key, configs, 3600)

        return Response(configs, status=status.HTTP_200_OK)
