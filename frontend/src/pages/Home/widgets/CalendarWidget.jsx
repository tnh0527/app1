import { useState, useEffect, useMemo, useCallback } from "react";
import api from "../../../api/axios";
import { getHolidaysInRange } from "../../../data/usHolidays";
import "./CalendarWidget.css";

const DAYS_OF_WEEK = ["S", "M", "T", "W", "T", "F", "S"];

export const CalendarWidget = ({ onNavigate }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch today's and upcoming events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 7);

        const response = await api.get("/api/schedule/events/", {
          params: {
            start_date: today.toISOString().split("T")[0],
            end_date: endDate.toISOString().split("T")[0],
          },
        });

        setEvents(response.data || []);
      } catch (error) {
        console.error("Failed to fetch calendar events:", error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Get today's date
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const month = currentMonth.getMonth();
    const year = currentMonth.getFullYear();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];

    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(year, month - 1, day);
      days.push({ day, date, isCurrentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      date.setHours(0, 0, 0, 0);
      const isToday = date.getTime() === today.getTime();
      days.push({ day, date, isCurrentMonth: true, isToday });
    }

    // Next month days (fill to complete grid)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ day: i, date, isCurrentMonth: false });
    }

    return days;
  }, [currentMonth, today]);

  // Get holidays for the current month range
  const monthHolidays = useMemo(() => {
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    );
    endOfMonth.setHours(23, 59, 59, 999);
    return getHolidaysInRange(startOfMonth, endOfMonth);
  }, [currentMonth]);

  // Check if a date has events or holidays
  const hasEventsOrHolidays = useCallback(
    (date) => {
      // Check for events
      const hasEvents = events.some((event) => {
        const eventDate = new Date(event.start_at);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === date.getTime();
      });

      // Check for holidays
      const hasHolidays = monthHolidays.some((holiday) => {
        const holidayDate = new Date(holiday.date);
        holidayDate.setHours(0, 0, 0, 0);
        return holidayDate.getTime() === date.getTime();
      });

      return hasEvents || hasHolidays;
    },
    [events, monthHolidays]
  );

  // Navigate month
  const navigateMonth = (direction) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  // Get today's holidays
  const todayHolidays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    return getHolidaysInRange(today, endOfToday);
  }, []);

  // Get today's events and holidays combined
  const todayItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEventsList = events
      .filter((event) => {
        const eventDate = new Date(event.start_at);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === today.getTime();
      })
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
      .map((event) => ({ ...event, isHoliday: false }));

    const holidaysList = todayHolidays.map((holiday) => ({
      ...holiday,
      isHoliday: true,
      start_at: holiday.date.toISOString(),
    }));

    // Combine events and holidays, holidays first
    return [...holidaysList, ...todayEventsList];
  }, [events, todayHolidays]);

  // Get upcoming events (next 7 days, excluding today)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    return events
      .filter((event) => {
        const eventDate = new Date(event.start_at);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= tomorrow;
      })
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
      .slice(0, 3);
  }, [events]);

  const formatTime = (dateStr) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";

    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: "#22D6D6",
      medium: "#FEC80A",
      high: "#FF6B35",
      urgent: "#FE1E00",
    };
    return colors[priority] || "#22D6D6";
  };

  return (
    <div className="home-widget calendar-widget">
      <div className="widget-header">
        <div className="widget-title-section">
          <div className="widget-icon calendar">
            <i className="bi bi-calendar3"></i>
          </div>
          <div>
            <h3 className="widget-title">Calendar</h3>
            <p className="widget-subtitle">Today's agenda</p>
          </div>
        </div>
        <div className="widget-arrow" onClick={onNavigate}>
          <i className="bi bi-chevron-right"></i>
        </div>
      </div>

      <div className="widget-content">
        {loading ? (
          <div className="widget-loading"></div>
        ) : (
          <div className="calendar-grid-layout">
            {/* Mini Calendar - Main Big Container */}
            <div className="calendar-mini-calendar">
              <div className="mini-cal-header">
                <div className="mini-cal-month">
                  {currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>
                <div className="mini-cal-nav">
                  <button
                    className="mini-cal-nav-btn"
                    onClick={() => navigateMonth(-1)}
                  >
                    <i className="bi bi-chevron-left"></i>
                  </button>
                  <button
                    className="mini-cal-nav-btn"
                    onClick={() => navigateMonth(1)}
                  >
                    <i className="bi bi-chevron-right"></i>
                  </button>
                </div>
              </div>

              <div className="mini-cal-grid">
                {/* Day headers */}
                {DAYS_OF_WEEK.map((day, idx) => (
                  <div key={idx} className="mini-cal-dow">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {calendarDays.map(({ day, date, isCurrentMonth, isToday }, idx) => {
                  const hasItems = hasEventsOrHolidays(date);

                  return (
                    <div
                      key={idx}
                      className={`mini-cal-day ${!isCurrentMonth ? "other-month" : ""} ${isToday ? "today" : ""} ${hasItems ? "has-events" : ""}`}
                    >
                      <span className="mini-cal-day-num">{day}</span>
                      {hasItems && (
                        <span className="mini-cal-event-dot"></span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Small Containers - Right Side */}
            <div className="calendar-side-containers">
              {/* Today's Events Card */}
              <div className="calendar-small-card today-card">
                <div className="small-card-header">
                  <i className="bi bi-calendar-date"></i>
                  <span>Today</span>
                  <span className="event-count-badge">
                    {todayItems.length}
                  </span>
                </div>
                {todayItems.length > 0 ? (
                  <div className="small-card-content">
                    {todayItems.map((item) => (
                      <div
                        key={item.id}
                        className={`small-event-item ${
                          item.isHoliday ? "holiday-item" : ""
                        }`}
                      >
                        <div
                          className="event-dot"
                          style={{
                            backgroundColor: item.isHoliday
                              ? item.color
                              : item.color || getPriorityColor(item.priority),
                          }}
                        ></div>
                        <div className="event-details">
                          <span className="event-title-small">
                            {item.isHoliday ? (
                              <>
                                <span className="holiday-icon">
                                  {item.icon}
                                </span>{" "}
                                {item.title}
                              </>
                            ) : (
                              item.title
                            )}
                          </span>
                          {!item.isHoliday && (
                            <span className="event-time-small">
                              {formatTime(item.start_at)}
                            </span>
                          )}
                          {item.isHoliday && item.type === "federal" && (
                            <span className="event-time-small holiday-type">
                              Federal Holiday
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="small-card-empty">
                    <i className="bi bi-check-circle"></i>
                    <span>No events</span>
                  </div>
                )}
              </div>

              {/* Upcoming Events Card */}
              <div className="calendar-small-card upcoming-card">
                <div className="small-card-header">
                  <i className="bi bi-calendar-event"></i>
                  <span>Upcoming</span>
                </div>
                {upcomingEvents.length > 0 ? (
                  <div className="small-card-content">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="small-event-item">
                        <div
                          className="event-dot"
                          style={{
                            backgroundColor:
                              event.color || getPriorityColor(event.priority),
                          }}
                        ></div>
                        <div className="event-details">
                          <span className="event-title-small">
                            {event.title}
                          </span>
                          <span className="event-date-small">
                            {formatDate(event.start_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="small-card-empty">
                    <i className="bi bi-calendar-x"></i>
                    <span>None</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

