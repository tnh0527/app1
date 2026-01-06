import { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "./SpendingChart.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// eslint-disable-next-line no-unused-vars
export const SpendingChart = ({ history, summary }) => {
  const chartData = useMemo(() => {
    if (!history || history.length === 0) {
      return null;
    }

    const labels = history.map((h) => {
      const date = new Date(h.month);
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    });

    return {
      labels,
      datasets: [
        {
          label: "Monthly Spend",
          data: history.map((h) => h.spend),
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139, 92, 246, 0.1)",
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: "#8b5cf6",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [history]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
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
        displayColors: false,
        callbacks: {
          label: (context) => formatCurrency(context.raw),
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#a8a5a6",
          font: {
            size: 11,
          },
        },
      },
      y: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#a8a5a6",
          font: {
            size: 11,
          },
          callback: (value) => formatCurrency(value),
        },
      },
    },
  };

  return (
    <div className="spending-chart">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-graph-up"></i>
          Spending Trend
        </h3>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: "#8b5cf6" }}></span>
            Monthly Spend
          </span>
        </div>
      </div>
      <div className="chart-container">
        {chartData ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="no-data">
            <i className="bi bi-bar-chart"></i>
            <p>No spending history available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpendingChart;

