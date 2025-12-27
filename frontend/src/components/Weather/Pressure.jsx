import "./Pressure.css";
import { useState, useEffect } from "react";

const Pressure = ({ pressureData, currentPressure }) => {
  const [displayPressure, setDisplayPressure] = useState(null);

  useEffect(() => {
    if (currentPressure !== undefined && currentPressure !== null) {
      setDisplayPressure(currentPressure);
    } else if (pressureData) {
      const updateLevel = () => {
        const currentHour = new Date().getHours();
        const currentData = pressureData.find((hourData) => {
          const hour = parseInt(hourData.time.split("T")[1].split(":")[0], 10);
          return hour === currentHour;
        });
        if (currentData) {
          setDisplayPressure(currentData.pressure);
        }
      };
      updateLevel();
    }
  }, [pressureData, currentPressure]);

  return (
    <div className={`highlight ${displayPressure === null ? "skeleton" : ""}`}>
      {displayPressure === null ? null : (
        <div className="card pressure">
          <div className="pressure-content">
            <i className="bi bi-speedometer2 pressure-icon"></i>
            <div className="pressure-value-unit">
              <span className="pressure-value">{displayPressure}</span>
              <span className="pressure-unit">hPa</span>
            </div>
          </div>
          <div className="pressure-desc">
            <span>
              {displayPressure < 1000
                ? "Low"
                : displayPressure > 1020
                ? "High"
                : "Normal"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pressure;
