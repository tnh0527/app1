import "./UpcomingPanel.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const UpcomingPanel = ({ charges }) => {
  const totalUpcoming = charges.reduce(
    (sum, charge) => sum + parseFloat(charge.amount),
    0
  );

  return (
    <div className="upcoming-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-calendar-check"></i>
          Upcoming Charges
        </h3>
        <span className="upcoming-total">{formatCurrency(totalUpcoming)}</span>
      </div>
      <div className="upcoming-list">
        {charges.length === 0 ? (
          <div className="no-upcoming">
            <i className="bi bi-check-circle"></i>
            <p>No charges in the next 30 days</p>
          </div>
        ) : (
          charges.map((charge, index) => (
            <div key={index} className="upcoming-item">
              <div className="upcoming-date">
                <span className="date-day">
                  {new Date(charge.next_billing_date).getDate()}
                </span>
                <span className="date-month">
                  {new Date(charge.next_billing_date).toLocaleDateString(
                    "en-US",
                    { month: "short" }
                  )}
                </span>
              </div>
              <div className="upcoming-info">
                <span className="upcoming-name">{charge.name}</span>
                <span className="upcoming-cycle">{charge.billing_cycle}</span>
              </div>
              <div className="upcoming-amount">
                <span className="amount">{formatCurrency(charge.amount)}</span>
                <span className="days-until">
                  {charge.days_until === 0
                    ? "Today"
                    : charge.days_until === 1
                    ? "Tomorrow"
                    : `${charge.days_until} days`}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UpcomingPanel;

