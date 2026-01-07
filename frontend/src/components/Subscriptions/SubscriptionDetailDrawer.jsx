import { useState, useEffect } from "react";
import "./SubscriptionDetailDrawer.css";
import { dashboardApi, subscriptionsApi } from "../../api/subscriptionsApi";
import { Line } from "react-chartjs-2";

const CATEGORIES = [
  "entertainment",
  "software",
  "education",
  "productivity",
  "utilities",
  "health",
  "finance",
  "shopping",
  "news",
  "gaming",
  "music",
  "other",
];

const SubscriptionDetailDrawer = ({ subscription, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: subscription.name || "",
    amount: subscription.amount || "",
    billing_cycle: subscription.billing_cycle || "monthly",
    category: subscription.category || "other",
    next_billing_date: subscription.next_billing_date || "",
    is_active: subscription.is_active !== false,
    notes: subscription.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [chargeHistory, setChargeHistory] = useState([]);

  useEffect(() => {
    // Simulate fetching charge history
    const mockHistory = Array.from({ length: 6 }, (_, i) => ({
      month: new Date(
        Date.now() - i * 30 * 24 * 60 * 60 * 1000
      ).toLocaleDateString("en-US", {
        month: "short",
      }),
      amount: subscription.amount || 0,
    })).reverse();
    setChargeHistory(mockHistory);
  }, [subscription]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await dashboardApi.updateSubscription(subscription.id, {
        ...formData,
        amount: parseFloat(formData.amount),
      });
      setIsEditing(false);
      onUpdate();
    } catch (err) {
      console.error("Failed to update subscription:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this subscription?")) {
      return;
    }
    try {
      await dashboardApi.deleteSubscription(subscription.id);
      onUpdate();
    } catch (err) {
      console.error("Failed to delete subscription:", err);
    }
  };

  const handleLogUsage = async () => {
    try {
      await dashboardApi.logUsage(subscription.id);
      // Could show a toast notification here
    } catch (err) {
      console.error("Failed to log usage:", err);
    }
  };

  const handleSyncToCalendar = async () => {
    try {
      const result = await subscriptionsApi.syncToCalendar(subscription.id);
      if (result.success) {
        alert(`Calendar event ${result.action}!`);
      }
    } catch (err) {
      console.error("Failed to sync to calendar:", err);
    }
  };

  const chartData = {
    labels: chargeHistory.map((h) => h.month),
    datasets: [
      {
        data: chargeHistory.map((h) => h.amount),
        borderColor: "#8b5cf6",
        backgroundColor: "rgba(139, 92, 246, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: "#8b5cf6",
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `$${ctx.raw.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, color: "rgba(255,255,255,0.05)" },
        ticks: { color: "#888", font: { size: 10 } },
      },
      y: {
        grid: { color: "rgba(255,255,255,0.05)" },
        ticks: {
          color: "#888",
          font: { size: 10 },
          callback: (value) => `$${value}`,
        },
      },
    },
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  const getStatusBadge = () => {
    if (subscription.is_trial) {
      return <span className="status-badge trial">Trial</span>;
    }
    if (!subscription.is_active) {
      return <span className="status-badge inactive">Inactive</span>;
    }
    if (subscription.is_unused) {
      return <span className="status-badge unused">Unused</span>;
    }
    return <span className="status-badge active">Active</span>;
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-container" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-section">
            <h2>{subscription.name}</h2>
            {getStatusBadge()}
          </div>
          <button className="close-btn" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="drawer-content">
          {/* Summary Section */}
          <div className="drawer-section summary-section">
            <div className="summary-card">
              <span className="summary-label">Amount</span>
              <span className="summary-value">
                {formatAmount(subscription.amount)}
              </span>
              <span className="summary-cycle">
                {subscription.billing_cycle}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Monthly Cost</span>
              <span className="summary-value">
                {formatAmount(
                  subscription.normalized_monthly_amount || subscription.amount
                )}
              </span>
            </div>
            <div className="summary-card">
              <span className="summary-label">Next Charge</span>
              <span className="summary-value">
                {subscription.next_billing_date || "N/A"}
              </span>
            </div>
          </div>

          {/* Cost History Chart */}
          <div className="drawer-section">
            <h3 className="section-title">
              <i className="bi bi-graph-up"></i>
              Cost History
            </h3>
            <div className="chart-container">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* Details Section */}
          <div className="drawer-section">
            <div className="section-header">
              <h3 className="section-title">
                <i className="bi bi-info-circle"></i>
                Details
              </h3>
              {!isEditing && (
                <button className="edit-btn" onClick={() => setIsEditing(true)}>
                  <i className="bi bi-pencil"></i>
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Billing Cycle</label>
                    <select
                      name="billing_cycle"
                      value={formData.billing_cycle}
                      onChange={handleChange}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Next Billing Date</label>
                    <input
                      type="date"
                      name="next_billing_date"
                      value={formData.next_billing_date}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
                <div className="edit-actions">
                  <button
                    className="btn-cancel"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-save"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Category</span>
                  <span className="detail-value">
                    {subscription.category || "Other"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Billing Cycle</span>
                  <span className="detail-value">
                    {subscription.billing_cycle || "Monthly"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Created</span>
                  <span className="detail-value">
                    {subscription.created_at
                      ? new Date(subscription.created_at).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Last Used</span>
                  <span className="detail-value">
                    {subscription.last_used_at || "Never"}
                  </span>
                </div>
                {subscription.notes && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Notes</span>
                    <span className="detail-value">{subscription.notes}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions Section */}
          <div className="drawer-section actions-section">
            <h3 className="section-title">
              <i className="bi bi-lightning"></i>
              Quick Actions
            </h3>
            <div className="action-buttons">
              <button className="action-btn usage" onClick={handleLogUsage}>
                <i className="bi bi-check2-circle"></i>
                Log Usage
              </button>
              <button
                className="action-btn calendar"
                onClick={handleSyncToCalendar}
              >
                <i className="bi bi-calendar-plus"></i>
                {subscription.calendar_event_id
                  ? "Update Calendar"
                  : "Add to Calendar"}
              </button>
              <button className="action-btn delete" onClick={handleDelete}>
                <i className="bi bi-trash"></i>
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDetailDrawer;
