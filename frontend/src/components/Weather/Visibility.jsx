import "./Visibility.css";
import { useState, useEffect } from "react";

const Visibility = ({ visibilityData, currentVisibility }) => {
  const [displayVisibility, setDisplayVisibility] = useState(null);

  useEffect(() => {
    if (currentVisibility !== undefined && currentVisibility !== null) {
      // Convert meters to km
      setDisplayVisibility((currentVisibility / 1000).toFixed(1));
    } else if (visibilityData) {
      const updateLevel = () => {
        const currentHour = new Date().getHours();
        const currentData = visibilityData.find((hourData) => {
          const hour = parseInt(hourData.time.split("T")[1].split(":")[0], 10);
          return hour === currentHour;
        });
        if (currentData) {
          setDisplayVisibility((currentData.visibility / 1000).toFixed(1));
        }
      };
      updateLevel();
    }
  }, [visibilityData, currentVisibility]);

  const visibilityKm =
    displayVisibility === null ? null : Number(displayVisibility);
  const visibilityPct =
    visibilityKm === null
      ? 0
      : Math.max(0, Math.min(100, (visibilityKm / 20) * 100));

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
                <span className="visibility-unit">km</span>
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
