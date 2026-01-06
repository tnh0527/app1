import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { iconsImgs } from "../../../utils/images";
import BlurOverlay from "../../../components/shared/BlurOverlay";
import "./TravelWidget.css";

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
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      setCountdown({ days, hours, minutes });
    };

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 60000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return countdown;
};

const formatDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const options = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);

  return `${startStr} - ${endStr}`;
};

export const TravelWidget = ({ data, onNavigate }) => {
  const summary = data?.summary || {};
  const nextTrip = data?.next_trip;
  const upcomingTrips = data?.upcomingTrips?.slice(0, 2) || [];
  const countdown = useCountdown(nextTrip?.start_date);

  const hasUpcomingTrip = nextTrip && nextTrip.days_until_trip <= 30;

  const getTripStatusColor = (status) => {
    const colors = {
      planning: "#8b5cf6",
      booked: "#0ea5e9",
      confirmed: "#00d4aa",
      in_progress: "#00fe93",
      completed: "var(--clr-silver)",
    };
    return colors[status] || "var(--clr-silver)";
  };

  return (
    <div className="home-widget travel-widget">
      <BlurOverlay isActive={true} message="Travel features coming soon!">
        <div className="widget-header">
          <div className="widget-title-section">
            <div className="widget-icon travel">
              <Icon icon={iconsImgs.plane} />
            </div>
            <div>
              <h3 className="widget-title">Travel</h3>
              <p className="widget-subtitle">
                {hasUpcomingTrip ? "Upcoming trip" : "Your journeys"}
              </p>
            </div>
          </div>
          <div className="widget-arrow" onClick={onNavigate}>
            <i className="bi bi-chevron-right"></i>
          </div>
        </div>

        <div className="widget-content">
          {!data ? (
            <div className="widget-loading"></div>
          ) : (
            <div className="travel-content">
              {/* If upcoming trip within 30 days, show countdown */}
              {hasUpcomingTrip ? (
                <div className="travel-grid-layout">
                  {/* Left: Trip Info */}
                  <div className="travel-info-card">
                    <div className="countdown-header">
                      <span className="trip-destination">
                        <span className="trip-flag">
                          {nextTrip.country_flag}
                        </span>
                        {nextTrip.name}
                      </span>
                      <span className="trip-location">
                        {nextTrip.city}, {nextTrip.country}
                      </span>
                    </div>
                    <div className="trip-meta">
                      <span className="trip-dates">
                        <i className="bi bi-calendar3"></i>
                        {formatDateRange(
                          nextTrip.start_date,
                          nextTrip.end_date
                        )}
                      </span>
                      <span className="trip-duration">
                        <i className="bi bi-clock"></i>
                        {nextTrip.duration_days} days
                      </span>
                    </div>
                  </div>

                  {/* Right: Countdown */}
                  <div className="countdown-card">
                    <div className="countdown-label-top">Departing In</div>
                    <div className="countdown-display">
                      <div className="countdown-item">
                        <span className="countdown-value">
                          {countdown.days}
                        </span>
                        <span className="countdown-label">Days</span>
                      </div>
                      <div className="countdown-separator">:</div>
                      <div className="countdown-item">
                        <span className="countdown-value">
                          {countdown.hours}
                        </span>
                        <span className="countdown-label">Hrs</span>
                      </div>
                      <div className="countdown-separator">:</div>
                      <div className="countdown-item">
                        <span className="countdown-value">
                          {countdown.minutes}
                        </span>
                        <span className="countdown-label">Min</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Otherwise show stats and upcoming trips in grid */
                <div className="travel-grid-layout">
                  {/* Left: Stats Cards */}
                  <div className="travel-stats-grid">
                    <div className="stat-card">
                      <div className="stat-card-icon">
                        <i className="bi bi-geo-alt-fill"></i>
                      </div>
                      <div className="stat-card-content">
                        <span className="stat-card-value">
                          {summary.total_trips || 0}
                        </span>
                        <span className="stat-card-label">Trips</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon">
                        <i className="bi bi-globe2"></i>
                      </div>
                      <div className="stat-card-content">
                        <span className="stat-card-value">
                          {summary.countries_visited || 0}
                        </span>
                        <span className="stat-card-label">Countries</span>
                      </div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card-icon">
                        <i className="bi bi-building"></i>
                      </div>
                      <div className="stat-card-content">
                        <span className="stat-card-value">
                          {summary.cities_visited || 0}
                        </span>
                        <span className="stat-card-label">Cities</span>
                      </div>
                    </div>
                    <div className="stat-card highlight">
                      <div className="stat-card-icon">
                        <i className="bi bi-calendar-event"></i>
                      </div>
                      <div className="stat-card-content">
                        <span className="stat-card-value">
                          {summary.upcoming_trips || 0}
                        </span>
                        <span className="stat-card-label">Upcoming</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Upcoming Trips List */}
                  <div className="travel-trips-card">
                    {upcomingTrips.length > 0 ? (
                      <>
                        <div className="trips-card-header">
                          <i className="bi bi-compass"></i>
                          <span>Next Adventures</span>
                        </div>
                        <div className="trips-list">
                          {upcomingTrips.map((trip) => (
                            <div key={trip.id} className="trip-item">
                              <div className="trip-icon">
                                <span className="trip-flag-small">
                                  {trip.country_flag}
                                </span>
                              </div>
                              <div className="trip-info">
                                <span className="trip-name">{trip.name}</span>
                                <span className="trip-detail">
                                  {trip.city} •{" "}
                                  {formatDateRange(
                                    trip.start_date,
                                    trip.end_date
                                  )}
                                </span>
                              </div>
                              <div
                                className="trip-status"
                                style={{
                                  backgroundColor: getTripStatusColor(
                                    trip.status
                                  ),
                                }}
                              ></div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="no-trips-card">
                        <div className="no-trips-icon">
                          <i className="bi bi-compass"></i>
                        </div>
                        <div className="no-trips-text">
                          <span className="no-trips-title">
                            Ready for adventure?
                          </span>
                          <span className="no-trips-subtitle">
                            Start planning your next trip
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </BlurOverlay>
    </div>
  );
};
