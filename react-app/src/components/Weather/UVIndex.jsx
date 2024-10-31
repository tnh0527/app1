import "./UVIndex.css";

const UVIndex = ({ uvIndex = 6 }) => {
  const maxUVIndex = 12;
  const uvPercentage = (uvIndex / maxUVIndex) * 100; // Calculate percentage

  const uvLevelText =
    uvIndex <= 2
      ? "Low"
      : uvIndex <= 5
      ? "Moderate"
      : uvIndex <= 7
      ? "High"
      : uvIndex <= 10
      ? "Very High"
      : "Extreme";

  const uvLevelColor =
    uvIndex <= 2
      ? "green"
      : uvIndex <= 4
      ? "yellow"
      : uvIndex <= 7
      ? "orange"
      : uvIndex <= 9
      ? "red"
      : "purple";

  return (
    <div className="highlight">
      <h4>UV Index</h4>
      <div className="card uv-index">
        <div className="index-gauge">
          <div className="percent">
            <svg width="210" height="210">
              <circle cx="105" cy="105" r="65" className="bg-circle"></circle>
              <circle
                cx="105"
                cy="105"
                r="65"
                className="fill-circle"
                style={{
                  "--percent": uvPercentage,
                  "--stroke-color": uvLevelColor,
                }}
              ></circle>
            </svg>
            <div className="number">
              <h3>
                {uvIndex}
                <span> UV</span>
              </h3>
              <h2>
                <span> Index </span>
              </h2>
            </div>
          </div>
        </div>

        <div className="uv-level" style={{ color: uvLevelColor }}>
          <h2>{uvLevelText}</h2>
        </div>
      </div>
    </div>
  );
};

export default UVIndex;
