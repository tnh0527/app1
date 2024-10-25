import "./Schedule.css";
import { useState, useEffect } from "react";
import ScheduleNav from "./ScheduleNav";
import RenderCalendar from "./RenderCalendar";
import { PulseLoader } from "react-spinners";
import { csrfToken } from "../../data/data";

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
      title: eventTitle,
      date: formattedDate,
    };
    try {
      const savedEvent = await saveEvent(newEvent);

      setEvents((prevEvents) => [...prevEvents, savedEvent]);
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
    const response = await fetch("http://localhost:8000/events/schedule/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      credentials: "include",
      body: JSON.stringify(e),
    });
    if (!response.ok) {
      throw new Error("Backend: Failed to save event.");
    }
    displayEvents();
    return await response.json();
  };

  const displayEvents = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/events/schedule/", {
        method: "GET",
        headers: {
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
      });
      const data = await response.json();
      console.log("Events data:", data);
      if (response.ok) {
        let events = data.map((event) => ({
          ...event,
          date: new Date(event.date),
        }));
        setEvents(events);
      } else {
        console.error("Error:", data.error);
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

  const removeEvent = async (eventId) => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/events/schedule/", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify({ event_id: eventId }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error("Error:", data.error);
      }
      setEvents((prevEvents) =>
        prevEvents.filter((event) => event.id !== eventId)
      );
    } catch (error) {
      console.error("Error deleting event.", error);
    } finally {
      setLoading(false);
    }
  };

  // Upcoming events display
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight

  const twoWeeksFromNow = new Date(today);
  twoWeeksFromNow.setDate(today.getDate() + 14); // Set to two weeks from today

  // Filter events to include only those within the next two weeks
  const upcomingEvents = events.filter((event) => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today && eventDate <= twoWeeksFromNow;
  });

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
          removeEvent={removeEvent}
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
          <h3 className="upcoming-event-h3">Up Coming Events</h3>
          {loading ? (
            <PulseLoader loading={loading} size={7} color={"#22D6D6"} />
          ) : events.length > 0 ? (
            <ul>
              {upcomingEvents.map((event, index) => (
                <li key={event.event_id || index}>
                  {event.title} - {new Date(event.date).toLocaleDateString()}
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
