import { useState, useEffect } from "react";
import "./TravelHero.css";

/**
 * Countdown hook for trip countdowns
 */
const useCountdown = (targetDate) => {
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    if (!targetDate) return;

    const calculateCountdown = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const diff = target - now;

      if (diff <= 0) {
        setCountdown({ days: 0, hours: 0, minutes: 0 });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown({ days, hours, minutes });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
};

/**
 * Format date range nicely
 */
const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const options = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", { ...options, year: "numeric" });
  
  return `${startStr} - ${endStr}`;
};

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

// eslint-disable-next-line no-unused-vars
export const TravelHero = ({ summary, activeTrip, nextTrip, onViewTrip }) => {
  const hasUpcomingTrip = nextTrip && nextTrip.days_until_trip <= 30;
  const countdown = useCountdown(nextTrip?.start_date);

  // Show countdown hero if upcoming trip within 30 days
  if (hasUpcomingTrip) {
    return (
      <div className="travel-hero upcoming-mode">
        <div className="hero-countdown-card">
          <div className="hero-glow"></div>
          <div className="countdown-content">
            <div className="destination-info">
              <span className="country-flag">{nextTrip.country_flag}</span>
              <div className="destination-text">
                <h2>{nextTrip.name}</h2>
                <p>
                  {nextTrip.city}, {nextTrip.country}
                </p>
              </div>
            </div>

            <div className="countdown-display">
              <div className="countdown-item">
                <span className="countdown-value">{countdown.days}</span>
                <span className="countdown-label">Days</span>
              </div>
              <div className="countdown-separator">:</div>
              <div className="countdown-item">
                <span className="countdown-value">{countdown.hours}</span>
                <span className="countdown-label">Hours</span>
              </div>
              <div className="countdown-separator">:</div>
              <div className="countdown-item">
                <span className="countdown-value">{countdown.minutes}</span>
                <span className="countdown-label">Minutes</span>
              </div>
            </div>

            <div className="trip-meta">
              <span className="trip-dates">
                <i className="bi bi-calendar3"></i>
                {formatDateRange(nextTrip.start_date, nextTrip.end_date)}
              </span>
              <span className={`status-badge ${nextTrip.status}`}>
                {nextTrip.status.replace("_", " ")}
              </span>
            </div>

            <div className="trip-quick-stats">
              <div className="quick-stat">
                <i className="bi bi-clock"></i>
                <span>{nextTrip.duration_days} days</span>
              </div>
              <div className="quick-stat">
                <div className="budget-mini-gauge">
                  <div
                    className="gauge-fill"
                    style={{
                      width: `${Math.min(nextTrip.budget_utilization_percentage, 100)}%`,
                    }}
                  ></div>
                </div>
                <span>{Math.round(nextTrip.budget_utilization_percentage)}% budget used</span>
              </div>
            </div>

            <div className="hero-actions">
              <button
                className="hero-btn primary"
                onClick={() => onViewTrip(nextTrip)}
              >
                <i className="bi bi-eye"></i>
                View Trip
              </button>
              <button className="hero-btn secondary">
                <i className="bi bi-bag-check"></i>
                Start Packing
              </button>
            </div>
          </div>

          <div className="hero-decoration">
            <div className={`trip-type-badge ${nextTrip.trip_type}`}>
              <i className={`bi ${getTripTypeIcon(nextTrip.trip_type)}`}></i>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show stats hero when no upcoming trip
  return (
    <div className="travel-hero stats-mode">
      <div className="hero-stats-grid">
        <div className="stat-card countries">
          <div className="stat-icon">
            <i className="bi bi-globe-americas"></i>
          </div>
          <div className="stat-content">
            <span className="stat-value">{summary?.countries_visited || 0}</span>
            <span className="stat-label">Countries Visited</span>
          </div>
          <div className="stat-accent"></div>
        </div>

        <div className="stat-card trips">
          <div className="stat-icon">
            <i className="bi bi-airplane"></i>
          </div>
          <div className="stat-content">
            <span className="stat-value">{summary?.trips_this_year || 0}</span>
            <span className="stat-label">Trips This Year</span>
          </div>
          <div className="stat-accent"></div>
        </div>

        <div className="stat-card days">
          <div className="stat-icon">
            <i className="bi bi-calendar-check"></i>
          </div>
          <div className="stat-content">
            <span className="stat-value">{summary?.total_days_traveled || 0}</span>
            <span className="stat-label">Days Traveled</span>
          </div>
          <div className="stat-accent"></div>
        </div>

        <div className="stat-card spend">
          <div className="stat-icon">
            <i className="bi bi-wallet2"></i>
          </div>
          <div className="stat-content">
            <span className="stat-value">
              ${(summary?.total_spend_this_year || 0).toLocaleString()}
            </span>
            <span className="stat-label">Spent This Year</span>
          </div>
          <div className="stat-accent"></div>
        </div>
      </div>

      {summary?.upcoming_trips === 0 && (
        <div className="no-trips-cta">
          <div className="cta-content">
            <i className="bi bi-map"></i>
            <h3>Ready for your next adventure?</h3>
            <p>Start planning your dream trip today</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TravelHero;

