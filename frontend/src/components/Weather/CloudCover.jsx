import "./CloudCover.css";
import { useState, useEffect } from "react";

const CloudCover = ({ cloudCoverData, currentCloudCover }) => {
  const [displayCloudCover, setDisplayCloudCover] = useState(null);

  useEffect(() => {
    if (currentCloudCover !== undefined && currentCloudCover !== null) {
      setDisplayCloudCover(currentCloudCover);
    } else if (cloudCoverData) {
      const updateLevel = () => {
        const currentHour = new Date().getHours();
        const currentData = cloudCoverData.find((hourData) => {
          const hour = parseInt(hourData.time.split("T")[1].split(":")[0], 10);
          return hour === currentHour;
        });
        if (currentData) {
          setDisplayCloudCover(currentData.cloud_cover);
        }
      };
      updateLevel();
    }
  }, [cloudCoverData, currentCloudCover]);

  return (
    <div
      className={`highlight ${displayCloudCover === null ? "skeleton" : ""}`}
    >
      {displayCloudCover === null ? null : (
        <div className="card cloud-cover">
          <div className="cloud-cover-content">
            <div className="cloud-info">
              <i
                className="bi bi-cloud-fill cloud-icon"
                style={{ opacity: Math.max(0.2, displayCloudCover / 100) }}
              ></i>
              <div className="cloud-cover-value-unit">
                <span className="cloud-cover-value">{displayCloudCover}</span>
                <span className="cloud-cover-unit">%</span>
              </div>
            </div>
            <div className="cloud-desc">
              <span>{displayCloudCover > 50 ? "Cloudy" : "Clear"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CloudCover;
