const miniDow = ["S", "M", "T", "W", "T", "F", "S"];

const MiniCalendar = ({
  monthDate,
  selectedDay,
  events,
  onChangeMonth,
  onSelectDay,
  onToday,
}) => {
  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const today = new Date();
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const hasEventOnDay = (day) => {
    const date = new Date(year, month, day);
    return (events || []).some((event) => {
      const eventDate = new Date(event.start_at);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) {
    cells.push(
      <button
        key={`empty-${i}`}
        type="button"
        className="mini-cal-cell mini-cal-cell--empty"
        tabIndex={-1}
        aria-hidden="true"
      />
    );
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = year === todayY && month === todayM && day === todayD;
    const isSelected = selectedDay === day;

    const date = new Date(year, month, day);
    date.setHours(0, 0, 0, 0);
    const normalizedToday = new Date(today);
    normalizedToday.setHours(0, 0, 0, 0);
    const isPast = date < normalizedToday && !isToday;

    cells.push(
      <button
        key={day}
        type="button"
        className={`mini-cal-cell ${
          isSelected ? "mini-cal-cell--selected" : ""
        } ${isToday ? "mini-cal-cell--today" : ""} ${
          isPast ? "mini-cal-cell--past" : ""
        }`}
        onClick={() => onSelectDay(day)}
        aria-label={`${monthDate.toLocaleString("default", {
          month: "long",
        })} ${day}, ${year}`}
      >
        <span className="mini-cal-date">{day}</span>
        {hasEventOnDay(day) && <span className="mini-cal-dot" />}
      </button>
    );
  }

  return (
    <div className="mini-cal">
      <div className="mini-cal-header">
        <div className="mini-cal-title">
          {monthDate.toLocaleString("default", { month: "long" })} {year}
        </div>
        <div className="mini-cal-actions">
          <button
            type="button"
            className="mini-cal-icon"
            onClick={() => onChangeMonth(-1)}
            aria-label="Previous month"
          >
            <i className="bi bi-chevron-left"></i>
          </button>
          <button
            type="button"
            className="mini-cal-icon"
            onClick={() => onChangeMonth(1)}
            aria-label="Next month"
          >
            <i className="bi bi-chevron-right"></i>
          </button>
          <button type="button" className="mini-cal-today" onClick={onToday}>
            Today
          </button>
        </div>
      </div>

      <div className="mini-cal-dow">
        {miniDow.map((d) => (
          <div key={d} className="mini-cal-dow-cell">
            {d}
          </div>
        ))}
      </div>

      <div className="mini-cal-grid">{cells}</div>
    </div>
  );
};

export default MiniCalendar;
