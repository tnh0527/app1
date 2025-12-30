import { useState, useRef, useEffect } from "react";
import "./CustomTimePicker.css";

const CustomTimePicker = ({
  value,
  onChange,
  className = "",
  error = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Parse the current time value (HH:MM format)
  const parseTime = (timeStr) => {
    if (!timeStr) return { hours: 9, minutes: 0, period: "AM" };
    const [hours, minutes] = timeStr.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return { hours: displayHours, minutes, period };
  };

  const [selectedTime, setSelectedTime] = useState(parseTime(value));

  useEffect(() => {
    setSelectedTime(parseTime(value));
  }, [value]);

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

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return "Select time";
    const { hours, minutes, period } = parseTime(timeStr);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )} ${period}`;
  };

  const handleTimeChange = (field, value) => {
    const newTime = { ...selectedTime, [field]: value };
    setSelectedTime(newTime);

    // Convert to 24-hour format for the value
    let hours24 = newTime.hours;
    if (newTime.period === "PM" && hours24 !== 12) {
      hours24 += 12;
    } else if (newTime.period === "AM" && hours24 === 12) {
      hours24 = 0;
    }

    const timeString = `${String(hours24).padStart(2, "0")}:${String(
      newTime.minutes
    ).padStart(2, "0")}`;
    onChange(timeString);
  };

  const generateHours = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  };

  const generateMinutes = () => {
    return Array.from({ length: 60 }, (_, i) => i);
  };

  const hours = generateHours();
  const minutes = generateMinutes();

  return (
    <div className="custom-time-picker" ref={dropdownRef}>
      <button
        type="button"
        className={`time-picker-trigger ${className} ${
          error ? "time-picker-trigger--error" : ""
        } ${isOpen ? "time-picker-trigger--open" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="time-picker-value">{formatDisplayTime(value)}</span>
        <i className="bi bi-clock time-picker-icon" aria-hidden="true"></i>
      </button>

      {isOpen && (
        <div className="time-picker-dropdown">
          <div className="time-picker-header">
            <span className="time-picker-title">Select Time</span>
          </div>

          <div className="time-picker-selectors">
            {/* Hours */}
            <div className="time-picker-column">
              <div className="time-picker-column-label">Hour</div>
              <div className="time-picker-scroll">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    className={`time-picker-option ${
                      selectedTime.hours === hour
                        ? "time-picker-option--selected"
                        : ""
                    }`}
                    onClick={() => handleTimeChange("hours", hour)}
                  >
                    {String(hour).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div className="time-picker-column">
              <div className="time-picker-column-label">Min</div>
              <div className="time-picker-scroll">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    className={`time-picker-option ${
                      selectedTime.minutes === minute
                        ? "time-picker-option--selected"
                        : ""
                    }`}
                    onClick={() => handleTimeChange("minutes", minute)}
                  >
                    {String(minute).padStart(2, "0")}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM */}
            <div className="time-picker-column time-picker-column--period">
              <div className="time-picker-column-label">Period</div>
              <div className="time-picker-scroll">
                <button
                  type="button"
                  className={`time-picker-option ${
                    selectedTime.period === "AM"
                      ? "time-picker-option--selected"
                      : ""
                  }`}
                  onClick={() => handleTimeChange("period", "AM")}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={`time-picker-option ${
                    selectedTime.period === "PM"
                      ? "time-picker-option--selected"
                      : ""
                  }`}
                  onClick={() => handleTimeChange("period", "PM")}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          <div className="time-picker-footer">
            <button
              type="button"
              className="time-picker-done-btn"
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomTimePicker;
