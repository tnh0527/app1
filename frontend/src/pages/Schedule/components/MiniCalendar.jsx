import { useMemo } from "react";
import { useCalendar } from "../context/CalendarContext";
import "./MiniCalendar.css";

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];

const MiniCalendar = () => {
  const {
    currentDate,
    selectedDate,
    events,
    navigateDate,
    goToDate,
    goToToday,
    getEventCountForDate,
  } = useCalendar();

  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      days.push({ day, date, isCurrentMonth: false, isPast: date < today });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const isToday = date.getTime() === today.getTime();
      const isPast = date < today && !isToday;
      days.push({ day, date, isCurrentMonth: true, isToday, isPast });
    }

    // Next month days (fill to complete grid)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ day: i, date, isCurrentMonth: false, isPast: false });
    }

    return days;
  }, [year, month, today]);

  const isSelected = (date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handleDateClick = (date, isCurrentMonth) => {
    if (!isCurrentMonth) {
      // Navigate to the clicked month
      const newDate = new Date(date);
      goToDate(newDate);
    } else {
      goToDate(date);
    }
  };

  const getHeatLevel = (date) => {
    const count = getEventCountForDate(date);
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 4) return 2;
    return 3;
  };

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        <h3 className="mini-calendar-title">
          {currentDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h3>
        <div className="mini-calendar-actions">
          <button
            type="button"
            className="mini-cal-nav-btn"
            onClick={() => navigateDate(-1)}
            aria-label="Previous month"
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          <button
            type="button"
            className="mini-cal-nav-btn"
            onClick={() => navigateDate(1)}
            aria-label="Next month"
          >
            <i className="bi bi-chevron-right"></i>
          </button>
          <button
            type="button"
            className="mini-cal-today-btn"
            onClick={goToToday}
          >
            Today
          </button>
        </div>
      </div>

      <div className="mini-calendar-grid">
        {/* Day of week headers */}
        {DAYS_OF_WEEK.map((day, index) => (
          <div key={`dow-${index}`} className="mini-cal-dow">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map(
          ({ day, date, isCurrentMonth, isToday, isPast }, index) => {
            const heatLevel = isCurrentMonth ? getHeatLevel(date) : 0;
            const hasEvents = heatLevel > 0;

            return (
              <button
                key={`day-${index}`}
                type="button"
                className={`
                mini-cal-day
                ${!isCurrentMonth ? "mini-cal-day--other-month" : ""}
                ${isToday ? "mini-cal-day--today" : ""}
                ${isSelected(date) ? "mini-cal-day--selected" : ""}
                ${isPast ? "mini-cal-day--past" : ""}
                ${heatLevel > 0 ? `mini-cal-day--heat-${heatLevel}` : ""}
              `}
                onClick={() => handleDateClick(date, isCurrentMonth)}
                aria-label={date.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              >
                <span className="mini-cal-day-number">{day}</span>
                {hasEvents && <span className="mini-cal-day-indicator" />}
              </button>
            );
          }
        )}
      </div>

      {/* Quick navigation */}
      <div className="mini-calendar-quick-nav">
        <button
          type="button"
          className="quick-nav-btn"
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setFullYear(newDate.getFullYear() - 1);
            goToDate(newDate);
          }}
        >
          <i className="bi bi-chevron-double-left"></i>
          <span>{year - 1}</span>
        </button>
        <span className="quick-nav-divider">|</span>
        <button
          type="button"
          className="quick-nav-btn"
          onClick={() => {
            const newDate = new Date(currentDate);
            newDate.setFullYear(newDate.getFullYear() + 1);
            goToDate(newDate);
          }}
        >
          <span>{year + 1}</span>
          <i className="bi bi-chevron-double-right"></i>
        </button>
      </div>
    </div>
  );
};

export default MiniCalendar;
