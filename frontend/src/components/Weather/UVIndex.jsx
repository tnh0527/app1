import "./UVIndex.css";
import { useState, useEffect } from "react";
import moment from "moment-timezone";

const UVIndex = ({ hourlyUVIndex, timeZone, sunData }) => {
  const maxUVIndex = 12;
  const [currentUVIndex, setCurrentUVIndex] = useState(null);
  const [peakUVData, setPeakUVData] = useState(null);

  const resolvedTimeZone =
    (timeZone && (timeZone.time_zone || timeZone)) || "UTC";

  const normalizeUvValue = (value) => {
    const num = Number(value);
    if (Number.isNaN(num) || num < 0) return 0;
    return Math.ceil(num * 10) / 10;
  };

  const computeIsDayFromSun = (sunriseISO, sunsetISO, tz) => {
    if (sunriseISO && sunsetISO) {
      const now = moment().tz(tz);
      const sunrise = moment.tz(sunriseISO, tz);
      const sunset = moment.tz(sunsetISO, tz);

      if (sunrise.isValid() && sunset.isValid()) {
        if (sunset.isBefore(sunrise)) {
          return !(now.isAfter(sunset) && now.isBefore(sunrise));
        }
        return now.isSameOrAfter(sunrise) && now.isBefore(sunset);
      }
    }
    return true;
  };

  useEffect(() => {
    const updateUVIndex = () => {
      if (!hourlyUVIndex || hourlyUVIndex.length === 0) {
        setCurrentUVIndex(null);
        setPeakUVData(null);
        return;
      }

      const entries = hourlyUVIndex
        .map((hourData) => {
          const ts = moment.tz(hourData.time, resolvedTimeZone);
          if (!ts.isValid()) return null;
          return {
            ...hourData,
            uv_index: normalizeUvValue(hourData.uv_index),
            ts,
          };
        })
        .filter(Boolean);

      if (!entries.length) {
        setCurrentUVIndex(null);
        setPeakUVData(null);
        return;
      }

      const now = moment().tz(resolvedTimeZone);
      const closest = entries.reduce((best, item) => {
        const diff = Math.abs(item.ts.valueOf() - now.valueOf());
        if (!best || diff < best.diff) return { data: item, diff };
        return best;
      }, null)?.data;

      const isDaytime = computeIsDayFromSun(
        sunData?.sunrise,
        sunData?.sunset,
        resolvedTimeZone
      );

      const currentValue = closest ? normalizeUvValue(closest.uv_index) : 0;
      setCurrentUVIndex(
        closest
          ? {
              ...closest,
              uv_index: (isDaytime ? currentValue : 0).toFixed(1),
            }
          : { uv_index: "0.0", time: now.toISOString() }
      );

      const peakData = entries.reduce((prev, curr) => {
        const prevVal = normalizeUvValue(prev.uv_index);
        const currVal = normalizeUvValue(curr.uv_index);
        return currVal > prevVal ? curr : prev;
      }, entries[0]);

      setPeakUVData(
        peakData
          ? {
              ...peakData,
              uv_index: normalizeUvValue(peakData.uv_index).toFixed(1),
            }
          : null
      );
    };
    updateUVIndex();
    const interval = setInterval(() => {
      updateUVIndex();
    }, 3600000); // Update every hour

    return () => clearInterval(interval);
  }, [hourlyUVIndex, resolvedTimeZone, sunData]);

  const peakMoment = peakUVData
    ? moment.tz(peakUVData.time, resolvedTimeZone)
    : null;
  const peakUVTime =
    peakMoment && peakMoment.isValid() ? peakMoment.format("h:mm A") : "";

  return (
    <div className={`highlight ${!currentUVIndex ? "skeleton" : ""}`}>
      <div className="highlight-header">
        <h4>UV Index</h4>
        <div className="highlight-icon uv-icon">
          <i className="bi bi-sun"></i>
        </div>
      </div>
      {!currentUVIndex ? null : (
        <div className="card uv-index">
          <div className="index-gauge">
            <div className="percent">
              <svg viewBox="0 0 260 260" width="180" height="180">
                <circle
                  cx="130"
                  cy="130"
                  r="105"
                  className="bg-circle"
                ></circle>
                <circle
                  cx="130"
                  cy="130"
                  r="105"
                  className="fill-circle"
                  style={{
                    "--percent": (currentUVIndex.uv_index / maxUVIndex) * 100,
                    "--stroke-color": uvLevelColor(currentUVIndex.uv_index),
                  }}
                ></circle>
              </svg>
              <div className="number">
                <h1>
                  <span> Current </span>
                </h1>
                <h3>{currentUVIndex.uv_index}</h3>

                <h2>
                  <span> UV</span>
                  <span> Index </span>
                </h2>
              </div>
            </div>
          </div>

          <div
            className="uv-level"
            style={{ color: uvLevelColor(currentUVIndex.uv_index) }}
          >
            <h2>{uvLevelText(currentUVIndex.uv_index)}</h2>
            {peakUVData && (
              <p className="peak-uv-description">
                Peak UV Index: {peakUVData.uv_index} at {peakUVTime}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const uvLevelText = (uvIndex) => {
  return uvIndex <= 2
    ? "Low"
    : uvIndex <= 5
    ? "Moderate"
    : uvIndex <= 7
    ? "High"
    : uvIndex <= 10
    ? "Very High"
    : "Extreme";
};

const uvLevelColor = (uvIndex) => {
  return uvIndex <= 2
    ? "#00FF00" // Lime Green
    : uvIndex <= 4
    ? "yellow"
    : uvIndex <= 7
    ? "orange"
    : uvIndex <= 9
    ? "red"
    : "purple";
};

export default UVIndex;
