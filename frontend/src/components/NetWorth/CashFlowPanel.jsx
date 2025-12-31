import "./CashFlowPanel.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const CashFlowPanel = ({ cashFlow }) => {
  const {
    period = "",
    income = 0,
    expenses = 0,
    net_flow = 0,
    savings_rate = 0,
    expense_breakdown = [],
  } = cashFlow || {};

  const isPositiveFlow = net_flow >= 0;

  const safeIncome = Math.max(income, 0);
  const safeExpenses = Math.max(expenses, 0);
  const barMax = Math.max(safeIncome, safeExpenses, 1);
  const incomePct = Math.min(100, Math.round((safeIncome / barMax) * 100));
  const expensePct = safeIncome
    ? Math.min(100, Math.round((safeExpenses / safeIncome) * 100))
    : Math.min(100, Math.round((safeExpenses / barMax) * 100));

  const scaleStops = Array.from({ length: 5 }, (_, i) =>
    Math.round((barMax / 4) * i)
  );

  // Top expense categories
  const topExpenses = [...expense_breakdown]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  return (
    <div className="cashflow-panel">
      <div className="panel-header cf-header">
        <div className="panel-title">
          <div className="cf-icon">
            <i className="bi bi-arrow-left-right"></i>
          </div>
          <div className="cf-title-wrap">
            <span>Cash Flow</span>
            <small>Monthly snapshot</small>
          </div>
        </div>
        <span className="cf-period">{period || "—"}</span>
      </div>

      <div className="cashflow-content">
        <div
          className={`net-flow-card ${
            isPositiveFlow ? "positive" : "negative"
          }`}
        >
          <div className="nf-main">
            <span className="nf-label">Net Monthly Flow</span>
            <span className="nf-value">
              {isPositiveFlow ? "+" : ""}
              {formatCurrency(net_flow)}
            </span>
            <span className="nf-sub">Income {formatCurrency(income)}</span>
          </div>
          <div className="nf-badge">
            <div className="nf-icon-wrap">
              <i
                className={`bi ${
                  isPositiveFlow ? "bi-arrow-up-right" : "bi-arrow-down-right"
                }`}
              ></i>
            </div>
            <div className="nf-savings">
              <span>Savings Rate</span>
              <span className={isPositiveFlow ? "positive" : "negative"}>
                {savings_rate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="flow-card">
          <div className="flow-top">
            <span className="flow-label">Income</span>
            <div className="flow-legend">
              <span className="legend-dot income"></span>
              <span>Income {formatCurrency(income)}</span>
              <span className="legend-dot expense"></span>
              <span>Expenses {formatCurrency(expenses)}</span>
            </div>
          </div>

          <div className="flow-track" aria-label="Income vs expenses">
            <div className="flow-income" style={{ width: `${incomePct}%` }}>
              <div
                className="flow-expense"
                style={{ width: `${expensePct}%` }}
              ></div>
            </div>
          </div>

          <div className="flow-scale">
            {scaleStops.map((stop, idx) => (
              <span key={idx}>{formatCurrency(stop)}</span>
            ))}
          </div>
        </div>

        {topExpenses.length > 0 && (
          <div className="cf-breakdown">
            <div className="breakdown-head">
              <h4 className="section-label">Top Expenses</h4>
              <span className="expense-total">{formatCurrency(expenses)}</span>
            </div>
            <div className="expenses-list">
              {topExpenses.map((item, index) => (
                <div key={index} className="expense-item">
                  <div className="expense-left">
                    <span className="expense-dot"></span>
                    <span className="expense-category">
                      {item.category
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </span>
                  </div>
                  <span className="expense-amount">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CashFlowPanel;
