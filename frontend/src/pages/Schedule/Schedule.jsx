import "./Schedule.css";
import { useState, useEffect } from "react";
import ScheduleNav from "./ScheduleNav";
import RenderCalendar from "./RenderCalendar";
import MiniCalendar from "./MiniCalendar";
import { PulseLoader } from "react-spinners";
import api from "../../api/axios";

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventTitle, setEventTitle] = useState("");
  const [recurrenceFreq, setRecurrenceFreq] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState("");
  const [loading, setLoading] = useState(false);

  const [dueReminders, setDueReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  const monthRange = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1, 0, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { start, end };
  };

  const parseOccurrences = (data) =>
    (data || []).map((occ) => ({
      ...occ,
      start_at: new Date(occ.start_at),
      end_at: new Date(occ.end_at),
    }));

  const changeMonth = (delta) => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + delta);
      return newDate;
    });
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now.getDate());
  };
  const handleDateClick = (day) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  const handleAddEvent = async () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const startAt = new Date(year, month, selectedDate, 0, 0, 0, 0);
    const endAt = new Date(year, month, selectedDate + 1, 0, 0, 0, 0);

    const newEvent = {
      title: eventTitle,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      all_day: true,
    };

    if (recurrenceFreq) {
      newEvent.recurrence_freq = recurrenceFreq;
      newEvent.recurrence_interval = Number(recurrenceInterval) || 1;
      if (recurrenceUntil) {
        const [y, m, d] = recurrenceUntil.split("-").map((v) => Number(v));
        const until = new Date(y, (m || 1) - 1, d || 1, 23, 59, 59, 999);
        newEvent.recurrence_until = until.toISOString();
      }
    }

    if (reminderMinutesBefore !== "") {
      newEvent.reminder_minutes_before = Number(reminderMinutesBefore);
    }
    try {
      const monthOccurrences = await saveEvent(newEvent);
      setEvents(parseOccurrences(monthOccurrences));
      resetModal();
    } catch (error) {
      console.error("Failed to save event:", error);
    }
  };
  const resetModal = () => {
    setEventTitle("");
    setRecurrenceFreq("");
    setRecurrenceInterval(1);
    setRecurrenceUntil("");
    setReminderMinutesBefore("");
    setIsModalOpen(false);
  };

  const saveEvent = async (e) => {
    const response = await api.post("/events/schedule/", e);
    return response.data;
  };

  const displayEvents = async () => {
    setLoading(true);
    try {
      const { start, end } = monthRange(currentDate);
      const response = await api.get("/events/schedule/", {
        params: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
      });
      setEvents(parseOccurrences(response.data));
    } catch (error) {
      console.error("Error to fetch events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    displayEvents();
  }, [currentDate]);

  const fetchDueReminders = async () => {
    setRemindersLoading(true);
    try {
      const response = await api.get("/events/reminders/due/");
      setDueReminders(response.data || []);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      setDueReminders([]);
    } finally {
      setRemindersLoading(false);
    }
  };

  useEffect(() => {
    fetchDueReminders();
    const id = setInterval(fetchDueReminders, 30000);
    return () => clearInterval(id);
  }, []);

  const removeEvent = async (occurrenceId) => {
    setLoading(true);
    try {
      await api.delete("/events/schedule/", {
        data: { occurrence_id: occurrenceId },
      });
      setEvents((prevEvents) =>
        prevEvents.filter((event) => event.id !== occurrenceId)
      );
    } catch (error) {
      console.error("Error deleting event.", error);
    } finally {
      setLoading(false);
    }
  };

  const dismissReminder = async (reminderId) => {
    try {
      await api.post(`/events/reminders/${reminderId}/dismiss/`);
      setDueReminders((prev) => prev.filter((r) => r.id !== reminderId));
    } catch (error) {
      console.error("Error dismissing reminder:", error);
    }
  };

  // Upcoming events display
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight

  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(today.getDate() + 14); // Set to two weeks from today

  // Filter events to include only those within the next two weeks
  const upcomingEvents = events.filter((event) => {
    const eventDate = new Date(event.start_at);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today && eventDate <= twoWeeksFromNow;
  });

  return (
    <div className="schedule-main-content">
      <ScheduleNav />
      <div className="schedule-grid">
        <div className="schedule-calendar-card">
          <div className="schedule-calendar-header">
            <button
              type="button"
              className="schedule-nav-button"
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              <i className="bi bi-caret-left-fill"></i>
            </button>

            <div className="schedule-month-title">
              <h2>
                {currentDate.toLocaleString("default", { month: "long" })}{" "}
                {currentDate.getFullYear()}
              </h2>
              <p className="schedule-month-subtitle">
                Click a day to add an event
              </p>
            </div>

            <button
              type="button"
              className="schedule-nav-button"
              onClick={() => changeMonth(1)}
              aria-label="Next month"
            >
              <i className="bi bi-caret-right-fill"></i>
            </button>
          </div>

          <RenderCalendar
            currentDate={currentDate}
            events={events}
            onDateClick={handleDateClick}
            removeEvent={removeEvent}
            selectedDay={selectedDate}
          />
        </div>

        <div className="schedule-side">
          <div className="schedule-panel">
            <div className="schedule-panel-header">
              <h3>Mini Calendar</h3>
            </div>
            <MiniCalendar
              monthDate={currentDate}
              selectedDay={selectedDate}
              events={events}
              onChangeMonth={changeMonth}
              onSelectDay={handleDateClick}
              onToday={goToToday}
            />
          </div>

          <div className="schedule-panel">
            <div className="schedule-panel-header">
              <h3>Reminders Due</h3>
            </div>
            {remindersLoading ? (
              <PulseLoader
                loading={remindersLoading}
                size={7}
                color={"#22D6D6"}
              />
            ) : dueReminders.length > 0 ? (
              <ul className="schedule-list">
                {dueReminders.map((r) => (
                  <li key={r.id} className="schedule-list-item">
                    <div className="schedule-list-item-main">
                      <div className="schedule-list-item-title">{r.title}</div>
                      <div className="schedule-list-item-subtitle">
                        {new Date(r.occurrence_start_at).toLocaleString()}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="schedule-secondary-button"
                      onClick={() => dismissReminder(r.id)}
                    >
                      Dismiss
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="schedule-empty">No reminders due</p>
            )}
          </div>

          <div className="schedule-panel">
            <div className="schedule-panel-header">
              <h3>Up Coming Events</h3>
            </div>
            {loading ? (
              <PulseLoader loading={loading} size={7} color={"#22D6D6"} />
            ) : upcomingEvents.length > 0 ? (
              <ul className="schedule-list">
                {upcomingEvents.map((event, index) => (
                  <li
                    key={event.event_id || index}
                    className="schedule-list-item"
                  >
                    <div className="schedule-list-item-main">
                      <div className="schedule-list-item-title">
                        {event.title}
                      </div>
                      <div className="schedule-list-item-subtitle">
                        {new Date(event.start_at).toLocaleDateString()}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="schedule-empty">No upcoming events</p>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="calendar-modal" role="dialog" aria-modal="true">
          <div className="calendar-modal-card">
            <div className="calendar-modal-header">
              <h3 className="modal-header">
                Add Event for {selectedDate}{" "}
                {currentDate.toLocaleString("default", { month: "long" })}
              </h3>
              <button
                type="button"
                className="calendar-modal-close"
                onClick={resetModal}
                aria-label="Close"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="calendar-modal-body">
              <input
                className="event-input"
                type="text"
                placeholder="Enter event title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />

              <select
                className="event-input"
                value={recurrenceFreq}
                onChange={(e) => setRecurrenceFreq(e.target.value)}
              >
                <option value="">No recurrence</option>
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>

              {recurrenceFreq && (
                <>
                  <input
                    className="event-input"
                    type="number"
                    min={1}
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value)}
                    placeholder="Interval (e.g. 1)"
                  />
                  <input
                    className="event-input"
                    type="date"
                    value={recurrenceUntil}
                    onChange={(e) => setRecurrenceUntil(e.target.value)}
                  />
                </>
              )}

              <input
                className="event-input"
                type="number"
                min={0}
                placeholder="Reminder minutes before (optional)"
                value={reminderMinutesBefore}
                onChange={(e) => setReminderMinutesBefore(e.target.value)}
              />
            </div>

            <div className="calendar-modal-footer">
              <button
                type="button"
                className="event-cancel-button"
                onClick={resetModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="add-event-button"
                onClick={handleAddEvent}
                disabled={!eventTitle}
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Schedule;
