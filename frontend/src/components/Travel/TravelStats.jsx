import "./TravelStats.css";

export const TravelStats = ({ summary }) => {
  const stats = [
    {
      label: "Total Trips",
      value: summary?.total_trips || 0,
      icon: "bi-airplane",
      color: "#00d4aa",
    },
    {
      label: "Countries",
      value: summary?.countries_visited || 0,
      icon: "bi-globe-americas",
      color: "#3b82f6",
    },
    {
      label: "Days Traveled",
      value: summary?.total_days_traveled || 0,
      icon: "bi-calendar-check",
      color: "#a855f7",
    },
    {
      label: "Upcoming",
      value: summary?.upcoming_trips || 0,
      icon: "bi-calendar-event",
      color: "#f59e0b",
    },
  ];

  return (
    <div className="travel-stats">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-bar-chart"></i>
          Travel Stats
        </h3>
      </div>

      <div className="panel-content">
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-item">
              <div
                className="stat-icon"
                style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
              >
                <i className={`bi ${stat.icon}`}></i>
              </div>
              <div className="stat-info">
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="year-progress">
          <div className="progress-header">
            <span>Trips This Year</span>
            <span>{summary?.trips_this_year || 0}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${Math.min((summary?.trips_this_year || 0) * 10, 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelStats;

