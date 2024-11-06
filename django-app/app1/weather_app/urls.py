from django.urls import path
from .views import *

urlpatterns = [
    path("weather/", WeatherView.as_view(), name="weather_view"),
    path("place/", PlaceSuggestionsView.as_view(), name="place_view"),
]
