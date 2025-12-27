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

  const temps = data
    ? data
        .map((d) => ({ min: Number(d.tempMin), max: Number(d.tempMax) }))
        .filter((t) => Number.isFinite(t.min) && Number.isFinite(t.max))
    : [];
  const globalMin = temps.length ? Math.min(...temps.map((t) => t.min)) : null;
  const globalMax = temps.length ? Math.max(...temps.map((t) => t.max)) : null;
  const globalRange =
    globalMin != null && globalMax != null
      ? Math.max(1, globalMax - globalMin)
      : 1;

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
                  {item.tempMin != null &&
                  item.tempMax != null &&
                  globalMin != null ? (
                    (() => {
                      const min = Number(item.tempMin);
                      const max = Number(item.tempMax);
                      if (!Number.isFinite(min) || !Number.isFinite(max))
                        return null;

                      const leftPct = ((min - globalMin) / globalRange) * 100;
                      const widthPct = ((max - min) / globalRange) * 100;
                      const clampedLeft = Math.min(100, Math.max(0, leftPct));
                      const clampedWidth = Math.min(
                        100 - clampedLeft,
                        Math.max(6, widthPct)
                      );

                      return (
                        <div
                          className="forecast-temps"
                          aria-label={`Low ${roundTemp(
                            min
                          )} degrees, high ${roundTemp(max)} degrees`}
                        >
                          <span className="forecast-temp low">
                            {roundTemp(min)}°
                          </span>
                          <div
                            className="forecast-range-track"
                            aria-hidden="true"
                          >
                            <div
                              className="forecast-range-fill"
                              style={{
                                "--left": `${clampedLeft}%`,
                                "--width": `${clampedWidth}%`,
                              }}
                            />
                          </div>
                          <span className="forecast-temp high">
                            {roundTemp(max)}°
                          </span>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="forecast-temps">
                      <span className="forecast-temp low">Sample</span>
                      <div
                        className="forecast-range-track"
                        aria-hidden="true"
                      />
                      <span className="forecast-temp high">Sample</span>
                    </div>
                  )}
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
