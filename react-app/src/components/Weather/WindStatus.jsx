import "./WindStatus.css";

const WindStatus = () => {
  const windData = [
    { speed: 10, height: 15 },
    { speed: 15, height: 20 },
    { speed: 5, height: 10 },
    { speed: 25, height: 25 },
    { speed: 15, height: 15 },
    { speed: 17, height: 17 },
    { speed: 13, height: 13 },
    { speed: 20, height: 18 },
    { speed: 12, height: 14 },
    { speed: 18, height: 22 },
    { speed: 18, height: 28 },
  ];

  const pathData = windData
    .map((data, index) => {
      const x = 5 + index * 10;
      const y = 30 - data.height;
      return [x, y];
    })
    .reduce((acc, point, index, array) => {
      if (index === 0) {
        return `M${point[0]},${point[1]}`;
      } else {
        const prevPoint = array[index - 1];
        const controlX1 = prevPoint[0] + (point[0] - prevPoint[0]) / 3;
        const controlY1 = prevPoint[1];
        const controlX2 = prevPoint[0] + (2 * (point[0] - prevPoint[0])) / 3;
        const controlY2 = point[1];
        return `${acc} C${controlX1},${controlY1} ${controlX2},${controlY2} ${point[0]},${point[1]}`;
      }
    }, "");

  return (
    <div className="card wind-status">
      <div className="wind-chart">
        <svg viewBox="0 0 111 30" className="wind-line-chart">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop
                offset="0%"
                style={{ stopColor: "#404040", stopOpacity: 0.2 }}
              />
              <stop
                offset="40%"
                style={{ stopColor: "#00FFFF", stopOpacity: 1 }}
              />
              <stop
                offset="50%"
                style={{ stopColor: "#FFFFFF", stopOpacity: 1 }}
              />
              <stop
                offset="60%"
                style={{ stopColor: "#00FFFF", stopOpacity: 1 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "#404040", stopOpacity: 0.2 }}
              />
            </linearGradient>
          </defs>
          <path
            d={pathData}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="wind-bars">
        <svg viewBox="0 0 111 40" className="wind-bar-chart">
          {windData.map((data, index) => (
            <rect
              key={index}
              x={5 + index * 10}
              y={30 - data.height}
              width="5"
              height={data.height}
              rx="2"
              ry="2"
              fill={
                index === Math.floor(windData.length / 2)
                  ? "#00FFFF"
                  : index === Math.floor(windData.length / 2) - 1 ||
                    index === Math.floor(windData.length / 2) + 1
                  ? "#005f69"
                  : "#404040"
              }
            />
          ))}
        </svg>
      </div>
      <div className="wind-speed-data">
        <h2 className="wind-speed wind-speed-highlight wind-speed-bottom-left">
          7.90 <span>km/h</span>
        </h2>
        <div />
        <div className="wind-time-data">
          <span className="wind-time wind-time-highlight wind-time-bottom-right">
            5:01 AM
          </span>
        </div>
      </div>
    </div>
  );
};

export default WindStatus;
