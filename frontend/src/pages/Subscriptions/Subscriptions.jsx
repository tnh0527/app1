import { useState, useEffect, useCallback } from "react";
import "./Subscriptions.css";
import { dashboardApi } from "../../api/subscriptionsApi";
import {
  SubscriptionHero,
  SpendingChart,
  CategoryBreakdown,
  SubscriptionGrid,
  AlertsPanel,
  UnusedPanel,
  UpcomingPanel,
  AddSubscriptionModal,
  SubscriptionDetailDrawer,
} from "../../components/Subscriptions";

const Subscriptions = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [filter, setFilter] = useState("all");

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getFullDashboard();
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch subscription data:", err);
      setError("Failed to load subscription data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    await fetchDashboardData();
  };

  const handleSubscriptionClick = (subscription) => {
    setSelectedSubscription(subscription);
  };

  const handleCloseDrawer = () => {
    setSelectedSubscription(null);
  };

  const handleSubscriptionAdded = () => {
    setIsAddModalOpen(false);
    fetchDashboardData();
  };

  const handleSubscriptionUpdated = () => {
    setSelectedSubscription(null);
    fetchDashboardData();
  };

  if (loading && !dashboardData) {
    return (
      <div className="subscriptions-page">
        <div className="subscriptions-loading">
          <div className="loading-spinner"></div>
          <p>Loading your subscriptions...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="subscriptions-page">
        <div className="subscriptions-error">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const {
    summary = {},
    subscriptions = [],
    upcoming_charges = [],
    unused_subscriptions = [],
    spending_history = [],
    active_alerts = [],
  } = dashboardData || {};

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (filter === "all") return true;
    if (filter === "active") return sub.status === "active";
    if (filter === "trial") return sub.status === "trial";
    if (filter === "paused") return sub.status === "paused";
    if (filter === "cancelled") return sub.status === "cancelled";
    return sub.category === filter;
  });

  return (
    <div className="subscriptions-page">
      {/* Header */}
      <div className="subscriptions-header">
        <div className="header-title">
          <h1>Subscriptions</h1>
          <span className="header-subtitle">
            Manage your recurring payments
          </span>
        </div>
        <div className="header-actions">
          <button
            className="action-btn secondary"
            onClick={() => setIsAddModalOpen(true)}
          >
            <i className="bi bi-plus-lg"></i>
            Add Subscription
          </button>
          <button className="action-btn primary" onClick={handleRefresh}>
            <i className="bi bi-arrow-clockwise"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Hero Section - Summary Cards */}
      <SubscriptionHero summary={summary} />

      {/* Main Grid */}
      <div className="subscriptions-grid">
        {/* Spending Chart */}
        <div className="grid-item spending-section">
          <SpendingChart history={spending_history} summary={summary} />
        </div>

        {/* Category Breakdown */}
        <div className="grid-item category-section">
          <CategoryBreakdown breakdown={summary.category_breakdown || {}} />
        </div>

        {/* Alerts Panel */}
        {active_alerts.length > 0 && (
          <div className="grid-item alerts-section">
            <AlertsPanel alerts={active_alerts} onRefresh={handleRefresh} />
          </div>
        )}

        {/* Unused Subscriptions */}
        {unused_subscriptions.length > 0 && (
          <div className="grid-item unused-section">
            <UnusedPanel
              subscriptions={unused_subscriptions}
              onRefresh={handleRefresh}
            />
          </div>
        )}

        {/* Upcoming Charges */}
        <div className="grid-item upcoming-section">
          <UpcomingPanel charges={upcoming_charges} />
        </div>

        {/* Subscription Grid */}
        <div className="grid-item subscriptions-list-section">
          <div className="panel-header">
            <h3 className="panel-title">
              <i className="bi bi-collection"></i>
              All Subscriptions
            </h3>
            <div className="filter-tabs">
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "trial", label: "Trial" },
                { key: "paused", label: "Paused" },
                { key: "cancelled", label: "Cancelled" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`filter-tab ${filter === tab.key ? "active" : ""}`}
                  onClick={() => setFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <SubscriptionGrid
            subscriptions={filteredSubscriptions}
            onSubscriptionClick={handleSubscriptionClick}
          />
        </div>
      </div>

      {/* Modals */}
      {isAddModalOpen && (
        <AddSubscriptionModal
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleSubscriptionAdded}
        />
      )}

      {/* Detail Drawer */}
      {selectedSubscription && (
        <SubscriptionDetailDrawer
          subscription={selectedSubscription}
          onClose={handleCloseDrawer}
          onUpdate={handleSubscriptionUpdated}
        />
      )}
    </div>
  );
};

export default Subscriptions;

