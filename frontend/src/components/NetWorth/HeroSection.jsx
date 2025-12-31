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
  const totalBase =
    (summary?.total_assets || 0) + (summary?.total_liabilities || 0);
  const assetsShare = totalBase
    ? Math.min(100, Math.max(0, (summary.total_assets / totalBase) * 100))
    : 0;
  const liabilitiesShare = totalBase
    ? Math.min(100, Math.max(0, (summary.total_liabilities / totalBase) * 100))
    : 0;

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
      <div className="hero-main-card">
        <div className="hero-grid"></div>
        <div className="hero-orb"></div>
        <div className="hero-content">
          <div className="hero-top">
            <div className="chip">Total Net Worth</div>
            <span className="meta">Updated monthly</span>
          </div>

          <div className="hero-value">
            <span className="currency-sign">$</span>
            <span className="value-number">
              {Math.floor(animatedNetWorth).toLocaleString()}
            </span>
            <span className="value-decimal">
              .
              {String(Math.floor((animatedNetWorth % 1) * 100)).padStart(
                2,
                "0"
              )}
            </span>
          </div>

          <div className="hero-meta-row">
            <div className={`trend-pill ${getTrendClass()}`}>
              <i className={`bi ${getTrendIcon()}`}></i>
              <span>
                {changeAmount >= 0 ? "+" : ""}
                {formatCurrency(changeAmount)}
              </span>
              <span className="pill-muted">
                ({changePercentage >= 0 ? "+" : ""}
                {changePercentage.toFixed(1)}%)
              </span>
            </div>
            <span className="muted">vs last month</span>
          </div>
        </div>
      </div>

      <div className="hero-side">
        <div className="summary-duo">
          <div className="summary-card assets">
            <div className="summary-head">
              <div className="summary-icon">
                <i className="bi bi-graph-up-arrow"></i>
              </div>
              <div className="summary-labels">
                <span className="summary-label">Total Assets</span>
                <span className="summary-sub">Growth fuel</span>
              </div>
            </div>
            <div className="summary-value positive">
              {formatCurrency(animatedAssets)}
            </div>
            <div className="progress">
              <div
                className="progress-bar assets"
                style={{ width: `${assetsShare}%` }}
              />
            </div>
            <div className="progress-meta">
              <span>{assetsShare.toFixed(0)}% of holdings</span>
              <span className="muted">vs liabilities</span>
            </div>
          </div>

          <div className="summary-card liabilities">
            <div className="summary-head">
              <div className="summary-icon">
                <i className="bi bi-credit-card-2-back"></i>
              </div>
              <div className="summary-labels">
                <span className="summary-label">Total Liabilities</span>
                <span className="summary-sub">Obligations</span>
              </div>
            </div>
            <div className="summary-value negative">
              {formatCurrency(animatedLiabilities)}
            </div>
            <div className="progress">
              <div
                className="progress-bar liabilities"
                style={{ width: `${liabilitiesShare}%` }}
              />
            </div>
            <div className="progress-meta">
              <span>{liabilitiesShare.toFixed(0)}% of holdings</span>
              <span className="muted">lower is better</span>
            </div>
          </div>
        </div>

        <div className="stat-grid">
          {["Cash", "Investments", "Debt"].map((label) => {
            const valueMap = {
              Cash: summary?.cash_total || 0,
              Investments: summary?.investment_total || 0,
              Debt: summary?.debt_total || 0,
            };
            const tone = label === "Debt" ? "negative" : "positive";
            return (
              <div key={label} className={`stat-chip ${tone}`}>
                <span className="chip-label">{label}</span>
                <span className="chip-value">
                  {formatCurrency(valueMap[label], true)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
