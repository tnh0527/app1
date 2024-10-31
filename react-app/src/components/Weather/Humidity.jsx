import "./Humidity.css";

const Humidity = () => {
  return (
    <div className="highlight">
      <h4>Humidity</h4>
      <div className="humidity-card">
        <div className="humidity-content">
          <div className="humidity-info">
            <div className="humidity-value-percentage">
              <span className="humidity-value">84</span>
              <span className="humidity-percentage">%</span>
            </div>
          </div>

          <div className="dew-point">
            <i className="bi bi-droplet-half"></i>The dew point is 27° right
            now.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Humidity;
