import { useMemo, useCallback } from "react";
import { useCalendar, PRIORITY_COLORS } from "../context/CalendarContext";
import "./AgendaView.css";

const AgendaView = () => {
  const {
    currentDate,
    events,
    holidays,
    showHolidays,
    openEventModal,
    deleteEvent,
    goToDate,
    setCurrentView,
    CALENDAR_VIEWS,
  } = useCalendar();

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Group events by date for the next 30 days
  const groupedEvents = useMemo(() => {
    const startDate = new Date(currentDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 30);

    // Filter and sort events
    const filteredEvents = events
      .filter((event) => {
        const eventDate = new Date(event.start_at);
        return eventDate >= startDate && eventDate <= endDate;
      })
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

    // Group by date
    const groups = {};

    // Add holidays to groups if showHolidays is enabled
    if (showHolidays && holidays) {
      holidays.forEach((holiday) => {
        if (holiday.date >= startDate && holiday.date <= endDate) {
          const dateKey = holiday.date.toDateString();
          if (!groups[dateKey]) {
            groups[dateKey] = {
              date: holiday.date,
              events: [],
              holidays: [],
            };
          }
          groups[dateKey].holidays = groups[dateKey].holidays || [];
          groups[dateKey].holidays.push(holiday);
        }
      });
    }

    filteredEvents.forEach((event) => {
      const dateKey = new Date(event.start_at).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: new Date(event.start_at),
          events: [],
          holidays: [],
        };
      }
      groups[dateKey].events.push(event);
    });

    return Object.values(groups).sort((a, b) => a.date - b.date);
  }, [events, holidays, showHolidays, currentDate]);

  const handleEventClick = useCallback(
    (event) => {
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

  const handleDateClick = useCallback(
    (date) => {
      goToDate(date);
      setCurrentView(CALENDAR_VIEWS.DAY);
    },
    [goToDate, setCurrentView, CALENDAR_VIEWS]
  );

  const formatDate = (date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);

    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    if (dateObj.getTime() === now.getTime()) return "Today";
    if (dateObj.getTime() === tomorrow.getTime()) return "Tomorrow";

    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const isToday = (date) => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    return dateObj.getTime() === today.getTime();
  };

  const isPast = (date) => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    return dateObj < today;
  };

  const getRelativeDay = (date) => {
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);
    const diffTime = dateObj.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "today";
    if (diffDays === 1) return "in 1 day";
    if (diffDays < 7) return `in ${diffDays} days`;
    if (diffDays < 14) return "in 1 week";
    return `in ${Math.floor(diffDays / 7)} weeks`;
  };

  return (
    <div className="agenda-view">
      <div className="agenda-header">
        <h2 className="agenda-title">Upcoming Events</h2>
        <p className="agenda-subtitle">
          Next 30 days from{" "}
          {currentDate.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {groupedEvents.length === 0 ? (
        <div className="agenda-empty">
          <div className="agenda-empty-icon">
            <i className="bi bi-calendar-check"></i>
          </div>
          <h3>No Upcoming Events</h3>
          <p>Your schedule is clear for the next 30 days</p>
          <button
            type="button"
            className="agenda-add-btn"
            onClick={() => openEventModal()}
          >
            <i className="bi bi-plus-lg"></i>
            Create Event
          </button>
        </div>
      ) : (
        <div className="agenda-list">
          {groupedEvents.map(
            ({ date, events: dayEvents, holidays: dayHolidays }) => (
              <div
                key={date.toISOString()}
                className={`agenda-day-group ${
                  isToday(date) ? "agenda-day-group--today" : ""
                } ${isPast(date) ? "agenda-day-group--past" : ""} ${
                  dayHolidays?.length > 0 ? "agenda-day-group--holiday" : ""
                }`}
              >
                <div
                  className="agenda-day-header"
                  onClick={() => handleDateClick(date)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="agenda-day-info">
                    <span className="agenda-day-name">{formatDate(date)}</span>
                    <span className="agenda-day-relative">
                      {getRelativeDay(date)}
                    </span>
                  </div>
                  <div className="agenda-day-date">
                    <span className="agenda-day-number">{date.getDate()}</span>
                    <span className="agenda-day-month">
                      {date.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </div>
                </div>

                <div className="agenda-events">
                  {/* Render holidays first */}
                  {dayHolidays?.map((holiday) => (
                    <div
                      key={holiday.id}
                      className="agenda-holiday-card"
                      style={{ "--holiday-color": holiday.color }}
                    >
                      <div className="agenda-holiday-icon">{holiday.icon}</div>
                      <div className="agenda-holiday-content">
                        <span className="agenda-holiday-title">
                          {holiday.title}
                        </span>
                        <span className="agenda-holiday-type">
                          {holiday.type === "federal"
                            ? "Federal Holiday"
                            : "Observance"}
                        </span>
                      </div>
                      {holiday.type === "federal" && (
                        <span className="agenda-holiday-badge">
                          <i className="bi bi-star-fill"></i>
                        </span>
                      )}
                    </div>
                  ))}

                  {dayEvents.map((event) => {
                    const eventColor = event.color || "#22D6D6";
                    const priorityColor = event.priority
                      ? PRIORITY_COLORS[event.priority]
                      : null;
                    const startTime = new Date(event.start_at);
                    const endTime = new Date(event.end_at);

                    return (
                      <div
                        key={event.id}
                        className="agenda-event-card"
                        style={{ "--event-color": eventColor }}
                        onClick={() => handleEventClick(event)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="agenda-event-time">
                          {event.all_day ? (
                            <span className="all-day-badge">All Day</span>
                          ) : (
                            <>
                              <span className="time-start">
                                {startTime.toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                              <span className="time-separator">-</span>
                              <span className="time-end">
                                {endTime.toLocaleTimeString("en-US", {
                                  hour: "numeric",
                                  minute: "2-digit",
                                  hour12: true,
                                })}
                              </span>
                            </>
                          )}
                        </div>

                        <div className="agenda-event-content">
                          <div className="agenda-event-header">
                            {priorityColor && (
                              <span
                                className="event-priority"
                                style={{ backgroundColor: priorityColor }}
                              />
                            )}
                            <h3 className="event-title">{event.title}</h3>
                            {event.is_recurring && (
                              <i
                                className="bi bi-arrow-repeat recurring-icon"
                                title="Recurring event"
                              />
                            )}
                          </div>
                          {event.description && (
                            <p className="event-description">
                              {event.description}
                            </p>
                          )}
                          {event.tags && event.tags.length > 0 && (
                            <div className="event-tags">
                              {event.tags.map((tag) => (
                                <span key={tag} className="event-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="agenda-event-actions">
                          <button
                            type="button"
                            className="event-action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                            aria-label="Edit event"
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            type="button"
                            className="event-action-btn event-action-btn--delete"
                            onClick={(e) => handleEventDelete(e, event.id)}
                            aria-label="Delete event"
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default AgendaView;
