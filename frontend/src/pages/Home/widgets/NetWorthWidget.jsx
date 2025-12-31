import { useState, useEffect, useRef } from "react";
import "./NetWorthWidget.css";

/**
 * Animated count-up hook
 */
const useCountUp = (targetValue, duration = 1500, enabled = true) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef(null);
  const animationFrame = useRef(null);

  useEffect(() => {
    if (!enabled || targetValue === 0) {
      setDisplayValue(targetValue);
      return;
    }

    const animate = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(targetValue * easeOut);

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      }
    };

    startTime.current = null;
    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [targetValue, duration, enabled]);

  return displayValue;
};

const formatCurrency = (value, compact = false) => {
  if (compact && Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (compact && Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const NetWorthWidget = ({ data, onNavigate }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const summary = data?.summary || {};
  const animatedNetWorth = useCountUp(
    summary.net_worth || 0,
    1500,
    mounted && !!data
  );

  const changeAmount = summary.change_amount || 0;
  const changePercentage = summary.change_percentage || 0;
  const trend = summary.trend || "neutral";

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return "bi-arrow-up-right";
      case "down":
        return "bi-arrow-down-right";
      default:
        return "bi-dash";
    }
  };

  const getTrendClass = () => {
    switch (trend) {
      case "up":
        return "positive";
      case "down":
        return "negative";
      default:
        return "neutral";
    }
  };

  // Calculate assets/liabilities ratio for mini bar
  const totalAssets = summary.total_assets || 0;
  const totalLiabilities = summary.total_liabilities || 0;
  const total = totalAssets + totalLiabilities;
  const assetsPercent = total > 0 ? (totalAssets / total) * 100 : 50;

  return (
    <div className="home-widget networth-widget">
      <div className="widget-header">
        <div className="widget-title-section">
          <div className="widget-icon networth">
            <i className="bi bi-wallet2"></i>
          </div>
          <div>
            <h3 className="widget-title">Financials</h3>
            <p className="widget-subtitle">Overview</p>
          </div>
        </div>
        <div className="widget-arrow" onClick={onNavigate}>
          <i className="bi bi-chevron-right"></i>
        </div>
      </div>

      <div className="widget-content">
        {!data ? (
          <div className="widget-loading"></div>
        ) : (
          <div className="networth-grid-layout">
            {/* Main Value Card */}
            <div className="nw-main-card">
              <div className="nw-value-display">
                <span className="nw-currency">$</span>
                <span className="nw-amount">
                  {Math.floor(animatedNetWorth).toLocaleString()}
                </span>
              </div>
              <div className={`nw-change ${getTrendClass()}`}>
                <i className={`bi ${getTrendIcon()}`}></i>
                <span>
                  {changeAmount >= 0 ? "+" : ""}
                  {formatCurrency(changeAmount, true)}
                </span>
                <span className="nw-change-percent">
                  ({changePercentage >= 0 ? "+" : ""}
                  {changePercentage.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Stats Cards Grid */}
            <div className="nw-stats-grid">
              {/* Assets Card */}
              <div className="nw-stat-card assets">
                <div className="nw-stat-icon">
                  <i className="bi bi-graph-up-arrow"></i>
                </div>
                <div className="nw-stat-info">
                  <span className="nw-stat-value">
                    {formatCurrency(totalAssets, true)}
                  </span>
                  <span className="nw-stat-label">Assets</span>
                </div>
              </div>

              {/* Liabilities Card */}
              <div className="nw-stat-card liabilities">
                <div className="nw-stat-icon">
                  <i className="bi bi-graph-down-arrow"></i>
                </div>
                <div className="nw-stat-info">
                  <span className="nw-stat-value">
                    {formatCurrency(totalLiabilities, true)}
                  </span>
                  <span className="nw-stat-label">Liabilities</span>
                </div>
              </div>

              {/* Accounts Card */}
              <div className="nw-stat-card accounts">
                <div className="nw-stat-icon">
                  <i className="bi bi-bank"></i>
                </div>
                <div className="nw-stat-info">
                  <span className="nw-stat-value">
                    {data?.accounts?.length || 0}
                  </span>
                  <span className="nw-stat-label">Accounts</span>
                </div>
              </div>

              {/* Last Updated Card */}
              <div className="nw-stat-card updated">
                <div className="nw-stat-icon">
                  <i className="bi bi-clock-history"></i>
                </div>
                <div className="nw-stat-info">
                  <span className="nw-stat-value">
                    {summary.last_snapshot_date
                      ? new Date(summary.last_snapshot_date).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" }
                        )
                      : "N/A"}
                  </span>
                  <span className="nw-stat-label">Updated</span>
                </div>
              </div>
            </div>

            {/* Assets vs Liabilities Bar */}
            <div className="nw-ratio-card">
              <div className="nw-bar-container">
                <div
                  className="nw-bar-fill assets"
                  style={{ width: `${assetsPercent}%` }}
                ></div>
                <div
                  className="nw-bar-fill liabilities"
                  style={{ width: `${100 - assetsPercent}%` }}
                ></div>
              </div>
              <div className="nw-bar-labels">
                <div className="nw-bar-label">
                  <span className="nw-dot assets"></span>
                  <span>Assets {assetsPercent.toFixed(0)}%</span>
                </div>
                <div className="nw-bar-label">
                  <span className="nw-dot liabilities"></span>
                  <span>Liabilities {(100 - assetsPercent).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
