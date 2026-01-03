import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./WeatherMap.css";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_ACCESS_TOKEN;

// Helper to get wind direction label
const getWindDirection = (degrees) => {
  if (degrees === null || degrees === undefined) return "";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};
const DEFAULT_CENTER = [-95.3698, 29.7604];

const WeatherMap = ({ mapData }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markerRef = useRef(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [hasLocation, setHasLocation] = useState(true); // show default map by default
  const [mapBearing, setMapBearing] = useState(0); // Track map rotation for compass

  // Home view = where the map should return after pan/zoom.
  const homeViewRef = useRef({
    center: null,
    zoom: 17,
    bearing: 0,
    pitch: 0,
  });

  const SELECTION_ZOOM = 17;

  const handleHomeClick = () => {
    if (!map.current || !homeViewRef.current.center) return;
    const view = homeViewRef.current;
    map.current.flyTo({
      center: view.center,
      zoom: view.zoom,
      bearing: view.bearing ?? 0,
      pitch: view.pitch ?? 0,
      essential: true,
    });
  };

  // Initialize map only when we have coordinates
  useEffect(() => {
    const rawCoords = mapData?.features?.[0]?.geometry?.coordinates;
    const centerCoordinates =
      rawCoords && rawCoords.length >= 2 ? rawCoords : DEFAULT_CENTER;

    // If no explicit location provided, we'll show the default Houston center.
    setHasLocation(true);
    setIsMapLoading(true); // show loading while map updates

    if (!MAPBOX_ACCESS_TOKEN) {
      console.error(
        "Missing VITE_REACT_APP_MAPBOX_ACCESS_TOKEN in frontend/.env."
      );
      return;
    }

    // Disable telemetry to prevent "ERR_BLOCKED_BY_CLIENT" errors from ad blockers
    try {
      mapboxgl.config.TELEMETRY = false;
    } catch (e) {
      console.warn("Could not disable Mapbox telemetry", e);
    }

    if (!mapContainer.current) return;

    // If map already exists, just update location
    if (map.current) {
      homeViewRef.current = {
        center: centerCoordinates,
        zoom: SELECTION_ZOOM,
        bearing: 0,
        pitch: 0,
      };

      map.current.flyTo({
        center: centerCoordinates,
        zoom: SELECTION_ZOOM,
        bearing: 0,
        pitch: 0,
        essential: true,
      });

      if (markerRef.current) {
        markerRef.current.setLngLat(centerCoordinates);
      }

      // Hide loading after fly completes (on idle)
      map.current.once("idle", () => {
        setIsMapLoading(false);
      });
      return;
    }

    // Create new map
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: centerCoordinates,
      zoom: SELECTION_ZOOM,
      pitch: 0,
      bearing: 0,
      antialias: true,
      attributionControl: false,
      collectResourceTiming: false, // Disable telemetry to prevent ERR_BLOCKED_BY_CLIENT
    });

    homeViewRef.current = {
      center: centerCoordinates,
      zoom: SELECTION_ZOOM,
      bearing: 0,
      pitch: 0,
    };

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    const markerEl = document.createElement("div");
    markerEl.className = "current-location-marker";
    markerRef.current = new mapboxgl.Marker({ element: markerEl })
      .setLngLat(centerCoordinates)
      .addTo(map.current);

    map.current.on("load", () => {
      setIsMapLoading(false);
    });

    map.current.on("idle", () => {
      setIsMapLoading(false);
    });

    // Track map rotation for compass
    map.current.on("rotate", () => {
      setMapBearing(map.current.getBearing());
    });

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      setIsMapLoading(true);
    };
  }, [mapData]);

  // Extract weather properties for overlay
  const weatherProps = mapData?.features?.[0]?.properties || {};
  const windSpeed = weatherProps.wind_speed;
  const windDirection = weatherProps.wind_direction;
  const precipitation = weatherProps.precip;
  const coords = mapData?.features?.[0]?.geometry?.coordinates;

  // Always render map wrapper — default location will be shown when none selected

  return (
    <div className="map-wrapper">
      <div ref={mapContainer} className="map-container" />

      {/* Map loading overlay - show spinner while map is loading */}
      {isMapLoading && (
        <div className="map-loading-overlay">
          <div className="map-spinner"></div>
        </div>
      )}

      {/* Coordinates Display */}
      {coords && (
        <div className="map-coords-overlay">
          <i className="bi bi-geo-alt"></i>
          <span>
            {coords[1].toFixed(4)}°, {coords[0].toFixed(4)}°
          </span>
        </div>
      )}

      <div className="map-controls-overlay">
        <button
          className="map-home-btn"
          onClick={handleHomeClick}
          title="Reset View"
          type="button"
        >
          <i className="bi bi-house-door-fill"></i>
        </button>
      </div>
    </div>
  );
};

export default WeatherMap;
