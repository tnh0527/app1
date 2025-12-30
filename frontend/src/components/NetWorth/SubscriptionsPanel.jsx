import "./SubscriptionsPanel.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const getCategoryIcon = (category) => {
  const icons = {
    streaming: "bi-play-circle",
    software: "bi-code-square",
    utilities: "bi-lightning",
    insurance: "bi-shield-check",
    membership: "bi-card-heading",
    financial: "bi-bank",
    health: "bi-heart-pulse",
    education: "bi-book",
    other: "bi-box",
  };
  return icons[category] || "bi-box";
};

export const SubscriptionsPanel = ({ subscriptions }) => {
  const {
    total_count = 0,
    monthly_total = 0,
    annual_total = 0,
    upcoming_renewals = [],
    by_category = {},
  } = subscriptions || {};

  // Get top categories by cost
  const sortedCategories = Object.entries(by_category)
    .map(([key, value]) => ({ category: key, ...value }))
    .sort((a, b) => b.monthly_cost - a.monthly_cost)
    .slice(0, 4);

  return (
    <div className="subscriptions-panel">
      <div className="panel-header">
        <div className="panel-title">
          <i className="bi bi-credit-card-2-front"></i>
          <span>Subscriptions</span>
        </div>
        <span className="sub-count">{total_count} active</span>
      </div>

      <div className="subscriptions-content">
        {/* Monthly Total */}
        <div className="sub-summary">
          <div className="summary-item">
            <span className="summary-label">Monthly</span>
            <span className="summary-value">{formatCurrency(monthly_total)}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item">
            <span className="summary-label">Yearly</span>
            <span className="summary-value">{formatCurrency(annual_total)}</span>
          </div>
        </div>

        {/* By Category */}
        <div className="sub-categories">
          <h4 className="section-label">By Category</h4>
          {sortedCategories.length > 0 ? (
            sortedCategories.map((cat, index) => (
              <div key={index} className="category-item">
                <div className="cat-info">
                  <i className={`bi ${getCategoryIcon(cat.category)}`}></i>
                  <span className="cat-name">
                    {cat.category.charAt(0).toUpperCase() + cat.category.slice(1)}
                  </span>
                  <span className="cat-count">{cat.count}</span>
                </div>
                <span className="cat-amount">
                  {formatCurrency(cat.monthly_cost)}/mo
                </span>
              </div>
            ))
          ) : (
            <p className="no-data-text">No subscriptions yet</p>
          )}
        </div>

        {/* Upcoming Renewals */}
        {upcoming_renewals.length > 0 && (
          <div className="sub-upcoming">
            <h4 className="section-label">
              <i className="bi bi-calendar-event"></i>
              Upcoming
            </h4>
            {upcoming_renewals.slice(0, 3).map((renewal, index) => (
              <div key={index} className="renewal-item">
                <div className="renewal-info">
                  <span className="renewal-name">{renewal.name}</span>
                  <span className="renewal-date">
                    {renewal.days_until === 0
                      ? "Today"
                      : renewal.days_until === 1
                      ? "Tomorrow"
                      : `In ${renewal.days_until} days`}
                  </span>
                </div>
                <span className="renewal-amount">{formatCurrency(renewal.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsPanel;

