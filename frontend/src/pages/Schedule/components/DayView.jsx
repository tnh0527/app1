import { useMemo, useCallback, useRef, useEffect } from "react";
import { useCalendar, PRIORITY_COLORS } from "../context/CalendarContext";
import "./DayView.css";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const DayView = () => {
  const { currentDate, events, openEventModal, deleteEvent, navigateDate } =
    useCalendar();

  const scrollContainerRef = useRef(null);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const isToday = useMemo(() => {
    const current = new Date(currentDate);
    current.setHours(0, 0, 0, 0);
    return current.getTime() === today.getTime();
  }, [currentDate, today]);

  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = new Date(event.start_at);
      return eventDate.toDateString() === currentDate.toDateString();
    });
  }, [events, currentDate]);

  const allDayEvents = useMemo(() => {
    return dayEvents.filter((event) => event.all_day);
  }, [dayEvents]);

  const timedEvents = useMemo(() => {
    return dayEvents.filter((event) => !event.all_day);
  }, [dayEvents]);

  const getEventPosition = useCallback((event) => {
    const start = new Date(event.start_at);
    const end = new Date(event.end_at);

    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const duration = Math.max(endHour - startHour, 0.5);

    return {
      top: `${(startHour / 24) * 100}%`,
      height: `${(duration / 24) * 100}%`,
    };
  }, []);

  const handleTimeSlotClick = useCallback(
    (hour) => {
      const clickedDate = new Date(currentDate);
      clickedDate.setHours(hour, 0, 0, 0);
      openEventModal(clickedDate);
    },
    [currentDate, openEventModal]
  );

  const handleEventClick = useCallback(
    (e, event) => {
      e.stopPropagation();
      openEventModal(null, event);
    },
    [openEventModal]
  );

  const handleEventDelete = useCallback(
    (e, eventId) => {
      e.stopPropagation();
      if (confirm("Delete this event?")) {
        deleteEvent(eventId);
      }
    },
    [deleteEvent]
  );

  const formatHour = (hour) => {
    if (hour === 0) return "12 AM";
    if (hour === 12) return "12 PM";
    return hour < 12 ? `${hour} AM` : `${hour - 12} PM`;
  };

  const currentTimePosition = useMemo(() => {
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    return `${(hours / 24) * 100}%`;
  }, []);

  // Scroll to current time on load
  useEffect(() => {
    if (scrollContainerRef.current && isToday) {
      const now = new Date();
      const scrollPosition = (now.getHours() - 1) * 80; // 80px per hour
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition);
    }
  }, [isToday]);

  return (
    <div className="day-view">
      {/* Day header */}
      <div className="day-view-header">
        <button
          type="button"
          className="day-nav-btn"
          onClick={() => navigateDate(-1)}
          aria-label="Previous day"
        >
          <i className="bi bi-chevron-left"></i>
        </button>

        <div className="day-header-info">
          <h2 className="day-header-date">
            {currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h2>
          {isToday && <span className="day-today-badge">Today</span>}
        </div>

        <button
          type="button"
          className="day-nav-btn"
          onClick={() => navigateDate(1)}
          aria-label="Next day"
        >
          <i className="bi bi-chevron-right"></i>
        </button>
      </div>

      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="day-all-day-section">
          <div className="all-day-label">All Day</div>
          <div className="all-day-events">
            {allDayEvents.map((event) => {
              const eventColor = event.color || "#22D6D6";
              const priorityColor = event.priority
                ? PRIORITY_COLORS[event.priority]
                : null;

              return (
                <div
                  key={event.id}
                  className="day-all-day-event"
                  style={{ "--event-color": eventColor }}
                  onClick={(e) => handleEventClick(e, event)}
                  role="button"
                  tabIndex={0}
                >
                  {priorityColor && (
                    <span
                      className="event-priority"
                      style={{ backgroundColor: priorityColor }}
                    />
                  )}
                  <span className="event-title">{event.title}</span>
                  <button
                    type="button"
                    className="event-delete"
                    onClick={(e) => handleEventDelete(e, event.id)}
                    aria-label="Delete event"
                  >
                    <i className="bi bi-x"></i>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="day-view-body" ref={scrollContainerRef}>
        <div className="day-time-grid">
          {/* Time labels */}
          <div className="day-time-gutter">
            {HOURS.map((hour) => (
              <div key={hour} className="time-label">
                {formatHour(hour)}
              </div>
            ))}
          </div>

          {/* Time slots and events */}
          <div className="day-content">
            {/* Time slots */}
            {HOURS.map((hour) => (
              <div
                key={hour}
                className={`day-time-slot ${
                  hour === new Date().getHours() && isToday
                    ? "day-time-slot--current"
                    : ""
                }`}
                onClick={() => handleTimeSlotClick(hour)}
                role="button"
                tabIndex={0}
              >
                <span className="time-slot-hover">
                  <i className="bi bi-plus"></i>
                  Add event
                </span>
              </div>
            ))}

            {/* Events layer */}
            <div className="day-events-layer">
              {timedEvents.map((event) => {
                const position = getEventPosition(event);
                const eventColor = event.color || "#22D6D6";
                const priorityColor = event.priority
                  ? PRIORITY_COLORS[event.priority]
                  : null;
                const startTime = new Date(event.start_at);
                const endTime = new Date(event.end_at);

                return (
                  <div
                    key={event.id}
                    className="day-event-card"
                    style={{
                      top: position.top,
                      height: position.height,
                      "--event-color": eventColor,
                    }}
                    onClick={(e) => handleEventClick(e, event)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="day-event-header">
                      {priorityColor && (
                        <span
                          className="event-priority"
                          style={{ backgroundColor: priorityColor }}
                        />
                      )}
                      <span className="event-time">
                        {startTime.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                        {" - "}
                        {endTime.toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                      <button
                        type="button"
                        className="event-delete"
                        onClick={(e) => handleEventDelete(e, event.id)}
                        aria-label="Delete event"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </div>
                    <h3 className="event-title">{event.title}</h3>
                    {event.description && (
                      <p className="event-description">{event.description}</p>
                    )}
                    {event.is_recurring && (
                      <span className="event-recurring-badge">
                        <i className="bi bi-arrow-repeat"></i> Recurring
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Current time indicator */}
            {isToday && (
              <div
                className="day-current-time"
                style={{ top: currentTimePosition }}
              >
                <span className="current-time-label">
                  {new Date().toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
                <span className="current-time-dot" />
                <span className="current-time-line" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DayView;
