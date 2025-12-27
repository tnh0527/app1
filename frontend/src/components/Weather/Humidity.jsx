import "./Humidity.css";
import { useState, useEffect } from "react";

const Humidity = ({ humidDewData }) => {
  const [currentHumidity, setCurrentHumidity] = useState(null);
  const [currentDewpoint, setCurrentDewpoint] = useState(null);
  // console.log("Humid", humidDewData);

  useEffect(() => {
    const updateLevel = () => {
      const currentHour = new Date().getHours();
      const currentData = humidDewData.find((hourData) => {
        const hour = parseInt(hourData.time.split("T")[1].split(":")[0], 10);
        return hour === currentHour;
      });
      if (currentData) {
        setCurrentHumidity(Math.round(currentData.humidity * 10) / 10);
        setCurrentDewpoint(currentData.dewpoint);
      }
    };
    updateLevel();
    const interval = setInterval(() => {
      updateLevel();
    }, 3600000);
    return () => clearInterval(interval);
  }, [humidDewData]);

  return (
    <div
      className={`highlight ${
        !currentHumidity || !currentDewpoint ? "skeleton" : ""
      }`}
    >
      {!currentHumidity || !currentDewpoint ? null : (
        <div className="card humidity">
          <div className="humidity-content">
            <div className="humidity-info">
              <i className="bi bi-droplet-half humidity-icon"></i>
              <div className="humidity-value-percentage">
                <span className="humidity-value">{currentHumidity}</span>
                <span className="humidity-percentage">%</span>
              </div>
            </div>

            <div className="dew-point">
              <div className="dewpoint-value">
                <span>The dew point is </span>
                <span className="dewpoint" style={{ fontWeight: "bold" }}>
                  {currentDewpoint}°
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Humidity;
