import { useMemo } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import "./CategoryBreakdown.css";

ChartJS.register(ArcElement, Tooltip, Legend);

const CATEGORY_COLORS = {
  streaming: "#e11d48",
  software: "#8b5cf6",
  utilities: "#06b6d4",
  insurance: "#10b981",
  membership: "#f59e0b",
  financial: "#3b82f6",
  health: "#ec4899",
  education: "#6366f1",
  cloud: "#14b8a6",
  news: "#f97316",
  gaming: "#a855f7",
  food: "#84cc16",
  productivity: "#0ea5e9",
  security: "#64748b",
  other: "#94a3b8",
};

const CATEGORY_LABELS = {
  streaming: "Streaming",
  software: "Software",
  utilities: "Utilities",
  insurance: "Insurance",
  membership: "Memberships",
  financial: "Financial",
  health: "Health & Fitness",
  education: "Education",
  cloud: "Cloud Services",
  news: "News & Media",
  gaming: "Gaming",
  food: "Food & Delivery",
  productivity: "Productivity",
  security: "Security",
  other: "Other",
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const CategoryBreakdown = ({ breakdown }) => {
  const chartData = useMemo(() => {
    const categories = Object.entries(breakdown || {}).filter(
      // eslint-disable-next-line no-unused-vars
      ([_key, value]) => value > 0
    );

    if (categories.length === 0) {
      return null;
    }

    const sortedCategories = categories.sort((a, b) => b[1] - a[1]);

    return {
      labels: sortedCategories.map(
        ([cat]) => CATEGORY_LABELS[cat] || cat
      ),
      datasets: [
        {
          // eslint-disable-next-line no-unused-vars
          data: sortedCategories.map(([_, value]) => value),
          backgroundColor: sortedCategories.map(
            ([cat]) => CATEGORY_COLORS[cat] || "#94a3b8"
          ),
          borderColor: "transparent",
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    };
  }, [breakdown]);

  const total = useMemo(() => {
    return Object.values(breakdown || {}).reduce((sum, val) => sum + val, 0);
  }, [breakdown]);

  const topCategories = useMemo(() => {
    return Object.entries(breakdown || {})
      // eslint-disable-next-line no-unused-vars
      .filter(([_key, value]) => value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [breakdown]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "70%",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(3, 22, 34, 0.95)",
        titleColor: "#fff",
        bodyColor: "#a8a5a6",
        borderColor: "rgba(139, 92, 246, 0.3)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) =>
            `${formatCurrency(context.raw)}/mo (${(
              (context.raw / total) *
              100
            ).toFixed(1)}%)`,
        },
      },
    },
  };

  return (
    <div className="category-breakdown">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-pie-chart"></i>
          By Category
        </h3>
      </div>
      <div className="breakdown-content">
        {chartData ? (
          <>
            <div className="chart-wrapper">
              <Doughnut data={chartData} options={options} />
              <div className="chart-center">
                <span className="center-label">Total</span>
                <span className="center-value">{formatCurrency(total)}</span>
                <span className="center-subtext">/month</span>
              </div>
            </div>
            <div className="category-list">
              {topCategories.map(([category, value]) => (
                <div key={category} className="category-item">
                  <div className="category-info">
                    <span
                      className="category-dot"
                      style={{
                        background: CATEGORY_COLORS[category] || "#94a3b8",
                      }}
                    ></span>
                    <span className="category-name">
                      {CATEGORY_LABELS[category] || category}
                    </span>
                  </div>
                  <div className="category-value">
                    <span className="value">{formatCurrency(value)}</span>
                    <span className="percentage">
                      {((value / total) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="no-data">
            <i className="bi bi-pie-chart"></i>
            <p>No category data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryBreakdown;

