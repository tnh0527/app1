import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "./AdvancedWeatherMap.css";
import {
  fetchAQIGrid,
  fetchWindGrid,
  getAPIStatus,
} from "../../api/weatherApi";

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_REACT_APP_MAPBOX_ACCESS_TOKEN;

// OpenWeatherMap API key for weather tiles
const OWM_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "";

// WAQI API key for detailed air quality
const WAQI_API_KEY = import.meta.env.VITE_REACT_APP_WAQI_KEY || "";

// Default map zoom (higher = closer)
const DEFAULT_ZOOM = 12;

// Zoom constraints to prevent globe view and maintain flat map projection
const MIN_ZOOM = 2; // Prevents zooming out to see full globe
const MAX_ZOOM = 18; // Maximum zoom for detailed view

// Weather layer configurations - Updated with gold accent theme
const WEATHER_LAYERS = {
  radar: {
    id: "radar",
    name: "Precipitation Radar",
    icon: "bi-cloud-rain-heavy",
    description: "Real-time precipitation data",
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
const getWindDirection = (degrees) => {
  if (degrees === null || degrees === undefined) return "";
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
};

// Helper: Format temperature color - Updated with theme colors
const getTempColor = (temp) => {
  if (temp <= 32) return "#60a5fa"; // Blue for freezing
  if (temp <= 50) return "#10b981"; // Green for cool
  if (temp <= 68) return "#d4a853"; // Gold for moderate
  if (temp <= 86) return "#fb923c"; // Orange for warm
  return "#ef4444"; // Red for hot
};

// Legend data for different layers - Updated colors
const LAYER_LEGENDS = {
  radar: {
    title: "Precipitation",
    items: [
      { color: "#22c55e", label: "Light" },
      { color: "#eab308", label: "Moderate" },
      { color: "#f97316", label: "Heavy" },
      { color: "#ef4444", label: "Extreme" },
    ],
  },
  temperature: {
    title: "Temperature (°F)",
    items: [
      { color: "#60a5fa", label: "< 32°" },
      { color: "#10b981", label: "32-50°" },
      { color: "#d4a853", label: "50-68°" },
      { color: "#fb923c", label: "68-86°" },
      { color: "#ef4444", label: "> 86°" },
    ],
  },
  wind: {
    title: "Wind Speed (mph)",
    items: [
      { color: "#d4a853", label: "< 10" },
      { color: "#e5c07b", label: "10-20" },
      { color: "#fb923c", label: "20-30" },
      { color: "#ef4444", label: "> 30" },
    ],
  },
  clouds: {
    title: "Cloud Cover",
    items: [
      { color: "rgba(148,163,184,0.2)", label: "Clear" },
      { color: "rgba(148,163,184,0.5)", label: "Partly" },
      { color: "rgba(148,163,184,0.7)", label: "Mostly" },
      { color: "rgba(148,163,184,0.9)", label: "Overcast" },
    ],
  },
  pressure: {
    title: "Pressure (hPa)",
    items: [
      { color: "#60a5fa", label: "Low" },
      { color: "#a855f7", label: "Normal" },
      { color: "#ef4444", label: "High" },
    ],
  },
  airquality: {
    title: "Air Quality Index",
    items: [
      { color: "#10b981", label: "Good (0-50)" },
      { color: "#eab308", label: "Moderate (51-100)" },
      { color: "#f97316", label: "Sensitive (101-150)" },
      { color: "#ef4444", label: "Unhealthy (151-200)" },
      { color: "#a855f7", label: "Very Unhealthy (201+)" },
    ],
  },
};

// Wind Particle System for iOS-style animated wind visualization
class WindParticleSystem {
  constructor(canvas, map, apiKey) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.map = map;
    this.apiKey = apiKey;
    this.particles = [];
    this.windGrid = null;
    this.gridSize = 8; // Grid of wind data points
    this.isRunning = false;
    this.animationId = null;
    this.particleCount = 800; // Reduced for cleaner look
    this.fadeOpacity = 0.92;
    this.lineWidth = 1.0;
    this.particleAge = 60;
    this.speedFactor = 0.15; // Reduced for subtler animation
    this.lastFetchBounds = null;
    this.fetchDebounceTimer = null;

    // Color gradient based on wind speed - Updated with gold theme
    this.colorStops = [
      { speed: 0, color: [212, 168, 83, 0.4] }, // Gold (light wind)
      { speed: 10, color: [229, 192, 123, 0.5] }, // Light gold
      { speed: 20, color: [251, 146, 60, 0.6] }, // Orange
      { speed: 30, color: [239, 68, 68, 0.7] }, // Red (strong wind)
      { speed: 50, color: [168, 85, 247, 0.8] }, // Purple (extreme)
    ];

    // Listen for map movements
    this.onMapMove = this.onMapMove.bind(this);
    this.map.on("moveend", this.onMapMove);
    this.map.on("zoomend", this.onMapMove);
  }

  onMapMove() {
    if (!this.isRunning) return;

    // Debounce fetch calls
    if (this.fetchDebounceTimer) {
      clearTimeout(this.fetchDebounceTimer);
    }
    this.fetchDebounceTimer = setTimeout(() => {
      this.fetchWindGrid();
    }, 300);
  }

  async fetchWindGrid() {
    if (!this.apiKey) return;

    const bounds = this.map.getBounds();
    const zoom = this.map.getZoom();

    // Adjust grid density based on zoom level
    const gridPoints = zoom > 10 ? 6 : zoom > 7 ? 5 : 4;

    const north = bounds.getNorth();
    const south = bounds.getSouth();
    const east = bounds.getEast();
    const west = bounds.getWest();

    const latStep = (north - south) / (gridPoints - 1);
    const lngStep = (east - west) / (gridPoints - 1);

    const newGrid = [];
    const fetchPromises = [];

    for (let i = 0; i < gridPoints; i++) {
      for (let j = 0; j < gridPoints; j++) {
        const lat = south + latStep * i;
        const lng = west + lngStep * j;

        fetchPromises.push(
          fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${this.apiKey}&units=imperial`
          )
            .then((res) => res.json())
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
    } catch (error) {
      console.error("Error fetching wind grid:", error);
    }
  }

  getWindAtPoint(x, y) {
    if (!this.windGrid || !this.windGrid.points.length) {
      return { u: 0, v: 0, speed: 5 };
    }

    const { bounds, points, gridPoints } = this.windGrid;

    // Convert canvas coords to lat/lng
    const canvasRect = this.canvas.getBoundingClientRect();
    const lngRange = bounds.east - bounds.west;
    const latRange = bounds.north - bounds.south;

    const lng = bounds.west + (x / canvasRect.width) * lngRange;
    const lat = bounds.north - (y / canvasRect.height) * latRange;

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
  airQualityData,
  onRouteCalculated,
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markerRef = useRef(null);
  const routeLayerRef = useRef(null);
  const windCanvasRef = useRef(null);
  const windParticleSystemRef = useRef(null);
  const aqiCanvasRef = useRef(null);
  const aqiFetchTimerRef = useRef(null);
  const compassRef = useRef(null);
  const isDraggingCompassRef = useRef(false);

  // State
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState("dark");
  const [activeLayers, setActiveLayers] = useState(["radar"]);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [mapBearing, setMapBearing] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationFrame, setAnimationFrame] = useState(0);
  const animationIntervalRef = useRef(null);
  const [showRoutePanel, setShowRoutePanel] = useState(false);
  const [routeOrigin, setRouteOrigin] = useState("");
  const [routeDestination, setRouteDestination] = useState("");
  const [routeInfo, setRouteInfo] = useState(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [currentWeatherInfo, setCurrentWeatherInfo] = useState(null);
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

  // Fetch and display Air Quality heatmap using WAQI/OWM via API service
  const fetchAndDisplayAQI = useCallback(async () => {
    if (!map.current || !aqiCanvasRef.current) return;
    if (!OWM_API_KEY && !WAQI_API_KEY) return;

    const canvas = aqiCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const bounds = map.current.getBounds();
    const zoom = map.current.getZoom();

    // Adjust grid density based on zoom level
    const gridPoints = zoom > 10 ? 6 : zoom > 7 ? 5 : 4;

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

      // Calculate cell dimensions for heatmap
      const cellWidth = canvas.width / (gridPoints - 1);
      const cellHeight = canvas.height / (gridPoints - 1);
      const radius = Math.max(cellWidth, cellHeight) * 1.2;

      aqiData.forEach((point) => {
        // Convert lat/lng to canvas coordinates
        const x = ((point.lng - west) / (east - west)) * canvas.width;
        const y = ((north - point.lat) / (north - south)) * canvas.height;

        const color = aqiColors[Math.min(point.aqi - 1, 4)];

        // Create radial gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(
          0,
          `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3]})`
        );
        gradient.addColorStop(
          0.5,
          `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] * 0.5})`
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

    const updateAQI = () => {
      if (!activeLayers.includes("airquality")) return;

      if (aqiFetchTimerRef.current) {
        clearTimeout(aqiFetchTimerRef.current);
      }
      aqiFetchTimerRef.current = setTimeout(() => {
        fetchAndDisplayAQI();
      }, 500);
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

  // Add weather tile layer to map
  const addWeatherLayer = useCallback(
    (layerId) => {
      if (!map.current || !OWM_API_KEY) return;

      // Special handling for wind - use particle animation instead of tile layer
      if (layerId === "wind") {
        if (windCanvasRef.current && !windParticleSystemRef.current) {
          windParticleSystemRef.current = new WindParticleSystem(
            windCanvasRef.current,
            map.current,
            OWM_API_KEY
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

      const layerConfig = {
        radar: {
          url: `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
          opacity: 0.7,
        },
        temperature: {
          url: `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
          opacity: 0.6,
        },
        clouds: {
          url: `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
          opacity: 0.5,
        },
        pressure: {
          url: `https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${OWM_API_KEY}`,
          opacity: 0.6,
        },
      };

      const config = layerConfig[layerId];
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
          "raster-opacity": config.opacity,
          "raster-fade-duration": 300,
        },
      });
    },
    [OWM_API_KEY, windData, weatherData, fetchAndDisplayAQI]
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

  // Calculate route using Mapbox Directions API
  const calculateRoute = useCallback(async () => {
    if (!routeOrigin || !routeDestination || !map.current) return;

    setIsCalculatingRoute(true);
    setRouteInfo(null);

    try {
      // Geocode origin and destination
      const geocodeLocation = async (location) => {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            location
          )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=1`
        );
        const data = await response.json();
        return data.features?.[0]?.center;
      };

      const originCoords = await geocodeLocation(routeOrigin);
      const destCoords = await geocodeLocation(routeDestination);

      if (!originCoords || !destCoords) {
        alert("Could not find one or both locations. Please try again.");
        setIsCalculatingRoute(false);
        return;
      }

      // Get route from Mapbox Directions API
      const routeResponse = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?geometries=geojson&overview=full&steps=true&access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      const routeData = await routeResponse.json();

      if (!routeData.routes || routeData.routes.length === 0) {
        alert("No route found between these locations.");
        setIsCalculatingRoute(false);
        return;
      }

      const route = routeData.routes[0];
      const routeGeometry = route.geometry;

      // Remove existing route layer
      if (map.current.getLayer("route-layer")) {
        map.current.removeLayer("route-layer");
      }
      if (map.current.getSource("route-source")) {
        map.current.removeSource("route-source");
      }

      // Add route to map
      map.current.addSource("route-source", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: routeGeometry,
        },
      });

      map.current.addLayer({
        id: "route-layer",
        type: "line",
        source: "route-source",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#d4a853",
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });

      // Fit map to route bounds
      const bounds = new mapboxgl.LngLatBounds();
      routeGeometry.coordinates.forEach((coord) => bounds.extend(coord));
      map.current.fitBounds(bounds, { padding: 50 });

      // Set route info
      const durationMinutes = Math.round(route.duration / 60);
      const distanceMiles = (route.distance / 1609.34).toFixed(1);

      setRouteInfo({
        duration: durationMinutes,
        distance: distanceMiles,
        steps: route.legs[0]?.steps?.length || 0,
      });

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
      alert("Failed to calculate route. Please try again.");
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [routeOrigin, routeDestination, onRouteCalculated]);

  // Clear route
  const clearRoute = useCallback(() => {
    if (!map.current) return;

    if (map.current.getLayer("route-layer")) {
      map.current.removeLayer("route-layer");
    }
    if (map.current.getSource("route-source")) {
      map.current.removeSource("route-source");
    }

    setRouteInfo(null);
    setRouteOrigin("");
    setRouteDestination("");
  }, []);

  // Fetch location suggestions using Mapbox Geocoding API
  const fetchSuggestions = useCallback(async (query, type) => {
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
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5&types=place,locality,neighborhood,address,poi`
      );
      const data = await response.json();

      const suggestions =
        data.features?.map((feature) => ({
          id: feature.id,
          name: feature.text,
          fullName: feature.place_name,
          coordinates: feature.center,
        })) || [];

      if (type === "origin") {
        setOriginSuggestions(suggestions);
        setShowOriginSuggestions(suggestions.length > 0);
      } else {
        setDestSuggestions(suggestions);
        setShowDestSuggestions(suggestions.length > 0);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
    } finally {
      if (type === "origin") {
        setIsLoadingOrigin(false);
      } else {
        setIsLoadingDest(false);
      }
    }
  }, []);

  // Debounced suggestion fetch
  const handleLocationInput = useCallback(
    (value, type) => {
      if (type === "origin") {
        setRouteOrigin(value);
      } else {
        setRouteDestination(value);
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

  // Select a suggestion
  const selectSuggestion = useCallback((suggestion, type) => {
    if (type === "origin") {
      setRouteOrigin(suggestion.fullName);
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
    } else {
      setRouteDestination(suggestion.fullName);
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

  // Animation effect for weather layers (iPhone-style)
  useEffect(() => {
    if (isAnimating && activeLayers.length > 0) {
      animationIntervalRef.current = setInterval(() => {
        setAnimationFrame((prev) => (prev + 1) % 100);
      }, 100);
    } else {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    }
    return () => {
      if (animationIntervalRef.current) {
        clearInterval(animationIntervalRef.current);
      }
    };
  }, [isAnimating, activeLayers.length]);

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
            <h3>Weather Radar & Analysis</h3>
          </div>
        </div>
        <div className="awm-header-right">
          <button
            className={`awm-animate-btn ${isAnimating ? "active" : ""}`}
            onClick={() => setIsAnimating(!isAnimating)}
            title={isAnimating ? "Pause Animation" : "Play Animation"}
            aria-label={isAnimating ? "Pause Animation" : "Play Animation"}
          >
            <i
              className={`bi ${isAnimating ? "bi-pause-fill" : "bi-play-fill"}`}
            ></i>
          </button>
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
              {!OWM_API_KEY && (
                <div className="awm-panel-warning">
                  <i className="bi bi-exclamation-triangle"></i>
                  <span>
                    Add VITE_OPENWEATHER_API_KEY for live weather tiles
                  </span>
                </div>
              )}
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
            <i className={`bi ${MAP_STYLES[mapStyle].icon}`}></i>
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
                    <i className={`bi ${style.icon}`}></i>
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
              setShowRoutePanel(!showRoutePanel);
              setShowLayerPanel(false);
              setShowStylePanel(false);
            }}
            title="Route Planner"
            aria-label="Toggle route planner panel"
            aria-expanded={showRoutePanel}
          >
            <i className="bi bi-signpost-split"></i>
          </button>

          {showRoutePanel && (
            <div
              className="awm-panel awm-route-panel"
              role="dialog"
              aria-label="Route Planner"
            >
              <div className="awm-panel-header">
                <h4>Route Planner</h4>
                <button
                  onClick={() => setShowRoutePanel(false)}
                  aria-label="Close panel"
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
              <div className="awm-panel-content">
                {/* Origin Input with Suggestions */}
                <div className="awm-route-input-wrapper" ref={originInputRef}>
                  <div className="awm-route-input">
                    <i className="bi bi-geo-alt"></i>
                    <input
                      type="text"
                      placeholder="Starting point..."
                      value={routeOrigin}
                      onChange={(e) =>
                        handleLocationInput(e.target.value, "origin")
                      }
                      onFocus={() =>
                        originSuggestions.length > 0 &&
                        setShowOriginSuggestions(true)
                      }
                    />
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
                          onClick={() => selectSuggestion(suggestion, "origin")}
                        >
                          <i className="bi bi-geo-alt-fill"></i>
                          <div className="awm-suggestion-text">
                            <span className="awm-suggestion-name">
                              {suggestion.name}
                            </span>
                            <span className="awm-suggestion-full">
                              {suggestion.fullName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Destination Input with Suggestions */}
                <div className="awm-route-input-wrapper" ref={destInputRef}>
                  <div className="awm-route-input">
                    <i className="bi bi-geo-alt-fill"></i>
                    <input
                      type="text"
                      placeholder="Destination..."
                      value={routeDestination}
                      onChange={(e) =>
                        handleLocationInput(e.target.value, "dest")
                      }
                      onFocus={() =>
                        destSuggestions.length > 0 &&
                        setShowDestSuggestions(true)
                      }
                    />
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
                              {suggestion.fullName}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="awm-route-actions">
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
                        Calculating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-right-circle"></i>
                        Calculate Route
                      </>
                    )}
                  </button>
                  {routeInfo && (
                    <button
                      className="awm-route-clear-btn"
                      onClick={clearRoute}
                    >
                      <i className="bi bi-x-circle"></i>
                      Clear
                    </button>
                  )}
                </div>
                {routeInfo && (
                  <div className="awm-route-info">
                    <div className="awm-route-stat">
                      <i className="bi bi-clock"></i>
                      <span>{routeInfo.duration} min</span>
                    </div>
                    <div className="awm-route-stat">
                      <i className="bi bi-speedometer2"></i>
                      <span>{routeInfo.distance} mi</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
              <span>{weatherProps.precip.toFixed(2)}"</span>
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
            activeLayers.includes("radar") ? "active" : ""
          }`}
          onClick={() => toggleLayer("radar")}
          title="Toggle Radar"
          aria-label="Toggle precipitation radar layer"
          aria-pressed={activeLayers.includes("radar")}
        >
          <i className="bi bi-cloud-rain-heavy"></i>
          <span>Radar</span>
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
          className="awm-action-btn"
          onClick={() => {
            setShowRoutePanel(true);
            setShowLayerPanel(false);
            setShowStylePanel(false);
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
