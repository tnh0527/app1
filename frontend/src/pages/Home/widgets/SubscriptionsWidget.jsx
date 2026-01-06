import { useState, useEffect, useRef } from "react";
import { Icon } from "@iconify/react";
import { iconsImgs } from "../../../utils/images";
import BlurOverlay from "../../../components/shared/BlurOverlay";
import "./SubscriptionsWidget.css";

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

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const SubscriptionsWidget = ({ data, onNavigate }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const summary = data?.summary || {};
  const upcomingCharges = data?.upcoming_charges?.slice(0, 3) || [];
  const animatedMonthly = useCountUp(
    summary.monthly_spend || 0,
    1500,
    mounted && !!data
  );

  const getCategoryIcon = (category) => {
    const icons = {
      streaming: "bi-play-circle",
      music: "bi-music-note-beamed",
      gaming: "bi-controller",
      productivity: "bi-briefcase",
      cloud: "bi-cloud",
      fitness: "bi-heart-pulse",
      news: "bi-newspaper",
      education: "bi-book",
      finance: "bi-graph-up",
      social: "bi-people",
      utilities: "bi-gear",
      other: "bi-box",
    };
    return icons[category] || "bi-box";
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffDays = Math.ceil((date - today) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays <= 7) return `In ${diffDays} days`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="home-widget subscriptions-widget">
      <BlurOverlay
        isActive={true}
        message="Subscriptions features coming soon!"
      >
        <div className="widget-header">
          <div className="widget-title-section">
            <div className="widget-icon subscriptions">
              <Icon icon={iconsImgs.bills} />
            </div>
            <div>
              <h3 className="widget-title">Subscriptions</h3>
              <p className="widget-subtitle">Monthly overview</p>
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
            <div className="subs-grid-layout">
              {/* Main Card - Monthly Spend */}
              <div className="subs-main-card">
                <div className="subs-main-header">
                  <i className="bi bi-currency-dollar"></i>
                  <span>Monthly Spend</span>
                </div>
                <div className="subs-main-value">
                  {formatCurrency(animatedMonthly)}
                </div>
                <div className="subs-per-period">/month</div>
              </div>

              {/* Stats Grid */}
              <div className="subs-stats-grid">
                <div className="subs-stat-card active">
                  <span className="subs-stat-number">
                    {summary.active_count || 0}
                  </span>
                  <span className="subs-stat-label">Active</span>
                </div>
                <div className="subs-stat-card trial">
                  <span className="subs-stat-number">
                    {summary.trial_count || 0}
                  </span>
                  <span className="subs-stat-label">Trial</span>
                </div>
                <div className="subs-stat-card unused">
                  <span className="subs-stat-number">
                    {summary.unused_count || 0}
                  </span>
                  <span className="subs-stat-label">Unused</span>
                </div>
              </div>

              {/* Upcoming Charges Card */}
              <div className="subs-upcoming-card">
                <div className="subs-upcoming-header">
                  <i className="bi bi-calendar-event"></i>
                  <span>Upcoming</span>
                </div>
                {upcomingCharges.length > 0 ? (
                  <div className="subs-charges-list">
                    {upcomingCharges.map((charge, index) => (
                      <div key={index} className="subs-charge-item">
                        <div className="charge-icon">
                          <i
                            className={`bi ${getCategoryIcon(charge.category)}`}
                          ></i>
                        </div>
                        <div className="charge-info">
                          <span className="charge-name">{charge.name}</span>
                          <span className="charge-date">
                            {formatDate(charge.next_billing_date)}
                          </span>
                        </div>
                        <span className="charge-amount">
                          {formatCurrency(charge.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="no-upcoming">
                    <i className="bi bi-check-circle"></i>
                    <span>No charges this week</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </BlurOverlay>
    </div>
  );
};
