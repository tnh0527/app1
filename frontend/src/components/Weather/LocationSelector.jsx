import { useState, useEffect, useRef } from "react";
import {
  getSavedLocations,
  deleteSavedLocation,
} from "../../api/weatherLocationsApi";
import "./LocationSelector.css";

const LocationSelector = ({ currentLocation, onLocationSelect }) => {
  const [savedLocations, setSavedLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // eslint-disable-next-line no-unused-vars
  const [_error, _setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    fetchSavedLocations();
  }, []);

  const fetchSavedLocations = async () => {
    try {
      setIsLoading(true);
      const locations = await getSavedLocations();
      setSavedLocations(locations);
      _setError(null);
    } catch (err) {
      console.error("Failed to fetch saved locations:", err);
      _setError(null); // Don't show error to user, just continue
      setSavedLocations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLocation = async (id, e) => {
    e.stopPropagation();
    try {
      await deleteSavedLocation(id);
      setSavedLocations((prev) => prev.filter((loc) => loc.id !== id));
    } catch (err) {
      console.error("Failed to delete location:", err);
    }
  };

  const handleLocationClick = (location) => {
    onLocationSelect(location.name, {
      lat: parseFloat(location.latitude),
      lng: parseFloat(location.longitude),
    });
  };

  // Auto-scroll to active location
  useEffect(() => {
    if (scrollRef.current && currentLocation && savedLocations.length > 0) {
      const activeCard = scrollRef.current.querySelector(
        ".location-card.active"
      );
      if (activeCard) {
        activeCard.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [currentLocation, savedLocations]);

  return (
    <div className="location-selector">
      <div className="location-cards-container" ref={scrollRef}>
        {/* Saved Locations */}
        {isLoading ? (
          <div className="location-card skeleton-card">
            <div className="skeleton-pulse"></div>
          </div>
        ) : (
          savedLocations.map((location) => (
            <div
              key={location.id}
              className={`location-card ${
                currentLocation === location.name ? "active" : ""
              }`}
              onClick={() => handleLocationClick(location)}
            >
              <button
                className="delete-location-btn"
                onClick={(e) => handleDeleteLocation(location.id, e)}
                title="Remove"
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
              <div className="location-card-content">
                {location.is_primary && (
                  <i
                    className="bi bi-house-fill primary-badge"
                    title="Primary"
                  ></i>
                )}
                <h4>{location.name}</h4>
                <p className="location-coords">
                  {location.latitude.toFixed(2)}°,{" "}
                  {location.longitude.toFixed(2)}°
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LocationSelector;
