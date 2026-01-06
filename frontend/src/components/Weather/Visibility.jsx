import "./Visibility.css";
import { useState, useEffect } from "react";

const Visibility = ({ visibilityData, currentVisibility }) => {
  const [displayVisibility, setDisplayVisibility] = useState(null);

  useEffect(() => {
    // Convert meters to miles for display
    const metersToMiles = (m) => m / 1609.344;

    if (currentVisibility !== undefined && currentVisibility !== null) {
      setDisplayVisibility(metersToMiles(currentVisibility).toFixed(1));
    } else if (visibilityData) {
      const updateLevel = () => {
        const currentHour = new Date().getHours();
        const currentData = visibilityData.find((hourData) => {
          const parts = (hourData.time || "").split("T");
          if (!parts[1]) return false;
          const hour = parseInt(parts[1].split(":")[0], 10);
          return hour === currentHour;
        });
        if (currentData && currentData.visibility != null) {
          setDisplayVisibility(
            metersToMiles(currentData.visibility).toFixed(1)
          );
        }
      };
      updateLevel();
    }
  }, [visibilityData, currentVisibility]);

  // For now just display the value

  return (
    <div
      className={`highlight ${displayVisibility === null ? "skeleton" : ""}`}
    >
      {displayVisibility === null ? null : (
        <div className="card visibility">
          <div className="visibility-content">
            <div className="visibility-info">
              <i className="bi bi-eye visibility-icon"></i>
              <div className="visibility-value-unit">
                <span className="visibility-value">{displayVisibility}</span>
                <span className="visibility-unit">mi</span>
              </div>
            </div>

            <div className="visibility-desc">
              <span>{displayVisibility > 10 ? "Clear view" : "Haze"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Visibility;
