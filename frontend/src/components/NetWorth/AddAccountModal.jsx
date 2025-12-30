import { useState } from "react";
import { accountsApi } from "../../api/networthApi";
import "./Modals.css";

const ACCOUNT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "investment", label: "Investment" },
  { value: "debt", label: "Debt/Liability" },
  { value: "asset", label: "Physical Asset" },
];

const SUBTYPES = {
  cash: [
    { value: "checking", label: "Checking Account" },
    { value: "savings", label: "Savings Account" },
    { value: "cash_on_hand", label: "Cash on Hand" },
    { value: "emergency_fund", label: "Emergency Fund" },
  ],
  investment: [
    { value: "brokerage", label: "Brokerage Account" },
    { value: "401k", label: "401(k)" },
    { value: "ira", label: "IRA" },
    { value: "roth_ira", label: "Roth IRA" },
    { value: "hsa", label: "HSA" },
    { value: "crypto", label: "Cryptocurrency" },
    { value: "other_investment", label: "Other Investment" },
  ],
  debt: [
    { value: "credit_card", label: "Credit Card" },
    { value: "student_loan", label: "Student Loan" },
    { value: "mortgage", label: "Mortgage" },
    { value: "auto_loan", label: "Auto Loan" },
    { value: "personal_loan", label: "Personal Loan" },
    { value: "medical_debt", label: "Medical Debt" },
    { value: "other_debt", label: "Other Debt" },
  ],
  asset: [
    { value: "real_estate", label: "Real Estate" },
    { value: "vehicle", label: "Vehicle" },
    { value: "jewelry", label: "Jewelry/Valuables" },
    { value: "collectibles", label: "Collectibles" },
    { value: "other_asset", label: "Other Asset" },
  ],
};

const COLORS = [
  "#0ea5e9",
  "#8b5cf6",
  "#14b8a6",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#22c55e",
  "#6366f1",
];

export const AddAccountModal = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: "",
    account_type: "cash",
    subtype: "checking",
    institution_name: "",
    initial_balance: "",
    apr: "",
    credit_limit: "",
    color: "#208585",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      
      // Reset subtype when type changes
      if (field === "account_type") {
        updated.subtype = SUBTYPES[value]?.[0]?.value || "";
      }
      
      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!formData.name.trim()) {
      setError("Account name is required");
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        name: formData.name.trim(),
        account_type: formData.account_type,
        subtype: formData.subtype,
        institution_name: formData.institution_name.trim(),
        color: formData.color,
        notes: formData.notes.trim(),
      };

      // Add initial balance if provided
      if (formData.initial_balance) {
        payload.initial_balance = parseFloat(formData.initial_balance);
      }

      // Add debt-specific fields
      if (formData.account_type === "debt") {
        if (formData.apr) payload.apr = parseFloat(formData.apr);
        if (formData.credit_limit) payload.credit_limit = parseFloat(formData.credit_limit);
      }

      await accountsApi.create(payload);
      onSuccess();
    } catch (err) {
      console.error("Failed to create account:", err);
      setError(err.response?.data?.detail || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const currentSubtypes = SUBTYPES[formData.account_type] || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Account</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          {/* Account Name */}
          <div className="form-group">
            <label>Account Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g., Chase Checking"
              autoFocus
            />
          </div>

          {/* Account Type */}
          <div className="form-row">
            <div className="form-group">
              <label>Account Type</label>
              <select
                value={formData.account_type}
                onChange={(e) => handleChange("account_type", e.target.value)}
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Subtype</label>
              <select
                value={formData.subtype}
                onChange={(e) => handleChange("subtype", e.target.value)}
              >
                {currentSubtypes.map((subtype) => (
                  <option key={subtype.value} value={subtype.value}>
                    {subtype.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Institution */}
          <div className="form-group">
            <label>Institution (Optional)</label>
            <input
              type="text"
              value={formData.institution_name}
              onChange={(e) => handleChange("institution_name", e.target.value)}
              placeholder="e.g., Chase Bank, Fidelity"
            />
          </div>

          {/* Initial Balance */}
          <div className="form-group">
            <label>
              {formData.account_type === "debt" ? "Current Balance" : "Current Value"}
            </label>
            <div className="input-with-prefix">
              <span className="input-prefix">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.initial_balance}
                onChange={(e) => handleChange("initial_balance", e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Debt-specific fields */}
          {formData.account_type === "debt" && (
            <div className="form-row">
              <div className="form-group">
                <label>APR (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.apr}
                  onChange={(e) => handleChange("apr", e.target.value)}
                  placeholder="e.g., 24.99"
                />
              </div>
              <div className="form-group">
                <label>Credit Limit</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.credit_limit}
                    onChange={(e) => handleChange("credit_limit", e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Color Picker */}
          <div className="form-group">
            <label>Color</label>
            <div className="color-picker">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${formData.color === color ? "selected" : ""}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleChange("color", color)}
                />
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>Notes (Optional)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <i className="bi bi-hourglass-split"></i>
                  Creating...
                </>
              ) : (
                <>
                  <i className="bi bi-plus-lg"></i>
                  Add Account
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAccountModal;

