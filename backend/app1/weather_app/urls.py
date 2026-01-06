from django.urls import path
from .views import (
    WeatherView,
    WeatherAPIStatusView,
    PlaceSuggestionsView,
    SavedLocationListCreateView,
    SavedLocationDetailView,
    SavedLocationReorderView,
    SavedLocationSetPrimaryView,
)
from .proxy_views import (
    PlacesAutocompleteProxyView,
    GeoapifyAutocompleteProxyView,
    GeoapifyRoutingProxyView,
    GeoapifyPlacesProxyView,
    OpenWeatherProxyView,
    OpenWeatherTileProxyView,
    WAQIProxyView,
    MapboxGeocodingProxyView,
    MapTileConfigView,
)

urlpatterns = [
    path("weather/", WeatherView.as_view(), name="weather_view"),
    path(
        "weather/api-status/", WeatherAPIStatusView.as_view(), name="weather_api_status"
    ),
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
    # API Proxy endpoints (keeps API keys secure on backend)
    path(
        "proxy/places-autocomplete/",
        PlacesAutocompleteProxyView.as_view(),
        name="proxy_places_autocomplete",
    ),
    path(
        "proxy/geoapify-autocomplete/",
        GeoapifyAutocompleteProxyView.as_view(),
        name="proxy_geoapify_autocomplete",
    ),
    path(
        "proxy/routing/",
        GeoapifyRoutingProxyView.as_view(),
        name="proxy_routing",
    ),
    path(
        "proxy/nearby-places/",
        GeoapifyPlacesProxyView.as_view(),
        name="proxy_nearby_places",
    ),
    path(
        "proxy/openweather/",
        OpenWeatherProxyView.as_view(),
        name="proxy_openweather",
    ),
    path(
        "proxy/tile-url/",
        OpenWeatherTileProxyView.as_view(),
        name="proxy_tile_url",
    ),
    path(
        "proxy/waqi/",
        WAQIProxyView.as_view(),
        name="proxy_waqi",
    ),
    path(
        "proxy/mapbox-geocode/",
        MapboxGeocodingProxyView.as_view(),
        name="proxy_mapbox_geocode",
    ),
    path(
        "proxy/tile-config/",
        MapTileConfigView.as_view(),
        name="proxy_tile_config",
    ),
]
