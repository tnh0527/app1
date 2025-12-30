import { useMemo } from "react";
import "./TripTimeline.css";

/**
 * Get trip type icon
 */
const getTripTypeIcon = (type) => {
  const icons = {
    vacation: "bi-sun",
    business: "bi-briefcase",
    adventure: "bi-compass",
    city_break: "bi-building",
    beach: "bi-umbrella",
    road_trip: "bi-car-front",
    backpacking: "bi-backpack",
  };
  return icons[type] || "bi-airplane";
};

/**
 * Format date nicely
 */
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/**
 * Trip Card Component
 */
const TripCard = ({ trip, onSelect }) => {
  const budgetPercentage = Math.min(trip.budget_utilization_percentage || 0, 100);
  const budgetColor =
    budgetPercentage < 80 ? "#00d4aa" : budgetPercentage < 100 ? "#ffc107" : "#dc3545";

  return (
    <div className={`trip-card status-${trip.status}`} onClick={() => onSelect(trip)}>
      <div className="trip-card-header">
        <div className={`trip-type-icon ${trip.trip_type}`}>
          <i className={`bi ${getTripTypeIcon(trip.trip_type)}`}></i>
        </div>
        <span className={`status-badge ${trip.status}`}>
          {trip.status.replace("_", " ")}
        </span>
      </div>

      <div className="trip-card-body">
        <div className="trip-destination">
          <span className="country-flag">{trip.country_flag}</span>
          <div>
            <h4>{trip.name}</h4>
            <p>
              {trip.city}, {trip.country}
            </p>
          </div>
        </div>

        <div className="trip-dates">
          <i className="bi bi-calendar3"></i>
          <span>
            {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
          </span>
        </div>

        <div className="trip-meta">
          <span className="meta-item">
            <i className="bi bi-clock"></i>
            {trip.duration_days} days
          </span>
          {trip.days_until_trip > 0 && (
            <span className="meta-item countdown">
              <i className="bi bi-hourglass-split"></i>
              {trip.days_until_trip} days to go
            </span>
          )}
        </div>
      </div>

      <div className="trip-card-footer">
        <div className="budget-progress">
          <div className="budget-info">
            <span>${(trip.actual_spend || 0).toLocaleString()}</span>
            <span className="budget-total">
              / ${(trip.budget_amount || 0).toLocaleString()}
            </span>
          </div>
          <div className="budget-bar">
            <div
              className="budget-fill"
              style={{
                width: `${budgetPercentage}%`,
                backgroundColor: budgetColor,
              }}
            ></div>
          </div>
        </div>
      </div>

      <div
        className="trip-card-accent"
        style={{ backgroundColor: trip.color || "#00d4aa" }}
      ></div>
    </div>
  );
};

/**
 * Pipeline Stage
 */
const PipelineStage = ({ title, trips, onSelect, icon, color }) => {
  return (
    <div className="pipeline-stage">
      <div className="stage-header" style={{ borderColor: color }}>
        <i className={`bi ${icon}`} style={{ color }}></i>
        <span>{title}</span>
        <span className="stage-count">{trips.length}</span>
      </div>
      <div className="stage-trips">
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} onSelect={onSelect} />
        ))}
        {trips.length === 0 && (
          <div className="empty-stage">
            <p>No trips</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const TripTimeline = ({ trips, viewMode, onSelectTrip }) => {
  // Group trips by status for pipeline view
  const groupedTrips = useMemo(() => {
    return {
      planning: trips.filter((t) => t.status === "planning"),
      booked: trips.filter((t) => t.status === "booked"),
      in_progress: trips.filter((t) => t.status === "in_progress"),
      completed: trips.filter((t) => t.status === "completed"),
    };
  }, [trips]);

  // Sort trips for timeline view
  const sortedTrips = useMemo(() => {
    return [...trips]
      .filter((t) => t.status !== "cancelled" && !t.is_archived)
      .sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  }, [trips]);

  return (
    <div className="trip-timeline">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-calendar3"></i>
          {viewMode === "timeline" ? "Trip Timeline" : "Trip Pipeline"}
        </h3>
        <span className="trip-count">{trips.length} trips</span>
      </div>

      <div className="panel-content">
        {viewMode === "timeline" ? (
          <div className="timeline-view">
            {sortedTrips.length === 0 ? (
              <div className="empty-timeline">
                <i className="bi bi-map"></i>
                <p>No trips planned yet</p>
                <span>Start planning your next adventure!</span>
              </div>
            ) : (
              <div className="timeline-grid">
                {sortedTrips.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onSelect={onSelectTrip} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="pipeline-view">
            <PipelineStage
              title="Planning"
              trips={groupedTrips.planning}
              onSelect={onSelectTrip}
              icon="bi-pencil"
              color="#ffc107"
            />
            <PipelineStage
              title="Booked"
              trips={groupedTrips.booked}
              onSelect={onSelectTrip}
              icon="bi-check-circle"
              color="#17a2b8"
            />
            <PipelineStage
              title="In Progress"
              trips={groupedTrips.in_progress}
              onSelect={onSelectTrip}
              icon="bi-airplane-engines"
              color="#00d4aa"
            />
            <PipelineStage
              title="Completed"
              trips={groupedTrips.completed.slice(0, 3)}
              onSelect={onSelectTrip}
              icon="bi-flag"
              color="#6c757d"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TripTimeline;

