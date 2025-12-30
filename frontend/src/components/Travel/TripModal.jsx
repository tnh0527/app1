import { useState, useEffect } from "react";
import "./TripModal.css";
import { tripsApi, expensesApi } from "../../api/travelApi";

const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const getTripTypeIcon = (type) => {
  const icons = {
    vacation: "bi-sun",
    business: "bi-briefcase",
    adventure: "bi-compass",
    city_break: "bi-building",
    beach: "bi-umbrella",
    road_trip: "bi-car-front",
    backpacking: "bi-backpack",
  };
  return icons[type] || "bi-airplane";
};

export const TripModal = ({ trip, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [tripData, setTripData] = useState(trip);
  const [loading, setLoading] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: "",
    currency: "USD",
    category: "food",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchTripDetails();
  }, [trip.id]);

  const fetchTripDetails = async () => {
    try {
      const data = await tripsApi.get(trip.id);
      setTripData(data);
    } catch (err) {
      console.error("Failed to fetch trip details:", err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await tripsApi.updateStatus(trip.id, newStatus);
      fetchTripDetails();
      onUpdate();
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await expensesApi.create({
        trip: trip.id,
        ...newExpense,
        amount: parseFloat(newExpense.amount),
      });
      setShowAddExpense(false);
      setNewExpense({
        amount: "",
        currency: "USD",
        category: "food",
        description: "",
        expense_date: new Date().toISOString().split("T")[0],
      });
      fetchTripDetails();
    } catch (err) {
      console.error("Failed to add expense:", err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "bi-grid" },
    { id: "budget", label: "Budget", icon: "bi-wallet2" },
    { id: "itinerary", label: "Itinerary", icon: "bi-calendar3" },
    { id: "packing", label: "Packing", icon: "bi-bag-check" },
    { id: "documents", label: "Documents", icon: "bi-file-earmark-text" },
  ];

  const categories = [
    { value: "flights", label: "Flights" },
    { value: "accommodation", label: "Accommodation" },
    { value: "food", label: "Food & Dining" },
    { value: "activities", label: "Activities" },
    { value: "transport", label: "Local Transport" },
    { value: "shopping", label: "Shopping" },
    { value: "other", label: "Other" },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="trip-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="trip-header-info">
            <span className="trip-flag">{tripData.country_flag}</span>
            <div>
              <h2>{tripData.name}</h2>
              <p>
                {tripData.city}, {tripData.country}
              </p>
            </div>
          </div>
          <div className="modal-actions">
            <select
              value={tripData.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`status-select ${tripData.status}`}
            >
              <option value="planning">Planning</option>
              <option value="booked">Booked</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <button className="close-btn" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="modal-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`modal-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`bi ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modal Content */}
        <div className="modal-content">
          {activeTab === "overview" && (
            <div className="tab-overview">
              <div className="overview-grid">
                <div className="info-card">
                  <div className="info-icon">
                    <i className="bi bi-calendar3"></i>
                  </div>
                  <div className="info-content">
                    <span className="info-label">Dates</span>
                    <span className="info-value">
                      {formatDate(tripData.start_date)} - {formatDate(tripData.end_date)}
                    </span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <i className="bi bi-clock"></i>
                  </div>
                  <div className="info-content">
                    <span className="info-label">Duration</span>
                    <span className="info-value">{tripData.duration_days} days</span>
                  </div>
                </div>

                <div className="info-card">
                  <div className={`info-icon trip-type ${tripData.trip_type}`}>
                    <i className={`bi ${getTripTypeIcon(tripData.trip_type)}`}></i>
                  </div>
                  <div className="info-content">
                    <span className="info-label">Trip Type</span>
                    <span className="info-value">
                      {tripData.trip_type?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <i className="bi bi-wallet2"></i>
                  </div>
                  <div className="info-content">
                    <span className="info-label">Budget</span>
                    <span className="info-value">
                      {formatCurrency(tripData.actual_spend)} / {formatCurrency(tripData.budget_amount)}
                    </span>
                  </div>
                </div>
              </div>

              {tripData.description && (
                <div className="trip-description">
                  <h4>Description</h4>
                  <p>{tripData.description}</p>
                </div>
              )}

              {tripData.notes && (
                <div className="trip-notes">
                  <h4>Notes</h4>
                  <p>{tripData.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "budget" && (
            <div className="tab-budget">
              <div className="budget-summary">
                <div className="budget-total">
                  <span className="budget-spent">{formatCurrency(tripData.actual_spend)}</span>
                  <span className="budget-of">of</span>
                  <span className="budget-amount">{formatCurrency(tripData.budget_amount)}</span>
                </div>
                <div className="budget-bar-large">
                  <div
                    className="budget-fill-large"
                    style={{
                      width: `${Math.min(tripData.budget_utilization_percentage || 0, 100)}%`,
                    }}
                  ></div>
                </div>
                <div className="budget-remaining-text">
                  {formatCurrency(tripData.budget_remaining)} remaining
                  ({Math.round(100 - (tripData.budget_utilization_percentage || 0))}%)
                </div>
              </div>

              <div className="expenses-section">
                <div className="section-header">
                  <h4>Expenses</h4>
                  <button
                    className="add-expense-btn"
                    onClick={() => setShowAddExpense(!showAddExpense)}
                  >
                    <i className="bi bi-plus"></i>
                    Add Expense
                  </button>
                </div>

                {showAddExpense && (
                  <form className="add-expense-form" onSubmit={handleAddExpense}>
                    <div className="form-row">
                      <input
                        type="number"
                        placeholder="Amount"
                        value={newExpense.amount}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, amount: e.target.value })
                        }
                        required
                        step="0.01"
                      />
                      <select
                        value={newExpense.category}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, category: e.target.value })
                        }
                      >
                        {categories.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-row">
                      <input
                        type="text"
                        placeholder="Description"
                        value={newExpense.description}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, description: e.target.value })
                        }
                        required
                      />
                      <input
                        type="date"
                        value={newExpense.expense_date}
                        onChange={(e) =>
                          setNewExpense({ ...newExpense, expense_date: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="form-actions">
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={() => setShowAddExpense(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="save-btn" disabled={loading}>
                        {loading ? "Adding..." : "Add Expense"}
                      </button>
                    </div>
                  </form>
                )}

                <div className="expenses-list">
                  {tripData.expenses?.length > 0 ? (
                    tripData.expenses.map((expense) => (
                      <div key={expense.id} className="expense-item">
                        <div className="expense-info">
                          <span className="expense-desc">{expense.description}</span>
                          <span className="expense-meta">
                            {expense.category} • {formatDate(expense.expense_date)}
                          </span>
                        </div>
                        <span className="expense-amount">
                          {formatCurrency(expense.converted_amount)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="empty-expenses">
                      <p>No expenses recorded yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "itinerary" && (
            <div className="tab-itinerary">
              {tripData.itinerary_days?.length > 0 ? (
                tripData.itinerary_days.map((day) => (
                  <div key={day.id} className="itinerary-day">
                    <div className="day-header">
                      <span className="day-number">Day {day.day_number}</span>
                      <span className="day-date">{formatDate(day.date)}</span>
                    </div>
                    <div className="day-title">{day.title}</div>
                    {day.activities?.length > 0 ? (
                      <div className="day-activities">
                        {day.activities.map((activity) => (
                          <div key={activity.id} className="activity-item">
                            <span className="activity-time">
                              {activity.start_time || "Any time"}
                            </span>
                            <span className="activity-name">{activity.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-activities">No activities planned</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="empty-itinerary">
                  <i className="bi bi-calendar3"></i>
                  <p>No itinerary created yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "packing" && (
            <div className="tab-packing">
              {tripData.packing_list ? (
                <div className="packing-progress">
                  <div className="progress-info">
                    <span>
                      {tripData.packing_list.packed_items} of{" "}
                      {tripData.packing_list.total_items} items packed
                    </span>
                    <span>{Math.round(tripData.packing_list.packing_progress)}%</span>
                  </div>
                  <div className="packing-bar">
                    <div
                      className="packing-fill"
                      style={{ width: `${tripData.packing_list.packing_progress}%` }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="empty-packing">
                  <i className="bi bi-bag-check"></i>
                  <p>No packing list created yet</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "documents" && (
            <div className="tab-documents">
              {tripData.documents?.length > 0 ? (
                <div className="documents-list">
                  {tripData.documents.map((doc) => (
                    <div key={doc.id} className="document-item">
                      <i className="bi bi-file-earmark-text"></i>
                      <div className="doc-info">
                        <span className="doc-name">{doc.name}</span>
                        <span className="doc-type">{doc.document_type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-documents">
                  <i className="bi bi-file-earmark"></i>
                  <p>No documents uploaded yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripModal;

