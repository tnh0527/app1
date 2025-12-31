import { useMemo, useCallback } from "react";
import { useCalendar, PRIORITY_COLORS } from "../context/CalendarContext";
import "./MonthView.css";

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_EVENTS = 3;

const MonthView = () => {
  const {
    currentDate,
    selectedDate,
    events,
    openEventModal,
    deleteEvent,
    getEventsForDate,
    getHolidaysForDate,
    getEventCountForDate,
    goToDate,
    setCurrentView,
    CALENDAR_VIEWS,
  } = useCalendar();

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      days.push({ day, date, isCurrentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today && !isToday;
      days.push({ day, date, isCurrentMonth: true, isToday, isPast });
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ day: i, date, isCurrentMonth: false });
    }

    return days;
  }, [currentDate, today]);

  const isSelected = useCallback(
    (date) => {
      return (
        selectedDate && date.toDateString() === selectedDate.toDateString()
      );
    },
    [selectedDate]
  );

  const handleDayClick = useCallback(
    (date) => {
      goToDate(date);
      openEventModal(date);
    },
    [goToDate, openEventModal]
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

  const handleShowMore = useCallback(
    (e, date) => {
      e.stopPropagation();
      goToDate(date);
      setCurrentView(CALENDAR_VIEWS.DAY);
    },
    [goToDate, setCurrentView, CALENDAR_VIEWS]
  );

  const getHeatLevel = useCallback((count) => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    return 3;
  }, []);

  const renderEventCard = useCallback(
    (event, isCompact = false) => {
      const priorityColor = event.priority
        ? PRIORITY_COLORS[event.priority]
        : null;
      const eventColor = event.color || "#22D6D6";
      const isRecurring = event.event?.rrule || event.is_recurring;

      return (
        <div
          key={event.id}
          className={`month-event-card ${
            isCompact ? "month-event-card--compact" : ""
          }`}
          style={{ "--event-color": eventColor }}
          onClick={(e) => handleEventClick(e, event)}
          role="button"
          tabIndex={0}
          aria-label={`Event: ${event.title}`}
        >
          {priorityColor && (
            <span
              className="event-priority-indicator"
              style={{ backgroundColor: priorityColor }}
            />
          )}
          <span className="event-title">{event.title}</span>
          {isRecurring && (
            <i
              className="bi bi-arrow-repeat event-recurring-icon"
              title="Recurring event"
            />
          )}
          <button
            type="button"
            className="event-delete-btn"
            onClick={(e) => handleEventDelete(e, event.id)}
            aria-label="Delete event"
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      );
    },
    [handleEventClick, handleEventDelete]
  );

  const renderHolidayCard = useCallback((holiday) => {
    return (
      <div
        key={holiday.id}
        className="month-holiday-card"
        style={{ "--holiday-color": holiday.color }}
        role="listitem"
        aria-label={`Holiday: ${holiday.title}`}
      >
        <span className="holiday-icon">{holiday.icon}</span>
        <span className="holiday-title">{holiday.title}</span>
        {holiday.type === "federal" && (
          <span className="holiday-badge" title="Federal Holiday">
            <i className="bi bi-star-fill"></i>
          </span>
        )}
      </div>
    );
  }, []);

  return (
    <div className="month-view">
      {/* Day of week headers */}
      <div className="month-view-header">
        {DAYS_OF_WEEK.map((day) => (
          <div key={day} className="month-dow-cell">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="month-view-grid">
        {calendarDays.map(
          ({ day, date, isCurrentMonth, isToday, isPast }, index) => {
            const dayEvents = isCurrentMonth ? getEventsForDate(date) : [];
            const dayHolidays = getHolidaysForDate(date);
            const eventCount = dayEvents.length;
            const heatLevel = getHeatLevel(eventCount);
            const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_EVENTS);
            const hiddenCount = eventCount - MAX_VISIBLE_EVENTS;
            const hasHoliday = dayHolidays.length > 0;

            return (
              <div
                key={`day-${index}`}
                className={`
                month-day-cell
                ${!isCurrentMonth ? "month-day-cell--other-month" : ""}
                ${isToday ? "month-day-cell--today" : ""}
                ${isSelected(date) ? "month-day-cell--selected" : ""}
                ${isPast ? "month-day-cell--past" : ""}
                ${heatLevel > 0 ? `month-day-cell--heat-${heatLevel}` : ""}
                ${hasHoliday ? "month-day-cell--holiday" : ""}
              `}
                onClick={() => isCurrentMonth && handleDayClick(date)}
                role="button"
                tabIndex={isCurrentMonth ? 0 : -1}
                aria-label={`${date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}${eventCount > 0 ? `, ${eventCount} events` : ""}${
                  hasHoliday ? `, ${dayHolidays[0].title}` : ""
                }`}
              >
                <div className="month-day-header">
                  <span
                    className={`month-day-number ${
                      isToday ? "month-day-number--today" : ""
                    }`}
                  >
                    {day}
                  </span>
                  {isToday && <span className="today-badge">Today</span>}
                  {isCurrentMonth && (
                    <button
                      type="button"
                      className="day-add-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEventModal(date);
                      }}
                      aria-label="Add event"
                    >
                      <i className="bi bi-plus"></i>
                    </button>
                  )}
                </div>

                {/* Holidays */}
                {dayHolidays.length > 0 && (
                  <div className="month-day-holidays">
                    {dayHolidays.map((holiday) => renderHolidayCard(holiday))}
                  </div>
                )}

                {isCurrentMonth && (
                  <div className="month-day-events">
                    {visibleEvents.map((event) => renderEventCard(event))}

                    {hiddenCount > 0 && (
                      <button
                        type="button"
                        className="month-more-events"
                        onClick={(e) => handleShowMore(e, date)}
                      >
                        <i className="bi bi-plus-circle"></i>
                        <span>{hiddenCount} more</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
};

export default MonthView;
