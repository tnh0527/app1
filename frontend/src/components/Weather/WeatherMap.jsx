import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./WeatherMap.css";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_ACCESS_TOKEN;

// Helper to get wind direction label
// eslint-disable-next-line no-unused-vars
const _getWindDirection = (degrees) => {
  if (degrees === null || degrees === undefined) return "";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};
// Use a neutral world view when no specific coordinates are provided.
// The Weather page/widget is responsible for detecting the user's location
// (IP -> browser geolocation) and will pass coordinates in `mapData` when
// available. Avoid defaulting to a specific city.
const DEFAULT_CENTER = [0, 0];

const WeatherMap = ({ mapData }) => {
  // Ensure accessing `window.caches` won't throw in sandboxed iframes or blocked environments.
  // Some ad blockers or sandbox contexts cause `window.caches` access to throw, and
  // Mapbox internals call the Cache API which can surface errors like:
  // "Failed to execute 'keys' on 'Cache': Entry was not found." — silence by stubbing.
  const ensureSafeCaches = () => {
    try {
      // Accessing window.caches may throw in some restricted environments
      // (e.g., sandboxed iframes). If it throws, create a safe no-op stub.
      // If it's defined and usable, leave it alone.
      if (typeof window === "undefined") return;
      try {
        // Try a benign operation to detect throwing behavior
        void window.caches;
      } catch {
        // Replace with a safe stub that implements the methods Mapbox expects
        // Minimal no-op implementations returning promises.
        console.warn(
          "window.caches is inaccessible; installing safe stub for Mapbox."
        );
        // @ts-ignore
        window.caches = {
          open: async () => ({
            keys: async () => [],
            delete: async () => false,
            put: async () => {},
            match: async () => undefined,
          }),
          delete: async () => false,
        };
      }
    } catch {
      // Best effort only; do not block map creation.
    }
  };

  const mapContainer = useRef(null);
  const map = useRef(null);
  const markerRef = useRef(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [_hasLocation, _setHasLocation] = useState(true); // show default map by default
  // eslint-disable-next-line no-unused-vars
  const [_mapBearing, _setMapBearing] = useState(0); // Track map rotation for compass

  // Home view = where the map should return after pan/zoom.
  const homeViewRef = useRef({
    center: null,
    zoom: 14,
    bearing: 0,
    pitch: 0,
  });

  const SELECTION_ZOOM = 14;

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
    // Protect against environments where accessing window.caches throws
    ensureSafeCaches();
    const rawCoords = mapData?.features?.[0]?.geometry?.coordinates;
    const hasCoords = rawCoords && rawCoords.length >= 2;
    const centerCoordinates = hasCoords ? rawCoords : DEFAULT_CENTER;

    // Track whether we actually have a meaningful location to show.
    _setHasLocation(!!hasCoords);
    setIsMapLoading(true); // show loading while map updates

    if (!MAPBOX_ACCESS_TOKEN) {
      console.error(
        "Missing VITE_REACT_APP_MAPBOX_ACCESS_TOKEN in frontend/.env."
      );
      return;
    }

    // Disable telemetry to prevent "ERR_BLOCKED_BY_CLIENT" errors from ad blockers
    try {
      if (mapboxgl?.setTelemetryEnabled) {
        mapboxgl.setTelemetryEnabled(false);
      }
      if (mapboxgl?.config) {
        mapboxgl.config.TELEMETRY = false;
      }
    } catch (e) {
      console.warn("Could not disable Mapbox telemetry", e);
    }

    if (!mapContainer.current) return;

    // If map already exists, just update location
    if (map.current) {
      // Update home view and pan only when we have real coordinates.
      if (hasCoords) {
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

    // Only create a marker if we actually have coordinates to show.
    if (hasCoords) {
      const markerEl = document.createElement("div");
      markerEl.className = "current-location-marker";
      markerRef.current = new mapboxgl.Marker({ element: markerEl })
        .setLngLat(centerCoordinates)
        .addTo(map.current);
    }

    map.current.on("load", () => {
      setIsMapLoading(false);
    });

    map.current.on("idle", () => {
      setIsMapLoading(false);
    });

    // Track map rotation for compass
    map.current.on("rotate", () => {
      _setMapBearing(map.current.getBearing());
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
