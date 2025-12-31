import React, { useCallback } from "react";
import { CalendarProvider, useCalendar } from "./context/CalendarContext";
import CalendarTopBar from "./components/CalendarTopBar";
import MainCalendar from "./components/MainCalendar";
import CalendarSidebar from "./components/CalendarSidebar";
import EventModal from "./components/EventModal";
import "./Schedule.css";

/**
 * CalendarContent - Inner component that uses calendar context
 * Uses context for modal state management
 */
const CalendarContent = () => {
  const {
    isEventModalOpen,
    editingEvent,
    modalInitialDate,
    openEventModal,
    closeEventModal,
    createEvent,
    updateEvent,
    deleteEvent,
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

  // Save event (create or update)
  const handleSaveEvent = useCallback(
    async (eventData) => {
      try {
        if (editingEvent?.id) {
          // Update existing event
          await updateEvent(editingEvent.id, eventData);
        } else {
          // Create new event
          await createEvent(eventData);
        }
        closeEventModal();
      } catch (error) {
        console.error("Failed to save event:", error);
        throw error;
      }
    },
    [editingEvent, createEvent, updateEvent, closeEventModal]
  );

  // Delete event
  const handleDeleteEvent = useCallback(
    async (eventId) => {
      try {
        await deleteEvent(eventId);
        closeEventModal();
      } catch (error) {
        console.error("Failed to delete event:", error);
        throw error;
      }
    },
    [deleteEvent, closeEventModal]
  );

  // Build event data for modal
  const modalEvent =
    editingEvent || (modalInitialDate ? { startDate: modalInitialDate } : null);

  return (
    <div className="schedule-page">
      {/* Top Navigation Bar */}
      <CalendarTopBar onNewEvent={handleNewEvent} />

      {/* Main Content Area */}
      <div className="schedule-content">
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

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={closeEventModal}
        event={modalEvent}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};

/**
 * Calendar - Main page component
 * Wraps content with CalendarProvider for state management
 */
const Calendar = () => {
  return (
    <CalendarProvider>
      <CalendarContent />
    </CalendarProvider>
  );
};

export default Calendar;
