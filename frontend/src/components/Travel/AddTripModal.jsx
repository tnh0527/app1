import { useState } from "react";
import "./AddTripModal.css";
import { tripsApi, budgetApi } from "../../api/travelApi";

const TRIP_TYPES = [
  { value: "vacation", label: "Vacation", icon: "bi-sun" },
  { value: "business", label: "Business", icon: "bi-briefcase" },
  { value: "adventure", label: "Adventure", icon: "bi-compass" },
  { value: "city_break", label: "City Break", icon: "bi-building" },
  { value: "beach", label: "Beach", icon: "bi-umbrella" },
  { value: "road_trip", label: "Road Trip", icon: "bi-car-front" },
  { value: "backpacking", label: "Backpacking", icon: "bi-backpack" },
];

const COLORS = [
  "#00d4aa", "#3b82f6", "#f59e0b", "#a855f7", "#06b6d4",
  "#ef4444", "#22c55e", "#ec4899", "#6366f1", "#14b8a6",
];

export const AddTripModal = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [suggestedBudget, setSuggestedBudget] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    city: "",
    country: "",
    country_code: "",
    timezone: "UTC",
    start_date: "",
    end_date: "",
    trip_type: "vacation",
    budget_amount: "",
    budget_currency: "USD",
    budget_flights: 0,
    budget_accommodation: 0,
    budget_food: 0,
    budget_activities: 0,
    budget_transport: 0,
    budget_shopping: 0,
    budget_other: 0,
    color: "#00d4aa",
    auto_generate_itinerary: true,
    auto_create_packing_list: true,
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const getDurationDays = () => {
    if (!formData.start_date || !formData.end_date) return 0;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const handleGetBudgetSuggestion = async () => {
    const duration = getDurationDays();
    if (duration <= 0) return;

    try {
      const suggestion = await budgetApi.getSuggestion(
        `${formData.city}, ${formData.country}`,
        duration,
        formData.trip_type
      );
      setSuggestedBudget(suggestion);
    } catch (err) {
      console.error("Failed to get budget suggestion:", err);
    }
  };

  const handleApplySuggestion = () => {
    if (!suggestedBudget) return;
    setFormData({
      ...formData,
      budget_amount: suggestedBudget.total,
      budget_flights: suggestedBudget.breakdown.flights,
      budget_accommodation: suggestedBudget.breakdown.accommodation,
      budget_food: suggestedBudget.breakdown.food,
      budget_activities: suggestedBudget.breakdown.activities,
      budget_transport: suggestedBudget.breakdown.transport,
      budget_shopping: suggestedBudget.breakdown.shopping,
      budget_other: suggestedBudget.breakdown.other,
    });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await tripsApi.create(formData);
      onSuccess();
    } catch (err) {
      console.error("Failed to create trip:", err);
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return (
          formData.name &&
          formData.city &&
          formData.country &&
          formData.country_code.length === 2
        );
      case 2:
        return (
          formData.start_date &&
          formData.end_date &&
          new Date(formData.end_date) >= new Date(formData.start_date)
        );
      case 3:
        return formData.budget_amount > 0;
      default:
        return true;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="add-trip-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Plan New Trip</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="step-progress">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`step-item ${step >= s ? "active" : ""} ${step === s ? "current" : ""}`}
            >
              <div className="step-number">{s}</div>
              <span className="step-label">
                {s === 1 ? "Destination" : s === 2 ? "Dates" : "Budget"}
              </span>
            </div>
          ))}
        </div>

        <div className="modal-content">
          {/* Step 1: Destination */}
          {step === 1 && (
            <div className="step-content">
              <div className="form-group">
                <label>Trip Name</label>
                <input
                  type="text"
                  placeholder="Summer in Paris"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    placeholder="Paris"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    placeholder="France"
                    value={formData.country}
                    onChange={(e) => handleChange("country", e.target.value)}
                  />
                </div>
                <div className="form-group small">
                  <label>Code</label>
                  <input
                    type="text"
                    placeholder="FR"
                    value={formData.country_code}
                    maxLength={2}
                    onChange={(e) =>
                      handleChange("country_code", e.target.value.toUpperCase())
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Trip Type</label>
                <div className="trip-type-grid">
                  {TRIP_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      className={`type-btn ${formData.trip_type === type.value ? "active" : ""}`}
                      onClick={() => handleChange("trip_type", type.value)}
                    >
                      <i className={`bi ${type.icon}`}></i>
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Color Theme</label>
                <div className="color-grid">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`color-btn ${formData.color === color ? "active" : ""}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleChange("color", color)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  placeholder="Add a description for your trip..."
                  value={formData.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Step 2: Dates */}
          {step === 2 && (
            <div className="step-content">
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleChange("start_date", e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    min={formData.start_date}
                    onChange={(e) => handleChange("end_date", e.target.value)}
                  />
                </div>
              </div>

              {getDurationDays() > 0 && (
                <div className="duration-display">
                  <i className="bi bi-calendar-check"></i>
                  <span>{getDurationDays()} day{getDurationDays() > 1 ? "s" : ""}</span>
                </div>
              )}

              <div className="form-group">
                <label>Auto-generate Options</label>
                <div className="checkbox-group">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.auto_generate_itinerary}
                      onChange={(e) =>
                        handleChange("auto_generate_itinerary", e.target.checked)
                      }
                    />
                    <span>Create itinerary days automatically</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.auto_create_packing_list}
                      onChange={(e) =>
                        handleChange("auto_create_packing_list", e.target.checked)
                      }
                    />
                    <span>Generate smart packing list</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Budget */}
          {step === 3 && (
            <div className="step-content">
              <div className="budget-suggestion-card">
                <button
                  type="button"
                  className="get-suggestion-btn"
                  onClick={handleGetBudgetSuggestion}
                >
                  <i className="bi bi-lightbulb"></i>
                  Get Budget Suggestion
                </button>
                {suggestedBudget && (
                  <div className="suggestion-result">
                    <span className="suggested-amount">
                      ${suggestedBudget.total.toLocaleString()}
                    </span>
                    <span className="suggested-daily">
                      ~${suggestedBudget.daily_average.toFixed(0)}/day
                    </span>
                    <button
                      type="button"
                      className="apply-btn"
                      onClick={handleApplySuggestion}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Total Budget</label>
                  <input
                    type="number"
                    placeholder="5000"
                    value={formData.budget_amount}
                    onChange={(e) =>
                      handleChange("budget_amount", parseFloat(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="form-group small">
                  <label>Currency</label>
                  <select
                    value={formData.budget_currency}
                    onChange={(e) => handleChange("budget_currency", e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="JPY">JPY</option>
                    <option value="CAD">CAD</option>
                    <option value="AUD">AUD</option>
                  </select>
                </div>
              </div>

              <div className="budget-breakdown">
                <h4>Budget Breakdown (Optional)</h4>
                <div className="breakdown-grid">
                  {[
                    { key: "budget_flights", label: "Flights", icon: "bi-airplane" },
                    { key: "budget_accommodation", label: "Accommodation", icon: "bi-building" },
                    { key: "budget_food", label: "Food", icon: "bi-cup-straw" },
                    { key: "budget_activities", label: "Activities", icon: "bi-stars" },
                    { key: "budget_transport", label: "Transport", icon: "bi-bus-front" },
                    { key: "budget_shopping", label: "Shopping", icon: "bi-bag" },
                  ].map((item) => (
                    <div key={item.key} className="breakdown-item">
                      <i className={`bi ${item.icon}`}></i>
                      <span>{item.label}</span>
                      <input
                        type="number"
                        value={formData[item.key]}
                        onChange={(e) =>
                          handleChange(item.key, parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          {step > 1 && (
            <button
              type="button"
              className="back-btn"
              onClick={() => setStep(step - 1)}
            >
              <i className="bi bi-arrow-left"></i>
              Back
            </button>
          )}
          
          <div className="footer-spacer"></div>

          {step < 3 ? (
            <button
              type="button"
              className="next-btn"
              onClick={() => setStep(step + 1)}
              disabled={!isStepValid()}
            >
              Next
              <i className="bi bi-arrow-right"></i>
            </button>
          ) : (
            <button
              type="button"
              className="create-btn"
              onClick={handleSubmit}
              disabled={!isStepValid() || loading}
            >
              {loading ? (
                "Creating..."
              ) : (
                <>
                  <i className="bi bi-airplane-engines"></i>
                  Create Trip
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddTripModal;

