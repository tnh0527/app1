import { useMemo, useCallback } from "react";
import { useCalendar, PRIORITY_COLORS } from "../context/CalendarContext";
import "./WeekView.css";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const WeekView = () => {
  const {
    currentDate,
    selectedDate,
    events,
    openEventModal,
    // eslint-disable-next-line no-unused-vars
    deleteEvent,
    goToDate,
    setCurrentView,
    getHolidaysForDate,
    CALENDAR_VIEWS,
  } = useCalendar();

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const isPastDate = useCallback(
    (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d < today;
    },
    [today]
  );

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      date.setHours(0, 0, 0, 0);
      return {
        date,
        dayName: DAYS_OF_WEEK[i],
        dayNumber: date.getDate(),
        isToday: date.getTime() === today.getTime(),
        isSelected:
          selectedDate && date.toDateString() === selectedDate.toDateString(),
      };
    });
  }, [currentDate, today, selectedDate]);

  const getEventsForDay = useCallback(
    (date) => {
      return events.filter((event) => {
        const eventDate = new Date(event.start_at);
        return eventDate.toDateString() === date.toDateString();
      });
    },
    [events]
  );

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
    (date, hour) => {
      const clickedDate = new Date(date);
      clickedDate.setHours(hour, 0, 0, 0);
      if (isPastDate(clickedDate)) {
        goToDate(date);
        return;
      }
      goToDate(date);
      openEventModal(clickedDate);
    },
    [goToDate, openEventModal, isPastDate]
  );

  const handleEventClick = useCallback(
    (e, event) => {
      e.stopPropagation();
      openEventModal(null, event);
    },
    [openEventModal]
  );

  const handleDayHeaderClick = useCallback(
    (date) => {
      goToDate(date);
      setCurrentView(CALENDAR_VIEWS.DAY);
    },
    [goToDate, setCurrentView, CALENDAR_VIEWS]
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

  const isCurrentWeek = useMemo(() => {
    return weekDays.some(({ isToday }) => isToday);
  }, [weekDays]);

  return (
    <div className="week-view">
      {/* Header with day columns */}
      <div className="week-view-header">
        <div className="week-time-gutter-header">
          <span className="gutter-label">GMT</span>
        </div>
        {weekDays.map(({ date, dayName, dayNumber, isToday, isSelected }) => {
          const dayHolidays = getHolidaysForDate(date);
          const hasHoliday = dayHolidays.length > 0;

          return (
            <div
              key={date.toISOString()}
              className={`week-day-header ${
                isToday ? "week-day-header--today" : ""
              } ${isSelected ? "week-day-header--selected" : ""} ${
                hasHoliday ? "week-day-header--holiday" : ""
              }`}
              onClick={() => handleDayHeaderClick(date)}
              role="button"
              tabIndex={0}
            >
              <span className="week-day-name">{dayName}</span>
              <span
                className={`week-day-number ${
                  isToday ? "week-day-number--today" : ""
                }`}
              >
                {dayNumber}
              </span>
              {hasHoliday && (
                <span
                  className="week-holiday-indicator"
                  title={dayHolidays[0].title}
                >
                  {dayHolidays[0].icon}
                </span>
              )}
              {isToday && <span className="week-today-indicator" />}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="week-view-body">
        {/* Time gutter */}
        <div className="week-time-gutter">
          {HOURS.map((hour) => (
            <div key={hour} className="time-slot-label">
              {formatHour(hour)}
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div className="week-days-container">
          {weekDays.map(({ date, isToday }) => {
            const dayEvents = getEventsForDay(date);

            return (
              <div
                key={date.toISOString()}
                className={`week-day-column ${
                  isToday ? "week-day-column--today" : ""
                }`}
              >
                {/* Time slots */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="week-time-slot"
                    onClick={() => handleTimeSlotClick(date, hour)}
                    role="button"
                    tabIndex={0}
                    aria-label={`${date.toLocaleDateString()} at ${formatHour(
                      hour
                    )}`}
                  >
                    <span className="time-slot-hover-hint">
                      <i className="bi bi-plus"></i>
                    </span>
                  </div>
                ))}

                {/* Events */}
                <div className="week-events-layer">
                  {dayEvents.map((event) => {
                    const position = getEventPosition(event);
                    const eventColor = event.color || "#22D6D6";
                    const priorityColor = event.priority
                      ? PRIORITY_COLORS[event.priority]
                      : null;

                    return (
                      <div
                        key={event.id}
                        className="week-event-card"
                        style={{
                          top: position.top,
                          height: position.height,
                          "--event-color": eventColor,
                        }}
                        onClick={(e) => handleEventClick(e, event)}
                        role="button"
                        tabIndex={0}
                      >
                        {priorityColor && (
                          <span
                            className="week-event-priority"
                            style={{ backgroundColor: priorityColor }}
                          />
                        )}
                        <span className="week-event-time">
                          {new Date(event.start_at).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "numeric",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )}
                        </span>
                        <span className="week-event-title">{event.title}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Current time indicator */}
                {isToday && isCurrentWeek && (
                  <div
                    className="week-current-time"
                    style={{ top: currentTimePosition }}
                  >
                    <span className="current-time-dot" />
                    <span className="current-time-line" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekView;
