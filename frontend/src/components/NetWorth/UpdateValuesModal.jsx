import { useState, useEffect } from "react";
import { snapshotsApi } from "../../api/networthApi";
import "./Modals.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const UpdateValuesModal = ({ accounts, onClose, onSuccess }) => {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recordedAt, setRecordedAt] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Flatten all accounts
  const allAccounts = [
    ...(accounts?.cash || []),
    ...(accounts?.investment || []),
    ...(accounts?.asset || []),
    ...(accounts?.debt || []),
  ];

  // Initialize values from current account values
  useEffect(() => {
    const initialValues = {};
    allAccounts.forEach((account) => {
      initialValues[account.id] = account.value.toString();
    });
    setValues(initialValues);
  }, []);

  const handleValueChange = (accountId, value) => {
    setValues((prev) => ({
      ...prev,
      [accountId]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Build snapshots array with changed values
    const snapshots = [];
    allAccounts.forEach((account) => {
      const newValue = parseFloat(values[account.id] || 0);
      if (newValue !== account.value) {
        snapshots.push({
          account_id: account.id,
          value: newValue,
        });
      }
    });

    if (snapshots.length === 0) {
      setError("No values have been changed");
      return;
    }

    try {
      setLoading(true);
      await snapshotsApi.bulkUpdate(snapshots, recordedAt);
      
      // Generate new net worth snapshot
      await snapshotsApi.generateNetWorth(recordedAt);
      
      onSuccess();
    } catch (err) {
      console.error("Failed to update values:", err);
      setError(err.response?.data?.detail || "Failed to update values");
    } finally {
      setLoading(false);
    }
  };

  const getAccountTypeLabel = (type) => {
    const labels = {
      cash: "Cash Accounts",
      investment: "Investments",
      asset: "Physical Assets",
      debt: "Debts & Liabilities",
    };
    return labels[type] || type;
  };

  // Group accounts by type for display
  const groupedAccounts = {
    cash: accounts?.cash || [],
    investment: accounts?.investment || [],
    asset: accounts?.asset || [],
    debt: accounts?.debt || [],
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Update Account Values</h2>
          <button className="close-btn" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          {/* Date Selection */}
          <div className="form-group date-group">
            <label>Record Date</label>
            <input
              type="date"
              value={recordedAt}
              onChange={(e) => setRecordedAt(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Account Value Updates */}
          <div className="update-sections">
            {Object.entries(groupedAccounts).map(
              ([type, typeAccounts]) =>
                typeAccounts.length > 0 && (
                  <div key={type} className="update-section">
                    <h3 className={`section-title ${type}`}>
                      {getAccountTypeLabel(type)}
                    </h3>
                    <div className="update-accounts">
                      {typeAccounts.map((account) => {
                        const currentValue = parseFloat(values[account.id] || 0);
                        const originalValue = account.value;
                        const hasChanged = currentValue !== originalValue;
                        const change = currentValue - originalValue;

                        return (
                          <div key={account.id} className="update-account-row">
                            <div className="ua-info">
                              <span className="ua-name">{account.name}</span>
                              <span className="ua-current">
                                Current: {formatCurrency(originalValue)}
                              </span>
                            </div>
                            <div className="ua-input">
                              <div className="input-with-prefix">
                                <span className="input-prefix">$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={values[account.id] || ""}
                                  onChange={(e) =>
                                    handleValueChange(account.id, e.target.value)
                                  }
                                  placeholder="0.00"
                                />
                              </div>
                              {hasChanged && (
                                <span
                                  className={`ua-change ${
                                    change > 0 ? "positive" : "negative"
                                  }`}
                                >
                                  {change > 0 ? "+" : ""}
                                  {formatCurrency(change)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
            )}
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
                  Updating...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg"></i>
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateValuesModal;

