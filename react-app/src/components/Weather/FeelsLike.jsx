import { useState, useEffect } from "react";
import "./FeelsLike.css";

const FeelsLike = ({ feels, actualTemp }) => {
  const [currentFeels, setCurrentFeels] = useState(null);

  useEffect(() => {
    const updateFeels = () => {
      const currentHour = new Date().getHours();
      const currentData = feels.find((hourData) => {
        const hour = parseInt(hourData.time.split(":")[0], 10);
        return hour === currentHour;
      });
      setCurrentFeels(currentData);
      // console.log("Feels:", currentData);
    };
    updateFeels();
    const interval = setInterval(() => {
      updateFeels();
    }, 3600000); // Update every hour
    return () => clearInterval(interval);
  }, [feels]);

  return (
    <div className={`highlight ${!currentFeels ? "skeleton" : ""}`}>
      <h4>Feels Like</h4>
      {currentFeels && (
        <div className="card feels-like">
          <div className="feels-like-content">
            <div className="feels-like-icon">
              <i className="bi bi-thermometer-half"></i>
            </div>
            <div className="feels-like-temp">{currentFeels.feelsLike}</div>
          </div>
          <div className="feels-like-description">
            {currentFeels.feelsLike > actualTemp
              ? "Humidity is making it feel hotter."
              : "Humidity is making it feel colder."}
          </div>
        </div>
      )}
    </div>
  );
};

export default FeelsLike;
