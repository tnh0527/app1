import { useState, useEffect, useRef } from "react";
import "./RetirementPanel.css";

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

const getRetirementIcon = (subtype) => {
  const icons = {
    "401k": "bi-briefcase-fill",
    ira: "bi-pie-chart",
    roth_ira: "bi-pie-chart-fill",
    hsa: "bi-heart-pulse-fill",
    default: "bi-piggy-bank-fill",
  };
  return icons[subtype] || icons.default;
};

const getRetirementLabel = (subtype) => {
  const labels = {
    "401k": "401(k)",
    ira: "Traditional IRA",
    roth_ira: "Roth IRA",
    hsa: "HSA",
    default: "Retirement",
  };
  return labels[subtype] || labels.default;
};

const getRetirementGradient = (subtype) => {
  const gradients = {
    "401k": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    ira: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    roth_ira: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    hsa: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    default: "linear-gradient(135deg, #208585 0%, #1a7a7a 100%)",
  };
  return gradients[subtype] || gradients.default;
};

const RetirementAccountCard = ({ account }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="retirement-account-card"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        "--card-gradient": getRetirementGradient(account.subtype),
      }}
    >
      <div className="retirement-card-glow"></div>
      <div className="retirement-card-content">
        <div className="retirement-card-header">
          <div className="retirement-icon-wrapper">
            <i className={`bi ${getRetirementIcon(account.subtype)}`}></i>
          </div>
          <div className="retirement-card-info">
            <span className="retirement-card-name">{account.name}</span>
            <span className="retirement-card-type">
              {getRetirementLabel(account.subtype)}
            </span>
          </div>
        </div>
        <div className="retirement-card-value">
          {formatCurrency(account.value)}
        </div>
        {account.institution && (
          <div className="retirement-card-institution">
            <i className="bi bi-building"></i>
            {account.institution}
          </div>
        )}
        <div className="retirement-card-footer">
          <span className="retirement-updated">
            Updated {new Date(account.last_updated).toLocaleDateString()}
          </span>
          {account.contribution_limit && (
            <span className="retirement-contribution">
              Limit: {formatCurrency(account.contribution_limit, true)}
            </span>
          )}
        </div>
      </div>
      <div className={`retirement-card-shine ${isHovered ? "active" : ""}`}></div>
    </div>
  );
};

export const RetirementPanel = ({ accounts }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Filter retirement accounts
  const retirementAccounts =
    accounts?.investment?.filter((acc) =>
      ["401k", "ira", "roth_ira", "hsa"].includes(acc.subtype)
    ) || [];

  // Calculate totals by type
  const totalsByType = retirementAccounts.reduce((acc, account) => {
    acc[account.subtype] = (acc[account.subtype] || 0) + account.value;
    return acc;
  }, {});

  const totalRetirement = retirementAccounts.reduce(
    (sum, acc) => sum + acc.value,
    0
  );

  const animatedTotal = useCountUp(totalRetirement, 1500, mounted);

  // 2024 Contribution limits
  const contributionLimits = {
    "401k": 23000,
    ira: 7000,
    roth_ira: 7000,
    hsa: 4150,
  };

  // Calculate projected growth (7% annual return)
  const projectedGrowth = totalRetirement * 0.07;

  return (
    <div className="retirement-panel">
      <div className="retirement-header">
        <div className="retirement-title">
          <div className="title-icon">
            <i className="bi bi-piggy-bank-fill"></i>
          </div>
          <div className="title-text">
            <h3>Retirement Portfolio</h3>
            <span className="title-subtitle">Tax-Advantaged Accounts</span>
          </div>
        </div>
        <div className="retirement-total">
          <span className="total-label">Total Balance</span>
          <span className="total-value">{formatCurrency(animatedTotal)}</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="retirement-stats-grid">
        {Object.entries(totalsByType).map(([type, value]) => (
          <div
            key={type}
            className="retirement-stat-card"
            style={{ "--stat-gradient": getRetirementGradient(type) }}
          >
            <div className="stat-icon">
              <i className={`bi ${getRetirementIcon(type)}`}></i>
            </div>
            <div className="stat-info">
              <span className="stat-type">{getRetirementLabel(type)}</span>
              <span className="stat-value">{formatCurrency(value, true)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Accounts Grid */}
      {retirementAccounts.length > 0 ? (
        <div className="retirement-accounts-grid">
          {retirementAccounts.map((account) => (
            <RetirementAccountCard key={account.id} account={account} />
          ))}
        </div>
      ) : (
        <div className="retirement-empty">
          <div className="empty-icon">
            <i className="bi bi-piggy-bank"></i>
          </div>
          <h4>No Retirement Accounts</h4>
          <p>
            Add your 401(k), IRA, Roth IRA, or HSA accounts to track your
            retirement progress.
          </p>
          <button className="add-retirement-btn">
            <i className="bi bi-plus-lg"></i>
            Add Retirement Account
          </button>
        </div>
      )}

      {/* Projected Growth */}
      {totalRetirement > 0 && (
        <div className="retirement-projection">
          <div className="projection-header">
            <i className="bi bi-graph-up-arrow"></i>
            <span>Projected Annual Growth (7%)</span>
          </div>
          <div className="projection-value">
            +{formatCurrency(projectedGrowth)}
          </div>
          <div className="projection-bar">
            <div
              className="projection-fill"
              style={{
                width: `${Math.min(100, (projectedGrowth / totalRetirement) * 100)}%`,
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetirementPanel;

