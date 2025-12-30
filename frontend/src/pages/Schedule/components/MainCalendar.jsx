import { useCalendar, CALENDAR_VIEWS } from "../context/CalendarContext";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import AgendaView from "./AgendaView";
import "./MainCalendar.css";

const MainCalendar = ({ onEventClick, onSlotClick }) => {
  const { currentView, isLoading } = useCalendar();

  const renderView = () => {
    switch (currentView) {
      case CALENDAR_VIEWS.MONTH:
        return (
          <MonthView onEventClick={onEventClick} onSlotClick={onSlotClick} />
        );
      case CALENDAR_VIEWS.WEEK:
        return (
          <WeekView onEventClick={onEventClick} onSlotClick={onSlotClick} />
        );
      case CALENDAR_VIEWS.DAY:
        return (
          <DayView onEventClick={onEventClick} onSlotClick={onSlotClick} />
        );
      case CALENDAR_VIEWS.AGENDA:
        return <AgendaView onEventClick={onEventClick} />;
      default:
        return (
          <MonthView onEventClick={onEventClick} onSlotClick={onSlotClick} />
        );
    }
  };

  return (
    <div className="main-calendar">
      {isLoading && (
        <div className="calendar-loading-overlay">
          <div className="calendar-loading">
            <div className="calendar-loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <span>Loading events...</span>
          </div>
        </div>
      )}

      <div
        className={`calendar-view-container ${
          isLoading ? "calendar-view-container--loading" : ""
        }`}
      >
        {renderView()}
      </div>
    </div>
  );
};

export default MainCalendar;
