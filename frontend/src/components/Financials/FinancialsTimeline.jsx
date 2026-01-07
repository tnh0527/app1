import { useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import "./FinancialsTimeline.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const formatCurrency = (value) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const FinancialsTimeline = ({
  timeline = [],
  forecast = [],
  showForecast,
  onToggleForecast,
  range,
  onRangeChange,
}) => {
  const chartRef = useRef(null);

  // Prepare chart data
  const labels = [
    ...timeline.map((d) => formatDate(d.date)),
    ...(showForecast ? forecast.map((d) => formatDate(d.date)) : []),
  ];

  const netWorthData = [
    ...timeline.map((d) => d.net_worth),
    ...(showForecast ? forecast.map((d) => d.projected_net_worth) : []),
  ];

  const assetsData = [
    ...timeline.map((d) => d.total_assets),
    ...(showForecast ? Array(forecast.length).fill(null) : []),
  ];

  const liabilitiesData = [
    ...timeline.map((d) => -d.total_liabilities),
    ...(showForecast ? Array(forecast.length).fill(null) : []),
  ];

  // Find where forecast starts
  const forecastStartIndex = timeline.length;

  const data = {
    labels,
    datasets: [
      {
        label: "Net Worth",
        data: netWorthData,
        borderColor: "#208585",
        backgroundColor: (context) => {
          const chart = context.chart;
          const { ctx, chartArea } = chart;
          if (!chartArea) return "rgba(32, 133, 133, 0.1)";

          const gradient = ctx.createLinearGradient(
            0,
            chartArea.top,
            0,
            chartArea.bottom
          );
          gradient.addColorStop(0, "rgba(32, 133, 133, 0.3)");
          gradient.addColorStop(1, "rgba(32, 133, 133, 0)");
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: "#208585",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
        segment: {
          borderDash: (ctx) =>
            ctx.p1DataIndex >= forecastStartIndex - 1 ? [5, 5] : undefined,
        },
      },
      {
        label: "Assets",
        data: assetsData,
        borderColor: "#00fe93",
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        label: "Liabilities",
        data: liabilitiesData,
        borderColor: "#fe1e00",
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index",
    },
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
        displayColors: true,
        callbacks: {
          title: (items) => {
            return items[0]?.label || "";
          },
          label: (item) => {
            const value = item.parsed.y;
            const label = item.dataset.label;
            return `${label}: ${formatCurrency(Math.abs(value))}`;
          },
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
          maxTicksLimit: 8,
        },
        border: {
          display: false,
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
        border: {
          display: false,
        },
      },
    },
  };

  const ranges = [
    { value: "1m", label: "1M" },
    { value: "3m", label: "3M" },
    { value: "6m", label: "6M" },
    { value: "1y", label: "1Y" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="timeline-panel">
      <div className="panel-header">
        <div className="panel-title">
          <i className="bi bi-graph-up"></i>
          <span>Net Worth Over Time</span>
        </div>
        <div className="timeline-controls">
          {/* Range Selector */}
          <div className="range-selector">
            {ranges.map((r) => (
              <button
                key={r.value}
                className={`range-btn ${range === r.value ? "active" : ""}`}
                onClick={() => onRangeChange(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Forecast Toggle */}
          <button
            className={`forecast-toggle ${showForecast ? "active" : ""}`}
            onClick={onToggleForecast}
          >
            <i className="bi bi-graph-up-arrow"></i>
            Forecast
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="timeline-legend">
        <div className="legend-item">
          <span className="legend-dot financials"></span>
          <span>Net Worth</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot assets"></span>
          <span>Assets</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot liabilities"></span>
          <span>Liabilities</span>
        </div>
        {showForecast && (
          <div className="legend-item forecast">
            <span className="legend-line"></span>
            <span>Projected</span>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="timeline-chart">
        {timeline.length > 0 ? (
          <Line ref={chartRef} data={data} options={options} />
        ) : (
          <div className="no-data">
            <i className="bi bi-bar-chart"></i>
            <p>No historical data yet</p>
            <span>Start tracking your net worth to see trends</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FinancialsTimeline;
