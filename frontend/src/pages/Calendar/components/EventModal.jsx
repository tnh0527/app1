import { useState, useEffect, useMemo, useCallback } from "react";
import {
  useCalendar,
  PRIORITY_LEVELS,
  PRIORITY_COLORS,
  EVENT_COLORS,
} from "../context/CalendarContext";
import CustomDatePicker from "./CustomDatePicker";
import CustomTimePicker from "./CustomTimePicker";
import CustomDropdown from "./CustomDropdown";
import "./EventModal.css";

const RECURRENCE_OPTIONS = [
  { value: "", label: "Does not repeat" },
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom..." },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const REMINDER_OPTIONS = [
  { value: 0, label: "At time of event" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 120, label: "2 hours before" },
  { value: 1440, label: "1 day before" },
  { value: 2880, label: "2 days before" },
  { value: 10080, label: "1 week before" },
];

const EventModal = () => {
  const {
    isEventModalOpen,
    closeEventModal,
    editingEvent,
    modalInitialDate,
    createEvent,
    updateEvent,
    checkConflicts,
    currentDate,
  } = useCalendar();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(true);
  const [priority, setPriority] = useState("");
  const [eventColor, setEventColor] = useState(EVENT_COLORS[0].id);

  // Recurrence state
  const [recurrenceFreq, setRecurrenceFreq] = useState("");
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUntil, setRecurrenceUntil] = useState("");
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState([]);
  const [showCustomRecurrence, setShowCustomRecurrence] = useState(false);

  // Reminder state
  const [reminders, setReminders] = useState([]);
  const [selectedReminder, setSelectedReminder] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [errors, setErrors] = useState({});

  // Initialize form when modal opens
  useEffect(() => {
    if (isEventModalOpen) {
      if (editingEvent && editingEvent.start_at) {
        // Editing existing event
        setTitle(editingEvent.title || "");
        setDescription(editingEvent.description || "");

        const start = new Date(editingEvent.start_at);
        const end = new Date(editingEvent.end_at);

        setStartDate(start.toISOString().split("T")[0]);
        setStartTime(start.toTimeString().slice(0, 5));
        setEndDate(end.toISOString().split("T")[0]);
        setEndTime(end.toTimeString().slice(0, 5));
        setAllDay(editingEvent.all_day || false);
        setPriority(editingEvent.priority || "");
        setEventColor(editingEvent.color || EVENT_COLORS[0].id);
      } else {
        // New event
        const initialDate = modalInitialDate || currentDate;
        const dateStr = new Date(initialDate).toISOString().split("T")[0];

        setTitle("");
        setDescription("");
        setStartDate(dateStr);
        setStartTime("09:00");
        setEndDate(dateStr);
        setEndTime("10:00");
        setAllDay(true);
        setPriority("");
        setEventColor(EVENT_COLORS[0].id);
        setRecurrenceFreq("");
        setRecurrenceInterval(1);
        setRecurrenceUntil("");
        setRecurrenceWeekdays([]);
        setReminders([]);
        setShowCustomRecurrence(false);
      }

      setErrors({});
      setConflicts([]);
      setActiveTab("details");
    }
  }, [isEventModalOpen, editingEvent, modalInitialDate, currentDate]);

  // Check for conflicts when dates change
  useEffect(() => {
    if (!startDate || !endDate) return;

    const start = allDay
      ? new Date(`${startDate}T00:00:00`)
      : new Date(`${startDate}T${startTime}`);
    const end = allDay
      ? new Date(`${endDate}T23:59:59`)
      : new Date(`${endDate}T${endTime}`);

    const foundConflicts = checkConflicts(start, end, editingEvent?.id);
    setConflicts(foundConflicts);
  }, [
    startDate,
    startTime,
    endDate,
    endTime,
    allDay,
    checkConflicts,
    editingEvent,
  ]);

  // Validate form
  const validate = useCallback(() => {
    const newErrors = {};

    // Title validation
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      newErrors.title = "Title is required";
    } else if (trimmedTitle.length < 2) {
      newErrors.title = "Title must be at least 2 characters";
    } else if (trimmedTitle.length > 200) {
      newErrors.title = "Title must be 200 characters or less";
    }

    // Description validation (optional but has max length)
    if (description.length > 2000) {
      newErrors.description = "Description must be 2000 characters or less";
    }

    // Date validations
    if (!startDate) {
      newErrors.startDate = "Start date is required";
    }

    if (!endDate) {
      newErrors.endDate = "End date is required";
    }

    if (startDate && endDate) {
      const start = allDay
        ? new Date(`${startDate}T00:00:00`)
        : new Date(`${startDate}T${startTime}`);
      const end = allDay
        ? new Date(`${endDate}T23:59:59`)
        : new Date(`${endDate}T${endTime}`);

      // Check for valid date objects
      if (isNaN(start.getTime())) {
        newErrors.startDate = "Invalid start date";
      }
      if (isNaN(end.getTime())) {
        newErrors.endDate = "Invalid end date";
      }

      // End must be after start for non all-day events
      if (end <= start && !allDay) {
        newErrors.endTime = "End time must be after start time";
      }

      // End date must be on or after start date for all-day events
      if (allDay && endDate < startDate) {
        newErrors.endDate = "End date must be on or after start date";
      }

      // Prevent events too far in the future (5 years)
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 5);
      if (start > maxFutureDate) {
        newErrors.startDate = "Event cannot be more than 5 years in the future";
      }

      // Prevent events too far in the past (1 year)
      const maxPastDate = new Date();
      maxPastDate.setFullYear(maxPastDate.getFullYear() - 1);
      if (start < maxPastDate) {
        newErrors.startDate = "Event cannot be more than 1 year in the past";
      }
    }

    // Recurrence validation
    if (recurrenceFreq && recurrenceFreq !== "") {
      if (recurrenceInterval < 1) {
        newErrors.recurrence = "Recurrence interval must be at least 1";
      } else if (recurrenceInterval > 365) {
        newErrors.recurrence = "Recurrence interval cannot exceed 365";
      }

      if (recurrenceUntil) {
        const untilDate = new Date(`${recurrenceUntil}T23:59:59`);
        const startDateObj = new Date(`${startDate}T00:00:00`);
        if (untilDate <= startDateObj) {
          newErrors.recurrenceUntil = "Recurrence end must be after start date";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [
    title,
    description,
    startDate,
    endDate,
    startTime,
    endTime,
    allDay,
    recurrenceFreq,
    recurrenceInterval,
    recurrenceUntil,
  ]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const start = allDay
        ? new Date(`${startDate}T00:00:00`)
        : new Date(`${startDate}T${startTime}`);
      const end = allDay
        ? new Date(
            new Date(`${endDate}T00:00:00`).getTime() + 24 * 60 * 60 * 1000
          )
        : new Date(`${endDate}T${endTime}`);

      const eventData = {
        title: title.trim(),
        description: description.trim(),
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        all_day: allDay,
      };

      // Add recurrence if set
      if (recurrenceFreq && recurrenceFreq !== "CUSTOM") {
        eventData.recurrence_freq = recurrenceFreq;
        eventData.recurrence_interval = recurrenceInterval;
        if (recurrenceUntil) {
          const until = new Date(`${recurrenceUntil}T23:59:59`);
          eventData.recurrence_until = until.toISOString();
        }
      }

      // Add reminder if set
      if (reminders.length > 0) {
        eventData.reminder_minutes_before = reminders[0];
      }

      if (editingEvent) {
        await updateEvent(editingEvent.event_id || editingEvent.id, eventData);
      } else {
        await createEvent(eventData);
      }

      closeEventModal();
    } catch (error) {
      console.error("Failed to save event:", error);
      setErrors({ submit: "Failed to save event. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecurrenceChange = (value) => {
    if (value === "CUSTOM") {
      setShowCustomRecurrence(true);
      setRecurrenceFreq("WEEKLY");
    } else {
      setShowCustomRecurrence(false);
      setRecurrenceFreq(value);
    }
  };

  const toggleWeekday = (index) => {
    setRecurrenceWeekdays((prev) =>
      prev.includes(index)
        ? prev.filter((d) => d !== index)
        : [...prev, index].sort()
    );
  };

  const addReminder = () => {
    if (
      selectedReminder !== "" &&
      !reminders.includes(Number(selectedReminder))
    ) {
      setReminders((prev) =>
        [...prev, Number(selectedReminder)].sort((a, b) => a - b)
      );
      setSelectedReminder("");
    }
  };

  const removeReminder = (value) => {
    setReminders((prev) => prev.filter((r) => r !== value));
  };

  const getReminderLabel = (value) => {
    return (
      REMINDER_OPTIONS.find((opt) => opt.value === value)?.label ||
      `${value} minutes`
    );
  };

  const selectedColor = useMemo(
    () =>
      EVENT_COLORS.find((c) => c.id === eventColor)?.color ||
      EVENT_COLORS[0].color,
    [eventColor]
  );

  if (!isEventModalOpen) return null;

  return (
    <div className="event-modal-overlay" onClick={closeEventModal}>
      <div
        className="event-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ "--modal-accent": selectedColor }}
      >
        {/* Header */}
        <div className="event-modal-header">
          <h2 className="modal-title">
            {editingEvent ? "Edit Event" : "Create Event"}
          </h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={closeEventModal}
            aria-label="Close"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${
              activeTab === "details" ? "modal-tab--active" : ""
            }`}
            onClick={() => setActiveTab("details")}
          >
            <i className="bi bi-card-text"></i>
            Details
          </button>
          <button
            type="button"
            className={`modal-tab ${
              activeTab === "recurrence" ? "modal-tab--active" : ""
            }`}
            onClick={() => setActiveTab("recurrence")}
          >
            <i className="bi bi-arrow-repeat"></i>
            Recurrence
          </button>
          <button
            type="button"
            className={`modal-tab ${
              activeTab === "reminders" ? "modal-tab--active" : ""
            }`}
            onClick={() => setActiveTab("reminders")}
          >
            <i className="bi bi-bell"></i>
            Reminders
            {reminders.length > 0 && (
              <span className="tab-badge">{reminders.length}</span>
            )}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="event-modal-body">
            {/* Conflict Warning */}
            {conflicts.length > 0 && (
              <div className="conflict-warning">
                <i className="bi bi-exclamation-triangle"></i>
                <div className="conflict-content">
                  <strong>Scheduling Conflict</strong>
                  <p>
                    This event overlaps with {conflicts.length} existing
                    event(s):
                  </p>
                  <ul>
                    {conflicts.slice(0, 3).map((c) => (
                      <li key={c.id}>{c.title}</li>
                    ))}
                    {conflicts.length > 3 && (
                      <li>...and {conflicts.length - 3} more</li>
                    )}
                  </ul>
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === "details" && (
              <div className="tab-content">
                {/* Title */}
                <div className="form-group">
                  <label className="form-label">
                    Event Title <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-input ${
                      errors.title ? "form-input--error" : ""
                    }`}
                    placeholder="Add title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                  />
                  {errors.title && (
                    <span className="form-error">{errors.title}</span>
                  )}
                </div>

                {/* All Day Toggle */}
                <div className="form-group form-group--inline all-day-toggle-group">
                  <label className="toggle-label">
                    <input
                      type="checkbox"
                      className="toggle-input"
                      checked={allDay}
                      onChange={(e) => setAllDay(e.target.checked)}
                    />
                    <span className="toggle-switch"></span>
                    <span>All day event</span>
                  </label>
                </div>

                {/* Date & Time */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start</label>
                    <div
                      className={`datetime-inputs ${
                        !allDay ? "stack-time" : ""
                      }`}
                    >
                      <CustomDatePicker
                        value={startDate}
                        onChange={setStartDate}
                      />

                      {!allDay && (
                        <CustomTimePicker
                          value={startTime}
                          onChange={setStartTime}
                        />
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">End</label>
                    <div
                      className={`datetime-inputs ${
                        !allDay ? "stack-time" : ""
                      }`}
                    >
                      <CustomDatePicker value={endDate} onChange={setEndDate} />

                      {!allDay && (
                        <CustomTimePicker
                          value={endTime}
                          onChange={setEndTime}
                          error={!!errors.endTime}
                        />
                      )}
                    </div>
                    {errors.endTime && (
                      <span className="form-error">{errors.endTime}</span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input form-textarea"
                    placeholder="Add description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Priority */}
                <div className="form-group priority-group">
                  <label className="form-label">Priority</label>
                  <div className="priority-options">
                    {Object.entries(PRIORITY_LEVELS).map(([key, value]) => (
                      <button
                        key={key}
                        type="button"
                        className={`priority-btn ${
                          priority === value ? "priority-btn--active" : ""
                        }`}
                        style={{ "--priority-color": PRIORITY_COLORS[value] }}
                        onClick={() =>
                          setPriority(priority === value ? "" : value)
                        }
                      >
                        <span className="priority-indicator"></span>
                        {key.charAt(0) + key.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color */}
                <div className="form-group color-group">
                  <label className="form-label">Color</label>
                  <div className="color-options">
                    {EVENT_COLORS.map((color) => (
                      <button
                        key={color.id}
                        type="button"
                        className={`color-btn ${
                          eventColor === color.id ? "color-btn--active" : ""
                        }`}
                        style={{ backgroundColor: color.color }}
                        onClick={() => setEventColor(color.id)}
                        title={color.name}
                        aria-label={color.name}
                      >
                        {eventColor === color.id && (
                          <i className="bi bi-check"></i>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Recurrence Tab */}
            {activeTab === "recurrence" && (
              <div className="tab-content tab-content--recurrence">
                <div className="form-group">
                  <label className="form-label">Repeat</label>
                  <CustomDropdown
                    options={RECURRENCE_OPTIONS}
                    value={showCustomRecurrence ? "CUSTOM" : recurrenceFreq}
                    onChange={handleRecurrenceChange}
                    placeholder="Does not repeat"
                  />
                </div>

                {(recurrenceFreq || showCustomRecurrence) && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Repeat every</label>
                      <div className="interval-input">
                        <input
                          type="number"
                          className="form-input form-input--number"
                          min={1}
                          max={99}
                          value={recurrenceInterval}
                          onChange={(e) =>
                            setRecurrenceInterval(
                              Math.max(1, parseInt(e.target.value) || 1)
                            )
                          }
                        />
                        <span className="interval-label">
                          {recurrenceFreq === "DAILY"
                            ? "day(s)"
                            : recurrenceFreq === "WEEKLY"
                            ? "week(s)"
                            : recurrenceFreq === "MONTHLY"
                            ? "month(s)"
                            : "time(s)"}
                        </span>
                      </div>
                    </div>

                    {showCustomRecurrence && recurrenceFreq === "WEEKLY" && (
                      <div className="form-group">
                        <label className="form-label">On these days</label>
                        <div className="weekday-options">
                          {WEEKDAYS.map((day, index) => (
                            <button
                              key={day}
                              type="button"
                              className={`weekday-btn ${
                                recurrenceWeekdays.includes(index)
                                  ? "weekday-btn--active"
                                  : ""
                              }`}
                              onClick={() => toggleWeekday(index)}
                            >
                              {day.charAt(0)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label className="form-label">End repeat</label>
                      <input
                        type="date"
                        className="form-input"
                        value={recurrenceUntil}
                        onChange={(e) => setRecurrenceUntil(e.target.value)}
                        placeholder="Never"
                      />
                      <span className="form-hint">
                        Leave empty for no end date
                      </span>
                    </div>

                    {/* Recurrence Preview - Hidden when Custom is selected */}
                    {!showCustomRecurrence && (
                      <div className="recurrence-preview">
                        <i className="bi bi-info-circle"></i>
                        <span>
                          Repeats {recurrenceFreq.toLowerCase()}
                          {recurrenceInterval > 1
                            ? ` every ${recurrenceInterval} ${
                                recurrenceFreq === "DAILY"
                                  ? "days"
                                  : recurrenceFreq === "WEEKLY"
                                  ? "weeks"
                                  : "months"
                              }`
                            : ""}
                          {recurrenceUntil
                            ? ` until ${new Date(
                                recurrenceUntil
                              ).toLocaleDateString()}`
                            : " forever"}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Reminders Tab */}
            {activeTab === "reminders" && (
              <div className="tab-content">
                <div className="form-group">
                  <label className="form-label">Add Reminder</label>
                  <div className="reminder-add">
                    <CustomDropdown
                      options={[
                        { value: "", label: "No reminder" },
                        ...REMINDER_OPTIONS.filter(
                          (opt) => !reminders.includes(opt.value)
                        ),
                      ]}
                      value={selectedReminder}
                      onChange={setSelectedReminder}
                      placeholder="Select when to remind..."
                    />
                    <button
                      type="button"
                      className="reminder-add-btn"
                      onClick={addReminder}
                      disabled={selectedReminder === ""}
                    >
                      <i className="bi bi-plus"></i>
                    </button>
                  </div>
                </div>

                {reminders.length > 0 ? (
                  <div className="reminders-list">
                    <label className="form-label">Active Reminders</label>
                    {reminders.map((reminder) => (
                      <div key={reminder} className="reminder-item">
                        <i className="bi bi-bell"></i>
                        <span>{getReminderLabel(reminder)}</span>
                        <button
                          type="button"
                          className="reminder-remove"
                          onClick={() => removeReminder(reminder)}
                          aria-label="Remove reminder"
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="reminders-empty">
                    <i className="bi bi-bell-slash"></i>
                    <p>No reminders set</p>
                    <span>
                      Add a reminder to get notified before this event
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer - Only show on Details tab */}
          {activeTab === "details" && (
            <div className="event-modal-footer">
              {errors.submit && (
                <span className="form-error">{errors.submit}</span>
              )}
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeEventModal}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Saving...
                  </>
                ) : editingEvent ? (
                  "Update Event"
                ) : (
                  "Create Event"
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default EventModal;
