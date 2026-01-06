import "./Forecast.css";
import { iconMap } from "../../utils/weatherMapping";
import { Tooltip } from "react-tooltip";

const Forecast = ({ forecast, isLoading = false }) => {
  const data = forecast && forecast.length > 0 ? forecast : null;
  const loading = isLoading || !data;
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

  // Helper function to get color based on temperature (cold to hot gradient)
  const getTempColor = (temp, min, max) => {
    if (min === max) return "rgb(100, 150, 255)"; // Default blue if no range
    const normalized = (temp - min) / (max - min);

    // Color gradient: blue (cold) -> cyan -> yellow -> orange -> red (hot)
    if (normalized < 0.25) {
      // Blue to cyan
      const t = normalized / 0.25;
      return `rgb(${100 + t * 100}, ${150 + t * 105}, 255)`;
    } else if (normalized < 0.5) {
      // Cyan to yellow
      const t = (normalized - 0.25) / 0.25;
      return `rgb(${200 - t * 100}, ${255 - t * 55}, ${255 - t * 255})`;
    } else if (normalized < 0.75) {
      // Yellow to orange
      const t = (normalized - 0.5) / 0.25;
      return `rgb(${255}, ${200 - t * 100}, ${0})`;
    } else {
      // Orange to red
      const t = (normalized - 0.75) / 0.25;
      return `rgb(${255}, ${100 - t * 100}, ${0})`;
    }
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
                : iconData || "bi bi-question-circle";

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
                  <i
                    className={iconSrc}
                    data-tooltip-id={`forecast-tooltip-${index}`}
                    data-tooltip-content={item.condition || "No Condition"}
                    data-tooltip-place="top"
                  ></i>
                  <Tooltip
                    id={`forecast-tooltip-${index}`}
                    style={{ zIndex: "999" }}
                  />
                  {item.tempMin != null && item.tempMax != null ? (
                    (() => {
                      const min = Number(item.tempMin);
                      const max = Number(item.tempMax);

                      // Show only the heat bar first (numbers removed temporarily)
                      return globalMin != null &&
                        globalMax != null &&
                        Number.isFinite(min) &&
                        Number.isFinite(max) ? (
                        (() => {
                          // Calculate positions for the heat bar
                          const minPos =
                            ((min - globalMin) / globalRange) * 100;
                          const maxPos =
                            ((max - globalMin) / globalRange) * 100;
                          const clampedMinPos = Math.max(
                            0,
                            Math.min(100, minPos)
                          );
                          const clampedMaxPos = Math.max(
                            0,
                            Math.min(100, maxPos)
                          );
                          const barWidth = Math.max(
                            4,
                            clampedMaxPos - clampedMinPos
                          );

                          // Get colors for min and max temperatures
                          const minColor = getTempColor(
                            min,
                            globalMin,
                            globalMax
                          );
                          const maxColor = getTempColor(
                            max,
                            globalMin,
                            globalMax
                          );

                          return (
                            <div className="forecast-heat-bar-container">
                              <div className="forecast-heat-bar-track">
                                <div
                                  className="forecast-heat-bar"
                                  style={{
                                    left: `${clampedMinPos}%`,
                                    width: `${barWidth}%`,
                                    background: `linear-gradient(to right, ${minColor}, ${maxColor})`,
                                  }}
                                />
                              </div>
                              <div className="forecast-temp-labels">
                                <span className="forecast-temp-label forecast-temp-low">
                                  {roundTemp(min)}°
                                </span>
                                <span className="forecast-temp-label forecast-temp-high">
                                  {roundTemp(max)}°
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="forecast-heat-bar-container">
                          <div className="forecast-heat-bar-track" />
                        </div>
                      );
                    })()
                  ) : (
                    <div className="forecast-heat-bar-container">
                      <div className="forecast-heat-bar-track" />
                    </div>
                  )}
                </div>
              </div>
            );
          })
        : [...Array(10)].map((_, index) => (
            // Placeholder for skeleton loading state
            <div className="forecast-card" key={index}>
              <div
                className="skeleton-element skeleton-text"
                style={{ width: "50%", height: "16px", marginBottom: "12px" }}
              />
              <div
                className="skeleton-element skeleton-circle"
                style={{ width: "48px", height: "48px", margin: "12px auto" }}
              />
              <div
                className="skeleton-element skeleton-text"
                style={{ width: "70%", height: "20px", marginTop: "12px" }}
              />
            </div>
          ))}
    </div>
  );
};

export default Forecast;
