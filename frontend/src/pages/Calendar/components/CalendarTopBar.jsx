import { useContext, useState, useRef, useEffect } from "react";
import { SidebarContext } from "../../../contexts/SidebarContext";
import { useCalendar, CALENDAR_VIEWS } from "../context/CalendarContext";
import "./CalendarTopBar.css";

const CalendarTopBar = () => {
  // eslint-disable-next-line no-unused-vars
  const { toggleSidebar } = useContext(SidebarContext);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const topBarRef = useRef(null);
  const {
    currentDate,
    currentView,
    setCurrentView,
    navigateDate,
    goToToday,
    goToDate,
    openEventModal,
    showHolidays,
    setShowHolidays,
    dueReminders,
  } = useCalendar();

  const handleMonthSelect = (year, month) => {
    const newDate = new Date(year, month, 1);
    goToDate(newDate);
    setShowMonthPicker(false);
  };

  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    if (showMonthPicker) setSelectedYear(currentDate.getFullYear());
  }, [showMonthPicker, currentDate]);

  const prevYear = () =>
    setSelectedYear((y) => {
      const newY = y - 1;
      goToDate(new Date(newY, currentDate.getMonth(), 1));
      return newY;
    });

  const nextYear = () =>
    setSelectedYear((y) => {
      const newY = y + 1;
      goToDate(new Date(newY, currentDate.getMonth(), 1));
      return newY;
    });

  useEffect(() => {
    const onDocClick = (e) => {
      if (
        showMonthPicker &&
        topBarRef.current &&
        !topBarRef.current.contains(e.target)
      ) {
        setShowMonthPicker(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [showMonthPicker]);

  const getDateRangeLabel = () => {
    const options = { month: "long", year: "numeric" };
    const dayOptions = {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    };

    switch (currentView) {
      case CALENDAR_VIEWS.MONTH:
        return currentDate.toLocaleDateString("en-US", options);
      case CALENDAR_VIEWS.WEEK: {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
          return `${startOfWeek.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
          })} - ${endOfWeek.getDate()}, ${endOfWeek.getFullYear()}`;
        }
        return `${startOfWeek.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })} - ${endOfWeek.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`;
      }
      case CALENDAR_VIEWS.DAY:
        return currentDate.toLocaleDateString("en-US", dayOptions);
      case CALENDAR_VIEWS.AGENDA:
        return `Agenda from ${currentDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}`;
      default:
        return currentDate.toLocaleDateString("en-US", options);
    }
  };

  const views = [
    { key: CALENDAR_VIEWS.MONTH, label: "Month", icon: "bi-calendar3" },
    { key: CALENDAR_VIEWS.WEEK, label: "Week", icon: "bi-calendar-week" },
    { key: CALENDAR_VIEWS.DAY, label: "Day", icon: "bi-calendar-day" },
    { key: CALENDAR_VIEWS.AGENDA, label: "Agenda", icon: "bi-list-ul" },
  ];

  return (
    <div className="calendar-top-bar" ref={topBarRef}>
      <div className="calendar-top-bar-left">
        <div className="calendar-navigation">
          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => navigateDate(-1)}
            aria-label="Previous"
          >
            <i className="bi bi-chevron-left"></i>
          </button>

          <h1
            className={`calendar-date-label ${
              currentView === CALENDAR_VIEWS.MONTH
                ? "calendar-date-label--clickable"
                : ""
            }`}
            onClick={() =>
              currentView === CALENDAR_VIEWS.MONTH &&
              setShowMonthPicker((s) => !s)
            }
            role={currentView === CALENDAR_VIEWS.MONTH ? "button" : "heading"}
            tabIndex={currentView === CALENDAR_VIEWS.MONTH ? 0 : undefined}
            title={
              currentView === CALENDAR_VIEWS.MONTH
                ? "Click to select month"
                : undefined
            }
          >
            {getDateRangeLabel()}
            {currentView === CALENDAR_VIEWS.MONTH && (
              <i
                className="bi bi-chevron-down"
                style={{ marginLeft: "8px", fontSize: "0.8em" }}
              ></i>
            )}
          </h1>

          <button
            type="button"
            className="calendar-nav-btn"
            onClick={() => navigateDate(1)}
            aria-label="Next"
          >
            <i className="bi bi-chevron-right"></i>
          </button>
        </div>

        <button
          type="button"
          className="calendar-today-btn"
          onClick={goToToday}
        >
          Today
        </button>
      </div>

      <div className="calendar-top-bar-center">
        <div className="calendar-view-switcher">
          {views.map((view) => (
            <button
              key={view.key}
              type="button"
              className={`view-btn ${
                currentView === view.key ? "view-btn--active" : ""
              }`}
              onClick={() => setCurrentView(view.key)}
              aria-label={`${view.label} view`}
            >
              <i className={`bi ${view.icon}`}></i>
              <span className="view-btn-label">{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="calendar-top-bar-right">
        <button
          type="button"
          className={`holiday-toggle-btn ${
            showHolidays ? "holiday-toggle-btn--active" : ""
          }`}
          onClick={() => setShowHolidays(!showHolidays)}
          title={showHolidays ? "Hide Holidays" : "Show Holidays"}
        >
          <i
            className={`bi ${
              showHolidays ? "bi-calendar-heart-fill" : "bi-calendar-heart"
            }`}
          ></i>
        </button>

        <button
          type="button"
          className="add-event-btn"
          onClick={() => openEventModal()}
        >
          <i className="bi bi-plus-lg"></i>
          <span>Event</span>
        </button>

        <div
          className="reminders-indicator"
          title={`${dueReminders?.length || 0} pending reminders`}
        >
          <i className="bi bi-bell-fill"></i>
          {dueReminders?.length > 0 && (
            <span className="reminders-badge">{dueReminders.length}</span>
          )}
        </div>
      </div>

      {/* Month Picker Dropdown */}
      {showMonthPicker && (
        <div
          className="month-picker-dropdown"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label="Select month"
        >
          <div className="month-picker-panel">
            <div className="month-picker-header">
              <button
                type="button"
                className="year-btn"
                onClick={prevYear}
                aria-label="Previous year"
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <div className="year-display">{selectedYear}</div>
              <button
                type="button"
                className="year-btn"
                onClick={nextYear}
                aria-label="Next year"
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>

            <div className="months-grid">
              {[
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
              ].map((monthName, monthIndex) => {
                const isCurrentMonth =
                  selectedYear === currentDate.getFullYear() &&
                  monthIndex === currentDate.getMonth();
                const today = new Date();
                const isToday =
                  selectedYear === today.getFullYear() &&
                  monthIndex === today.getMonth();
                return (
                  <button
                    key={monthIndex}
                    type="button"
                    className={`month-btn ${
                      isCurrentMonth ? "month-btn--current" : ""
                    } ${isToday ? "month-btn--today" : ""}`}
                    onClick={() => handleMonthSelect(selectedYear, monthIndex)}
                  >
                    {monthName.slice(0, 3)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTopBar;
