const daysInWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RenderCalendar = ({ currentDate, events, onDateClick, removeEvent }) => {
  const getDaysInMonth = (month, year) =>
    new Date(year, month + 1, 0).getDate();

  const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const firstDay = getFirstDayOfMonth(month, year);
    const daysInMonth = getDaysInMonth(month, year);

    const today = new Date();

    const days = Array.from({ length: firstDay }, (_, index) => (
      <div className="day empty" key={`empty-${index}`} />
    ));

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isPast =
        date < today && date.toDateString() !== today.toDateString();
      const isToday = date.toDateString() === today.toDateString();
      const dayEvents = events.filter(
        (event) => event.date.toDateString() === date.toDateString()
      );

      days.push(
        <div
          className={`day ${isToday ? "today" : ""} ${isPast ? "past" : ""}`}
          key={day}
          onClick={() => !isPast && onDateClick(day)}
        >
          <div>
            {day}
            {isToday && <span className="today-label"> Today</span>}
          </div>
          {dayEvents.map((event) => (
            <div
              key={event.id}
              className="event"
              onClick={(e) => e.stopPropagation()}
            >
              {event.title}
              <button
                type="button"
                className="delete-event"
                onClick={(e) => {
                  e.stopPropagation();
                  removeEvent(event.id);
                }}
              >
                <i className="bi bi-trash"></i>
              </button>
            </div>
          ))}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="">
      <div className="days-of-week">
        {daysInWeek.map((day) => (
          <div className="day" key={day}>
            {day}
          </div>
        ))}
      </div>
      <div className="days">{renderCalendar()}</div>
    </div>
  );
};

export default RenderCalendar;
