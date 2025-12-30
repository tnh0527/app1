import { useState, useEffect, useRef } from "react";
import "./SubscriptionHero.css";

/**
 * Animated count-up effect for numbers
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

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const SubscriptionHero = ({ summary }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const animatedMonthly = useCountUp(summary?.monthly_spend || 0, 1500, mounted);
  const animatedAnnual = useCountUp(summary?.annual_burn || 0, 1500, mounted);

  const changeAmount = summary?.change_amount || 0;
  const changePercentage = summary?.change_percentage || 0;
  const trend = summary?.trend || "flat";

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
    // For subscriptions, "up" (spending more) is negative
    switch (trend) {
      case "up":
        return "negative";
      case "down":
        return "positive";
      default:
        return "neutral";
    }
  };

  return (
    <div className="subscription-hero">
      {/* Monthly Spend Card */}
      <div className="hero-card monthly-card">
        <div className="hero-glow"></div>
        <div className="hero-content">
          <div className="hero-icon">
            <i className="bi bi-calendar-month"></i>
          </div>
          <div className="hero-info">
            <span className="hero-label">Monthly Spend</span>
            <span className="hero-value">
              {formatCurrency(animatedMonthly)}
            </span>
            <div className={`hero-change ${getTrendClass()}`}>
              <i className={`bi ${getTrendIcon()}`}></i>
              <span>
                {changeAmount >= 0 ? "+" : ""}
                {formatCurrency(changeAmount)} ({changePercentage >= 0 ? "+" : ""}
                {changePercentage.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Annual Burn Card */}
      <div className="hero-card annual-card">
        <div className="hero-content">
          <div className="hero-icon">
            <i className="bi bi-graph-up"></i>
          </div>
          <div className="hero-info">
            <span className="hero-label">Annual Burn Rate</span>
            <span className="hero-value">{formatCurrency(animatedAnnual)}</span>
            <span className="hero-subtext">
              Total yearly subscription cost
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="hero-card stats-card">
        <div className="stat-item">
          <span className="stat-value">{summary?.active_count || 0}</span>
          <span className="stat-label">Active</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-value trial">{summary?.trial_count || 0}</span>
          <span className="stat-label">Trial</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-value paused">{summary?.paused_count || 0}</span>
          <span className="stat-label">Paused</span>
        </div>
        <div className="stat-divider"></div>
        <div className="stat-item">
          <span className="stat-value warning">{summary?.unused_count || 0}</span>
          <span className="stat-label">Unused</span>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionHero;

