import "./Forecast.css";
import { sampleForecast } from "../../data/data";

const Forecast = ({ forecast }) => {
  const data = forecast && forecast.length > 0 ? forecast : sampleForecast;

  console.log("forecast prop:", forecast);

  return (
    <div className="forecast">
      <h3>10 Days Forecast</h3>
      <div className="forecast-cards">
        {data.map((item, index) => (
          <div className="forecast-card" key={index}>
            <div className="forecast-info">
              <span className="forecast-day">
                {item?.date?.weekday || sampleForecast}
              </span>
              <p>{item?.tempMax || sampleForecast}°</p>
            </div>
            <div className="forecast-icon">
              <img src={item.icon} alt={item.day} />
            </div>
            <div className="forecast-dayMonth">
              {item?.date?.dayMonth || sampleForecast}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Forecast;
