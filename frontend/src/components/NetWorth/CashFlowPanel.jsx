import { useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import "./CashFlowPanel.css";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const CashFlowPanel = ({ cashFlow }) => {
  const chartRef = useRef(null);
  
  const {
    period = "",
    income = 0,
    expenses = 0,
    net_flow = 0,
    savings_rate = 0,
    expense_breakdown = [],
  } = cashFlow || {};

  const isPositiveFlow = net_flow >= 0;

  // Bar chart for income vs expenses
  const barData = {
    labels: ["Income", "Expenses"],
    datasets: [
      {
        data: [income, expenses],
        backgroundColor: ["rgba(0, 254, 147, 0.6)", "rgba(254, 30, 0, 0.6)"],
        borderColor: ["#00fe93", "#fe1e00"],
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 40,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(3, 22, 34, 0.95)",
        titleColor: "#fff",
        bodyColor: "#a8a5a6",
        borderColor: "rgba(32, 133, 133, 0.3)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => formatCurrency(context.parsed.x),
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#a8a5a6",
          font: { size: 10 },
          callback: (value) =>
            value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value}`,
        },
        border: { display: false },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: "#a8a5a6",
          font: { size: 11 },
        },
        border: { display: false },
      },
    },
  };

  // Top expense categories
  const topExpenses = [...expense_breakdown]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  return (
    <div className="cashflow-panel">
      <div className="panel-header">
        <div className="panel-title">
          <i className="bi bi-arrow-left-right"></i>
          <span>Cash Flow</span>
        </div>
        <span className="cf-period">{period}</span>
      </div>

      <div className="cashflow-content">
        {/* Net Flow Highlight */}
        <div className={`net-flow-card ${isPositiveFlow ? "positive" : "negative"}`}>
          <div className="nf-header">
            <span className="nf-label">Net Monthly Flow</span>
            <i className={`bi ${isPositiveFlow ? "bi-arrow-up-right" : "bi-arrow-down-right"}`}></i>
          </div>
          <span className="nf-value">
            {isPositiveFlow ? "+" : ""}
            {formatCurrency(net_flow)}
          </span>
          <div className="nf-savings">
            <span>Savings Rate:</span>
            <span className={isPositiveFlow ? "positive" : "negative"}>
              {savings_rate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Income vs Expenses Bar */}
        <div className="cf-chart">
          <Bar ref={chartRef} data={barData} options={barOptions} />
        </div>

        {/* Top Expenses */}
        {topExpenses.length > 0 && (
          <div className="cf-breakdown">
            <h4 className="section-label">Top Expenses</h4>
            {topExpenses.map((item, index) => (
              <div key={index} className="expense-item">
                <span className="expense-category">
                  {item.category
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <span className="expense-amount">{formatCurrency(item.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CashFlowPanel;

