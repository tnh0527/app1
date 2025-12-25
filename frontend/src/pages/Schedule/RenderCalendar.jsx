const daysInWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RenderCalendar = ({
  currentDate,
  events,
  onDateClick,
  removeEvent,
  selectedDay,
}) => {
  const getDaysInMonth = (month, year) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const firstDay = getFirstDayOfMonth(month, year);
    const daysInMonth = getDaysInMonth(month, year);

    const today = new Date();

    // Create an array to hold empty days for proper alignment
    const days = Array.from({ length: firstDay }, (_, index) => (
      <div
        className="calendar-cell calendar-cell--empty"
        key={`empty-${index}`}
      />
    ));

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isPast =
        date < today && date.toDateString() !== today.toDateString();
      const isToday = date.toDateString() === today.toDateString();

      const dayEvents = events.filter((event) => {
        const eventDate = new Date(event.start_at);
        return eventDate.toDateString() === date.toDateString();
      });

      days.push(
        <div
          className={`calendar-cell ${isToday ? "calendar-cell--today" : ""} ${
            isPast ? "calendar-cell--past" : ""
          } ${selectedDay === day ? "calendar-cell--selected" : ""}`}
          key={day}
          onClick={() => !isPast && onDateClick(day)}
        >
          <div className="calendar-cell-top">
            <span className="calendar-date">{day}</span>
            {isToday && <span className="today-label">Today</span>}
          </div>
          <div className="calendar-cell-events">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                className="calendar-event"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="calendar-event-title">{event.title}</span>
                <button
                  type="button"
                  className="calendar-event-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeEvent(event.id);
                  }}
                  aria-label={`Delete ${event.title}`}
                >
                  <i className="bi bi-trash"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="calendar">
      <div className="calendar-dow">
        {daysInWeek.map((day) => (
          <div className="calendar-dow-cell" key={day}>
            {day}
          </div>
        ))}
      </div>
      <div className="calendar-grid">{renderCalendar()}</div>
    </div>
  );
};

export default RenderCalendar;
