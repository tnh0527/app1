from django.urls import path
from .views import (
    WeatherView,
    PlaceSuggestionsView,
    SavedLocationListCreateView,
    SavedLocationDetailView,
    SavedLocationReorderView,
    SavedLocationSetPrimaryView,
)

urlpatterns = [
    path("weather/", WeatherView.as_view(), name="weather_view"),
    path("place/", PlaceSuggestionsView.as_view(), name="place_view"),
    # Saved locations endpoints
    path(
        "locations/", SavedLocationListCreateView.as_view(), name="saved_locations_list"
    ),
    path(
        "locations/<int:pk>/",
        SavedLocationDetailView.as_view(),
        name="saved_location_detail",
    ),
    path(
        "locations/reorder/",
        SavedLocationReorderView.as_view(),
        name="saved_locations_reorder",
    ),
    path(
        "locations/<int:pk>/set-primary/",
        SavedLocationSetPrimaryView.as_view(),
        name="saved_location_set_primary",
    ),
]
