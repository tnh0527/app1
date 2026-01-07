import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
import { SubscriptionsSkeleton } from "./SubscriptionsSkeleton";
import BlurOverlay from "../../components/shared/BlurOverlay";
import {
  ErrorState,
  TimeoutState,
} from "../../components/shared/LoadingStates";
import { useAutoRetry } from "../../utils/connectionHooks";

const REQUEST_TIMEOUT = 15000; // 15 seconds timeout

const Subscriptions = () => {
  const { filter: urlFilter } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Valid filters - using useMemo to prevent recreation
  const validFilters = useMemo(
    () => ["all", "active", "cancelled", "upcoming", "expired", "unused"],
    []
  );
  const currentFilter = validFilters.includes(urlFilter) ? urlFilter : "all";

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const timeoutRef = useRef(null);
  const isNavigatingRef = useRef(false);

  const fetchDashboardData = useCallback(async () => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);
    setError(null);
    setIsTimedOut(false);

    // Set up timeout
    timeoutRef.current = setTimeout(() => {
      setIsTimedOut(true);
      setLoading(false);
    }, REQUEST_TIMEOUT);

    try {
      const data = await dashboardApi.getFullDashboard();
      clearTimeout(timeoutRef.current);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      clearTimeout(timeoutRef.current);
      console.error("Failed to fetch subscription data:", err);
      setError("Failed to load subscription data. Please try again.");
    } finally {
      clearTimeout(timeoutRef.current);
      setLoading(false);
    }
  }, []);

  // Auto-retry data fetch when connection is restored
  useAutoRetry(fetchDashboardData, [], {
    enabled: !loading && (error || isTimedOut),
  });

  useEffect(() => {
    fetchDashboardData();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fetchDashboardData]);

  // Sync URL with filter - redirect to /subscriptions/all if no filter or invalid filter
  useEffect(() => {
    if (!urlFilter || !validFilters.includes(urlFilter)) {
      navigate("/subscriptions/all", { replace: true });
    }
  }, [urlFilter, navigate, validFilters]);

  // Sync selected subscription with URL query param
  useEffect(() => {
    const subId = searchParams.get("id");
    if (subId && dashboardData?.subscriptions) {
      const sub = dashboardData.subscriptions.find(
        (s) => s.id === parseInt(subId)
      );
      if (sub && sub !== selectedSubscription) {
        setSelectedSubscription(sub);
      } else if (!sub) {
        // Invalid subscription ID, clear it
        navigate(`/subscriptions/${currentFilter}`, { replace: true });
      }
    } else if (!subId && selectedSubscription) {
      setSelectedSubscription(null);
    }
  }, [
    searchParams,
    dashboardData,
    selectedSubscription,
    navigate,
    currentFilter,
  ]);

  const handleRefresh = async () => {
    await fetchDashboardData();
  };

  const handleSubscriptionClick = (subscription) => {
    const params = new URLSearchParams(searchParams);
    params.set("id", subscription.id);
    navigate(`/subscriptions/${currentFilter}?${params.toString()}`, {
      replace: true,
    });
  };

  const handleCloseDrawer = () => {
    navigate(`/subscriptions/${currentFilter}`, { replace: true });
  };

  const handleFilterChange = (newFilter) => {
    isNavigatingRef.current = true;
    navigate(`/subscriptions/${newFilter}`);
  };

  const handleSubscriptionAdded = () => {
    setIsAddModalOpen(false);
    fetchDashboardData();
  };

  const handleSubscriptionUpdated = () => {
    setSelectedSubscription(null);
    fetchDashboardData();
  };

  // Loading state - show skeleton
  if (loading && !dashboardData) {
    return (
      <div className="subscriptions-page">
        <BlurOverlay
          isActive={true}
          message="Subscriptions features coming soon!"
        >
          <SubscriptionsSkeleton />
        </BlurOverlay>
      </div>
    );
  }

  // Timeout state
  if (isTimedOut && !dashboardData) {
    return (
      <div className="subscriptions-page">
        <BlurOverlay
          isActive={true}
          message="Subscriptions features coming soon!"
        >
          <TimeoutState
            title="Request Timed Out"
            message="The server took too long to respond. Please check your connection and try again."
            onRetry={fetchDashboardData}
          />
        </BlurOverlay>
      </div>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div className="subscriptions-page">
        <BlurOverlay
          isActive={true}
          message="Subscriptions features coming soon!"
        >
          <ErrorState
            title="Failed to Load Subscriptions"
            message={error}
            onRetry={fetchDashboardData}
          />
        </BlurOverlay>
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

  // Filter subscriptions based on current filter
  const filteredSubscriptions = subscriptions.filter((sub) => {
    if (currentFilter === "all") return true;
    if (currentFilter === "active") return sub.status === "active";
    if (currentFilter === "trial") return sub.status === "trial";
    if (currentFilter === "paused") return sub.status === "paused";
    if (currentFilter === "cancelled") return sub.status === "cancelled";
    return sub.category === currentFilter;
  });

  return (
    <div className="subscriptions-page">
      <BlurOverlay
        isActive={true}
        message="Subscriptions features coming soon!"
      >
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
                    className={`filter-tab ${
                      currentFilter === tab.key ? "active" : ""
                    }`}
                    onClick={() => handleFilterChange(tab.key)}
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
      </BlurOverlay>

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
