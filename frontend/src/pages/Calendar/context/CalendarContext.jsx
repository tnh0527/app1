import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import api from "../../../api/axios";
import { getHolidaysInRange } from "../../../data/usHolidays";

const CalendarContext = createContext(null);

export const CALENDAR_VIEWS = {
  MONTH: "month",
  WEEK: "week",
  DAY: "day",
  AGENDA: "agenda",
};

export const PRIORITY_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
  URGENT: "urgent",
};

export const PRIORITY_COLORS = {
  low: "#22D6D6",
  medium: "#FEC80A",
  high: "#FF6B35",
  urgent: "#FE1E00",
};

export const EVENT_COLORS = [
  { id: "teal", color: "#22D6D6", name: "Teal" },
  { id: "blue", color: "#065481", name: "Blue" },
  { id: "purple", color: "#8B5CF6", name: "Purple" },
  { id: "pink", color: "#EC4899", name: "Pink" },
  { id: "orange", color: "#FF6B35", name: "Orange" },
  { id: "yellow", color: "#FEC80A", name: "Yellow" },
  { id: "green", color: "#00FE93", name: "Green" },
  { id: "red", color: "#FE1E00", name: "Red" },
];

export const CalendarProvider = ({ children }) => {
  // Core state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(CALENDAR_VIEWS.MONTH);
  const [events, setEvents] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isRemindersLoading, setIsRemindersLoading] = useState(false);

  // Modal states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [modalInitialDate, setModalInitialDate] = useState(null);

  // UI states
  const [showHolidays, setShowHolidays] = useState(true);
  const [activeFilters, setActiveFilters] = useState({
    tags: [],
    priorities: [],
    showRecurring: true,
  });

  // Date range helpers
  const getDateRange = useCallback((date, view) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const dayOfWeek = date.getDay();

    switch (view) {
      case CALENDAR_VIEWS.MONTH: {
        const start = new Date(year, month, 1, 0, 0, 0, 0);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return { start, end };
      }
      case CALENDAR_VIEWS.WEEK: {
        const start = new Date(year, month, day - dayOfWeek, 0, 0, 0, 0);
        const end = new Date(year, month, day - dayOfWeek + 6, 23, 59, 59, 999);
        return { start, end };
      }
      case CALENDAR_VIEWS.DAY: {
        const start = new Date(year, month, day, 0, 0, 0, 0);
        const end = new Date(year, month, day, 23, 59, 59, 999);
        return { start, end };
      }
      case CALENDAR_VIEWS.AGENDA: {
        const start = new Date(year, month, day, 0, 0, 0, 0);
        const end = new Date(year, month, day + 30, 23, 59, 59, 999);
        return { start, end };
      }
      default:
        return { start: new Date(), end: new Date() };
    }
  }, []);

  // Parse occurrences from API
  const parseOccurrences = useCallback(
    (data) =>
      (data || []).map((occ) => ({
        ...occ,
        start_at: new Date(occ.start_at),
        end_at: new Date(occ.end_at),
      })),
    []
  );

  // Fetch events
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange(currentDate, currentView);
      const response = await api.get("/events/schedule/", {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      });
      setEvents(parseOccurrences(response.data));
    } catch (error) {
      console.error("Error fetching events:", error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, currentView, getDateRange, parseOccurrences]);

  // Fetch due reminders
  const fetchDueReminders = useCallback(async () => {
    setIsRemindersLoading(true);
    try {
      const response = await api.get("/events/reminders/due/");
      setDueReminders(response.data || []);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      setDueReminders([]);
    } finally {
      setIsRemindersLoading(false);
    }
  }, []);

  // Create event
  const createEvent = useCallback(
    async (eventData) => {
      try {
        const response = await api.post("/events/schedule/", eventData);
        await fetchEvents();
        return response.data;
      } catch (error) {
        console.error("Failed to create event:", error);
        throw error;
      }
    },
    [fetchEvents]
  );

  // Update event
  const updateEvent = useCallback(
    async (eventId, eventData) => {
      try {
        const response = await api.put(
          `/events/schedule/${eventId}/`,
          eventData
        );
        await fetchEvents();
        return response.data;
      } catch (error) {
        console.error("Failed to update event:", error);
        throw error;
      }
    },
    [fetchEvents]
  );

  // Delete event/occurrence
  const deleteEvent = useCallback(async (occurrenceId, deleteAll = false) => {
    setIsLoading(true);
    try {
      await api.delete("/events/schedule/", {
        data: { occurrence_id: occurrenceId, delete_all: deleteAll },
      });
      setEvents((prev) => prev.filter((event) => event.id !== occurrenceId));
    } catch (error) {
      console.error("Error deleting event:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Dismiss reminder
  const dismissReminder = useCallback(async (reminderId) => {
    try {
      await api.post(`/events/reminders/${reminderId}/dismiss/`);
      setDueReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch (error) {
      console.error("Error dismissing reminder:", error);
      throw error;
    }
  }, []);

  // Navigation functions
  const goToToday = useCallback(() => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  }, []);

  const navigateDate = useCallback(
    (direction) => {
      setCurrentDate((prev) => {
        const newDate = new Date(prev);
        switch (currentView) {
          case CALENDAR_VIEWS.MONTH:
            newDate.setMonth(prev.getMonth() + direction);
            break;
          case CALENDAR_VIEWS.WEEK:
            newDate.setDate(prev.getDate() + direction * 7);
            break;
          case CALENDAR_VIEWS.DAY:
          case CALENDAR_VIEWS.AGENDA:
            newDate.setDate(prev.getDate() + direction);
            break;
          default:
            break;
        }
        return newDate;
      });
    },
    [currentView]
  );

  const goToDate = useCallback((date) => {
    setCurrentDate(date);
    setSelectedDate(date);
  }, []);

  // Modal functions
  const openEventModal = useCallback((date = null, event = null) => {
    setModalInitialDate(date);
    setEditingEvent(event);
    setIsEventModalOpen(true);
  }, []);

  const closeEventModal = useCallback(() => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
    setModalInitialDate(null);
  }, []);

  // Filter events
  const filteredEvents = useMemo(() => {
    let result = events;

    // Apply tag filters
    if (activeFilters.tags.length > 0) {
      result = result.filter((event) =>
        event.tags?.some((tag) => activeFilters.tags.includes(tag))
      );
    }

    // Apply priority filters
    if (activeFilters.priorities.length > 0) {
      result = result.filter((event) =>
        activeFilters.priorities.includes(event.priority)
      );
    }

    return result;
  }, [events, activeFilters]);

  // Get holidays for the current view range
  const holidays = useMemo(() => {
    if (!showHolidays) return [];
    const { start, end } = getDateRange(currentDate, currentView);
    // Extend range for month view to include adjacent month days
    const extendedStart = new Date(start);
    const extendedEnd = new Date(end);
    extendedStart.setDate(extendedStart.getDate() - 7);
    extendedEnd.setDate(extendedEnd.getDate() + 7);
    return getHolidaysInRange(extendedStart, extendedEnd);
  }, [currentDate, currentView, showHolidays, getDateRange]);

  // Get holidays for a specific date
  const getHolidaysForDate = useCallback(
    (date) => {
      if (!showHolidays) return [];
      const dateStr = date.toDateString();
      return holidays.filter(
        (holiday) => holiday.date.toDateString() === dateStr
      );
    },
    [holidays, showHolidays]
  );

  // Get events for specific date
  const getEventsForDate = useCallback(
    (date) => {
      const dateStr = date.toDateString();
      return filteredEvents.filter(
        (event) => new Date(event.start_at).toDateString() === dateStr
      );
    },
    [filteredEvents]
  );

  // Get event count for date (for heat mapping)
  const getEventCountForDate = useCallback(
    (date) => {
      return getEventsForDate(date).length;
    },
    [getEventsForDate]
  );

  // Check for conflicts
  const checkConflicts = useCallback(
    (startDate, endDate, excludeId = null) => {
      return events.filter((event) => {
        if (excludeId && event.id === excludeId) return false;
        const eventStart = new Date(event.start_at);
        const eventEnd = new Date(event.end_at);
        return startDate < eventEnd && endDate > eventStart;
      });
    },
    [events]
  );

  // Effects
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchDueReminders();
    const interval = setInterval(fetchDueReminders, 30000);
    return () => clearInterval(interval);
  }, [fetchDueReminders]);

  const value = {
    // State
    currentDate,
    selectedDate,
    currentView,
    events: filteredEvents,
    allEvents: events,
    holidays,
    showHolidays,
    dueReminders,
    isLoading,
    isRemindersLoading,
    isEventModalOpen,
    editingEvent,
    modalInitialDate,
    activeFilters,

    // Setters
    setCurrentDate,
    setSelectedDate,
    setCurrentView,
    setShowHolidays,
    setActiveFilters,

    // Actions
    fetchEvents,
    fetchDueReminders,
    createEvent,
    updateEvent,
    deleteEvent,
    dismissReminder,
    goToToday,
    navigateDate,
    goToDate,
    openEventModal,
    closeEventModal,

    // Helpers
    getEventsForDate,
    getHolidaysForDate,
    getEventCountForDate,
    checkConflicts,
    getDateRange,

    // Constants
    CALENDAR_VIEWS,
    PRIORITY_LEVELS,
    PRIORITY_COLORS,
    EVENT_COLORS,
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
};

export default CalendarContext;
