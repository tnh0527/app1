import "./CardSlot.css";
import { useState, useRef, useEffect } from "react";
import WindStatus from "./WindStatus";
import UVIndex from "./UVIndex";
import SunriseSunset from "./SunriseSunset";
import Humidity from "./Humidity";
import AirQuality from "./AirQuality";
import FeelsLike from "./FeelsLike";
import Visibility from "./Visibility";
import Pressure from "./Pressure";
import CloudCover from "./CloudCover";

const COMPONENT_MAP = {
  wind: WindStatus,
  uv: UVIndex,
  sunrise: SunriseSunset,
  humidity: Humidity,
  air_quality: AirQuality,
  feels_like: FeelsLike,
  visibility: Visibility,
  pressure: Pressure,
  cloud_cover: CloudCover,
};

const ICON_MAP = {
  wind: "bi-wind",
  uv: "bi-sun",
  sunrise: "bi-sunrise",
  humidity: "bi-droplet-half",
  air_quality: "bi-lungs",
  feels_like: "bi-thermometer-half",
  visibility: "bi-eye",
  pressure: "bi-speedometer2",
  cloud_cover: "bi-clouds",
};

const CardSlot = ({
  slotId,
  type,
  data,
  onChange,
  onCardClick,
  options,
  isLoading = false,
}) => {
  const Component = COMPONENT_MAP[type];
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getProps = (type, data) => {
    switch (type) {
      case "wind":
        return { windstatusData: data.windData };
      case "uv":
        return {
          hourlyUVIndex: data.uvData,
          timeZone: data.timeZone,
          sunData: data.sunriseSunset,
        };
      case "sunrise":
        return { sunData: data.sunriseSunset, timeZone: data.timeZone };
      case "humidity":
        return { humidDewData: data.humidData };
      case "air_quality":
        return { airQuality: data.AQI };
      case "feels_like":
        return {
          feels: data.feelsLikeData,
          windData: data.windData,
          humidData: data.humidData,
        };
      case "visibility":
        return {
          visibilityData: data.visibilityData,
          currentVisibility: data.currentConditions?.visibility,
        };
      case "pressure":
        return {
          pressureData: data.pressureData,
          currentPressure: data.currentConditions?.pressure,
        };
      case "cloud_cover":
        return {
          cloudCoverData: data.cloudCoverData,
          currentCloudCover: data.currentConditions?.cloud_cover,
        };
      default:
        return {};
    }
  };

  const props = getProps(type, data);
  const currentLabel =
    options?.find((opt) => opt.value === type)?.label || type;
  const currentIcon = ICON_MAP[type] || "bi-circle";

  const handleOptionClick = (value) => {
    onChange(slotId, value);
    setIsOpen(false);
  };

  return (
    <div className={`card-slot-container ${isLoading ? "skeleton" : ""}`}>
      {options && options.length > 0 && (
        <div className="card-selector-wrapper" ref={dropdownRef}>
          <button
            className="card-dropdown-trigger"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
          >
            <i className={`bi ${currentIcon} card-type-icon`} />
            <span>{currentLabel}</span>
            <i
              className={`bi bi-chevron-down dropdown-arrow ${
                isOpen ? "open" : ""
              }`}
            ></i>
          </button>
          {isOpen && (
            <ul className="card-dropdown-list">
              {options.map((opt) => (
                <li
                  key={opt.value}
                  className={`card-dropdown-item ${
                    opt.value === type ? "selected" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOptionClick(opt.value);
                  }}
                >
                  <i
                    className={`bi ${ICON_MAP[opt.value] || "bi-circle"}"`}
                    style={{ marginRight: 8 }}
                  ></i>
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div
        className="card-content-wrapper"
        data-type={type}
        onClick={() => onCardClick && onCardClick(type, props)}
      >
        {isLoading ? (
          <div style={{ width: "100%", height: "100%", padding: "20px" }}>
            <div
              className="skeleton-element skeleton-title"
              style={{ width: "60%", marginBottom: "16px" }}
            />
            <div
              className="skeleton-element skeleton-text"
              style={{ width: "80%", marginBottom: "12px" }}
            />
            <div
              className="skeleton-element skeleton-text"
              style={{ width: "40%" }}
            />
          </div>
        ) : Component ? (
          <Component {...props} />
        ) : (
          <div>Select a card</div>
        )}
      </div>
    </div>
  );
};

export default CardSlot;
