import { useCallback } from "react";
import { CalendarProvider, useCalendar } from "./context/CalendarContext";
import CalendarTopBar from "./components/CalendarTopBar";
import MainCalendar from "./components/MainCalendar";
import CalendarSidebar from "./components/CalendarSidebar";
import EventModal from "./components/EventModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import ErrorBoundary from "../../components/shared/ErrorBoundary";
import "./Calendar.css";

/**
 * CalendarContent - Inner component that uses calendar context
 * Uses context for modal state management
 */
const CalendarContent = () => {
  const {
    openEventModal,
    isDeleteModalOpen,
    deletingEvent,
    confirmDelete,
    closeDeleteModal,
  } = useCalendar();

  // Open modal for new event
  const handleNewEvent = useCallback(
    (initialDate = null) => {
      openEventModal(initialDate, null);
    },
    [openEventModal]
  );

  // Handle event click from calendar views
  const handleEventClick = useCallback(
    (event) => {
      openEventModal(null, event);
    },
    [openEventModal]
  );

  // Handle slot click (empty time slot)
  const handleSlotClick = useCallback(
    (date, time = null) => {
      // Create a date object with the time if provided
      const slotDate = new Date(date);
      if (time) {
        const [hours, minutes] = time.split(":").map(Number);
        slotDate.setHours(hours, minutes, 0, 0);
      }
      openEventModal(slotDate, null);
    },
    [openEventModal]
  );

  return (
    <div className="calendar-page">
      {/* Top Navigation Bar */}
      <CalendarTopBar onNewEvent={handleNewEvent} />

      {/* Main Content Area */}
      <div className="calendar-content">
        {/* Main Calendar View */}
        <MainCalendar
          onEventClick={handleEventClick}
          onSlotClick={handleSlotClick}
        />

        {/* Right Sidebar */}
        <CalendarSidebar
          onNewEvent={handleNewEvent}
          onEventClick={handleEventClick}
        />
      </div>

      {/* Event Modal - uses context internally for actions */}
      <EventModal />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        eventTitle={deletingEvent?.title}
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
      />
    </div>
  );
};

/**
 * Calendar - Main page component
 * Wraps content with CalendarProvider for state management
 * Includes ErrorBoundary for graceful error handling
 */
const Calendar = () => {
  return (
    <ErrorBoundary pageName="Calendar">
      <CalendarProvider>
        <CalendarContent />
      </CalendarProvider>
    </ErrorBoundary>
  );
};

export default Calendar;
