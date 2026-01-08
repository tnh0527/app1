import WeatherMap from "./WeatherMap";
import "./CurrentWeather.css";
import { useRef, useEffect, useState } from "react";
import { videoMap, iconMap } from "../../utils/weatherMapping";
import moment from "moment-timezone";

const CurrentWeather = ({
  currentWeather,
  setCurrentWeather,
  location,
  dailyTemps,
  handleToggle,
  mapData,
  timezone,
  sunData,
  hourlyForecast,
  isLoadingWeather,
  onSaveLocation,
  isLocationSaved,
  isSavingLocation,
  saveError,
  onClearSaveError,
  onSearchClick,
  onHomeClick,
  hasHomeAddress,
}) => {
  // State to track the current 15-minute interval index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDay, setIsDay] = useState(null);
  const [showHomePopup, setShowHomePopup] = useState(false);

  // Reset loading when parent signals loading or when location changes
  useEffect(() => {
    if (isLoadingWeather) {
      setIsLoading(true);
    }
  }, [isLoadingWeather]);

  useEffect(() => {
    if (
      currentWeather &&
      Object.keys(currentWeather).length > 0 &&
      !isLoadingWeather
    ) {
      setIsLoading(false);
    }
  }, [currentWeather, isLoadingWeather]);

  useEffect(() => {
    if (sunData && sunData.sunrise && sunData.sunset) {
      const currentTime = moment().tz(timezone);
      const sunrise = moment.tz(sunData.sunrise, timezone);
      const sunset = moment.tz(sunData.sunset, timezone);
      setIsDay(currentTime.isAfter(sunrise) && currentTime.isBefore(sunset));
    }
  }, [timezone, sunData, currentIndex]);

  const videoRef = useRef(null);
  const scrollRef = useRef(null);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [showLeftButton, setShowLeftButton] = useState(false);
  const [showRightButton, setShowRightButton] = useState(false);

  // Drag to scroll handlers
  const handleMouseDown = (e) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Scroll speed multiplier
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  useEffect(() => {
    if (videoRef.current) {
      let rate = 0.5;
      const interval = setInterval(() => {
        if (rate > 0.3) {
          rate -= 0.005;
          videoRef.current.playbackRate = rate;
        } else {
          clearInterval(interval);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, []);

  // Show/hide left/right scroll hints based on current scroll position
  useEffect(() => {
    const updateHints = () => {
      const el = scrollRef.current;
      const container = containerRef.current;
      if (!el || !container) return;

      // Use layout values to determine if scrollable content exists
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const canScroll = scrollWidth - clientWidth > 4; // small tolerance to detect overflow
      const atLeft = scrollLeft <= 5;
      const atRight = scrollLeft + clientWidth >= scrollWidth - 5;

      container.classList.toggle("no-left", atLeft || !canScroll);
      container.classList.toggle("no-right", atRight || !canScroll);

      // Update button visibility state so we can conditionally render
      setShowLeftButton(canScroll && !atLeft);
      setShowRightButton(canScroll && !atRight);
    };

    // Run after layout to ensure children sizes are known
    const runUpdate = () => requestAnimationFrame(updateHints);

    // Initial run with delay to ensure content is rendered
    const initialTimer = setTimeout(runUpdate, 100);
    runUpdate();

    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener("scroll", updateHints, { passive: true });
    window.addEventListener("resize", runUpdate);

    // Observe for content changes (items added/removed) so hints update
    const mo = new MutationObserver(runUpdate);
    mo.observe(el, { childList: true, subtree: true });

    // Observe size changes to recompute scrollability when layout shifts
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => runUpdate());
      ro.observe(el);
    }

    return () => {
      clearTimeout(initialTimer);
      el.removeEventListener("scroll", updateHints);
      window.removeEventListener("resize", runUpdate);
      mo.disconnect();
      if (ro) ro.disconnect();
    };
  }, [hourlyForecast]);

  // Handle wheel scroll isolation - prevent page scroll when inside hourly section
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleWheel = (e) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    // Use non-passive listener to allow preventDefault
    el.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      el.removeEventListener("wheel", handleWheel);
    };
  }, [hourlyForecast]);

  // Set an interval to update the weather data every 15 minutes
  useEffect(() => {
    const updateCurrentWeather = () => {
      const currentTime = new Date();
      const currentMinuteIndex = Math.floor(
        (currentTime.getHours() * 60 + currentTime.getMinutes()) / 15
      );
      const newIndex = currentMinuteIndex % currentWeather.length;

      setCurrentIndex(newIndex);
    };
    updateCurrentWeather();

    // Calculate the time until the next 15-minute interval
    const currentTime = new Date();
    const minutes = currentTime.getMinutes();
    const seconds = currentTime.getSeconds();
    const milliseconds = currentTime.getMilliseconds();

    const msToNextQuarterHour =
      (15 - (minutes % 15)) * 60 * 1000 - seconds * 1000 - milliseconds;

    // Set a timeout to synchronize with the next quarter-hour
    const timeout = setTimeout(() => {
      updateCurrentWeather();

      // Set interval to update every 15 minutes after the first synchronization
      const interval = setInterval(updateCurrentWeather, 15 * 60 * 1000); // 15 minutes

      return () => clearInterval(interval);
    }, msToNextQuarterHour);

    return () => clearTimeout(timeout);
  }, [currentWeather]);

  // Update weather icon and video based on condition and time of day
  useEffect(() => {
    const condition = currentWeather[currentIndex]?.condition;
    if (!condition) {
      return;
    }
    // Determine the appropriate icon
    let icon;
    if (typeof iconMap[condition] === "object") {
      icon = isDay ? iconMap[condition].day : iconMap[condition].night;
    } else {
      icon = iconMap[condition] || "bi bi-question-circle";
    }
    // Determine the appropriate video
    let video;
    if (typeof videoMap[condition] === "object") {
      video = isDay ? videoMap[condition].day : videoMap[condition].night;
    } else {
      video = videoMap[condition] || videoMap.default.clear;
    }

    setCurrentWeather((prevWeather) => {
      if (
        prevWeather.weatherIcon === icon &&
        prevWeather.video === video &&
        prevWeather.temperature === currentWeather[currentIndex].temperature
      )
        return prevWeather;

      return {
        ...prevWeather,
        weatherIcon: icon,
        video: video,
        temperature: currentWeather[currentIndex].temperature,
        condition: currentWeather[currentIndex].condition,
      };
    });
  }, [currentIndex, currentWeather, setCurrentWeather]);

  // Format today's date as a readable string
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (isLoading) {
    return (
      <div className="current-weather">
        <div className="weather-container">
          <div className="current-weather-details skeleton-details">
            <div className="skeleton-location"></div>
            <div className="skeleton-date"></div>
            <div className="skeleton-temp"></div>
          </div>
          <div className="hourly-forecast-container skeleton-hourly">
            <div className="skeleton-hourly-items">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="skeleton-hourly-item"></div>
              ))}
            </div>
          </div>
          <div className="weather-map skeleton-map"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="current-weather">
      <div className="weather-container">
        <div className="current-weather-details">
          <video
            key={currentWeather.video}
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            className="weather-video"
          >
            <source src={currentWeather.video} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          <h2>{location}</h2>
          <p className="current-date">{formattedDate}</p>
          <div className="temperature">
            <div className="temp-info">
              <h1>
                {currentWeather.temperature}°{currentWeather.unit || "F"}
              </h1>
              <p>{currentWeather.condition}</p>
            </div>
            <div className="high-low-temp">
              <i className={currentWeather.weatherIcon}></i>
              <span>
                <span style={{ fontSize: "0.8em", color: "#aaa" }}>L:</span>{" "}
                {dailyTemps.tempMin ? `${dailyTemps.tempMin}°` : "Sample"}{" "}
                <span style={{ fontSize: "0.8em", color: "#aaa" }}>H:</span>{" "}
                {dailyTemps.tempMax ? `${dailyTemps.tempMax}°` : "Sample"}
              </span>
            </div>
          </div>

          <div className="temp-toggle">
            <button
              className="search-icon-btn"
              onClick={onSearchClick}
              title="Search location"
            >
              <i className="bi bi-search"></i>
            </button>
            <div className="home-btn-wrapper">
              <button
                className="home-icon-btn"
                onClick={() => {
                  if (hasHomeAddress) {
                    onHomeClick?.();
                  } else {
                    setShowHomePopup(true);
                  }
                }}
                title="Go to home location"
              >
                <i className="bi bi-house-door"></i>
              </button>
              {showHomePopup && !hasHomeAddress && (
                <div className="home-popup">
                  <div className="home-popup-content">
                    <i className="bi bi-exclamation-circle"></i>
                    <p>No home address set</p>
                    <span>Add your address in your profile settings</span>
                    <button
                      className="home-popup-close"
                      onClick={() => setShowHomePopup(false)}
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Temperature Unit Toggle */}
          <div className="temp-unit-toggle">
            <button
              className={`unit-btn ${
                currentWeather.unit !== "C" ? "active" : ""
              }`}
              onClick={currentWeather.unit === "C" ? handleToggle : undefined}
            >
              F
            </button>
            <button
              className={`unit-btn ${
                currentWeather.unit === "C" ? "active" : ""
              }`}
              onClick={currentWeather.unit !== "C" ? handleToggle : undefined}
            >
              C
            </button>
          </div>

          {/* Save Location Button */}
          <button
            className={`save-location-btn ${isLocationSaved ? "saved" : ""} ${
              isSavingLocation ? "saving" : ""
            }`}
            onClick={onSaveLocation}
            disabled={isLocationSaved || isSavingLocation}
            title={isLocationSaved ? "Location saved" : "Save this location"}
          >
            {isSavingLocation ? (
              <i className="bi bi-arrow-repeat spinning"></i>
            ) : isLocationSaved ? (
              <i className="bi bi-bookmark-fill"></i>
            ) : (
              <i className="bi bi-bookmark-plus"></i>
            )}
          </button>
        </div>

        {/* Hourly Forecast Scrollable Section */}
        <div className="hourly-forecast-container" ref={containerRef}>
          {showLeftButton && (
            <button
              type="button"
              aria-label="Scroll left"
              className="hourly-scroll-btn left"
              onClick={() => {
                if (!scrollRef.current) return;
                const el = scrollRef.current;
                const first = el.firstElementChild;
                const gap = parseInt(getComputedStyle(el).gap || 18, 10) || 18;
                const itemW = first ? first.getBoundingClientRect().width : 60;
                const itemsToScroll = 3;
                const amount = (itemW + gap) * itemsToScroll;
                el.scrollBy({ left: -amount, behavior: "smooth" });
              }}
            >
              <i className="bi bi-chevron-left"></i>
            </button>
          )}
          <div
            className={`hourly-forecast-scroll ${isDragging ? "dragging" : ""}`}
            ref={scrollRef}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          >
            {hourlyForecast && hourlyForecast.length > 0 && sunData ? (
              (() => {
                const now = new Date();
                const currentHour = now.getHours();
                // Find the index of the first item that matches or is after the current hour
                const startIndex = hourlyForecast.findIndex((hour) => {
                  const hourDate = new Date(hour.time);
                  return (
                    hourDate.getDate() === now.getDate() &&
                    hourDate.getHours() === currentHour
                  );
                });

                const effectiveStartIndex = startIndex !== -1 ? startIndex : 0;
                const slicedForecast = hourlyForecast.slice(
                  effectiveStartIndex,
                  effectiveStartIndex + 24
                );

                // Parse sunrise and sunset times (today and tomorrow)
                const todaySunrise = sunData.sunrise
                  ? new Date(sunData.sunrise)
                  : null;
                const todaySunset = sunData.sunset
                  ? new Date(sunData.sunset)
                  : null;
                const tomorrowSunrise = sunData.tomorrowSunrise
                  ? new Date(sunData.tomorrowSunrise)
                  : null;
                const tomorrowSunset = sunData.tomorrowSunset
                  ? new Date(sunData.tomorrowSunset)
                  : null;

                // Build the forecast with sunrise/sunset inserted at correct positions
                const forecastWithSun = [];
                let todaySunriseInserted = false;
                let todaySunsetInserted = false;
                let tomorrowSunriseInserted = false;
                let tomorrowSunsetInserted = false;

                slicedForecast.forEach((hour, index) => {
                  const hourTime = new Date(hour.time);

                  // Insert today's sunrise if it falls before this hour and hasn't been inserted
                  if (
                    !todaySunriseInserted &&
                    todaySunrise &&
                    todaySunrise >= now &&
                    todaySunrise <= hourTime
                  ) {
                    forecastWithSun.push({
                      type: "sunrise",
                      time: todaySunrise,
                    });
                    todaySunriseInserted = true;
                  }

                  // Insert today's sunset if it falls before this hour and hasn't been inserted
                  if (
                    !todaySunsetInserted &&
                    todaySunset &&
                    todaySunset >= now &&
                    todaySunset <= hourTime
                  ) {
                    forecastWithSun.push({
                      type: "sunset",
                      time: todaySunset,
                    });
                    todaySunsetInserted = true;
                  }

                  // Insert tomorrow's sunrise if it falls before this hour
                  if (
                    !tomorrowSunriseInserted &&
                    tomorrowSunrise &&
                    tomorrowSunrise <= hourTime
                  ) {
                    forecastWithSun.push({
                      type: "sunrise",
                      time: tomorrowSunrise,
                    });
                    tomorrowSunriseInserted = true;
                  }

                  // Insert tomorrow's sunset if it falls before this hour
                  if (
                    !tomorrowSunsetInserted &&
                    tomorrowSunset &&
                    tomorrowSunset <= hourTime
                  ) {
                    forecastWithSun.push({
                      type: "sunset",
                      time: tomorrowSunset,
                    });
                    tomorrowSunsetInserted = true;
                  }

                  forecastWithSun.push({
                    ...hour,
                    type: "weather",
                    originalIndex: index,
                  });
                });

                // Append any sun events that come after all hours in the slice
                if (
                  !todaySunriseInserted &&
                  todaySunrise &&
                  todaySunrise >= now
                ) {
                  forecastWithSun.push({ type: "sunrise", time: todaySunrise });
                }
                if (!todaySunsetInserted && todaySunset && todaySunset >= now) {
                  forecastWithSun.push({ type: "sunset", time: todaySunset });
                }
                if (!tomorrowSunriseInserted && tomorrowSunrise) {
                  forecastWithSun.push({
                    type: "sunrise",
                    time: tomorrowSunrise,
                  });
                }

                // Wind speed threshold for "Windy" condition (iPhone uses ~20 mph typically)
                const WINDY_THRESHOLD = 20;

                return forecastWithSun.map((item, index) => {
                  if (item.type === "sunrise" || item.type === "sunset") {
                    const timeString = item.time.toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    });
                    const iconClass =
                      item.type === "sunrise"
                        ? "bi bi-sunrise-fill"
                        : "bi bi-sunset-fill";
                    const label =
                      item.type === "sunrise" ? "Sunrise" : "Sunset";

                    return (
                      <div
                        key={`${item.type}-${index}`}
                        className={`hourly-item ${item.type}-item`}
                      >
                        <span className="hourly-time">{timeString}</span>
                        <i className={`hourly-icon ${iconClass}`}></i>
                        <span className="hourly-temp sun-label">{label}</span>
                      </div>
                    );
                  }

                  // Regular weather item
                  const time = new Date(item.time);
                  const hourString = time.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    hour12: true,
                  });

                  let iconClass = "bi bi-question-circle";
                  let condition = item.condition;
                  const isDayTime = item.is_day === 1;

                  // Check for windy condition: high wind speed overrides other conditions
                  // Similar to iPhone weather app behavior
                  const isWindy =
                    item.wind_speed && item.wind_speed >= WINDY_THRESHOLD;
                  if (isWindy) {
                    iconClass = "bi bi-wind";
                  } else if (iconMap[condition]) {
                    if (typeof iconMap[condition] === "object") {
                      iconClass = isDayTime
                        ? iconMap[condition].day
                        : iconMap[condition].night;
                    } else {
                      iconClass = iconMap[condition];
                    }
                  }

                  const isNow = item.originalIndex === 0;

                  return (
                    <div key={index} className="hourly-item">
                      <span className="hourly-time">
                        {isNow ? "Now" : hourString}
                      </span>
                      <i className={`hourly-icon ${iconClass}`}></i>
                      <span className="hourly-temp">
                        {Math.round(item.temperature)}°
                      </span>
                    </div>
                  );
                });
              })()
            ) : (
              <div className="hourly-item" style={{ width: "100%" }}>
                <span className="hourly-time">Loading forecast...</span>
              </div>
            )}
          </div>
          {showRightButton && (
            <button
              type="button"
              aria-label="Scroll right"
              className="hourly-scroll-btn right"
              onClick={() => {
                if (!scrollRef.current) return;
                const el = scrollRef.current;
                const first = el.firstElementChild;
                const gap = parseInt(getComputedStyle(el).gap || 18, 10) || 18;
                const itemW = first ? first.getBoundingClientRect().width : 60;
                const itemsToScroll = 3;
                const amount = (itemW + gap) * itemsToScroll;
                el.scrollBy({ left: amount, behavior: "smooth" });
              }}
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          )}
        </div>

        <div className="weather-map">
          <WeatherMap mapData={mapData} />
        </div>
      </div>
    </div>
  );
};

export default CurrentWeather;
