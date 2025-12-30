import "./SubscriptionGrid.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const STATUS_BADGES = {
  active: { label: "Active", class: "active" },
  trial: { label: "Trial", class: "trial" },
  paused: { label: "Paused", class: "paused" },
  cancelled: { label: "Cancelled", class: "cancelled" },
};

export const SubscriptionGrid = ({ subscriptions, onSubscriptionClick }) => {
  if (!subscriptions || subscriptions.length === 0) {
    return (
      <div className="subscription-grid-empty">
        <i className="bi bi-collection"></i>
        <p>No subscriptions found</p>
      </div>
    );
  }

  return (
    <div className="subscription-grid">
      {subscriptions.map((sub) => (
        <div
          key={sub.id}
          className={`subscription-card ${sub.status}`}
          onClick={() => onSubscriptionClick(sub)}
          style={{ "--card-color": sub.color || "#8b5cf6" }}
        >
          <div className="card-header">
            <div className="card-icon" style={{ background: `${sub.color}20` }}>
              {sub.icon ? (
                <i className={`bi ${sub.icon}`} style={{ color: sub.color }}></i>
              ) : (
                <span style={{ color: sub.color }}>
                  {sub.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="card-badges">
              {sub.is_essential && (
                <span className="badge essential">
                  <i className="bi bi-star-fill"></i>
                </span>
              )}
              <span className={`badge status ${STATUS_BADGES[sub.status]?.class}`}>
                {STATUS_BADGES[sub.status]?.label || sub.status}
              </span>
            </div>
          </div>

          <div className="card-content">
            <h4 className="card-title">{sub.name}</h4>
            <div className="card-pricing">
              <span className="price">{formatCurrency(sub.amount)}</span>
              <span className="cycle">/{sub.billing_cycle}</span>
            </div>
            {sub.monthly_cost !== sub.amount && (
              <span className="monthly-equiv">
                {formatCurrency(sub.monthly_cost)}/mo
              </span>
            )}
          </div>

          <div className="card-footer">
            {sub.next_billing_date && sub.status === "active" && (
              <div className="next-billing">
                <i className="bi bi-calendar-event"></i>
                <span>
                  {new Date(sub.next_billing_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
            <div className="card-category">{sub.category}</div>
          </div>

          <div className="card-hover-indicator"></div>
        </div>
      ))}
    </div>
  );
};

export default SubscriptionGrid;

