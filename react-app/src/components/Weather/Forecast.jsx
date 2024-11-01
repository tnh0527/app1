import "./Forecast.css";

const Forecast = ({ forecast }) => {
  const data = forecast && forecast.length > 0 ? forecast : null;

  return (
    <div className="forecast">
      <h3>10 Days Forecast</h3>
      <div className="forecast-cards">
        {[...Array(10)].map((_, index) => (
          <div
            className={`forecast-card ${!data ? "skeleton" : ""}`}
            key={index}
          >
            {data && (
              // Show actual forecast data once loaded
              <>
                <div className="forecast-info">
                  <span className="forecast-day">
                    {data[index]?.date?.weekday || "Sample"}
                  </span>
                  <p>{data[index]?.tempMax || "Sample"}°</p>
                </div>
                <div className="forecast-icon">
                  <img src={data[index]?.icon} alt={data[index]?.day} />
                </div>
                <div className="forecast-dayMonth">
                  {data[index]?.date?.dayMonth || "Sample"}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Forecast;
