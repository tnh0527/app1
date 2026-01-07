import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../../api/axios";
import { getHolidaysInRange } from "../../../data/usHolidays";
import { getCache, setCache, CACHE_KEYS } from "../../../utils/sessionCache";
import { useAutoRetry } from "../../../utils/connectionHooks";

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
  const { view: urlView } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Validate and get view from URL, default to month
  const getValidView = useCallback((viewParam) => {
    const validViews = Object.values(CALENDAR_VIEWS);
    return validViews.includes(viewParam) ? viewParam : CALENDAR_VIEWS.MONTH;
  }, []);

  // Core state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(getValidView(urlView));
  const [events, setEvents] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isRemindersLoading, setIsRemindersLoading] = useState(false);

  // Modal states
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [modalInitialDate, setModalInitialDate] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingEvent, setDeletingEvent] = useState(null);

  // UI states - initialize from URL
  const [showHolidays, setShowHolidays] = useState(
    searchParams.get("holidays") !== "false" // default to true
  );
  const [activeFilters, setActiveFilters] = useState({
    tags: searchParams.get("tags")?.split(",").filter(Boolean) || [],
    priorities:
      searchParams.get("priorities")?.split(",").filter(Boolean) || [],
    showRecurring: searchParams.get("recurring") !== "false", // default to true
  });

  // Track if we've initialized from cache
  const initialLoadDoneRef = useRef(false);
  // Track the last fetched range to avoid redundant fetches
  const lastFetchedRangeRef = useRef(null);

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
  const fetchEvents = useCallback(
    async (forceRefresh = false) => {
      const { start, end } = getDateRange(currentDate, currentView);
      const rangeKey = `${start.toISOString()}_${end.toISOString()}`;

      // Create a cache key based on the date range (include day to avoid
      // returning a cached set for a different start date in the same month)
      const cacheKey = `${
        CACHE_KEYS.CALENDAR_EVENTS
      }_${currentView}_${start.getFullYear()}_${start.getMonth()}_${start.getDate()}_${end.getDate()}`;

      // Skip if same range was just fetched (prevents double fetches)
      if (!forceRefresh && lastFetchedRangeRef.current === rangeKey) {
        return;
      }

      // Check session cache for any navigation (not just initial load)
      if (!forceRefresh) {
        const cachedEvents = getCache(cacheKey);
        if (cachedEvents) {
          setEvents(parseOccurrences(cachedEvents));
          lastFetchedRangeRef.current = rangeKey;
          initialLoadDoneRef.current = true;
          return;
        }
      }

      setIsLoading(true);
      try {
        const response = await api.get("/events/schedule/", {
          params: {
            start: start.toISOString(),
            end: end.toISOString(),
          },
        });

        const parsedEvents = parseOccurrences(response.data);
        setEvents(parsedEvents);

        // Store in session cache
        setCache(cacheKey, response.data);
        lastFetchedRangeRef.current = rangeKey;
        initialLoadDoneRef.current = true;
      } catch (error) {
        console.error("Error fetching events:", error);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentDate, currentView, getDateRange, parseOccurrences]
  );

  // Retry fetching events when connection is restored
  useAutoRetry(fetchEvents, [currentDate, currentView], { enabled: true });

  // Fetch due reminders
  const fetchDueReminders = useCallback(async (forceRefresh = false) => {
    // Check session cache on initial load
    if (!forceRefresh) {
      const cachedReminders = getCache(CACHE_KEYS.CALENDAR_REMINDERS);
      if (cachedReminders) {
        setDueReminders(cachedReminders);
        return;
      }
    }

    setIsRemindersLoading(true);
    try {
      const response = await api.get("/events/reminders/due/");
      const reminders = response.data || [];
      setDueReminders(reminders);
      // Store in session cache
      setCache(CACHE_KEYS.CALENDAR_REMINDERS, reminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      setDueReminders([]);
    } finally {
      setIsRemindersLoading(false);
    }
  }, []);

  // Retry fetching reminders when connection is restored
  useAutoRetry(fetchDueReminders, [], { enabled: true });

  // Create event
  const createEvent = useCallback(
    async (eventData) => {
      try {
        const response = await api.post("/events/schedule/", eventData);
        // Force refresh to update cache
        await fetchEvents(true);
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
        // Force refresh to update cache
        await fetchEvents(true);
        return response.data;
      } catch (error) {
        console.error("Failed to update event:", error);
        throw error;
      }
    },
    [fetchEvents]
  );

  // Delete event/occurrence
  const deleteEvent = useCallback(
    async (occurrenceId, deleteAll = false) => {
      // Defensive: prevent deletion of immutable events (e.g., birthday masters)
      const evt = events.find((e) => e.id === occurrenceId);
      if (evt && (evt.is_immutable || evt.event?.is_immutable)) {
        alert("This event cannot be deleted.");
        return;
      }

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
    },
    [events]
  );

  // Delete modal functions
  const openDeleteModal = useCallback((event) => {
    setDeletingEvent(event);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setDeletingEvent(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingEvent) return;
    const occurrenceId = deletingEvent.id;
    const eventId = deletingEvent.event_id || deletingEvent.event?.id;
    const isRecurring = Boolean(deletingEvent.rrule);

    if (deletingEvent.is_immutable || deletingEvent.event?.is_immutable) {
      alert("This event cannot be deleted.");
      closeDeleteModal();
      return;
    }

    setIsLoading(true);
    try {
      if (isRecurring && eventId) {
        // Delete the master event (removes all occurrences)
        await api.delete("/events/schedule/", { data: { event_id: eventId } });
        setEvents((prev) =>
          prev.filter(
            (e) =>
              e.event_id !== eventId &&
              e.event?.id !== eventId &&
              e.id !== eventId
          )
        );
      } else {
        // Delete single occurrence
        await api.delete("/events/schedule/", {
          data: { occurrence_id: occurrenceId },
        });
        setEvents((prev) => prev.filter((e) => e.id !== occurrenceId));
      }
      closeDeleteModal();
    } catch (error) {
      console.error("Failed to delete event:", error);
    } finally {
      setIsLoading(false);
    }
  }, [deletingEvent, closeDeleteModal]);

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
  const isPastDate = useCallback((date) => {
    if (!date) return false;
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return target < today;
  }, []);

  const openEventModal = useCallback(
    (date = null, event = null) => {
      // Block creating new events on past dates while still allowing edits for existing events
      if (!event && date && isPastDate(date)) {
        return;
      }

      setModalInitialDate(date);
      setEditingEvent(event);
      setIsEventModalOpen(true);
    },
    [isPastDate]
  );

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
  // Sync view with URL parameter
  useEffect(() => {
    const validView = getValidView(urlView);
    if (currentView !== validView) {
      setCurrentView(validView);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlView]);

  // Sync URL when view changes (only if it differs from URL)
  useEffect(() => {
    const validUrlView = getValidView(urlView);
    if (currentView && currentView !== validUrlView) {
      navigate(`/calendar/${currentView}`, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView]);

  // Sync URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    if (activeFilters.tags.length > 0) {
      params.set("tags", activeFilters.tags.join(","));
    }
    if (activeFilters.priorities.length > 0) {
      params.set("priorities", activeFilters.priorities.join(","));
    }
    if (!activeFilters.showRecurring) {
      params.set("recurring", "false");
    }
    if (!showHolidays) {
      params.set("holidays", "false");
    }

    // Only update if params changed
    const newParamsStr = params.toString();
    const currentParamsStr = searchParams.toString();
    if (newParamsStr !== currentParamsStr) {
      setSearchParams(params, { replace: true });
    }
  }, [activeFilters, showHolidays, searchParams, setSearchParams]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    fetchDueReminders();
    // Interval always forces refresh to check for new due reminders
    const interval = setInterval(() => fetchDueReminders(true), 30000);
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
    isDeleteModalOpen,
    deletingEvent,
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
    openDeleteModal,
    closeDeleteModal,
    confirmDelete,
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
