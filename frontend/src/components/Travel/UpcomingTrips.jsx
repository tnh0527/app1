import "./UpcomingTrips.css";

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export const UpcomingTrips = ({ trips, onSelectTrip }) => {
  const upcomingTrips = trips
    .filter((t) => new Date(t.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    .slice(0, 5);

  return (
    <div className="upcoming-trips">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-calendar-event"></i>
          Upcoming Trips
        </h3>
      </div>

      <div className="panel-content">
        {upcomingTrips.length === 0 ? (
          <div className="empty-upcoming">
            <i className="bi bi-calendar-x"></i>
            <p>No upcoming trips</p>
          </div>
        ) : (
          <div className="upcoming-list">
            {upcomingTrips.map((trip) => (
              <div
                key={trip.id}
                className="upcoming-item"
                onClick={() => onSelectTrip(trip)}
              >
                <div className="upcoming-flag">{trip.country_flag}</div>
                <div className="upcoming-info">
                  <h4>{trip.name}</h4>
                  <p>
                    {trip.city}, {trip.country}
                  </p>
                </div>
                <div className="upcoming-meta">
                  <span className="days-badge">
                    {trip.days_until_trip === 0
                      ? "Today!"
                      : trip.days_until_trip === 1
                        ? "Tomorrow"
                        : `${trip.days_until_trip} days`}
                  </span>
                  <span className="trip-date">
                    {formatDate(trip.start_date)}
                  </span>
                </div>
                <div
                  className="upcoming-accent"
                  style={{ backgroundColor: trip.color || "#00d4aa" }}
                ></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingTrips;

