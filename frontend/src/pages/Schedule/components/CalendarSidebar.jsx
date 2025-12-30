import { useMemo } from "react";
import { useCalendar } from "../context/CalendarContext";
import MiniCalendar from "./MiniCalendar";
import "./CalendarSidebar.css";

const CalendarSidebar = () => {
  const {
    events,
    dueReminders,
    isRemindersLoading,
    dismissReminder,
    openEventModal,
    goToDate,
    setCurrentView,
    CALENDAR_VIEWS,
  } = useCalendar();

  // Calculate upcoming events (next 7 days)
  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return events
      .filter((event) => {
        const eventDate = new Date(event.start_at);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate >= today && eventDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at))
      .slice(0, 5);
  }, [events]);

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const monthEvents = events.filter((event) => {
      const eventDate = new Date(event.start_at);
      return eventDate >= thisMonth && eventDate <= nextMonth;
    });

    const recurringCount = events.filter(
      (e) => e.is_recurring || e.event?.rrule
    ).length;
    const todayEvents = events.filter(
      (e) => new Date(e.start_at).toDateString() === today.toDateString()
    );

    // Calculate busiest day
    const dayCount = {};
    monthEvents.forEach((event) => {
      const day = new Date(event.start_at).toDateString();
      dayCount[day] = (dayCount[day] || 0) + 1;
    });

    const busiestDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];

    return {
      totalThisMonth: monthEvents.length,
      todayCount: todayEvents.length,
      recurringCount,
      busiestDay: busiestDay
        ? {
            date: new Date(busiestDay[0]),
            count: busiestDay[1],
          }
        : null,
    };
  }, [events]);

  const formatEventTime = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let dayLabel;
    if (eventDate.getTime() === today.getTime()) {
      dayLabel = "Today";
    } else if (eventDate.getTime() === tomorrow.getTime()) {
      dayLabel = "Tomorrow";
    } else {
      dayLabel = date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
    }

    const timeLabel = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return { dayLabel, timeLabel };
  };

  const handleEventClick = (event) => {
    goToDate(new Date(event.start_at));
    setCurrentView(CALENDAR_VIEWS.DAY);
  };

  return (
    <div className="calendar-sidebar">
      {/* Mini Calendar */}
      <MiniCalendar />

      {/* Reminders Panel */}
      <div className="sidebar-panel">
        <div className="panel-header">
          <div className="panel-title">
            <i className="bi bi-bell"></i>
            <span>Reminders</span>
          </div>
          {dueReminders.length > 0 && (
            <span className="panel-badge">{dueReminders.length}</span>
          )}
        </div>

        <div className="panel-content">
          {dueReminders.length > 0 ? (
            <div className="reminders-list">
              {dueReminders.map((reminder) => (
                <div key={reminder.id} className="reminder-card">
                  <div className="reminder-icon">
                    <i className="bi bi-bell-fill"></i>
                  </div>
                  <div className="reminder-content">
                    <h4 className="reminder-title">{reminder.title}</h4>
                    <p className="reminder-time">
                      {new Date(reminder.occurrence_start_at).toLocaleString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        }
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="reminder-dismiss"
                    onClick={() => dismissReminder(reminder.id)}
                    title="Dismiss"
                  >
                    <i className="bi bi-check"></i>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel-empty">
              <i className="bi bi-bell-slash"></i>
              <p>No pending reminders</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Events */}
      <div className="sidebar-panel">
        <div className="panel-header">
          <div className="panel-title">
            <i className="bi bi-calendar-event"></i>
            <span>Upcoming</span>
          </div>
          <button
            type="button"
            className="panel-action"
            onClick={() => setCurrentView(CALENDAR_VIEWS.AGENDA)}
            title="View all"
          >
            <i className="bi bi-arrow-right"></i>
          </button>
        </div>

        <div className="panel-content">
          {upcomingEvents.length > 0 ? (
            <div className="upcoming-list">
              {upcomingEvents.map((event) => {
                const { dayLabel, timeLabel } = formatEventTime(event.start_at);
                const eventColor = event.color || "#22D6D6";

                return (
                  <div
                    key={event.id}
                    className="upcoming-card"
                    style={{ "--event-color": eventColor }}
                    onClick={() => handleEventClick(event)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="upcoming-date">
                      <span className="upcoming-day">{dayLabel}</span>
                      <span className="upcoming-time">{timeLabel}</span>
                    </div>
                    <h4 className="upcoming-title">{event.title}</h4>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel-empty">
              <i className="bi bi-calendar-check"></i>
              <p>No upcoming events</p>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Panel */}
      <div className="sidebar-panel sidebar-panel--analytics">
        <div className="panel-header">
          <div className="panel-title">
            <i className="bi bi-graph-up"></i>
            <span>This Month</span>
          </div>
        </div>

        <div className="panel-content">
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">{stats.todayCount}</span>
              <span className="stat-label">Today</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.totalThisMonth}</span>
              <span className="stat-label">This Month</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.recurringCount}</span>
              <span className="stat-label">Recurring</span>
            </div>
            {stats.busiestDay && (
              <div className="stat-card stat-card--wide">
                <span className="stat-label">Busiest Day</span>
                <span className="stat-value stat-value--small">
                  {stats.busiestDay.date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  <span className="stat-badge">
                    {stats.busiestDay.count} events
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSidebar;
