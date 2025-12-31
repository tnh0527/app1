import { useState, useRef, useEffect } from "react";
import "./CustomDatePicker.css";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const CustomDatePicker = ({
  value,
  onChange,
  className = "",
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(
    value ? new Date(value) : new Date()
  );
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return "Select date";
    const date = new Date(dateStr);
    return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(
      date.getDate()
    ).padStart(2, "0")}/${date.getFullYear()}`;
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevMonthDays = getDaysInMonth(year, month - 1);

    const days = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthDays - i),
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day),
      });
    }

    // Next month days to fill grid
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day),
      });
    }

    return days;
  };

  const handleDateClick = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    onChange(`${year}-${month}-${day}`);
    setIsOpen(false);
  };

  const handleMonthChange = (delta) => {
    setViewDate(
      new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1)
    );
  };

  const handleToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    onChange(`${year}-${month}-${day}`);
    setViewDate(today);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  const isSelected = (date) => {
    if (!value) return false;
    const selected = new Date(value);
    return date.toDateString() === selected.toDateString();
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const calendarDays = generateCalendarDays();

  return (
    <div className="custom-date-picker" ref={dropdownRef}>
      <button
        type="button"
        className={`date-picker-trigger ${className} ${
          error ? "date-picker-trigger--error" : ""
        } ${isOpen ? "date-picker-trigger--open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="date-picker-value">{formatDisplayDate(value)}</span>
        <i
          className="bi bi-calendar-date date-picker-icon"
          aria-hidden="true"
        ></i>
      </button>

      {isOpen && (
        <div className="date-picker-dropdown">
          <div className="date-picker-header">
            <button
              type="button"
              className="date-picker-nav"
              onClick={() => handleMonthChange(-1)}
              aria-label="Previous month"
            >
              <i className="bi bi-chevron-left"></i>
            </button>
            <span className="date-picker-month">
              {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button
              type="button"
              className="date-picker-nav"
              onClick={() => handleMonthChange(1)}
              aria-label="Next month"
            >
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>

          <div className="date-picker-weekdays">
            {WEEKDAYS.map((day) => (
              <div key={day} className="date-picker-weekday">
                {day}
              </div>
            ))}
          </div>

          <div className="date-picker-days">
            {calendarDays.map((dayInfo, index) => (
              <button
                key={index}
                type="button"
                className={`date-picker-day ${
                  !dayInfo.isCurrentMonth ? "date-picker-day--other-month" : ""
                } ${
                  isSelected(dayInfo.date) ? "date-picker-day--selected" : ""
                } ${isToday(dayInfo.date) ? "date-picker-day--today" : ""}`}
                onClick={() => handleDateClick(dayInfo.date)}
              >
                {dayInfo.day}
              </button>
            ))}
          </div>

          <div className="date-picker-footer">
            <button
              type="button"
              className="date-picker-footer-btn"
              onClick={handleClear}
            >
              Clear
            </button>
            <button
              type="button"
              className="date-picker-footer-btn date-picker-footer-btn--primary"
              onClick={handleToday}
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
