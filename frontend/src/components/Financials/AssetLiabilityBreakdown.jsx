import { useRef } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import "./AssetLiabilityBreakdown.css";

ChartJS.register(ArcElement, Tooltip, Legend);

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// eslint-disable-next-line no-unused-vars
export const AssetLiabilityBreakdown = ({ summary, accounts }) => {
  const chartRef = useRef(null);

  // Calculate breakdown percentages
  const totalAssets = summary?.total_assets || 0;
  const totalLiabilities = summary?.total_liabilities || 0;
  const total = totalAssets + totalLiabilities;

  const assetsPercent = total > 0 ? (totalAssets / total) * 100 : 0;
  const liabilitiesPercent = total > 0 ? (totalLiabilities / total) * 100 : 0;

  // Asset breakdown data
  const assetBreakdown = [
    {
      label: "Cash",
      value: summary?.cash_total || 0,
      color: "#0ea5e9",
    },
    {
      label: "Investments",
      value: summary?.investment_total || 0,
      color: "#8b5cf6",
    },
    {
      label: "Assets",
      value: summary?.asset_total || 0,
      color: "#14b8a6",
    },
  ].filter((item) => item.value > 0);

  const liabilityBreakdown = [
    {
      label: "Debt",
      value: summary?.debt_total || 0,
      color: "#ef4444",
    },
  ].filter((item) => item.value > 0);

  // Doughnut chart data
  const doughnutData = {
    labels: [...assetBreakdown.map((a) => a.label), ...liabilityBreakdown.map((l) => l.label)],
    datasets: [
      {
        data: [...assetBreakdown.map((a) => a.value), ...liabilityBreakdown.map((l) => l.value)],
        backgroundColor: [
          ...assetBreakdown.map((a) => a.color),
          ...liabilityBreakdown.map((l) => l.color),
        ],
        borderWidth: 0,
        hoverOffset: 8,
      },
    ],
  };

  const doughnutOptions = {
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
        borderColor: "rgba(32, 133, 133, 0.3)",
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const percent = ((value / total) * 100).toFixed(1);
            return `${formatCurrency(value)} (${percent}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="breakdown-panel">
      <div className="panel-header">
        <div className="panel-title">
          <i className="bi bi-pie-chart"></i>
          <span>Asset Breakdown</span>
        </div>
      </div>

      <div className="breakdown-content">
        {/* Doughnut Chart */}
        <div className="chart-container">
          <div className="doughnut-wrapper">
            <Doughnut ref={chartRef} data={doughnutData} options={doughnutOptions} />
            <div className="chart-center">
              <span className="center-label">Total</span>
              <span className="center-value">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Assets Section */}
        <div className="breakdown-section">
          <div className="section-header">
            <span className="section-title">
              <i className="bi bi-arrow-up-circle-fill positive"></i>
              Assets
            </span>
            <span className="section-value positive">
              {formatCurrency(totalAssets)}
            </span>
          </div>
          <div className="section-items">
            {assetBreakdown.map((item, index) => (
              <div key={index} className="breakdown-item">
                <div className="item-info">
                  <span
                    className="item-dot"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="item-label">{item.label}</span>
                </div>
                <div className="item-values">
                  <span className="item-amount">{formatCurrency(item.value)}</span>
                  <span className="item-percent">
                    {((item.value / total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Liabilities Section */}
        <div className="breakdown-section">
          <div className="section-header">
            <span className="section-title">
              <i className="bi bi-arrow-down-circle-fill negative"></i>
              Liabilities
            </span>
            <span className="section-value negative">
              {formatCurrency(totalLiabilities)}
            </span>
          </div>
          <div className="section-items">
            {liabilityBreakdown.map((item, index) => (
              <div key={index} className="breakdown-item">
                <div className="item-info">
                  <span
                    className="item-dot"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  <span className="item-label">{item.label}</span>
                </div>
                <div className="item-values">
                  <span className="item-amount">{formatCurrency(item.value)}</span>
                  <span className="item-percent">
                    {((item.value / total) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ratio Bar */}
        <div className="ratio-bar-container">
          <div className="ratio-labels">
            <span>{assetsPercent.toFixed(0)}% Assets</span>
            <span>{liabilitiesPercent.toFixed(0)}% Debt</span>
          </div>
          <div className="ratio-bar">
            <div
              className="ratio-fill assets"
              style={{ width: `${assetsPercent}%` }}
            ></div>
            <div
              className="ratio-fill liabilities"
              style={{ width: `${liabilitiesPercent}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetLiabilityBreakdown;

