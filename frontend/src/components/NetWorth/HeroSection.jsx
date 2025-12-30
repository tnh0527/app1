import { useState, useEffect, useRef } from "react";
import "./HeroSection.css";

/**
 * Animated count-up effect for numbers
 */
const useCountUp = (targetValue, duration = 2000, enabled = true) => {
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

      // Ease out cubic
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

/**
 * Format currency with proper formatting
 */
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

export const HeroSection = ({ summary }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const animatedNetWorth = useCountUp(summary?.net_worth || 0, 2000, mounted);
  const animatedAssets = useCountUp(summary?.total_assets || 0, 2000, mounted);
  const animatedLiabilities = useCountUp(
    summary?.total_liabilities || 0,
    2000,
    mounted
  );

  const changeAmount = summary?.change_amount || 0;
  const changePercentage = summary?.change_percentage || 0;
  const trend = summary?.trend || "neutral";

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

  return (
    <div className="hero-section">
      {/* Main Net Worth Card */}
      <div className="hero-main-card">
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="hero-label">
            <i className="bi bi-bank2"></i>
            <span>Total Net Worth</span>
          </div>
          <div className="hero-value">
            <span className="currency-sign">$</span>
            <span className="value-number">
              {Math.floor(animatedNetWorth).toLocaleString()}
            </span>
            <span className="value-decimal">
              .{String(Math.floor((animatedNetWorth % 1) * 100)).padStart(2, "0")}
            </span>
          </div>
          <div className={`hero-change ${getTrendClass()}`}>
            <i className={`bi ${getTrendIcon()}`}></i>
            <span className="change-amount">
              {changeAmount >= 0 ? "+" : ""}
              {formatCurrency(changeAmount)}
            </span>
            <span className="change-percentage">
              ({changePercentage >= 0 ? "+" : ""}
              {changePercentage.toFixed(1)}%)
            </span>
            <span className="change-period">vs last month</span>
          </div>
        </div>
        <div className="hero-decoration">
          <svg viewBox="0 0 200 200" className="hero-pattern">
            <defs>
              <linearGradient id="heroGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(32, 133, 133, 0.3)" />
                <stop offset="100%" stopColor="rgba(32, 133, 133, 0)" />
              </linearGradient>
            </defs>
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="url(#heroGradient)"
              strokeWidth="2"
            />
            <circle
              cx="100"
              cy="100"
              r="60"
              fill="none"
              stroke="url(#heroGradient)"
              strokeWidth="1"
            />
          </svg>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="hero-summary-cards">
        {/* Assets Card */}
        <div className="summary-card assets">
          <div className="summary-icon">
            <i className="bi bi-graph-up-arrow"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Assets</span>
            <span className="summary-value positive">
              {formatCurrency(animatedAssets)}
            </span>
          </div>
          <div className="summary-bar">
            <div
              className="bar-fill assets"
              style={{
                width: `${
                  summary?.total_assets && summary?.net_worth
                    ? Math.min(
                        100,
                        (summary.total_assets /
                          (summary.total_assets + summary.total_liabilities)) *
                          100
                      )
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Liabilities Card */}
        <div className="summary-card liabilities">
          <div className="summary-icon">
            <i className="bi bi-credit-card-2-back"></i>
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Liabilities</span>
            <span className="summary-value negative">
              {formatCurrency(animatedLiabilities)}
            </span>
          </div>
          <div className="summary-bar">
            <div
              className="bar-fill liabilities"
              style={{
                width: `${
                  summary?.total_liabilities && summary?.net_worth
                    ? Math.min(
                        100,
                        (summary.total_liabilities /
                          (summary.total_assets + summary.total_liabilities)) *
                          100
                      )
                    : 0
                }%`,
              }}
            ></div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="summary-card stats">
          <div className="stat-item">
            <span className="stat-label">Cash</span>
            <span className="stat-value">
              {formatCurrency(summary?.cash_total || 0, true)}
            </span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-label">Investments</span>
            <span className="stat-value">
              {formatCurrency(summary?.investment_total || 0, true)}
            </span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-label">Debt</span>
            <span className="stat-value debt">
              {formatCurrency(summary?.debt_total || 0, true)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;

