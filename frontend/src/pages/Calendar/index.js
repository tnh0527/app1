// Calendar Context
export {
  CalendarProvider,
  useCalendar,
  CALENDAR_VIEWS,
  PRIORITY_LEVELS,
  EVENT_COLORS,
} from "./context/CalendarContext";

// Layout Components
export { default as CalendarTopBar } from "./components/CalendarTopBar";
export { default as CalendarSidebar } from "./components/CalendarSidebar";
export { default as MainCalendar } from "./components/MainCalendar";

// View Components
export { default as MonthView } from "./components/MonthView";
export { default as WeekView } from "./components/WeekView";
export { default as DayView } from "./components/DayView";
export { default as AgendaView } from "./components/AgendaView";

// Sub-components
export { default as MiniCalendar } from "./components/MiniCalendar";
export { default as EventModal } from "./components/EventModal";
