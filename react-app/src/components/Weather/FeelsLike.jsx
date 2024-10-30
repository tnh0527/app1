import "./FeelsLike.css";

const FeelsLike = () => {
  return (
    <div className="card feels-like">
      <div className="feels-like-content">
        <div className="feels-like-icon">
          <i className="bi bi-thermometer-half"></i>
        </div>
        <div className="feels-like-temp">42°</div>
      </div>
      <div className="feels-like-description">
        Humidity is making it feel hotter.
      </div>
    </div>
  );
};

export default FeelsLike;
