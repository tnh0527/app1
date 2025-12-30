import { subscriptionsApi } from "../../api/subscriptionsApi";
import "./UnusedPanel.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const UnusedPanel = ({ subscriptions, onRefresh }) => {
  const totalSavings = subscriptions.reduce(
    (sum, sub) => sum + (sub.annual_savings || 0),
    0
  );

  const handleRecordUsage = async (id) => {
    try {
      await subscriptionsApi.recordUsage(id);
      onRefresh();
    } catch (error) {
      console.error("Failed to record usage:", error);
    }
  };

  const handleCancel = async (id) => {
    if (window.confirm("Are you sure you want to cancel this subscription?")) {
      try {
        await subscriptionsApi.cancel(id);
        onRefresh();
      } catch (error) {
        console.error("Failed to cancel subscription:", error);
      }
    }
  };

  return (
    <div className="unused-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-hourglass-split"></i>
          Unused Subscriptions
        </h3>
        <div className="potential-savings">
          <span className="savings-label">Potential Savings</span>
          <span className="savings-value">{formatCurrency(totalSavings)}/yr</span>
        </div>
      </div>
      <div className="unused-list">
        {subscriptions.map((sub) => (
          <div key={sub.id} className="unused-item">
            <div className="unused-info">
              <span className="unused-name">{sub.name}</span>
              <span className="unused-cost">
                {formatCurrency(sub.monthly_cost)}/mo
              </span>
            </div>
            <div className="unused-meta">
              <span className="unused-days">
                {sub.days_unused
                  ? `${sub.days_unused} days unused`
                  : "No usage recorded"}
              </span>
              <span className="unused-category">{sub.category}</span>
            </div>
            <div className="unused-actions">
              <button
                className="action-btn used"
                onClick={() => handleRecordUsage(sub.id)}
                title="I use this"
              >
                <i className="bi bi-check-lg"></i>
              </button>
              <button
                className="action-btn cancel"
                onClick={() => handleCancel(sub.id)}
                title="Cancel"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UnusedPanel;

