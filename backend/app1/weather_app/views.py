import requests
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .weather_codes import weather_code_descriptions
from datetime import datetime, timedelta, timezone


class PlaceSuggestionsView(APIView):
    def get(self, request):
        user_input = request.query_params.get("input")
        url = f"https://maps.googleapis.com/maps/api/place/autocomplete/json?input={user_input}&types=geocode&key={settings.GOOGLE_API_KEY}"

        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            predictions = data.get("predictions", [])
            suggestions = [
                {
                    "description": prediction["description"],
                    "place_id": prediction["place_id"],
                }
                for prediction in predictions
            ]
            # print("Suggestions", suggestions)
            return Response({"suggestions": suggestions}, status=status.HTTP_200_OK)

        except requests.exceptions.RequestException as e:
            print(f"Error in get_place_suggestions: {e}")
            return Response(
                {"error": "Could not retrieve place suggestions"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WeatherView(APIView):
    def get_coordinates(self, location):
        url = f"https://maps.googleapis.com/maps/api/geocode/json?address={location}&key={settings.GOOGLE_API_KEY}"
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            if data["results"]:
                return data["results"][0]["geometry"]["location"]
            else:
                print("No results found for coordinates.")
        except requests.exceptions.RequestException as e:
            print(f"Error in get_coordinates: {e}")
        return None

    def get_time_zone(self, lat, lng):
        timestamp = int(datetime.now().timestamp())
        url = f"https://maps.googleapis.com/maps/api/timezone/json?location={lat},{lng}&timestamp={timestamp}&key={settings.GOOGLE_API_KEY}"
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()

            time_zone_id, raw_offset, dst_offset = (
                data["timeZoneId"],
                data["rawOffset"],
                data["dstOffset"],
            )
            # Calculate the total UTC offset (in seconds)
            total_offset = raw_offset + dst_offset

            time_zone_data = {
                "time_zone": time_zone_id,
                "utc_offset": total_offset,
            }

            return time_zone_data

        except requests.exceptions.RequestException as e:
            print(f"Error in get_time_zone: {e}")

        return None

    def get_air_uv(self, lat, lng):
        url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lng}&hourly=uv_index,us_aqi&timezone=auto&forecast_days=1"
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()

            hourly_data = data.get("hourly", {})
            times = hourly_data.get("time", [])
            uv_indices = hourly_data.get("uv_index", [])
            us_aqi_values = hourly_data.get("us_aqi", [])

            aqi_data = [
                {"time": time, "us_aqi": aqi} for time, aqi in zip(times, us_aqi_values)
            ]

            uv_data = [
                {"time": time, "uv_index": uv_index}
                for time, uv_index in zip(times, uv_indices)
            ]

            return {"aqi_data": aqi_data, "uv_data": uv_data}
        except requests.exceptions.RequestException as e:
            print(f"Error in get_air_uv: {e}")
        return None

    def get_weather_data(self, lat, lng):
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lng}&hourly=temperature_2m,relative_humidity_2m,dew_point_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&minutely_15=temperature_2m,precipitation,weather_code,apparent_temperature,is_day&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=auto&forecast_days=10"

        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()

            hourly_data = data.get("hourly", {})
            times = hourly_data.get("time", [])[:48]
            temperatures = hourly_data.get("temperature_2m", [])[:48]
            humidities = hourly_data.get("relative_humidity_2m", [])[:48]
            dew_points = hourly_data.get("dew_point_2m", [])[:48]
            weather_codes = hourly_data.get("weather_code", [])[:48]
            wind_speeds = hourly_data.get("wind_speed_10m", [])[:48]

            hourly_weather_data = [
                {
                    "time": time,
                    "temperature": temp,
                    "humidity": humidity,
                    "dew_point": dew_point,
                    "weather_code": weather_code_descriptions.get(
                        weather_code, "Unknown"
                    ),
                    "wind_speed": wind_speed,
                }
                for time, temp, humidity, dew_point, weather_code, wind_speed in zip(
                    times,
                    temperatures,
                    humidities,
                    dew_points,
                    weather_codes,
                    wind_speeds,
                )
            ]

            daily_data = data.get("daily", {})
            daily_times = daily_data.get("time", [])
            weather_codes_daily = daily_data.get("weather_code", [])
            max_temperatures = daily_data.get("temperature_2m_max", [])
            min_temperatures = daily_data.get("temperature_2m_min", [])
            sunrises = daily_data.get("sunrise", [])
            sunsets = daily_data.get("sunset", [])

            daily_weather_data = [
                {
                    "date": date,
                    "weather_code": weather_code_descriptions.get(
                        weather_code, "Unknown"
                    ),
                    "max_temperature": max_temp,
                    "min_temperature": min_temp,
                    "sunrise": sunrise,
                    "sunset": sunset,
                }
                for date, weather_code, max_temp, min_temp, sunrise, sunset in zip(
                    daily_times,
                    weather_codes_daily,
                    max_temperatures,
                    min_temperatures,
                    sunrises,
                    sunsets,
                )
            ]

            # Extracting 15-minutely data
            minutely_15_data = data.get("minutely_15", {})
            minutely_times = minutely_15_data.get("time", [])[:96]
            minutely_temperatures = minutely_15_data.get("temperature_2m", [])[:96]
            minutely_precipitation = minutely_15_data.get("precipitation", [])[:96]
            minutely_weather_codes = minutely_15_data.get("weather_code", [])[:96]
            minutely_is_day = minutely_15_data.get("is_day", [])[:96]
            minutely_apparent_temperatures = minutely_15_data.get(
                "apparent_temperature", []
            )[:96]

            minutely_weather_data = [
                {
                    "time": time,
                    "temperature": temp,
                    "precipitation": precipitation,
                    "weather_code": weather_code_descriptions.get(
                        weather_code, "Unknown"
                    ),
                    "is_day": is_day,
                    "apparent_temperature": apparent_temp,
                }
                for time, temp, precipitation, weather_code, is_day, apparent_temp in zip(
                    minutely_times,
                    minutely_temperatures,
                    minutely_precipitation,
                    minutely_weather_codes,
                    minutely_is_day,
                    minutely_apparent_temperatures,
                )
            ]

            weather_data = {
                "hourly": hourly_weather_data,
                "daily": daily_weather_data,
                "minutely_15": minutely_weather_data,
            }
            return weather_data

        except requests.exceptions.RequestException as e:
            print(f"Error in get_weather_data: {e}")
        return None

    def get(self, request):
        location = request.query_params.get("location")

        if not location:
            return Response(
                {"error": "Location parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        coordinates = self.get_coordinates(location)
        if not coordinates:
            return Response(
                {"error": "Could not retrieve coordinates for location"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        lat, lng = coordinates["lat"], coordinates["lng"]

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
        }

        return Response(combined_data, status=status.HTTP_200_OK)
