import "./CardSlot.css";
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

const CardSlot = ({ slotId, type, data, onChange, onCardClick, options }) => {
  const Component = COMPONENT_MAP[type];

  const getProps = (type, data) => {
    switch (type) {
      case "wind":
        return { windstatusData: data.windData };
      case "uv":
        return { hourlyUVIndex: data.uvData };
      case "sunrise":
        return { sunData: data.sunriseSunset, timeZone: data.timeZone };
      case "humidity":
        return { humidDewData: data.humidData };
      case "air_quality":
        return { airQuality: data.AQI };
      case "feels_like":
        return { feels: data.feelsLikeData };
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

  return (
    <div className="card-slot-container">
      {options && options.length > 0 && (
        <div className="card-selector-wrapper">
          <select
            value={type}
            onChange={(e) => onChange(slotId, e.target.value)}
            className="card-select"
            onClick={(e) => e.stopPropagation()} // Prevent modal open when clicking select
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <div
        className="card-content-wrapper"
        onClick={() => onCardClick && onCardClick(type, props)}
      >
        {Component ? <Component {...props} /> : <div>Select a card</div>}
      </div>
    </div>
  );
};

export default CardSlot;
