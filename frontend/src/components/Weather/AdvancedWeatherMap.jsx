import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./AdvancedWeatherMap.css";
import { fetchAQIGrid } from "../../api/weatherApi";
import {
  fetchGeoapifyAutocomplete,
  fetchRouting,
  fetchNearbyPlaces as fetchNearbyPlacesProxy,
  fetchMapboxGeocode,
  fetchTileConfig,
  fetchOpenWeather,
} from "../../api/mapProxyApi";

// Mapbox token - this MUST stay in frontend for mapbox-gl to render maps
// Mapbox tokens are designed to be public and restricted by domain/usage
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_ACCESS_TOKEN;

// Default map zoom (higher = closer)
const DEFAULT_ZOOM = 16;

// Zoom constraints to prevent globe view and maintain flat map projection
const MIN_ZOOM = 2;
const MAX_ZOOM = 20;

// Weather layer configurations - Updated with gold accent theme
const WEATHER_LAYERS = {
  precipitation: {
    id: "precipitation",
    name: "Precipitation",
    icon: "bi-cloud-rain-heavy",
    description: "Real-time precipitation radar",
    color: "#60a5fa",
  },
  temperature: {
    id: "temperature",
    name: "Temperature",
    icon: "bi-thermometer-half",
    description: "Surface temperature overlay",
    color: "#ef4444",
  },
  wind: {
    id: "wind",
    name: "Wind Flow",
    icon: "bi-wind",
    description: "Animated wind particles",
    color: "#d4a853",
  },
  clouds: {
    id: "clouds",
    name: "Cloud Cover",
    icon: "bi-clouds",
    description: "Cloud coverage overlay",
    color: "#94a3b8",
  },
  pressure: {
    id: "pressure",
    name: "Pressure",
    icon: "bi-speedometer2",
    description: "Atmospheric pressure",
    color: "#a855f7",
  },
  airquality: {
    id: "airquality",
    name: "Air Quality",
    icon: "bi-lungs",
    description: "Air quality index (AQI)",
    color: "#10b981",
  },
};

// Map styles
const MAP_STYLES = {
  dark: {
    id: "dark",
    name: "Dark",
    url: "mapbox://styles/mapbox/dark-v11",
    icon: "bi-moon-stars",
  },
  satellite: {
    id: "satellite",
    name: "Satellite",
    url: "mapbox://styles/mapbox/satellite-streets-v12",
    icon: "bi-globe-americas",
  },
  terrain: {
    id: "terrain",
    name: "Terrain",
    url: "mapbox://styles/mapbox/outdoors-v12",
    icon: "bi-mountain",
  },
  light: {
    id: "light",
    name: "Light",
    url: "mapbox://styles/mapbox/light-v11",
    icon: "bi-sun",
  },
};

// Helper: Get wind direction label
// eslint-disable-next-line no-unused-vars
const _getWindDirection = (degrees) => {
  if (degrees === null || degrees === undefined) return "";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

// Helper: Format duration (minutes) to hours and minutes display
const formatDuration = (totalMinutes) => {
  if (!totalMinutes || totalMinutes <= 0) return "0 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} hr`;
  return `${hours} hr ${minutes} min`;
};

// Helper: Get timezone offset for coordinates using Mapbox API
// eslint-disable-next-line no-unused-vars
const _getTimezoneOffset = async (lng) => {
  try {
    // Use a simple approximation: 1 hour per 15 degrees longitude
    // This is a basic estimate; for production, use a timezone API
    const offsetHours = Math.round(lng / 15);
    return offsetHours * 60; // Return in minutes
  } catch {
    return 0;
  }
};

// Helper: Format temperature color - Updated with theme colors
// eslint-disable-next-line no-unused-vars
const _getTempColor = (temp) => {
  if (temp <= 32) return "#60a5fa"; // Blue for freezing
  if (temp <= 50) return "#10b981"; // Green for cool
  if (temp <= 68) return "#d4a853"; // Gold for moderate
  if (temp <= 86) return "#fb923c"; // Orange for warm
  return "#ef4444"; // Red for hot
};

// Legend data for different layers - Enhanced with more categories
const LAYER_LEGENDS = {
  precipitation: {
    title: "Precipitation Intensity",
    items: [
      { color: "#10b981", label: "Drizzle" },
      { color: "#22c55e", label: "Light" },
      { color: "#eab308", label: "Moderate" },
      { color: "#f97316", label: "Heavy" },
      { color: "#ef4444", label: "Very Heavy" },
      { color: "#dc2626", label: "Extreme" },
    ],
  },
  temperature: {
    title: "Temperature (°F)",
    items: [
      { color: "#3b82f6", label: "< 20°" },
      { color: "#60a5fa", label: "20-32°" },
      { color: "#10b981", label: "32-50°" },
      { color: "#d4a853", label: "50-68°" },
      { color: "#fb923c", label: "68-86°" },
      { color: "#ef4444", label: "> 86°" },
    ],
  },
  wind: {
    title: "Wind Speed (mph)",
    items: [
      { color: "#d4a853", label: "Calm (< 5)" },
      { color: "#e5c07b", label: "Light (5-10)" },
      { color: "#eab308", label: "Moderate (10-20)" },
      { color: "#fb923c", label: "Fresh (20-30)" },
      { color: "#ef4444", label: "Strong (30-50)" },
      { color: "#a855f7", label: "Storm (> 50)" },
    ],
  },
  clouds: {
    title: "Cloud Cover",
    items: [
      { color: "rgba(148,163,184,0.15)", label: "Clear (0-10%)" },
      { color: "rgba(148,163,184,0.35)", label: "Few (10-30%)" },
      { color: "rgba(148,163,184,0.55)", label: "Scattered (30-60%)" },
      { color: "rgba(148,163,184,0.75)", label: "Broken (60-90%)" },
      { color: "rgba(148,163,184,0.9)", label: "Overcast (90%+)" },
    ],
  },
  pressure: {
    title: "Pressure (hPa)",
    items: [
      { color: "#3b82f6", label: "Very Low (< 1000)" },
      { color: "#60a5fa", label: "Low (1000-1010)" },
      { color: "#a855f7", label: "Normal (1010-1020)" },
      { color: "#f97316", label: "High (1020-1030)" },
      { color: "#ef4444", label: "Very High (> 1030)" },
    ],
  },
  airquality: {
    title: "Air Quality Index",
    items: [
      { color: "#10b981", label: "Good (0-50)" },
      { color: "#eab308", label: "Moderate (51-100)" },
      { color: "#f97316", label: "Sensitive (101-150)" },
      { color: "#ef4444", label: "Unhealthy (151-200)" },
      { color: "#dc2626", label: "Very Unhealthy (201-300)" },
      { color: "#a855f7", label: "Hazardous (300+)" },
    ],
  },
};

// Wind Particle System for iOS-style animated wind visualization
class WindParticleSystem {
  constructor(canvas, map) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.map = map;
    this.particles = [];
    this.windGrid = null;
    this.gridSize = 4; // Reduced grid size to prevent rate limiting
    this.isRunning = false;
    this.animationId = null;
    this.particleCount = 400; // Reduced for cleaner look and fewer calculations
    this.fadeOpacity = 0.96; // Higher fade for smoother trails
    this.lineWidth = 1.2;
    this.particleAge = 100; // Longer particle life for smoother flow
    this.speedFactor = 0.06; // Much slower - color represents speed, not animation
    this.lastFetchBounds = null;
    this.lastFetchTime = 0;
    this.fetchDebounceTimer = null;
    this.zoomLevel = 15;
    this.isFetching = false; // Prevent concurrent fetches

    // Color gradient based on wind speed - Enhanced with more categories
    this.colorStops = [
      { speed: 0, color: [212, 168, 83, 0.35] }, // Calm - Gold (very light)
      { speed: 5, color: [212, 168, 83, 0.45] }, // Light breeze - Gold
      { speed: 10, color: [229, 192, 123, 0.5] }, // Gentle breeze - Light gold
      { speed: 15, color: [234, 179, 8, 0.55] }, // Moderate breeze - Yellow
      { speed: 20, color: [251, 146, 60, 0.6] }, // Fresh breeze - Orange
      { speed: 25, color: [249, 115, 22, 0.65] }, // Strong breeze - Deep orange
      { speed: 30, color: [239, 68, 68, 0.7] }, // High wind - Red
      { speed: 40, color: [220, 38, 38, 0.75] }, // Gale - Deep red
      { speed: 50, color: [168, 85, 247, 0.8] }, // Storm - Purple
      { speed: 65, color: [139, 92, 246, 0.85] }, // Hurricane - Violet
    ];

    // Listen for map movements
    this.onMapMove = this.onMapMove.bind(this);
    this.map.on("moveend", this.onMapMove);
    this.map.on("zoomend", this.onMapMove);
  }

  onMapMove() {
    if (!this.isRunning) return;

    // Update zoom level for particle density adjustment
    this.zoomLevel = this.map.getZoom();
    this.updateParticleSettings();

    // Check if we should skip fetching (rate limit protection)
    const now = Date.now();
    const minFetchInterval = 2000; // Minimum 2 seconds between fetches

    // Check if bounds changed significantly (>15% of viewport)
    const bounds = this.map.getBounds();
    if (this.lastFetchBounds) {
      const latDiff = Math.abs(
        bounds.getCenter().lat - this.lastFetchBounds.getCenter().lat
      );
      const lngDiff = Math.abs(
        bounds.getCenter().lng - this.lastFetchBounds.getCenter().lng
      );
      const latSpan = bounds.getNorth() - bounds.getSouth();
      const lngSpan = bounds.getEast() - bounds.getWest();

      // Skip fetch if movement is minimal and we fetched recently
      if (
        latDiff < latSpan * 0.15 &&
        lngDiff < lngSpan * 0.15 &&
        now - this.lastFetchTime < 30000
      ) {
        return;
      }
    }

    // Debounce fetch calls with longer delay
    if (this.fetchDebounceTimer) {
      clearTimeout(this.fetchDebounceTimer);
    }
    this.fetchDebounceTimer = setTimeout(() => {
      if (now - this.lastFetchTime >= minFetchInterval) {
        this.fetchWindGrid();
      }
    }, 800); // Increased debounce to 800ms
  }

  // Adjust particle settings based on zoom level for better accuracy
  updateParticleSettings() {
    const zoom = this.zoomLevel;

    // Reduced particle counts for better performance
    if (zoom >= 14) {
      this.particleCount = 500;
      this.lineWidth = 1.4;
      this.speedFactor = 0.04;
    } else if (zoom >= 10) {
      this.particleCount = 400;
      this.lineWidth = 1.2;
      this.speedFactor = 0.06;
    } else if (zoom >= 6) {
      this.particleCount = 300;
      this.lineWidth = 1.0;
      this.speedFactor = 0.08;
    } else {
      this.particleCount = 200;
      this.lineWidth = 0.8;
      this.speedFactor = 0.1;
    }
  }

  async fetchWindGrid() {
    // Prevent concurrent fetches
    if (this.isFetching) return;
    this.isFetching = true;

    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();

    // Drastically reduced grid density to prevent rate limiting
    // Max 16 requests (4x4 grid) instead of 64 (8x8)
    const gridPoints = zoom >= 12 ? 4 : zoom >= 8 ? 3 : 3;

    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    const latStep = (north - south) / (gridPoints - 1);
    const lngStep = (east - west) / (gridPoints - 1);

    const fetchPromises = [];

    for (let i = 0; i < gridPoints; i++) {
      for (let j = 0; j < gridPoints; j++) {
        const lat = south + latStep * i;
        const lng = west + lngStep * j;

        // Use proxy API to fetch weather data (keeps API key secure)
        // Client-side cache in fetchOpenWeather prevents redundant calls
        fetchPromises.push(
          fetchOpenWeather(lat, lng)
            .then((data) => ({
              lat,
              lng,
              speed: data.wind?.speed || 0,
              deg: data.wind?.deg || 0,
            }))
            .catch(() => ({ lat, lng, speed: 5, deg: 270 }))
        );
      }
    }

    try {
      const results = await Promise.all(fetchPromises);
      this.windGrid = {
        points: results,
        bounds: { north, south, east, west },
        gridPoints,
      };
      this.lastFetchBounds = bounds;
      this.lastFetchTime = Date.now();
    } catch (error) {
      console.error("Error fetching wind grid:", error);
    } finally {
      this.isFetching = false;
    }
  }

  getWindAtPoint(x, y) {
    if (!this.windGrid || !this.windGrid.points.length) {
      return { u: 0, v: 0, speed: 5 };
    }

    const { bounds, points } = this.windGrid;

    // Use map.unproject for accurate coordinate conversion
    const canvasRect = this.canvas.getBoundingClientRect();
    const topLeft = this.map.project([bounds.west, bounds.north]);
    const bottomRight = this.map.project([bounds.east, bounds.south]);

    // Convert canvas position to map pixel position
    const mapX =
      topLeft.x + (x / canvasRect.width) * (bottomRight.x - topLeft.x);
    const mapY =
      topLeft.y + (y / canvasRect.height) * (bottomRight.y - topLeft.y);

    // Unproject to get accurate lat/lng
    const lngLat = this.map.unproject([mapX, mapY]);
    const lng = lngLat.lng;
    const lat = lngLat.lat;

    // Find nearest grid points and interpolate
    let totalWeight = 0;
    let weightedSpeed = 0;
    let weightedU = 0;
    let weightedV = 0;

    for (const point of points) {
      const dist = Math.sqrt(
        Math.pow(lat - point.lat, 2) + Math.pow(lng - point.lng, 2)
      );
      const weight = 1 / (dist + 0.001);

      const dirTo = (point.deg + 180) % 360;
      const rad = (dirTo * Math.PI) / 180;
      const u = Math.sin(rad) * point.speed;
      const v = Math.cos(rad) * point.speed;

      weightedU += u * weight;
      weightedV += v * weight;
      weightedSpeed += point.speed * weight;
      totalWeight += weight;
    }

    return {
      u: weightedU / totalWeight,
      v: weightedV / totalWeight,
      speed: weightedSpeed / totalWeight,
    };
  }

  getColorForSpeed(speed) {
    for (let i = this.colorStops.length - 1; i >= 0; i--) {
      if (speed >= this.colorStops[i].speed) {
        const current = this.colorStops[i];
        const next = this.colorStops[i + 1] || current;
        const ratio =
          next === current
            ? 1
            : Math.min(
                1,
                (speed - current.speed) / (next.speed - current.speed)
              );

        const r = Math.round(
          current.color[0] + (next.color[0] - current.color[0]) * ratio
        );
        const g = Math.round(
          current.color[1] + (next.color[1] - current.color[1]) * ratio
        );
        const b = Math.round(
          current.color[2] + (next.color[2] - current.color[2]) * ratio
        );
        const a = current.color[3] + (next.color[3] - current.color[3]) * ratio;

        return `rgba(${r}, ${g}, ${b}, ${a})`;
      }
    }
    return `rgba(212, 168, 83, 0.4)`; // Gold default
  }

  setWindData(windSpeed, windDirection) {
    // Initial fallback wind data
    const directionTo = (windDirection + 180) % 360;
    const dirRadians = (directionTo * Math.PI) / 180;

    this.fallbackWind = {
      speed: windSpeed || 5,
      direction: dirRadians,
      u: Math.sin(dirRadians) * (windSpeed || 5),
      v: Math.cos(dirRadians) * (windSpeed || 5),
    };
  }

  createParticle() {
    return {
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      age: Math.floor(Math.random() * this.particleAge),
      maxAge: this.particleAge + Math.floor(Math.random() * 30),
    };
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle());
    }
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
  }

  update() {
    this.particles.forEach((p, i) => {
      const wind = this.getWindAtPoint(p.x, p.y);
      const speedScale = this.speedFactor * Math.min(wind.speed / 10, 2);

      // Add subtle turbulence
      const turbulence = (Math.random() - 0.5) * 0.3;
      const localU = wind.u * speedScale + turbulence;
      const localV = wind.v * speedScale + turbulence;

      p.prevX = p.x;
      p.prevY = p.y;
      p.speed = wind.speed;
      p.x += localU;
      p.y -= localV;

      p.age++;

      if (
        p.x < 0 ||
        p.x > this.canvas.width ||
        p.y < 0 ||
        p.y > this.canvas.height ||
        p.age > p.maxAge
      ) {
        this.particles[i] = this.createParticle();
      }
    });
  }

  draw() {
    // Fade previous frame
    this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.fadeOpacity})`;
    this.ctx.globalCompositeOperation = "destination-out";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = "source-over";

    this.ctx.lineWidth = this.lineWidth;
    this.ctx.lineCap = "round";

    // Draw particles with individual colors based on local wind speed
    this.particles.forEach((p) => {
      if (p.prevX !== undefined && p.age > 0) {
        const ageFade =
          Math.min(1, p.age / 8) *
          Math.max(0, 1 - (p.age - p.maxAge + 15) / 15);
        if (ageFade > 0.1) {
          this.ctx.strokeStyle = this.getColorForSpeed(p.speed || 5);
          this.ctx.beginPath();
          this.ctx.moveTo(p.prevX, p.prevY);
          this.ctx.lineTo(p.x, p.y);
          this.ctx.stroke();
        }
      }
    });
  }

  animate() {
    if (!this.isRunning) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.resize();
    this.initParticles();
    this.fetchWindGrid();
    this.animate();
  }

  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.fetchDebounceTimer) {
      clearTimeout(this.fetchDebounceTimer);
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy() {
    this.stop();
    this.particles = [];
    this.map.off("moveend", this.onMapMove);
    this.map.off("zoomend", this.onMapMove);
  }
}

const AdvancedWeatherMap = ({
  mapData,
  weatherData,
  windData,
  // eslint-disable-next-line no-unused-vars
  airQualityData,
  onRouteCalculated,
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markerRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const _routeLayerRef = useRef(null);
  const windCanvasRef = useRef(null);
  const windParticleSystemRef = useRef(null);
  const aqiCanvasRef = useRef(null);
  const aqiFetchTimerRef = useRef(null);
  const compassRef = useRef(null);
  const isDraggingCompassRef = useRef(false);

  // State
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState("dark");
  const [activeLayers, setActiveLayers] = useState(["precipitation"]);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [mapBearing, setMapBearing] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [_zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState("");
  const [routeDestination, setRouteDestination] = useState("");
  // Store coordinates from autocomplete suggestions to skip geocoding
  const [routeOriginCoords, setRouteOriginCoords] = useState(null);
  const [routeDestCoords, setRouteDestCoords] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [_currentWeatherInfo, _setCurrentWeatherInfo] = useState(null);
  const [cursorPosition, setCursorPosition] = useState(null);

  // Location suggestions state
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [aqiDataEstimated, setAqiDataEstimated] = useState(false);
  const [isLoadingOrigin, setIsLoadingOrigin] = useState(false);
  const [isLoadingDest, setIsLoadingDest] = useState(false);
  const originInputRef = useRef(null);
  const destInputRef = useRef(null);
  const suggestionsDebounceRef = useRef(null);

  // Apple Maps-style Route Features State
  const [routeMode, setRouteMode] = useState("driving"); // driving, walking, transit
  const [recentSearches, setRecentSearches] = useState(() => {
    const saved = localStorage.getItem("awm-recent-searches");
    return saved ? JSON.parse(saved) : [];
  });
  const [savedPlaces, setSavedPlaces] = useState(() => {
    const saved = localStorage.getItem("awm-saved-places");
    return saved
      ? JSON.parse(saved)
      : {
          home: null,
          work: null,
          favorites: [],
        };
  });
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);
  const [nearbySearchRadius, setNearbySearchRadius] = useState(null); // Current search radius in miles
  const [routePanelView, setRoutePanelView] = useState("main"); // main, directions, editPlace, findNearby
  const [selectedNearbyCategory, setSelectedNearbyCategory] = useState(null);
  const [routePanelPosition, setRoutePanelPosition] = useState({
    x: null,
    y: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const routePanelRef = useRef(null);
  const nearbyMarkersRef = useRef([]);
  const originMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  // Find Nearby category constants - Apple Maps style
  const NEARBY_CATEGORIES = useMemo(
    () => [
      {
        id: "restaurant",
        name: "Restaurants",
        icon: "bi-cup-hot",
        color: "#ef4444",
      },
    {
      id: "fast_food",
      name: "Fast Food",
      icon: "bi-box-seam",
      color: "#f97316",
    },
    {
      id: "gas_station",
      name: "Gas Stations",
      icon: "bi-fuel-pump",
      color: "#10b981",
    },
    { id: "coffee", name: "Coffee", icon: "bi-cup-straw", color: "#8b5cf6" },
    { id: "grocery", name: "Groceries", icon: "bi-cart3", color: "#3b82f6" },
    { id: "parking", name: "Parking", icon: "bi-p-circle", color: "#06b6d4" },
    { id: "hotel", name: "Hotels", icon: "bi-building", color: "#ec4899" },
    {
      id: "hospital",
      name: "Hospitals",
      icon: "bi-hospital",
      color: "#dc2626",
    },
    {
      id: "pharmacy",
      name: "Pharmacies",
      icon: "bi-capsule",
      color: "#22c55e",
    },
    { id: "bank", name: "Banks", icon: "bi-bank", color: "#0891b2" },
    { id: "atm", name: "ATMs", icon: "bi-cash-stack", color: "#059669" },
    {
      id: "ev_charging",
      name: "EV Charging",
      icon: "bi-ev-station",
      color: "#84cc16",
    },
    ],
    []
  );
  const [editingPlaceType, setEditingPlaceType] = useState(null); // home, work, or null
  const [routeSteps, setRouteSteps] = useState([]);
  const [alternateRoutes, setAlternateRoutes] = useState([]);
  const [trafficInfo, setTrafficInfo] = useState(null);
  const [routeError, setRouteError] = useState(null); // For walk/transit unavailable

  // Route options state (Apple Maps style - avoid tolls/highways)
  const [avoidTolls, setAvoidTolls] = useState(false);
  const [avoidHighways, setAvoidHighways] = useState(false);

  // Extract coordinates from mapData
  const coordinates = useMemo(() => {
    const rawCoords = mapData?.features?.[0]?.geometry?.coordinates;
    return rawCoords && rawCoords.length >= 2 ? rawCoords : [-95.3698, 29.7604];
  }, [mapData]);

  // Toggle layer
  const toggleLayer = useCallback((layerId) => {
    setActiveLayers((prev) => {
      // If the requested layer is already active, turn off all overlays
      if (prev.includes(layerId)) {
        return [];
      }
      // Enforce a single active overlay at any time
      return [layerId];
    });
  }, []);

  // Change map style
  const changeMapStyle = useCallback((styleId) => {
    setMapStyle(styleId);
    setShowStylePanel(false);
  }, []);

  const updateBearingFromPointer = useCallback((clientX, clientY) => {
    if (!map.current || !compassRef.current) return;

    const rect = compassRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const offsetX = clientX - centerX;
    const offsetY = clientY - centerY;

    let bearing = (Math.atan2(offsetX, -offsetY) * 180) / Math.PI;
    if (bearing < 0) bearing += 360;

    map.current.setBearing(bearing, { duration: 0 });
    setMapBearing(bearing);
  }, []);

  // Fetch and display Air Quality heatmap using WAQI/OWM via backend proxy
  const fetchAndDisplayAQI = useCallback(async () => {
    if (!map.current || !aqiCanvasRef.current) return;

    const canvas = aqiCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const bounds = map.current.getBounds();
    const zoom = map.current.getZoom();

    // Reduced grid points to prevent rate limiting (max 25 requests vs 100 before)
    // Use center-based grid for consistent color mapping across zoom levels
    const gridPoints =
      zoom >= 12
        ? 5 // 25 requests at high zoom
        : zoom >= 9
        ? 4 // 16 requests at medium zoom
        : 3; // 9 requests at low zoom

    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    // AQI color scale (1-5) - Updated with theme colors
    const aqiColors = [
      [16, 185, 129, 0.28], // 1: Good - green (lighter)
      [234, 179, 8, 0.26], // 2: Fair - yellow
      [249, 115, 22, 0.3], // 3: Moderate - orange
      [239, 68, 68, 0.35], // 4: Poor - red
      [168, 85, 247, 0.38], // 5: Very Poor - purple
    ];

    try {
      // Use the weather API service for AQI grid data
      const aqiData = await fetchAQIGrid(
        { north, south, east, west },
        gridPoints
      );

      // Check if any data points are estimated/mock
      const hasEstimatedData = aqiData.some((point) => point.isMock);
      setAqiDataEstimated(hasEstimatedData);

      // Resize canvas to match container
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate larger radius for better coverage with fewer points
      const cellWidth = canvas.width / (gridPoints - 1);
      const cellHeight = canvas.height / (gridPoints - 1);
      const radius = Math.max(cellWidth, cellHeight) * 1.5; // Increased from 1.2 to 1.5

      aqiData.forEach((point) => {
        // Convert lat/lng to pixel coordinates using map's project method for accuracy
        const pixelPoint = map.current.project([point.lng, point.lat]);
        const canvasTopLeft = map.current.project([west, north]);

        // Calculate canvas position relative to top-left
        const x = pixelPoint.x - canvasTopLeft.x;
        const y = pixelPoint.y - canvasTopLeft.y;

        const color = aqiColors[Math.min(point.aqi - 1, 4)];

        // Create radial gradient with smoother falloff
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(
          0,
          `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`
        );
        gradient.addColorStop(
          0.6,
          `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] * 0.4})`
        );
        gradient.addColorStop(
          1,
          `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`
        );

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Remove any existing AQI markers (legacy cleanup)
      document.querySelectorAll(".aqi-marker").forEach((el) => el.remove());
    } catch (error) {
      console.error("Error fetching AQI data:", error);
    }
  }, []);

  // Update AQI heatmap on map move
  const setupAQIMapListeners = useCallback(() => {
    if (!map.current) return;

    let lastBounds = null;
    let lastZoom = null;

    const updateAQI = () => {
      if (!activeLayers.includes("airquality")) return;

      const currentBounds = map.current.getBounds();
      const currentZoom = map.current.getZoom();

      // Only update if bounds changed significantly (>10% of viewport) or zoom changed
      if (lastBounds && lastZoom === currentZoom) {
        const latDiff = Math.abs(
          currentBounds.getCenter().lat - lastBounds.getCenter().lat
        );
        const lngDiff = Math.abs(
          currentBounds.getCenter().lng - lastBounds.getCenter().lng
        );
        const latSpan = currentBounds.getNorth() - currentBounds.getSouth();
        const lngSpan = currentBounds.getEast() - currentBounds.getWest();

        // Skip update if movement is less than 10% of viewport
        if (latDiff < latSpan * 0.1 && lngDiff < lngSpan * 0.1) {
          return;
        }
      }

      if (aqiFetchTimerRef.current) {
        clearTimeout(aqiFetchTimerRef.current);
      }
      aqiFetchTimerRef.current = setTimeout(() => {
        lastBounds = map.current.getBounds();
        lastZoom = map.current.getZoom();
        fetchAndDisplayAQI();
      }, 800); // Increased debounce to 800ms to reduce rapid requests
    };

    map.current.on("moveend", updateAQI);
    map.current.on("zoomend", updateAQI);

    return () => {
      if (map.current) {
        map.current.off("moveend", updateAQI);
        map.current.off("zoomend", updateAQI);
      }
    };
  }, [activeLayers, fetchAndDisplayAQI]);

  // Tile config cache (fetched from backend)
  const tileConfigRef = useRef(null);
  const tileConfigLoadingRef = useRef(false);

  // Add weather tile layer to map
  const addWeatherLayer = useCallback(
    async (layerId) => {
      if (!map.current) return;

      // Special handling for wind - use particle animation instead of tile layer
      if (layerId === "wind") {
        if (windCanvasRef.current && !windParticleSystemRef.current) {
          windParticleSystemRef.current = new WindParticleSystem(
            windCanvasRef.current,
            map.current
          );
        }
        if (windParticleSystemRef.current) {
          // Get wind data from props or weather data
          const windSpeed = windData?.speed || weatherData?.wind?.speed || 10;
          const windDirection = windData?.deg || weatherData?.wind?.deg || 270;
          windParticleSystemRef.current.setWindData(windSpeed, windDirection);
          windParticleSystemRef.current.start();
        }
        return;
      }

      // Special handling for air quality - use marker-based approach
      if (layerId === "airquality") {
        fetchAndDisplayAQI();
        return;
      }

      // Check if map style is loaded before adding tile layers
      if (!map.current.isStyleLoaded()) {
        console.warn(`Map style not loaded yet, deferring layer: ${layerId}`);
        return;
      }

      // Fetch tile config from backend (with caching)
      if (!tileConfigRef.current && !tileConfigLoadingRef.current) {
        tileConfigLoadingRef.current = true;
        try {
          tileConfigRef.current = await fetchTileConfig();
        } catch (error) {
          console.error("Failed to fetch tile config:", error);
          tileConfigLoadingRef.current = false;
          return;
        }
        tileConfigLoadingRef.current = false;
      }

      if (!tileConfigRef.current) {
        console.warn("Tile config not available");
        return;
      }

      // Get current zoom level for dynamic opacity/quality adjustment
      const currentZoom = map.current.getZoom();

      // Calculate zoom-based opacity - more opacity when zoomed in for better detail
      const getZoomBasedOpacity = (baseOpacity) => {
        if (currentZoom >= 12) return Math.min(baseOpacity + 0.15, 0.9);
        if (currentZoom >= 10) return Math.min(baseOpacity + 0.1, 0.85);
        if (currentZoom >= 8) return baseOpacity + 0.05;
        if (currentZoom >= 6) return baseOpacity;
        return Math.max(baseOpacity - 0.1, 0.4); // Lower opacity when very zoomed out
      };

      const config = tileConfigRef.current[layerId];
      if (!config) return;

      const sourceId = `weather-${layerId}-source`;
      const layerMapId = `weather-${layerId}-layer`;

      // Remove existing layer/source if present
      if (map.current.getLayer(layerMapId)) {
        map.current.removeLayer(layerMapId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }

      // Add new source and layer
      map.current.addSource(sourceId, {
        type: "raster",
        tiles: [config.url],
        tileSize: 256,
      });

      map.current.addLayer({
        id: layerMapId,
        type: "raster",
        source: sourceId,
        paint: {
          "raster-opacity": getZoomBasedOpacity(config.opacity),
          "raster-fade-duration": 300,
        },
      });
    },
    [windData, weatherData, fetchAndDisplayAQI]
  );

  // Remove weather layer from map
  const removeWeatherLayer = useCallback((layerId) => {
    if (!map.current) return;

    // Special handling for wind particle system
    if (layerId === "wind") {
      if (windParticleSystemRef.current) {
        windParticleSystemRef.current.stop();
      }
      return;
    }

    // Special handling for air quality heatmap
    if (layerId === "airquality") {
      document.querySelectorAll(".aqi-marker").forEach((el) => el.remove());
      if (aqiCanvasRef.current) {
        const ctx = aqiCanvasRef.current.getContext("2d");
        ctx.clearRect(
          0,
          0,
          aqiCanvasRef.current.width,
          aqiCanvasRef.current.height
        );
      }
      if (aqiFetchTimerRef.current) {
        clearTimeout(aqiFetchTimerRef.current);
      }
      return;
    }

    const sourceId = `weather-${layerId}-source`;
    const layerMapId = `weather-${layerId}-layer`;

    if (map.current.getLayer(layerMapId)) {
      map.current.removeLayer(layerMapId);
    }
    if (map.current.getSource(sourceId)) {
      map.current.removeSource(sourceId);
    }
  }, []);

  // Calculate route using Geoapify Routing API (via backend proxy)
  const calculateRoute = useCallback(async () => {
    if (!routeOrigin || !routeDestination || !map.current) return;

    setIsCalculatingRoute(true);
    setRouteInfo(null);
    setRouteError(null);

    try {
      // Geocode helper - only used if we don't have coordinates from suggestion
      const geocodeLocation = async (location) => {
        const data = await fetchMapboxGeocode(
          location,
          coordinates[0],
          coordinates[1],
          1
        );
        return data.features?.[0]?.center;
      };

      // Use stored coordinates from Geoapify autocomplete if available
      // Otherwise fall back to geocoding via Mapbox
      const originCoords =
        routeOriginCoords || (await geocodeLocation(routeOrigin));
      const destCoords =
        routeDestCoords || (await geocodeLocation(routeDestination));

      if (!originCoords || !destCoords) {
        alert("Could not find one or both locations. Please try again.");
        setIsCalculatingRoute(false);
        return;
      }

      // Save destination to recent searches
      saveRecentSearch({
        name: routeDestination.split(",")[0],
        fullName: routeDestination,
        coordinates: destCoords,
      });

      // Map route mode to Geoapify mode
      // Geoapify modes: drive, walk, bicycle, transit, approximated_transit
      const geoapifyMode =
        routeMode === "walking"
          ? "walk"
          : routeMode === "cycling"
          ? "bicycle"
          : routeMode === "transit"
          ? "transit"
          : "drive";

      // Build avoid parameter for tolls/highways (only for driving modes)
      let avoidParams = [];
      if (geoapifyMode === "drive") {
        if (avoidTolls) avoidParams.push("tolls");
        if (avoidHighways) avoidParams.push("highways");
      }
      const avoidString = avoidParams.length > 0 ? avoidParams.join("|") : "";

      // Geoapify uses lat,lon format (opposite of Mapbox which uses lon,lat)
      const waypoints = `${originCoords[1]},${originCoords[0]}|${destCoords[1]},${destCoords[0]}`;

      // Get route from Geoapify Routing API via backend proxy
      const routeData = await fetchRouting(
        waypoints,
        geoapifyMode,
        avoidString
      );

      // Handle errors from Geoapify
      if (routeData.error || routeData.statusCode >= 400) {
        console.error("Geoapify routing error:", routeData);
        if (routeMode === "walking") {
          setRouteError({
            type: "walking",
            message: "Walking directions unavailable",
            reason:
              "The distance may be too far for walking, or no pedestrian path exists.",
          });
        } else if (routeMode === "transit") {
          setRouteError({
            type: "transit",
            message: "Public transit directions unavailable",
            reason:
              "Transit routing requires integration with local transit agencies. Try using a dedicated transit app.",
          });
        } else {
          setRouteError({
            type: "general",
            message: "No route found",
            reason: "Could not find a route between these locations.",
          });
        }
        setRoutePanelView("directions");
        setIsCalculatingRoute(false);
        return;
      }

      // Geoapify returns features with properties containing legs array
      const feature = routeData.features[0];
      const properties = feature.properties;
      const geometry = feature.geometry;

      // Geoapify returns MultiLineString, need to flatten to LineString for Mapbox display
      let routeCoordinates = [];
      if (geometry.type === "MultiLineString") {
        // Flatten all line segments into one array
        geometry.coordinates.forEach((lineString) => {
          routeCoordinates = routeCoordinates.concat(lineString);
        });
      } else if (geometry.type === "LineString") {
        routeCoordinates = geometry.coordinates;
      }

      const routeGeometry = {
        type: "LineString",
        coordinates: routeCoordinates,
      };

      // Geoapify doesn't return alternates in the same way, so clear alternate routes
      setAlternateRoutes([]);

      // Remove existing route layers
      ["route-layer", "route-layer-alt-1", "route-layer-alt-2"].forEach(
        (layerId) => {
          if (map.current.getLayer(layerId)) {
            map.current.removeLayer(layerId);
          }
        }
      );
      ["route-source", "route-source-alt-1", "route-source-alt-2"].forEach(
        (sourceId) => {
          if (map.current.getSource(sourceId)) {
            map.current.removeSource(sourceId);
          }
        }
      );

      // Add main route to map
      map.current.addSource("route-source", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: routeGeometry,
        },
      });

      // Route color based on avoid settings
      const routeColor = avoidTolls ? "#22c55e" : "#d4a853"; // Green for toll-free, gold for normal

      map.current.addLayer({
        id: "route-layer",
        type: "line",
        source: "route-source",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": routeColor,
          "line-width": 6,
          "line-opacity": 0.95,
        },
      });

      // Fit map to route bounds
      const bounds = new mapboxgl.LngLatBounds();
      routeCoordinates.forEach((coord) => bounds.extend(coord));
      map.current.fitBounds(bounds, { padding: 80 });

      // Remove existing route markers
      if (originMarkerRef.current) {
        originMarkerRef.current.remove();
        originMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }

      // Add origin marker (green circle)
      const originEl = document.createElement("div");
      originEl.className = "route-origin-marker";
      originEl.innerHTML = `
        <div style="
          width: 24px;
          height: 24px;
          background: #22c55e;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
        </div>
      `;
      originMarkerRef.current = new mapboxgl.Marker({
        element: originEl,
        anchor: "center",
      })
        .setLngLat(originCoords)
        .addTo(map.current);

      // Add destination marker (red pin with flag icon)
      const destEl = document.createElement("div");
      destEl.className = "route-dest-marker";
      destEl.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
        ">
          <div style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            border: 3px solid white;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            box-shadow: 0 3px 10px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <i class="bi bi-flag-fill" style="
              transform: rotate(45deg);
              color: white;
              font-size: 14px;
            "></i>
          </div>
          <div style="
            width: 4px;
            height: 8px;
            background: #dc2626;
            margin-top: -2px;
            border-radius: 0 0 2px 2px;
          "></div>
        </div>
      `;
      destMarkerRef.current = new mapboxgl.Marker({
        element: destEl,
        anchor: "bottom",
      })
        .setLngLat(destCoords)
        .addTo(map.current);

      // Geoapify: time in seconds, distance in meters
      const durationMinutes = Math.round(properties.time / 60);
      const distanceMiles = (properties.distance / 1609.34).toFixed(1);

      // Extract steps from legs (Geoapify format)
      const legs = properties.legs || [];
      const steps = legs.length > 0 ? legs[0].steps || [] : [];

      // Format route steps for turn-by-turn directions (Geoapify format)
      const formattedSteps = steps.map((step, idx) => ({
        id: idx,
        instruction: step.instruction?.text || "",
        distance: (step.distance / 1609.34).toFixed(2),
        duration: Math.round(step.time / 60),
        modifier: step.instruction?.transition_instruction || "",
        type: step.instruction?.type || "",
        name: step.name || step.instruction?.street_name || "",
      }));

      setRouteSteps(formattedSteps);

      // Geoapify doesn't provide real-time traffic data, so set basic traffic info
      setTrafficInfo({
        delay: 0,
        condition: "unknown",
      });

      // Calculate arrival time based on origin location's approximate timezone
      // Using the origin coordinates to estimate local time
      const originLng = originCoords[0];
      const timezoneOffsetHours = Math.round(originLng / 15); // Rough timezone estimate
      const now = new Date();
      const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
      const localTime = new Date(
        utcTime + timezoneOffsetHours * 3600000 + durationMinutes * 60000
      );

      setRouteInfo({
        duration: durationMinutes,
        durationFormatted: formatDuration(durationMinutes),
        distance: distanceMiles,
        steps: steps.length,
        arrivalTime: localTime.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        originTimezone: timezoneOffsetHours,
        avoidTolls: avoidTolls,
        avoidHighways: avoidHighways,
      });

      // Switch to directions view
      setRoutePanelView("directions");

      if (onRouteCalculated) {
        onRouteCalculated({
          origin: routeOrigin,
          destination: routeDestination,
          duration: durationMinutes,
          distance: distanceMiles,
        });
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      setRouteError({
        type: "general",
        message: "Route calculation failed",
        reason:
          "An error occurred while calculating the route. Please try again.",
      });
      setRoutePanelView("directions");
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [
    routeOrigin,
    routeDestination,
    routeOriginCoords,
    routeDestCoords,
    routeMode,
    avoidTolls,
    avoidHighways,
    onRouteCalculated,
    coordinates,
  ]);

  // Clear route
  const clearRoute = useCallback(() => {
    if (!map.current) return;

    if (map.current.getLayer("route-layer")) {
      map.current.removeLayer("route-layer");
    }
    if (map.current.getSource("route-source")) {
      map.current.removeSource("route-source");
    }

    // Remove route markers
    if (originMarkerRef.current) {
      originMarkerRef.current.remove();
      originMarkerRef.current = null;
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }

    setRouteInfo(null);
    setRouteError(null);
    setRouteOrigin("");
    setRouteDestination("");
    // Clear stored coordinates
    setRouteOriginCoords(null);
    setRouteDestCoords(null);
    setRouteSteps([]);
    setAlternateRoutes([]);
    setRoutePanelView("main");
  }, []);

  // Save recent search to localStorage
  function saveRecentSearch(location) {
    setRecentSearches((prev) => {
      const filtered = prev.filter(
        (item) => item.fullName !== location.fullName
      );
      const updated = [location, ...filtered].slice(0, 10); // Keep last 10
      localStorage.setItem("awm-recent-searches", JSON.stringify(updated));
      return updated;
    });
  }

  // Save place (home/work) to localStorage
  const savePlace = useCallback((type, place) => {
    setSavedPlaces((prev) => {
      const updated = { ...prev, [type]: place };
      localStorage.setItem("awm-saved-places", JSON.stringify(updated));
      return updated;
    });
    setEditingPlaceType(null);
    setRoutePanelView("main");
  }, []);

  // Fetch nearby places using backend proxy - supports category filtering with zoom-aware radius
  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fetch nearby places using Geoapify Places API via backend proxy
  const fetchNearbyPlaces = useCallback(
    async (category = null) => {
      if (!coordinates || !map.current) return;

      // Map UI categories to Geoapify categories
      // Reference: https://apidocs.geoapify.com/docs/places/#categories
      const categoryMapping = {
        restaurant: "catering.restaurant",
        fast_food: "catering.fast_food",
        gas_station: "service.vehicle.fuel",
        coffee: "catering.cafe",
        grocery: "commercial.supermarket,commercial.food_and_drink",
        parking: "parking.cars",
        hotel: "accommodation.hotel,accommodation.motel",
        hospital: "healthcare.hospital",
        pharmacy: "healthcare.pharmacy,commercial.health_and_beauty.pharmacy",
        bank: "service.financial.bank",
        atm: "service.financial.atm",
        ev_charging: "service.vehicle.charging_station",
      };

      setIsLoadingNearby(true);
      try {
        // Dynamic search radius based on zoom level (Apple Maps style)
        const currentZoom = map.current.getZoom();
        let searchRadiusMiles;

        if (currentZoom >= 16) {
          searchRadiusMiles = 1;
        } else if (currentZoom >= 14) {
          searchRadiusMiles = 2;
        } else if (currentZoom >= 12) {
          searchRadiusMiles = 5;
        } else if (currentZoom >= 10) {
          searchRadiusMiles = 10;
        } else if (currentZoom >= 8) {
          searchRadiusMiles = 20;
        } else {
          searchRadiusMiles = 30;
        }

        const radiusMeters = Math.round(searchRadiusMiles * 1609.34);
        setNearbySearchRadius(searchRadiusMiles);

        // Get coordinates
        const lon = coordinates[0];
        const lat = coordinates[1];

        // Determine which categories to search
        let geoapifyCategories;
        if (category) {
          geoapifyCategories = categoryMapping[category] || "catering";
        } else {
          // Default: show mix of common categories
          geoapifyCategories =
            "catering.restaurant,service.vehicle.fuel,catering.cafe";
        }

        console.log("[Nearby Search] Parameters:", {
          currentZoom,
          searchRadiusMiles,
          radiusMeters,
          category,
          geoapifyCategories,
          coordinates,
        });

        // Use backend proxy for Geoapify Places API
        const data = await fetchNearbyPlacesProxy(
          geoapifyCategories,
          lat,
          lon,
          radiusMeters,
          20
        );

        if (data.error || !data.features) {
          console.error("Geoapify Places error:", data);
          setNearbyPlaces([]);
          return;
        }

        // Transform Geoapify response to our format
        const places = data.features.map((feature) => {
          const props = feature.properties;
          const distance =
            props.distance || calculateDistance(lat, lon, props.lat, props.lon);

          return {
            id:
              props.place_id ||
              feature.properties.osm_id ||
              Math.random().toString(36),
            name: props.name || props.address_line1 || "Unknown Place",
            fullName: props.formatted || props.address_line1,
            coordinates: [props.lon, props.lat], // Mapbox format: [lon, lat]
            category:
              category || props.categories?.[0]?.split(".").pop() || "place",
            distance,
            distanceMiles: (distance / 1609.34).toFixed(1),
            address: props.address_line2 || props.street || props.city || "",
            // Additional Geoapify properties
            website: props.website,
            phone: props.contact?.phone,
            openingHours: props.opening_hours,
          };
        });

        // Sort by distance
        places.sort((a, b) => a.distance - b.distance);

        console.log("[Nearby Search] Results:", {
          total: data.features.length,
          places: places.slice(0, 5),
        });

        // If no results found and we have a category, try expanding radius
        if (places.length === 0 && category && searchRadiusMiles < 30) {
          const expandedRadius = Math.min(searchRadiusMiles * 2, 30);
          const expandedRadiusMeters = Math.round(expandedRadius * 1609.34);
          setNearbySearchRadius(expandedRadius);

          console.log(
            "[Nearby Search] Expanding radius to:",
            expandedRadius,
            "miles"
          );

          // Use backend proxy for expanded search
          const expandedData = await fetchNearbyPlacesProxy(
            geoapifyCategories,
            lat,
            lon,
            expandedRadiusMeters,
            20
          );

          if (expandedData.features) {
            const expandedPlaces = expandedData.features.map((feature) => {
              const props = feature.properties;
              const distance =
                props.distance ||
                calculateDistance(lat, lon, props.lat, props.lon);

              return {
                id: props.place_id || Math.random().toString(36),
                name: props.name || props.address_line1 || "Unknown Place",
                fullName: props.formatted || props.address_line1,
                coordinates: [props.lon, props.lat],
                category:
                  category ||
                  props.categories?.[0]?.split(".").pop() ||
                  "place",
                distance,
                distanceMiles: (distance / 1609.34).toFixed(1),
                address:
                  props.address_line2 || props.street || props.city || "",
                website: props.website,
                phone: props.contact?.phone,
                openingHours: props.opening_hours,
              };
            });
            expandedPlaces.sort((a, b) => a.distance - b.distance);
            setNearbyPlaces(expandedPlaces.slice(0, 20));
          } else {
            setNearbyPlaces([]);
          }
        } else {
          setNearbyPlaces(places.slice(0, 20));
        }
      } catch (error) {
        console.error("Error fetching nearby places:", error);
        setNearbyPlaces([]);
      } finally {
        setIsLoadingNearby(false);
      }
    },
    [coordinates]
  );

  // Use saved place as destination
  const applySavedPlace = useCallback((place, asOrigin = false) => {
    if (asOrigin) {
      setRouteOrigin(place.fullName);
    } else {
      setRouteDestination(place.fullName);
    }
  }, []);

  // Use recent search
  const applyRecentSearch = useCallback((search, asOrigin = false) => {
    if (asOrigin) {
      setRouteOrigin(search.fullName);
    } else {
      setRouteDestination(search.fullName);
    }
  }, []);

  // Clear recent searches
  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem("awm-recent-searches");
  }, []);

  // Fetch location suggestions using Geoapify Autocomplete API via backend proxy
  // Geoapify provides rich POI data with place names (e.g., "University of Houston")
  // Falls back to Mapbox Geocoding if Geoapify fails
  const fetchSuggestions = useCallback(
    async (query, type) => {
      if (!query || query.length < 2) {
        if (type === "origin") {
          setOriginSuggestions([]);
          setShowOriginSuggestions(false);
        } else {
          setDestSuggestions([]);
          setShowDestSuggestions(false);
        }
        return;
      }

      if (type === "origin") {
        setIsLoadingOrigin(true);
      } else {
        setIsLoadingDest(true);
      }

      try {
        // Use backend proxy for Geoapify Autocomplete (primary)
        // coordinates[0] = lon, coordinates[1] = lat
        const suggestions = await fetchGeoapifyAutocomplete(
          query,
          coordinates[1], // latitude for bias
          coordinates[0], // longitude for bias
          6 // limit
        );

        // Geoapify response is already transformed by backend proxy
        // Each suggestion has: id, name, fullName, secondaryText, coordinates, category, type
        if (suggestions && suggestions.length > 0) {
          if (type === "origin") {
            setOriginSuggestions(suggestions);
            setShowOriginSuggestions(true);
          } else {
            setDestSuggestions(suggestions);
            setShowDestSuggestions(true);
          }
        } else {
          // No results from Geoapify, try Mapbox fallback
          throw new Error("No Geoapify results");
        }
      } catch (error) {
        console.error(
          "Geoapify autocomplete error, trying Mapbox fallback:",
          error
        );
        // Fallback to Mapbox Geocoding via backend proxy
        try {
          const data = await fetchMapboxGeocode(
            query,
            coordinates[0], // proximity_lon
            coordinates[1], // proximity_lat
            5
          );

          const suggestions =
            data.features?.map((feature) => ({
              id: feature.id,
              name: feature.text || feature.place_name?.split(",")[0] || "",
              fullName: feature.place_name || "",
              secondaryText:
                feature.place_name?.split(",").slice(1).join(",").trim() || "",
              coordinates: feature.center,
            })) || [];

          if (type === "origin") {
            setOriginSuggestions(suggestions);
            setShowOriginSuggestions(suggestions.length > 0);
          } else {
            setDestSuggestions(suggestions);
            setShowDestSuggestions(suggestions.length > 0);
          }
        } catch (fallbackError) {
          console.error("Mapbox fallback also failed:", fallbackError);
          if (type === "origin") {
            setOriginSuggestions([]);
            setShowOriginSuggestions(false);
          } else {
            setDestSuggestions([]);
            setShowDestSuggestions(false);
          }
        }
      } finally {
        if (type === "origin") {
          setIsLoadingOrigin(false);
        } else {
          setIsLoadingDest(false);
        }
      }
    },
    [coordinates]
  );

  // Debounced suggestion fetch
  const handleLocationInput = useCallback(
    (value, type) => {
      if (type === "origin") {
        setRouteOrigin(value);
        // Clear stored coords when user types manually (will geocode on submit)
        setRouteOriginCoords(null);
      } else {
        setRouteDestination(value);
        // Clear stored coords when user types manually (will geocode on submit)
        setRouteDestCoords(null);
      }

      // Clear existing debounce
      if (suggestionsDebounceRef.current) {
        clearTimeout(suggestionsDebounceRef.current);
      }

      // Debounce API calls
      suggestionsDebounceRef.current = setTimeout(() => {
        fetchSuggestions(value, type);
      }, 300);
    },
    [fetchSuggestions]
  );

  // Select a suggestion - store coordinates if available from Geoapify
  const selectSuggestion = useCallback((suggestion, type) => {
    if (type === "origin") {
      setRouteOrigin(suggestion.fullName || suggestion.name);
      // Store coordinates from Geoapify (format: [lon, lat])
      setRouteOriginCoords(suggestion.coordinates || null);
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
    } else {
      setRouteDestination(suggestion.fullName || suggestion.name);
      // Store coordinates from Geoapify (format: [lon, lat])
      setRouteDestCoords(suggestion.coordinates || null);
      setDestSuggestions([]);
      setShowDestSuggestions(false);
    }
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        originInputRef.current &&
        !originInputRef.current.contains(e.target)
      ) {
        setShowOriginSuggestions(false);
      }
      if (destInputRef.current && !destInputRef.current.contains(e.target)) {
        setShowDestSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Home view
  const handleHomeClick = useCallback(() => {
    if (!map.current) return;
    map.current.flyTo({
      center: coordinates,
      zoom: DEFAULT_ZOOM,
      bearing: 0,
      pitch: 0,
      duration: 1500,
      essential: true,
    });
  }, [coordinates]);

  // Initialize map
  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN || !mapContainer.current) return;

    // Explicitly disable Mapbox telemetry/event pings to avoid ad-blocked POST errors
    try {
      if (mapboxgl?.setTelemetryEnabled) {
        mapboxgl.setTelemetryEnabled(false);
      }
      if (mapboxgl?.config) {
        mapboxgl.config.TELEMETRY = false;
      }
    } catch (err) {
      console.warn("Could not disable Mapbox telemetry", err);
    }

    setIsMapLoading(true);

    // Clean up existing map
    if (map.current) {
      map.current.remove();
      map.current = null;
    }

    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: MAP_STYLES[mapStyle].url,
      center: coordinates,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      pitch: 0,
      bearing: 0,
      antialias: true,
      attributionControl: false,
      collectResourceTiming: false,
      // Use mercator projection for flat map (prevents globe view)
      projection: "mercator",
      // Disable telemetry to prevent ERR_BLOCKED_BY_CLIENT errors
      trackResize: true,
      // Render world copies to prevent edge issues when panning
      renderWorldCopies: true,
    });

    map.current.dragRotate.enable();
    map.current.touchZoomRotate.enableRotation();

    // Disable Mapbox telemetry
    if (mapboxgl.prewarm) {
      mapboxgl.prewarm();
    }
    // Clear any queued events
    if (map.current._requestManager) {
      map.current._requestManager._skuToken = "";
    }

    // Add navigation control
    map.current.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right"
    );

    // Add scale control
    map.current.addControl(
      new mapboxgl.ScaleControl({ maxWidth: 100 }),
      "bottom-left"
    );

    // Add location marker with proper anchor
    const markerEl = document.createElement("div");
    markerEl.className = "advanced-location-marker";
    markerRef.current = new mapboxgl.Marker({
      element: markerEl,
      anchor: "center",
    })
      .setLngLat(coordinates)
      .addTo(map.current);

    // Map events
    map.current.on("load", () => {
      setIsMapLoading(false);
    });

    // Add active weather layers after style loads
    map.current.on("styledata", () => {
      if (map.current.isStyleLoaded()) {
        // Add active weather layers
        activeLayers.forEach((layerId) => {
          addWeatherLayer(layerId);
        });
      }
    });

    map.current.on("rotate", () => {
      setMapBearing(map.current.getBearing());
    });

    map.current.on("zoom", () => {
      setZoomLevel(Math.round(map.current.getZoom()));
    });

    map.current.on("mousemove", (e) => {
      setCursorPosition({
        lng: e.lngLat.lng.toFixed(4),
        lat: e.lngLat.lat.toFixed(4),
      });
    });

    return () => {
      if (windParticleSystemRef.current) {
        windParticleSystemRef.current.destroy();
        windParticleSystemRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapStyle, coordinates]);

  useEffect(() => {
    const compassEl = compassRef.current;
    if (!compassEl) return;

    const handlePointerMove = (e) => {
      if (!isDraggingCompassRef.current) return;
      e.preventDefault();
      updateBearingFromPointer(e.clientX, e.clientY);
    };

    const handlePointerUp = () => {
      isDraggingCompassRef.current = false;
      compassEl.classList.remove("dragging");
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };

    const handlePointerDown = (e) => {
      e.preventDefault();
      isDraggingCompassRef.current = true;
      compassEl.classList.add("dragging");
      updateBearingFromPointer(e.clientX, e.clientY);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    };

    compassEl.addEventListener("pointerdown", handlePointerDown);

    return () => {
      compassEl.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [updateBearingFromPointer]);

  // Update weather layers when activeLayers changes
  useEffect(() => {
    if (!map.current || isMapLoading) return;

    // Ensure map style is loaded before modifying layers
    if (!map.current.isStyleLoaded()) return;

    // Get all possible layer IDs
    const allLayers = Object.keys(WEATHER_LAYERS);

    // Remove inactive layers
    allLayers.forEach((layerId) => {
      if (!activeLayers.includes(layerId)) {
        removeWeatherLayer(layerId);
      }
    });

    // Add active layers
    activeLayers.forEach((layerId) => {
      addWeatherLayer(layerId);
    });
  }, [activeLayers, isMapLoading, addWeatherLayer, removeWeatherLayer]);

  // Update marker position when coordinates change
  useEffect(() => {
    if (markerRef.current && map.current) {
      markerRef.current.setLngLat(coordinates);
      map.current.flyTo({
        center: coordinates,
        zoom: DEFAULT_ZOOM,
        duration: 1500,
        essential: true,
      });
    }
  }, [coordinates]);

  // Draggable panel handlers
  const handlePanelMouseDown = useCallback((e) => {
    // Only allow dragging from the header area
    if (!e.target.closest(".awm-panel-header")) return;
    if (e.target.closest("button")) return; // Don't drag when clicking buttons

    e.preventDefault();
    e.stopPropagation();

    const panel = routePanelRef.current;
    if (!panel) return;

    const initialRect = panel.getBoundingClientRect();
    const mapWrapper = panel.closest(".awm-map-wrapper");
    if (!mapWrapper) return;

    const offsetX = e.clientX - initialRect.left;
    const offsetY = e.clientY - initialRect.top;

    setIsDragging(true);

    const handleMove = (moveEvent) => {
      if (!panel || !mapWrapper) return;

      const currentPanelRect = panel.getBoundingClientRect();
      const currentContainerRect = mapWrapper.getBoundingClientRect();

      // Calculate new position relative to container
      let newX = moveEvent.clientX - currentContainerRect.left - offsetX;
      let newY = moveEvent.clientY - currentContainerRect.top - offsetY;

      // Constrain to container bounds with padding
      const maxX = currentContainerRect.width - currentPanelRect.width - 10;
      const maxY = currentContainerRect.height - currentPanelRect.height - 10;

      newX = Math.max(10, Math.min(newX, maxX));
      newY = Math.max(10, Math.min(newY, maxY));

      setRoutePanelPosition({ x: newX, y: newY });
    };

    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, []);

  // Reset panel position when closed
  const handleClosePanelAndReset = useCallback(() => {
    // Clear nearby markers
    nearbyMarkersRef.current.forEach((marker) => marker.remove());
    nearbyMarkersRef.current = [];

    setShowRoutePanel(false);
    setRoutePanelPosition({ x: null, y: null });
    setRoutePanelView("main");
    setSelectedNearbyCategory(null);
    setNearbyPlaces([]);
    setIsDragging(false);
  }, []);

  // Open route panel with proper initialization
  const openRoutePanel = useCallback(() => {
    // Reset all state for clean open
    setRoutePanelPosition({ x: null, y: null });
    setRoutePanelView("main");
    setSelectedNearbyCategory(null);
    setIsDragging(false);
    // Close other panels
    setShowLayerPanel(false);
    setShowStylePanel(false);
    // Open route panel
    setShowRoutePanel(true);
    // Fetch nearby places
    fetchNearbyPlaces();
  }, [fetchNearbyPlaces]);

  // Refetch nearby places when map zoom changes (Apple Maps style)
  useEffect(() => {
    if (!map.current || !showRoutePanel) return;

    const handleZoomEnd = () => {
      // Only refetch if we're in the findNearby view or main view with a category selected
      if (routePanelView === "findNearby" && selectedNearbyCategory) {
        fetchNearbyPlaces(selectedNearbyCategory);
      }
    };

    map.current.on("zoomend", handleZoomEnd);
    return () => {
      if (map.current) {
        map.current.off("zoomend", handleZoomEnd);
      }
    };
  }, [
    showRoutePanel,
    routePanelView,
    selectedNearbyCategory,
    fetchNearbyPlaces,
  ]);

  // Display nearby places as markers on the map
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    nearbyMarkersRef.current.forEach((marker) => marker.remove());
    nearbyMarkersRef.current = [];

    // Add markers for nearby places if in findNearby view with a selected category
    if (
      routePanelView === "findNearby" &&
      selectedNearbyCategory &&
      nearbyPlaces.length > 0
    ) {
      nearbyPlaces.forEach((place) => {
        const categoryInfo = NEARBY_CATEGORIES.find(
          (c) => c.id === selectedNearbyCategory
        );
        const color = categoryInfo?.color || "#d4a853";

        // Create marker element
        const el = document.createElement("div");
        el.className = "nearby-place-marker";
        el.style.cssText = `
          width: 32px;
          height: 32px;
          background: ${color};
          border: 2px solid rgba(255, 255, 255, 0.9);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        `;

        const icon = document.createElement("i");
        icon.className = `bi ${categoryInfo?.icon || "bi-geo-alt-fill"}`;
        icon.style.cssText = `
          color: white;
          font-size: 14px;
          transform: rotate(45deg);
        `;
        el.appendChild(icon);

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="padding: 4px; min-width: 150px;">
            <strong style="color: #0f1723; font-size: 13px;">${
              place.name
            }</strong>
            <p style="margin: 4px 0 2px 0; font-size: 11px; color: #666;">${
              place.address || ""
            }</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: ${color}; font-weight: 600;">${
          place.distanceMiles
        } mi away</p>
          </div>
        `);

        // Add marker to map
        const marker = new mapboxgl.Marker(el)
          .setLngLat(place.coordinates)
          .setPopup(popup)
          .addTo(map.current);

        // Click handler to use as destination
        el.addEventListener("click", () => {
          applySavedPlace(place);
          setRoutePanelView("main");
          setSelectedNearbyCategory(null);
        });

        nearbyMarkersRef.current.push(marker);
      });

      console.log(
        "[Nearby Markers] Added",
        nearbyMarkersRef.current.length,
        "markers to map"
      );
    }

    // Cleanup on unmount
    return () => {
      nearbyMarkersRef.current.forEach((marker) => marker.remove());
      nearbyMarkersRef.current = [];
    };
  }, [
    nearbyPlaces,
    routePanelView,
    selectedNearbyCategory,
    applySavedPlace,
    NEARBY_CATEGORIES,
  ]);

  // Update wind particle system when wind data changes
  useEffect(() => {
    if (windParticleSystemRef.current && activeLayers.includes("wind")) {
      const windSpeed = windData?.speed || weatherData?.wind?.speed || 10;
      const windDirection = windData?.deg || weatherData?.wind?.deg || 270;
      windParticleSystemRef.current.setWindData(windSpeed, windDirection);
    }
  }, [windData, weatherData, activeLayers]);

  // Setup AQI map listeners
  useEffect(() => {
    if (map.current && activeLayers.includes("airquality")) {
      return setupAQIMapListeners();
    }
  }, [activeLayers, setupAQIMapListeners]);

  // Handle canvas resize
  useEffect(() => {
    const handleResize = () => {
      if (windParticleSystemRef.current && activeLayers.includes("wind")) {
        windParticleSystemRef.current.resize();
      }
      // Also resize AQI canvas if active
      if (aqiCanvasRef.current && activeLayers.includes("airquality")) {
        const rect = aqiCanvasRef.current.parentElement.getBoundingClientRect();
        aqiCanvasRef.current.width = rect.width;
        aqiCanvasRef.current.height = rect.height;
        fetchAndDisplayAQI();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeLayers, fetchAndDisplayAQI]);

  // Extract weather info
  const weatherProps = mapData?.features?.[0]?.properties || {};

  return (
    <div className="advanced-weather-map">
      {/* Header */}
      <div className="awm-header">
        <div className="awm-header-left">
          <div className="awm-header-icon">
            <i className="bi bi-map"></i>
          </div>
          <div>
            <h3>Advanced Mapping & Direction</h3>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="awm-map-wrapper">
        <div ref={mapContainer} className="awm-map-container" />

        {/* Air Quality Heatmap Canvas */}
        <canvas
          ref={aqiCanvasRef}
          className={`awm-aqi-canvas ${
            activeLayers.includes("airquality") ? "visible" : ""
          }`}
        />

        {/* Wind Particle Animation Canvas */}
        <canvas
          ref={windCanvasRef}
          className={`awm-wind-canvas ${
            activeLayers.includes("wind") ? "visible" : ""
          }`}
        />

        {/* Loading Overlay */}
        {isMapLoading && (
          <div className="awm-loading-overlay">
            <div className="awm-loading-spinner"></div>
            <span>Loading weather data...</span>
          </div>
        )}

        {/* Reset Home Button (inside map, top-right) */}
        <div className="awm-map-reset">
          <button
            className="awm-reset-btn"
            onClick={handleHomeClick}
            title="Reset view"
            aria-label="Reset map view to home"
          >
            <i className="bi bi-house"></i>
          </button>
        </div>

        {/* Compass */}
        <div
          className="awm-compass"
          ref={compassRef}
          style={{ transform: `rotate(${-mapBearing}deg)` }}
          title="Drag to rotate map"
          aria-label="Drag to rotate map"
        >
          <div className="awm-compass-ring">
            <span className="awm-compass-n">N</span>
            <span className="awm-compass-e">E</span>
            <span className="awm-compass-s">S</span>
            <span className="awm-compass-w">W</span>
            <div className="awm-compass-needle">
              <div className="awm-needle-north"></div>
              <div className="awm-needle-south"></div>
            </div>
          </div>
        </div>

        {/* Layer Control Panel */}
        <div className="awm-layer-control">
          <button
            className={`awm-control-btn ${showLayerPanel ? "active" : ""}`}
            onClick={() => {
              setShowLayerPanel(!showLayerPanel);
              setShowStylePanel(false);
              setShowRoutePanel(false);
            }}
            title="Weather Layers"
            aria-label="Toggle weather layers panel"
            aria-expanded={showLayerPanel}
          >
            <i className="bi bi-layers"></i>
          </button>

          {showLayerPanel && (
            <div
              className="awm-panel awm-layer-panel"
              role="dialog"
              aria-label="Weather Layers"
            >
              <div className="awm-panel-header">
                <h4>Weather Layers</h4>
                <button
                  onClick={() => setShowLayerPanel(false)}
                  aria-label="Close panel"
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
              <div className="awm-panel-content">
                {Object.values(WEATHER_LAYERS).map((layer) => (
                  <div
                    key={layer.id}
                    className={`awm-layer-item ${
                      activeLayers.includes(layer.id) ? "active" : ""
                    }`}
                    onClick={() => toggleLayer(layer.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && toggleLayer(layer.id)
                    }
                    aria-pressed={activeLayers.includes(layer.id)}
                  >
                    <div
                      className="awm-layer-icon"
                      style={{
                        backgroundColor: `${layer.color}20`,
                        color: layer.color,
                      }}
                    >
                      <i className={`bi ${layer.icon}`}></i>
                    </div>
                    <div className="awm-layer-info">
                      <span className="awm-layer-name">{layer.name}</span>
                      <span className="awm-layer-desc">
                        {layer.description}
                      </span>
                    </div>
                    <div
                      className={`awm-layer-toggle ${
                        activeLayers.includes(layer.id) ? "on" : ""
                      }`}
                      aria-hidden="true"
                    >
                      <div className="awm-toggle-slider"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Style Control */}
        <div className="awm-style-control">
          <button
            className={`awm-control-btn ${showStylePanel ? "active" : ""}`}
            onClick={() => {
              setShowStylePanel(!showStylePanel);
              setShowLayerPanel(false);
              setShowRoutePanel(false);
            }}
            title="Map Style"
            aria-label="Toggle map style panel"
            aria-expanded={showStylePanel}
          >
            {mapStyle === "terrain" ? (
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M2 20h20L12 4 2 20z" fill="currentColor" />
                <path
                  d="M7 16l3-4 2 3 3-5 4 7H7z"
                  fill="rgba(255,255,255,0.12)"
                />
              </svg>
            ) : (
              <i className={`bi ${MAP_STYLES[mapStyle].icon}`}></i>
            )}
          </button>

          {showStylePanel && (
            <div
              className="awm-panel awm-style-panel"
              role="dialog"
              aria-label="Map Styles"
            >
              <div className="awm-panel-header">
                <h4>Map Style</h4>
                <button
                  onClick={() => setShowStylePanel(false)}
                  aria-label="Close panel"
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
              <div className="awm-panel-content awm-style-grid">
                {Object.values(MAP_STYLES).map((style) => (
                  <div
                    key={style.id}
                    className={`awm-style-item ${
                      mapStyle === style.id ? "active" : ""
                    }`}
                    onClick={() => changeMapStyle(style.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" && changeMapStyle(style.id)
                    }
                    aria-pressed={mapStyle === style.id}
                  >
                    {/* Render inline mountain SVG for terrain to avoid missing icon fonts */}
                    {style.id === "terrain" ? (
                      <svg
                        width="22"
                        height="22"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="M2 20h20L12 4 2 20z" fill="currentColor" />
                        <path
                          d="M7 16l3-4 2 3 3-5 4 7H7z"
                          fill="rgba(255,255,255,0.12)"
                        />
                      </svg>
                    ) : (
                      <i className={`bi ${style.icon}`}></i>
                    )}
                    <span>{style.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Route Control */}
        <div className="awm-route-control">
          <button
            className={`awm-control-btn ${showRoutePanel ? "active" : ""}`}
            onClick={() => {
              if (showRoutePanel) {
                handleClosePanelAndReset();
              } else {
                openRoutePanel();
              }
            }}
            title="Route Planner"
            aria-label="Toggle route planner panel"
            aria-expanded={showRoutePanel}
          >
            <i className="bi bi-signpost-split"></i>
          </button>
        </div>

        {/* Route Panel - positioned as direct child of map wrapper */}
        {showRoutePanel && (
          <div
            ref={routePanelRef}
            className={`awm-panel awm-route-panel awm-route-panel-expanded ${
              isDragging ? "dragging" : ""
            }`}
            role="dialog"
            aria-label="Route Planner"
            style={
              routePanelPosition.x !== null && routePanelPosition.y !== null
                ? {
                    left: `${routePanelPosition.x}px`,
                    top: `${routePanelPosition.y}px`,
                    right: "auto",
                  }
                : undefined
            }
          >
            {/* Panel Header with Back Button - Draggable Handle */}
            <div
              className="awm-panel-header awm-panel-draggable"
              onMouseDown={handlePanelMouseDown}
              style={{ cursor: isDragging ? "grabbing" : "grab" }}
            >
              {routePanelView !== "main" && routePanelView !== "findNearby" && (
                <button
                  className="awm-back-btn"
                  onClick={() => {
                    if (routePanelView === "editPlace") {
                      setEditingPlaceType(null);
                    }
                    setRoutePanelView("main");
                  }}
                  aria-label="Go back"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
              )}
              {routePanelView === "findNearby" && (
                <button
                  className="awm-back-btn"
                  onClick={() => {
                    setRoutePanelView("main");
                    setSelectedNearbyCategory(null);
                    setNearbyPlaces([]);
                  }}
                  aria-label="Go back"
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
              )}
              <h4>
                {routePanelView === "main" && "Directions"}
                {routePanelView === "directions" && "Route Details"}
                {routePanelView === "editPlace" &&
                  `Set ${editingPlaceType === "home" ? "Home" : "Work"}`}
                {routePanelView === "findNearby" &&
                  (selectedNearbyCategory
                    ? NEARBY_CATEGORIES.find(
                        (c) => c.id === selectedNearbyCategory
                      )?.name || "Nearby"
                    : "Find Nearby")}
              </h4>
              <button
                onClick={handleClosePanelAndReset}
                aria-label="Close panel"
              >
                <i className="bi bi-x"></i>
              </button>
            </div>

            <div className="awm-panel-content awm-route-content">
              {/* Main View */}
              {routePanelView === "main" && (
                <>
                  {/* Route Mode Selector - Apple Maps Style */}
                  <div className="awm-route-mode-selector">
                    <button
                      className={`awm-mode-btn ${
                        routeMode === "driving" ? "active" : ""
                      }`}
                      onClick={() => setRouteMode("driving")}
                      title="Driving"
                    >
                      <i className="bi bi-car-front"></i>
                      <span>Drive</span>
                    </button>
                    <button
                      className={`awm-mode-btn ${
                        routeMode === "walking" ? "active" : ""
                      }`}
                      onClick={() => setRouteMode("walking")}
                      title="Walking"
                    >
                      <i className="bi bi-person-walking"></i>
                      <span>Walk</span>
                    </button>
                    <button
                      className={`awm-mode-btn ${
                        routeMode === "transit" ? "active" : ""
                      }`}
                      onClick={() => setRouteMode("transit")}
                      title="Transit"
                    >
                      <i className="bi bi-bus-front"></i>
                      <span>Transit</span>
                    </button>
                  </div>

                  {/* Route Options - Apple Maps Style Toggles (only show for driving) */}
                  {routeMode === "driving" && (
                    <div className="awm-route-options">
                      <div className="awm-route-option-toggle">
                        <label className="awm-toggle-label">
                          <input
                            type="checkbox"
                            checked={avoidTolls}
                            onChange={(e) => setAvoidTolls(e.target.checked)}
                          />
                          <span className="awm-toggle-switch"></span>
                          <span className="awm-toggle-text">
                            <i className="bi bi-cash-coin"></i>
                            Avoid Tolls
                          </span>
                        </label>
                      </div>
                      <div className="awm-route-option-toggle">
                        <label className="awm-toggle-label">
                          <input
                            type="checkbox"
                            checked={avoidHighways}
                            onChange={(e) => setAvoidHighways(e.target.checked)}
                          />
                          <span className="awm-toggle-switch"></span>
                          <span className="awm-toggle-text">
                            <i className="bi bi-signpost-split"></i>
                            Avoid Highways
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Origin Input */}
                  <div className="awm-route-input-wrapper" ref={originInputRef}>
                    <div className="awm-route-input">
                      <div className="awm-input-marker awm-marker-origin"></div>
                      <input
                        type="text"
                        placeholder="Current location or starting point..."
                        value={routeOrigin}
                        onChange={(e) =>
                          handleLocationInput(e.target.value, "origin")
                        }
                        onFocus={() =>
                          originSuggestions.length > 0 &&
                          setShowOriginSuggestions(true)
                        }
                      />
                      {routeOrigin && (
                        <button
                          className="awm-input-clear"
                          onClick={() => setRouteOrigin("")}
                        >
                          <i className="bi bi-x-circle-fill"></i>
                        </button>
                      )}
                      {isLoadingOrigin && (
                        <i className="bi bi-arrow-repeat spinning awm-input-loader"></i>
                      )}
                    </div>
                    {showOriginSuggestions && originSuggestions.length > 0 && (
                      <div className="awm-suggestions-dropdown">
                        {originSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="awm-suggestion-item"
                            onClick={() =>
                              selectSuggestion(suggestion, "origin")
                            }
                          >
                            <i className="bi bi-geo-alt"></i>
                            <div className="awm-suggestion-text">
                              <span className="awm-suggestion-name">
                                {suggestion.name}
                              </span>
                              <span className="awm-suggestion-full">
                                {suggestion.secondaryText ||
                                  suggestion.fullName}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Route Line Connector */}
                  <div className="awm-route-connector">
                    <div className="awm-connector-line"></div>
                    <button
                      className="awm-swap-btn"
                      onClick={() => {
                        const temp = routeOrigin;
                        setRouteOrigin(routeDestination);
                        setRouteDestination(temp);
                      }}
                      title="Swap locations"
                    >
                      <i className="bi bi-arrow-down-up"></i>
                    </button>
                  </div>

                  {/* Destination Input */}
                  <div className="awm-route-input-wrapper" ref={destInputRef}>
                    <div className="awm-route-input">
                      <div className="awm-input-marker awm-marker-dest"></div>
                      <input
                        type="text"
                        placeholder="Where to?"
                        value={routeDestination}
                        onChange={(e) =>
                          handleLocationInput(e.target.value, "dest")
                        }
                        onFocus={() =>
                          destSuggestions.length > 0 &&
                          setShowDestSuggestions(true)
                        }
                      />
                      {routeDestination && (
                        <button
                          className="awm-input-clear"
                          onClick={() => setRouteDestination("")}
                        >
                          <i className="bi bi-x-circle-fill"></i>
                        </button>
                      )}
                      {isLoadingDest && (
                        <i className="bi bi-arrow-repeat spinning awm-input-loader"></i>
                      )}
                    </div>
                    {showDestSuggestions && destSuggestions.length > 0 && (
                      <div className="awm-suggestions-dropdown">
                        {destSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="awm-suggestion-item"
                            onClick={() => selectSuggestion(suggestion, "dest")}
                          >
                            <i className="bi bi-geo-alt-fill"></i>
                            <div className="awm-suggestion-text">
                              <span className="awm-suggestion-name">
                                {suggestion.name}
                              </span>
                              <span className="awm-suggestion-full">
                                {suggestion.secondaryText ||
                                  suggestion.fullName}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Calculate Route Button */}
                  <button
                    className="awm-route-calc-btn"
                    onClick={calculateRoute}
                    disabled={
                      !routeOrigin || !routeDestination || isCalculatingRoute
                    }
                  >
                    {isCalculatingRoute ? (
                      <>
                        <i className="bi bi-arrow-repeat spinning"></i>
                        <span>Finding routes...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-right-circle-fill"></i>
                        <span>Get Directions</span>
                      </>
                    )}
                  </button>

                  {/* Quick Actions - Saved Places */}
                  <div className="awm-saved-places">
                    <div className="awm-section-title">
                      <span>Saved Places</span>
                    </div>
                    <div className="awm-places-grid">
                      <div
                        className={`awm-place-card ${
                          savedPlaces.home ? "has-place" : ""
                        }`}
                        onClick={() => {
                          if (savedPlaces.home) {
                            applySavedPlace(savedPlaces.home);
                          } else {
                            setEditingPlaceType("home");
                            setRoutePanelView("editPlace");
                          }
                        }}
                      >
                        <div className="awm-place-icon home">
                          <i className="bi bi-house-fill"></i>
                        </div>
                        <div className="awm-place-info">
                          <span className="awm-place-label">Home</span>
                          <span className="awm-place-address">
                            {savedPlaces.home ? savedPlaces.home.name : "Add"}
                          </span>
                        </div>
                        {savedPlaces.home && (
                          <button
                            className="awm-place-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPlaceType("home");
                              setRoutePanelView("editPlace");
                            }}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}
                      </div>
                      <div
                        className={`awm-place-card ${
                          savedPlaces.work ? "has-place" : ""
                        }`}
                        onClick={() => {
                          if (savedPlaces.work) {
                            applySavedPlace(savedPlaces.work);
                          } else {
                            setEditingPlaceType("work");
                            setRoutePanelView("editPlace");
                          }
                        }}
                      >
                        <div className="awm-place-icon work">
                          <i className="bi bi-briefcase-fill"></i>
                        </div>
                        <div className="awm-place-info">
                          <span className="awm-place-label">Work</span>
                          <span className="awm-place-address">
                            {savedPlaces.work ? savedPlaces.work.name : "Add"}
                          </span>
                        </div>
                        {savedPlaces.work && (
                          <button
                            className="awm-place-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPlaceType("work");
                              setRoutePanelView("editPlace");
                            }}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div className="awm-recents">
                      <div className="awm-section-title">
                        <span>Recents</span>
                        <button
                          className="awm-clear-btn"
                          onClick={clearRecentSearches}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="awm-recents-list">
                        {recentSearches.slice(0, 5).map((search, idx) => (
                          <div
                            key={idx}
                            className="awm-recent-item"
                            onClick={() => applyRecentSearch(search)}
                          >
                            <i className="bi bi-clock-history"></i>
                            <div className="awm-recent-text">
                              <span className="awm-recent-name">
                                {search.name}
                              </span>
                              <span className="awm-recent-full">
                                {search.fullName}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Find Nearby - Apple Maps Style Categories */}
                  <div className="awm-find-nearby">
                    <button
                      className="awm-find-nearby-btn"
                      onClick={() => {
                        setRoutePanelView("findNearby");
                        fetchNearbyPlaces();
                      }}
                    >
                      <i className="bi bi-search"></i>
                      <span>Find Nearby</span>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                </>
              )}

              {/* Find Nearby View - Category Grid */}
              {routePanelView === "findNearby" && (
                <>
                  {!selectedNearbyCategory ? (
                    <>
                      <div className="awm-nearby-categories">
                        {NEARBY_CATEGORIES.map((category) => (
                          <button
                            key={category.id}
                            className="awm-nearby-category-btn"
                            onClick={() => {
                              setSelectedNearbyCategory(category.id);
                              fetchNearbyPlaces(category.id);
                            }}
                            style={{ "--category-color": category.color }}
                          >
                            <div className="awm-category-icon">
                              <i className={`bi ${category.icon}`}></i>
                            </div>
                            <span>{category.name}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="awm-nearby-results">
                        {isLoadingNearby ? (
                          <div className="awm-nearby-loading">
                            <i className="bi bi-arrow-repeat spinning"></i>
                            <span>Finding places...</span>
                          </div>
                        ) : nearbyPlaces.length > 0 ? (
                          <>
                            <div className="awm-nearby-results-header">
                              <span className="awm-results-count">
                                {nearbyPlaces.length}{" "}
                                {nearbyPlaces.length === 1 ? "place" : "places"}{" "}
                                found
                              </span>
                              {nearbySearchRadius && (
                                <span className="awm-search-radius">
                                  within{" "}
                                  {nearbySearchRadius < 1
                                    ? `${nearbySearchRadius * 5280} ft`
                                    : `${nearbySearchRadius} mi`}
                                </span>
                              )}
                            </div>
                            <div className="awm-zoom-hint">
                              <i className="bi bi-info-circle"></i>
                              <span>Zoom out to see more places</span>
                            </div>
                            <div className="awm-nearby-results-list">
                              {nearbyPlaces.map((place, idx) => (
                                <div
                                  key={idx}
                                  className="awm-nearby-result-item"
                                  onClick={() => {
                                    applySavedPlace(place);
                                    setRoutePanelView("main");
                                    setSelectedNearbyCategory(null);
                                  }}
                                >
                                  <div
                                    className="awm-nearby-result-icon"
                                    style={{
                                      "--category-color":
                                        NEARBY_CATEGORIES.find(
                                          (c) => c.id === selectedNearbyCategory
                                        )?.color || "#d4a853",
                                    }}
                                  >
                                    <i
                                      className={`bi ${
                                        NEARBY_CATEGORIES.find(
                                          (c) => c.id === selectedNearbyCategory
                                        )?.icon || "bi-geo-alt"
                                      }`}
                                    ></i>
                                  </div>
                                  <div className="awm-nearby-result-info">
                                    <div className="awm-nearby-result-name-row">
                                      <span className="awm-nearby-result-name">
                                        {place.name}
                                      </span>
                                      <span className="awm-nearby-result-distance">
                                        {place.distanceMiles} mi
                                      </span>
                                    </div>
                                    {place.address && (
                                      <span className="awm-nearby-result-address">
                                        {place.address}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    className="awm-nearby-directions-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRouteDestination(place.fullName);
                                      setRoutePanelView("main");
                                      setSelectedNearbyCategory(null);
                                    }}
                                    title="Get directions"
                                  >
                                    <i className="bi bi-arrow-right-circle"></i>
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="awm-nearby-no-results">
                            <i className="bi bi-geo-alt"></i>
                            <span>No places found nearby</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Directions View - Turn by Turn or Error */}
              {routePanelView === "directions" && (
                <>
                  {/* Route Error State (Walk/Transit Unavailable) */}
                  {routeError ? (
                    <div className="awm-route-error">
                      <div className="awm-route-error-icon">
                        {routeError.type === "walking" && (
                          <i className="bi bi-person-walking"></i>
                        )}
                        {routeError.type === "transit" && (
                          <i className="bi bi-bus-front"></i>
                        )}
                        {routeError.type === "general" && (
                          <i className="bi bi-exclamation-triangle"></i>
                        )}
                      </div>
                      <h5 className="awm-route-error-title">
                        {routeError.message}
                      </h5>
                      <p className="awm-route-error-reason">
                        {routeError.reason}
                      </p>
                      <div className="awm-route-error-actions">
                        {routeError.type === "walking" && (
                          <button
                            className="awm-error-action-btn"
                            onClick={() => {
                              setRouteMode("driving");
                              setRouteError(null);
                              calculateRoute();
                            }}
                          >
                            <i className="bi bi-car-front"></i>
                            <span>Try Driving Instead</span>
                          </button>
                        )}
                        {routeError.type === "transit" && (
                          <>
                            <button
                              className="awm-error-action-btn"
                              onClick={() => {
                                setRouteMode("driving");
                                setRouteError(null);
                                calculateRoute();
                              }}
                            >
                              <i className="bi bi-car-front"></i>
                              <span>Get Driving Directions</span>
                            </button>
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                                routeOrigin
                              )}&destination=${encodeURIComponent(
                                routeDestination
                              )}&travelmode=transit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="awm-error-action-btn secondary"
                            >
                              <i className="bi bi-box-arrow-up-right"></i>
                              <span>Open in Google Maps</span>
                            </a>
                          </>
                        )}
                        <button
                          className="awm-error-back-btn"
                          onClick={() => {
                            setRouteError(null);
                            setRoutePanelView("main");
                          }}
                        >
                          <i className="bi bi-arrow-left"></i>
                          <span>Back to Directions</span>
                        </button>
                      </div>
                    </div>
                  ) : routeInfo ? (
                    <>
                      {/* Route Summary Card */}
                      <div className="awm-route-summary">
                        <div className="awm-route-main-info">
                          <div className="awm-route-time">
                            <span className="awm-time-value">
                              {routeInfo.durationFormatted ||
                                formatDuration(routeInfo.duration)}
                            </span>
                          </div>
                          <div className="awm-route-details">
                            <span className="awm-route-distance">
                              {routeInfo.distance} mi
                            </span>
                            <span className="awm-route-arrival">
                              Arrive at {routeInfo.arrivalTime}
                            </span>
                          </div>
                        </div>
                        {/* Route Preferences Badges */}
                        {(routeInfo.avoidTolls || routeInfo.avoidHighways) && (
                          <div className="awm-route-preferences">
                            {routeInfo.avoidTolls && (
                              <span className="awm-pref-badge toll-free">
                                <i className="bi bi-cash-coin"></i>
                                Toll-free
                              </span>
                            )}
                            {routeInfo.avoidHighways && (
                              <span className="awm-pref-badge no-highways">
                                <i className="bi bi-signpost-split"></i>
                                No highways
                              </span>
                            )}
                          </div>
                        )}
                        {trafficInfo && trafficInfo.condition !== "unknown" && (
                          <div
                            className={`awm-traffic-badge ${trafficInfo.condition}`}
                          >
                            <i className="bi bi-car-front"></i>
                            <span>
                              {trafficInfo.condition === "light"
                                ? "Light traffic"
                                : trafficInfo.condition === "moderate"
                                ? "Moderate traffic"
                                : `${trafficInfo.delay} min delay`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Alternate Routes */}
                      {alternateRoutes.length > 0 && (
                        <div className="awm-alternate-routes">
                          <div className="awm-section-title">
                            <span>Alternative Routes</span>
                          </div>
                          {alternateRoutes.map((alt) => (
                            <div key={alt.id} className="awm-alt-route">
                              <span className="awm-alt-time">
                                {formatDuration(alt.duration)}
                              </span>
                              <span className="awm-alt-distance">
                                {alt.distance} mi
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Turn-by-Turn Directions */}
                      <div className="awm-directions-list">
                        <div className="awm-section-title">
                          <span>Directions</span>
                          <span className="awm-steps-count">
                            {routeSteps.length} steps
                          </span>
                        </div>
                        {/* eslint-disable-next-line no-unused-vars */}
                        {routeSteps.map((step, idx) => (
                          <div key={step.id} className="awm-direction-step">
                            <div className="awm-step-icon">
                              <i
                                className={`bi ${
                                  step.type === "turn" &&
                                  step.modifier === "left"
                                    ? "bi-arrow-left"
                                    : step.type === "turn" &&
                                      step.modifier === "right"
                                    ? "bi-arrow-right"
                                    : step.type === "merge"
                                    ? "bi-arrow-up-right"
                                    : step.type === "arrive"
                                    ? "bi-geo-alt-fill"
                                    : step.type === "depart"
                                    ? "bi-circle-fill"
                                    : "bi-arrow-up"
                                }`}
                              ></i>
                            </div>
                            <div className="awm-step-content">
                              <span className="awm-step-instruction">
                                {step.instruction}
                              </span>
                              {step.name && (
                                <span className="awm-step-road">
                                  {step.name}
                                </span>
                              )}
                            </div>
                            <div className="awm-step-meta">
                              <span>{step.distance} mi</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* End Route Button */}
                      <button
                        className="awm-end-route-btn"
                        onClick={clearRoute}
                      >
                        <i className="bi bi-x-circle"></i>
                        <span>End Route</span>
                      </button>
                    </>
                  ) : null}
                </>
              )}

              {/* Edit Place View */}
              {routePanelView === "editPlace" && (
                <div className="awm-edit-place">
                  <div className="awm-edit-place-icon">
                    <i
                      className={`bi ${
                        editingPlaceType === "home"
                          ? "bi-house-fill"
                          : "bi-briefcase-fill"
                      }`}
                    ></i>
                  </div>
                  <p className="awm-edit-place-desc">
                    Search for your {editingPlaceType} address below
                  </p>
                  <div className="awm-route-input-wrapper">
                    <div className="awm-route-input">
                      <i className="bi bi-search"></i>
                      <input
                        type="text"
                        placeholder={`Enter ${editingPlaceType} address...`}
                        onChange={(e) =>
                          handleLocationInput(e.target.value, "dest")
                        }
                        autoFocus
                      />
                    </div>
                    {destSuggestions.length > 0 && (
                      <div className="awm-suggestions-dropdown">
                        {destSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="awm-suggestion-item"
                            onClick={() =>
                              savePlace(editingPlaceType, suggestion)
                            }
                          >
                            <i className="bi bi-geo-alt-fill"></i>
                            <div className="awm-suggestion-text">
                              <span className="awm-suggestion-name">
                                {suggestion.name}
                              </span>
                              <span className="awm-suggestion-full">
                                {suggestion.secondaryText ||
                                  suggestion.fullName}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legend (show for active layers) */}
        {activeLayers.length > 0 && (
          <div className="awm-legend">
            {activeLayers.map((layerId) => {
              const legend = LAYER_LEGENDS[layerId];
              if (!legend) return null;
              return (
                <div key={layerId} className="awm-legend-section">
                  <div className="awm-legend-title">
                    <i
                      className={`bi ${WEATHER_LAYERS[layerId].icon}`}
                      style={{ color: WEATHER_LAYERS[layerId].color }}
                    ></i>
                    <span>{legend.title}</span>
                    {layerId === "airquality" && aqiDataEstimated && (
                      <span
                        className="awm-estimated-badge"
                        title="Some air quality data is estimated due to API limitations"
                      >
                        Estimated
                      </span>
                    )}
                  </div>
                  <div className="awm-legend-items">
                    {legend.items.map((item, idx) => (
                      <div key={idx} className="awm-legend-item">
                        <span
                          className="awm-legend-color"
                          style={{ backgroundColor: item.color }}
                        ></span>
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cursor Position */}
        {cursorPosition && (
          <div className="awm-cursor-position">
            <i className="bi bi-cursor"></i>
            <span>
              {cursorPosition.lat}°, {cursorPosition.lng}°
            </span>
          </div>
        )}

        {/* Weather Info Overlay */}
        <div className="awm-weather-overlay">
          {weatherProps.precip !== undefined && weatherProps.precip > 0 && (
            <div className="awm-weather-item precip">
              <i className="bi bi-droplet-fill"></i>
              <span>{weatherProps.precip.toFixed(2)}&quot;</span>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div
        className="awm-actions-bar"
        role="toolbar"
        aria-label="Quick actions"
      >
        <button
          className={`awm-action-btn ${
            activeLayers.includes("precipitation") ? "active" : ""
          }`}
          onClick={() => toggleLayer("precipitation")}
          title="Toggle Precipitation"
          aria-label="Toggle precipitation layer"
          aria-pressed={activeLayers.includes("precipitation")}
        >
          <i className="bi bi-cloud-rain-heavy"></i>
          <span>Precip</span>
        </button>
        <button
          className={`awm-action-btn ${
            activeLayers.includes("temperature") ? "active" : ""
          }`}
          onClick={() => toggleLayer("temperature")}
          title="Toggle Temperature"
          aria-label="Toggle temperature layer"
          aria-pressed={activeLayers.includes("temperature")}
        >
          <i className="bi bi-thermometer-half"></i>
          <span>Temp</span>
        </button>
        <button
          className={`awm-action-btn ${
            activeLayers.includes("wind") ? "active" : ""
          }`}
          onClick={() => toggleLayer("wind")}
          title="Toggle Wind"
          aria-label="Toggle wind flow layer"
          aria-pressed={activeLayers.includes("wind")}
        >
          <i className="bi bi-wind"></i>
          <span>Wind</span>
        </button>
        <button
          className={`awm-action-btn ${
            activeLayers.includes("clouds") ? "active" : ""
          }`}
          onClick={() => toggleLayer("clouds")}
          title="Toggle Clouds"
          aria-label="Toggle cloud cover layer"
          aria-pressed={activeLayers.includes("clouds")}
        >
          <i className="bi bi-clouds"></i>
          <span>Clouds</span>
        </button>
        <button
          className={`awm-action-btn ${
            activeLayers.includes("airquality") ? "active" : ""
          }`}
          onClick={() => toggleLayer("airquality")}
          title="Toggle Air Quality"
          aria-label="Toggle air quality layer"
          aria-pressed={activeLayers.includes("airquality")}
        >
          <i className="bi bi-lungs"></i>
          <span>AQI</span>
        </button>
        <button
          className={`awm-action-btn ${showRoutePanel ? "active" : ""}`}
          onClick={() => {
            if (showRoutePanel) {
              handleClosePanelAndReset();
            } else {
              openRoutePanel();
            }
          }}
          title="Route Planner"
          aria-label="Open route planner"
        >
          <i className="bi bi-signpost-split"></i>
          <span>Route</span>
        </button>
      </div>
    </div>
  );
};

export default AdvancedWeatherMap;
