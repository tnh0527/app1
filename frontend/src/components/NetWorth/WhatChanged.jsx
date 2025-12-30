import "./WhatChanged.css";

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getChangeIcon = (type) => {
  const icons = {
    account_added: "bi-plus-circle",
    account_removed: "bi-dash-circle",
    value_increase: "bi-graph-up",
    value_decrease: "bi-graph-down",
    milestone_achieved: "bi-trophy",
    debt_paid_off: "bi-check-circle",
    net_worth_increase: "bi-arrow-up-right",
    net_worth_decrease: "bi-arrow-down-right",
  };
  return icons[type] || "bi-info-circle";
};

const formatTimeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

export const WhatChanged = ({ insights }) => {
  const recentChanges = insights?.recent_changes || [];
  const monthlyInsights = insights?.monthly_insights || {};

  return (
    <div className="changes-panel">
      <div className="panel-header">
        <div className="panel-title">
          <i className="bi bi-lightning-charge"></i>
          <span>What Changed</span>
        </div>
        <span className="panel-subtitle">Since last month</span>
      </div>

      <div className="changes-content">
        {/* Monthly Summary */}
        {monthlyInsights.summary && (
          <div className="monthly-summary">
            <p className="summary-text">{monthlyInsights.summary}</p>
          </div>
        )}

        {/* Highlights */}
        {monthlyInsights.highlights?.length > 0 && (
          <div className="highlights-section">
            {monthlyInsights.highlights.map((highlight, index) => (
              <div key={index} className="highlight-item positive">
                <i className="bi bi-check-circle-fill"></i>
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Alerts */}
        {monthlyInsights.alerts?.length > 0 && (
          <div className="alerts-section">
            {monthlyInsights.alerts.map((alert, index) => (
              <div key={index} className="highlight-item alert">
                <i className="bi bi-exclamation-triangle-fill"></i>
                <span>{alert}</span>
              </div>
            ))}
          </div>
        )}

        {/* Recent Changes List */}
        <div className="changes-list">
          {recentChanges.length > 0 ? (
            recentChanges.slice(0, 8).map((change, index) => (
              <div
                key={change.id || index}
                className={`change-item ${change.is_positive ? "positive" : "negative"}`}
              >
                <div className={`change-icon ${change.is_positive ? "positive" : "negative"}`}>
                  <i className={`bi ${getChangeIcon(change.type)}`}></i>
                </div>
                <div className="change-details">
                  <p className="change-description">{change.description}</p>
                  <span className="change-time">{formatTimeAgo(change.created_at)}</span>
                </div>
                {change.amount_change !== null && (
                  <div className={`change-amount ${change.is_positive ? "positive" : "negative"}`}>
                    <span>
                      {change.is_positive ? "+" : "-"}
                      {formatCurrency(Math.abs(change.amount_change))}
                    </span>
                    {change.percentage_change !== null && (
                      <span className="change-percent">
                        {change.percentage_change >= 0 ? "+" : ""}
                        {change.percentage_change.toFixed(1)}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="no-changes">
              <i className="bi bi-journal-check"></i>
              <p>No recent changes</p>
              <span>Update your accounts to see changes here</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatChanged;

