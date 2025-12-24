import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "./WeatherMap.css";

mapboxgl.accessToken = import.meta.env.VITE_REACT_APP_MAPBOX_ACCESS_TOKEN;

const WeatherMap = ({ mapData }) => {
  const mapContainer = useRef(null);

  useEffect(() => {
    const centerCoordinates = mapData?.features?.[0]?.geometry?.coordinates || [
      -95.7608, 29.5826,
    ]; // Default to Richmond, Texas

    if (mapContainer.current) {
      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: centerCoordinates,
        zoom: 15,
        pitch: 45, // Tilt the map for 3D effect
        bearing: -17.6,
        antialias: true,
        attributionControl: false,
      });

      map.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.on("load", () => {
        // Road color
        map.addLayer({
          id: "roads-fill-effect",
          source: "composite",
          "source-layer": "road",
          type: "line",
          paint: {
            "line-color": "#031622", //
            "line-width": 5, // Wide line width to simulate a fill
          },
        });

        map.addSource("mapbox-dem", {
          type: "raster-dem",
          url: "mapbox://mapbox.terrain-rgb", // Mapbox terrain source
          tileSize: 512,
          maxzoom: 14,
        });

        // Enable 3D terrain after adding the source
        map.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 });

        // Add 3D buildings
        map.addLayer({
          id: "3d-buildings-extrusion",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#0C2340", // Buildings
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.6, // Higher opacity for a more solid look
          },
        });

        // Water color
        map.addLayer({
          id: "water-fill",
          source: "composite",
          "source-layer": "water",
          type: "fill",
          paint: {
            "fill-color": "#318CE7", // Custom color for water
            "fill-opacity": 0.3, // Adjust the opacity as needed
          },
        });
        // Road text color
        map.addLayer({
          id: "road-labels",
          source: "composite",
          "source-layer": "road",
          type: "symbol",
          layout: {
            "text-field": ["get", "name"], // Display road name
            "text-size": 12, // Adjust text size as needed
            "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            "symbol-placement": "line",
          },
          paint: {
            "text-color": "#ffffff",
            "text-halo-color": "#000000",
            "text-halo-width": 1,
          },
        });

        // Add precipitation layer if data is available
        if (mapData && mapData.features && mapData.features.length) {
          map.addSource("precipitationData", {
            type: "geojson",
            data: mapData,
          });

          // aggregated point-based precipitation data
          map.addLayer({
            id: "precipitation-heatmap",
            type: "heatmap",
            source: "precipitationData",
            paint: {
              "heatmap-weight": [
                "interpolate",
                ["linear"],
                ["get", "precip"],
                0,
                0.2,
                30,
                1,
              ],
              "heatmap-intensity": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                1,
                15,
                3,
              ],
              "heatmap-color": [
                "interpolate",
                ["linear"],
                ["heatmap-density"],
                0,
                "rgba(0, 0, 255, 0)",
                0.2,
                "#88e0ef", // Light blue
                0.4,
                "#00a8e8", // Medium blue
                0.6,
                "#007ea7", // Darker blue
                1,
                "#003459", // Very dark blue
              ],
              "heatmap-radius": [
                "interpolate",
                ["linear"],
                ["zoom"],
                0,
                2,
                15,
                20,
              ],
              "heatmap-opacity": 0.7,
            },
          });
        }
      });

      return () => map.remove();
    }
  }, [mapData]);
  // Precip map to be implemented later
  return (
    <div ref={mapContainer} className="map-container">
      {/* <div className="mapboxgl-ctrl-bottom-left legend-container legend-bottom-left">
        <div className="legend-title">Precipitation Legend</div>
        <div className="legend-bar">
          <div className="legend-color" style={{ backgroundColor: "#e0f7fa" }}>
            0
          </div>
          <div className="legend-color" style={{ backgroundColor: "#88e0ef" }}>
            0.2
          </div>
          <div className="legend-color" style={{ backgroundColor: "#00a8e8" }}>
            0.4
          </div>
          <div className="legend-color" style={{ backgroundColor: "#007ea7" }}>
            0.6
          </div>
          <div className="legend-color" style={{ backgroundColor: "#003459" }}>
            1
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default WeatherMap;
