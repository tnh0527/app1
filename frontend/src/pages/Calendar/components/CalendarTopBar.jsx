import { useContext } from "react";
import { SidebarContext } from "../../../contexts/SidebarContext";
import { useCalendar, CALENDAR_VIEWS } from "../context/CalendarContext";
import "./CalendarTopBar.css";

const CalendarTopBar = () => {
  const { toggleSidebar } = useContext(SidebarContext);
  const {
    currentDate,
    currentView,
    setCurrentView,
    navigateDate,
    goToToday,
    openEventModal,
    searchQuery,
    setSearchQuery,
    showHolidays,
    setShowHolidays,
    dueReminders,
  } = useCalendar();

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
    <div className="calendar-top-bar">
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

          <h1 className="calendar-date-label">{getDateRangeLabel()}</h1>

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
        <div className="calendar-search">
          <i className="bi bi-search search-icon"></i>
          <input
            type="text"
            className="search-input"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
            >
              <i className="bi bi-x"></i>
            </button>
          )}
        </div>

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
    </div>
  );
};

export default CalendarTopBar;
