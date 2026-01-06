import "./BudgetTracker.css";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// eslint-disable-next-line no-unused-vars
const BudgetCategory = ({ category, budgeted, actual, color }) => {
  const percentage = budgeted > 0 ? (actual / budgeted) * 100 : 0;
  const barColor =
    percentage < 80 ? "#00d4aa" : percentage < 100 ? "#ffc107" : "#dc3545";

  return (
    <div className="budget-category">
      <div className="category-header">
        <span className="category-name">{category}</span>
        <span className="category-amount">
          {formatCurrency(actual)} / {formatCurrency(budgeted)}
        </span>
      </div>
      <div className="category-bar">
        <div
          className="category-fill"
          style={{
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: barColor,
          }}
        ></div>
      </div>
    </div>
  );
};

export const BudgetTracker = ({ activeTrip, budgetAccuracy }) => {
  const categories = activeTrip
    ? [
        {
          name: "Flights",
          budgeted: activeTrip.budget_flights || 0,
          actual: activeTrip.expense_by_category?.flights || 0,
        },
        {
          name: "Accommodation",
          budgeted: activeTrip.budget_accommodation || 0,
          actual: activeTrip.expense_by_category?.accommodation || 0,
        },
        {
          name: "Food",
          budgeted: activeTrip.budget_food || 0,
          actual: activeTrip.expense_by_category?.food || 0,
        },
        {
          name: "Activities",
          budgeted: activeTrip.budget_activities || 0,
          actual: activeTrip.expense_by_category?.activities || 0,
        },
        {
          name: "Transport",
          budgeted: activeTrip.budget_transport || 0,
          actual: activeTrip.expense_by_category?.transport || 0,
        },
        {
          name: "Shopping",
          budgeted: activeTrip.budget_shopping || 0,
          actual: activeTrip.expense_by_category?.shopping || 0,
        },
      ]
    : [];

  return (
    <div className="budget-tracker">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-wallet2"></i>
          Budget Tracker
        </h3>
      </div>

      <div className="panel-content">
        {activeTrip ? (
          <>
            {/* Total Budget Overview */}
            <div className="budget-overview">
              <div className="budget-total-card">
                <div className="budget-amounts">
                  <span className="spent">
                    {formatCurrency(activeTrip.actual_spend || 0)}
                  </span>
                  <span className="of">of</span>
                  <span className="total">
                    {formatCurrency(activeTrip.budget_amount || 0)}
                  </span>
                </div>
                <div className="budget-total-bar">
                  <div
                    className="budget-total-fill"
                    style={{
                      width: `${Math.min(
                        activeTrip.budget_utilization_percentage || 0,
                        100
                      )}%`,
                    }}
                  ></div>
                </div>
                <div className="budget-remaining">
                  <span>
                    {formatCurrency(activeTrip.budget_remaining || 0)} remaining
                  </span>
                  <span
                    className={`percentage ${
                      (activeTrip.budget_utilization_percentage || 0) > 100
                        ? "over"
                        : ""
                    }`}
                  >
                    {Math.round(activeTrip.budget_utilization_percentage || 0)}%
                    used
                  </span>
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            <div className="budget-categories">
              <h4>Category Breakdown</h4>
              {categories.map((cat) => (
                <BudgetCategory
                  key={cat.name}
                  category={cat.name}
                  budgeted={cat.budgeted}
                  actual={cat.actual}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="no-active-trip">
            <div className="accuracy-card">
              <h4>Budget Accuracy</h4>
              <div className="accuracy-value">
                {Math.round(budgetAccuracy?.average_accuracy || 0)}%
              </div>
              <p>Based on past trips</p>
            </div>

            <div className="accuracy-stats">
              <div className="accuracy-stat">
                <span className="stat-value success">
                  {budgetAccuracy?.trips_under_budget || 0}
                </span>
                <span className="stat-label">Under Budget</span>
              </div>
              <div className="accuracy-stat">
                <span className="stat-value warning">
                  {budgetAccuracy?.trips_over_budget || 0}
                </span>
                <span className="stat-label">Over Budget</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetTracker;

