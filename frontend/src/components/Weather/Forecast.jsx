import "./Forecast.css";
import { useEffect, useState } from "react";
import { iconMap } from "../../utils/weatherMapping";
import { Tooltip } from "react-tooltip";

const Forecast = ({ forecast }) => {
  const [loading, setLoading] = useState(true);
  const data = forecast && forecast.length > 0 ? forecast : null;

  useEffect(() => {
    if (data) setLoading(false);
  }, [data]);
  // console.log("Forecasts:", forecast);

  // Helper function to format date into weekday and day/month, treating date as local
  const formatDate = (dateString) => {
    const date = new Date(dateString + "T00:00:00"); // Force local time
    const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
    const dayMonth = date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
    });
    return { weekday, dayMonth };
  };

  const todayDate = new Date();
  const todayFormatted = `${todayDate.getFullYear()}-${String(
    todayDate.getMonth() + 1
  ).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;

  const roundTemp = (temp) => {
    return Math.round(temp);
  };

  return (
    <div className="forecast-cards">
      {data
        ? data.map((item, index) => {
            const { weekday, dayMonth } = formatDate(item.date);
            const isToday = item.date === todayFormatted;
            const iconData = iconMap[item.condition];
            const iconSrc =
              typeof iconData === "object" && iconData.day
                ? iconData.day
                : iconData || "default-icon.png";

            return (
              <div
                className={`forecast-card ${loading ? "skeleton" : ""}`}
                key={index}
              >
                <div className="forecast-info">
                  <span
                    className="forecast-day"
                    style={{ color: isToday ? "red" : "inherit" }}
                  >
                    {isToday ? "Today" : weekday}
                  </span>
                </div>
                <div className="forecast-dayMonth">{dayMonth || "Sample"}</div>
                <div className="forecast-icon">
                  <img
                    src={iconSrc}
                    alt={item.condition || "Weather Icon"}
                    data-tooltip-id={`forecast-tooltip-${index}`}
                    data-tooltip-content={item.condition || "No Condition"}
                    data-tooltip-place="top"
                  />
                  <Tooltip
                    id={`forecast-tooltip-${index}`}
                    style={{ zIndex: "999" }}
                  />
                  <p>
                    <span style={{ fontSize: "0.8em", color: "#aaa" }}>H:</span>{" "}
                    {item.tempMax ? `${roundTemp(item.tempMax)}°` : "Sample"}{" "}
                    <span style={{ fontSize: "0.8em", color: "#aaa" }}>L:</span>{" "}
                    {item.tempMin ? `${roundTemp(item.tempMin)}°` : "Sample"}
                  </p>
                </div>
              </div>
            );
          })
        : [...Array(10)].map((_, index) => (
            // Placeholder for skeleton loading state
            <div className="forecast-card skeleton" key={index}></div>
          ))}
    </div>
  );
};

export default Forecast;
