import "./Schedule.css";
import { useState, useEffect } from "react";
import ScheduleNav from "./ScheduleNav";
import RenderCalendar from "./RenderCalendar";

const Schedule = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventTitle, setEventTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const changeMonth = (delta) => {
    setCurrentDate((prevDate) => {
      const newDate = new Date(prevDate);
      newDate.setMonth(prevDate.getMonth() + delta);
      return newDate;
    });
  };
  const handleDateClick = (day) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };
  const handleAddEvent = async () => {
    const formattedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      selectedDate
    );
    const newEvent = {
      id: new Date().getTime(),
      title: eventTitle,
      date: formattedDate,
    };
    try {
      await saveEvent(newEvent);

      setEvents((prevEvents) => [...prevEvents, newEvent]);
      resetModal();
    } catch (error) {
      console.error("Failed to save event:", error);
    }
  };
  const resetModal = () => {
    setEventTitle("");
    setIsModalOpen(false);
  };

  const saveEvent = async (e) => {
    const response = await fetch("http://localhost:5001/events/schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(e),
    });
    if (!response.ok) {
      throw new Error("Backend: Failed to save event.");
    }
  };

  const displayEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:5001/events/schedule", {
        method: "GET",
      });
      if (response.ok) {
        let events = await response.json();
        events = events.map((event) => ({
          ...event,
          date: new Date(event.date),
        }));
      } else {
        console.error("Failed to fetch events:", response.status);
      }
    } catch (error) {
      console.error("Error to fetch events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    displayEvents();
  }, []);

  return (
    <div className="schedule-main-content">
      <ScheduleNav />
      <div className="calendar-content">
        <div className="calendar-header">
          <button onClick={() => changeMonth(-1)}>
            <i className="bi bi-caret-left-fill"></i>
          </button>
          <h2>
            {currentDate.toLocaleString("default", { month: "long" })}{" "}
            {currentDate.getFullYear()}
          </h2>
          <button className="calendar-button" onClick={() => changeMonth(1)}>
            <i className="bi bi-caret-right-fill"></i>
          </button>
        </div>

        <RenderCalendar
          currentDate={currentDate}
          events={events}
          onDateClick={handleDateClick}
        />

        {isModalOpen && (
          <div className="calendar-modal">
            <div>
              <h3 className="modal-header">
                Add Event for {selectedDate}{" "}
                {currentDate.toLocaleString("default", { month: "long" })}
              </h3>
              <input
                className="event-input"
                type="text"
                placeholder="Enter event title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
              />
              <button
                className="add-event-button"
                onClick={handleAddEvent}
                disabled={!eventTitle}
              >
                Add Event
              </button>
              <button className="event-cancel-button" onClick={resetModal}>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="event-list">
          <h3>Up Coming Events</h3>
          {loading ? (
            <p>Loading events...</p>
          ) : events.length > 0 ? (
            <ul>
              {events.map((event) => (
                <li key={event.id}>
                  {event.title} - {new Date(event.date).toLocaleString()}
                </li>
              ))}
            </ul>
          ) : (
            <p>No upcoming events</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schedule;
