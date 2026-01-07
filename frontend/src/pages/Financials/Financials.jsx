import { useState, useEffect, useCallback, useRef } from "react";
import "./Financials.css";
import { dashboardApi, snapshotsApi } from "../../api/financialsApi";
import { HeroSection } from "../../components/Financials/HeroSection";
import { FinancialsTimeline } from "../../components/Financials/FinancialsTimeline";
import { AssetLiabilityBreakdown } from "../../components/Financials/AssetLiabilityBreakdown";
import { WhatChanged } from "../../components/Financials/WhatChanged";
import { CashFlowPanel } from "../../components/Financials/CashFlowPanel";
import { MilestonesPanel } from "../../components/Financials/MilestonesPanel";
import { AccountsPanel } from "../../components/Financials/AccountsPanel";
import { RetirementPanel } from "../../components/Financials/RetirementPanel";
import { AddAccountModal } from "../../components/Financials/AddAccountModal";
import { UpdateValuesModal } from "../../components/Financials/UpdateValuesModal";
import { FinancialsSkeleton } from "./FinancialsSkeleton";
import BlurOverlay from "../../components/shared/BlurOverlay";
import {
  ErrorState,
  TimeoutState,
} from "../../components/shared/LoadingStates";
import { useAutoRetry } from "../../utils/connectionHooks";

const REQUEST_TIMEOUT = 15000; // 15 seconds timeout

const Financials = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [timelineRange, setTimelineRange] = useState("1y");
  const [showForecast, setShowForecast] = useState(true);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isUpdateValuesOpen, setIsUpdateValuesOpen] = useState(false);
  const timeoutRef = useRef(null);

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
      const data = await dashboardApi.getFullDashboard(timelineRange);
      clearTimeout(timeoutRef.current);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      clearTimeout(timeoutRef.current);
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      clearTimeout(timeoutRef.current);
      setLoading(false);
    }
  }, [timelineRange]);

  // Auto-retry data fetch when connection is restored
  useAutoRetry(fetchDashboardData, [timelineRange], {
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

  const handleRefresh = async () => {
    try {
      await snapshotsApi.generateFinancials();
      await fetchDashboardData();
    } catch (err) {
      console.error("Failed to refresh data:", err);
    }
  };

  const handleAccountAdded = () => {
    setIsAddAccountOpen(false);
    fetchDashboardData();
  };

  const handleValuesUpdated = () => {
    setIsUpdateValuesOpen(false);
    fetchDashboardData();
  };

  // Loading state - show skeleton with blur
  if (loading && !dashboardData) {
    return (
      <div className="financials-page">
        <BlurOverlay isActive={true} message="Financials features coming soon!">
          <FinancialsSkeleton />
        </BlurOverlay>
      </div>
    );
  }

  // Timeout state
  if (isTimedOut && !dashboardData) {
    return (
      <div className="financials-page">
        <BlurOverlay isActive={true} message="Financials features coming soon!">
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
      <div className="financials-page">
        <BlurOverlay isActive={true} message="Financials features coming soon!">
          <ErrorState
            title="Failed to Load Data"
            message={error}
            onRetry={fetchDashboardData}
          />
        </BlurOverlay>
      </div>
    );
  }

  const {
    summary,
    timeline,
    forecast,
    accounts,
    cash_flow,
    insights,
    milestones,
  } = dashboardData || {};

  return (
    <div className="financials-page">
      <BlurOverlay isActive={true} message="Financials features coming soon!">
        {/* Header Section */}
        <div className="financials-top-section">
          <div className="financials-header">
            <div className="header-content">
              <div className="header-title-group">
                <h1>Financials Dashboard</h1>
                <span className="header-subtitle">
                  Your complete financial picture
                </span>
              </div>
              <div className="header-actions">
                <button
                  className="action-btn secondary"
                  onClick={() => setIsUpdateValuesOpen(true)}
                  title="Update account values"
                >
                  <i className="bi bi-pencil-square"></i>
                  <span>Update Values</span>
                </button>
                <button
                  className="action-btn secondary"
                  onClick={() => setIsAddAccountOpen(true)}
                  title="Add new account"
                >
                  <i className="bi bi-plus-lg"></i>
                  <span>Add Account</span>
                </button>
                <button
                  className="action-btn primary"
                  onClick={handleRefresh}
                  title="Refresh data"
                >
                  <i className="bi bi-arrow-clockwise"></i>
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Hero Section - Net Worth Summary */}
          <HeroSection summary={summary} />
        </div>

        {/* Main Dashboard Grid */}
        <div className="financials-grid">
          {/* Timeline Section */}
          <div className="grid-item timeline-section">
            <FinancialsTimeline
              timeline={timeline}
              forecast={forecast}
              showForecast={showForecast}
              onToggleForecast={() => setShowForecast(!showForecast)}
              range={timelineRange}
              onRangeChange={setTimelineRange}
            />
          </div>

          {/* Asset/Liability Breakdown */}
          <div className="grid-item breakdown-section">
            <AssetLiabilityBreakdown summary={summary} accounts={accounts} />
          </div>

          {/* Retirement Accounts */}
          <div className="grid-item retirement-section">
            <RetirementPanel accounts={accounts} />
          </div>

          {/* What Changed Panel */}
          <div className="grid-item changes-section">
            <WhatChanged insights={insights} />
          </div>

          {/* Accounts Detail */}
          <div className="grid-item accounts-section">
            <AccountsPanel accounts={accounts} onRefresh={fetchDashboardData} />
          </div>

          {/* Cash Flow */}
          <div className="grid-item cashflow-section">
            <CashFlowPanel cashFlow={cash_flow} />
          </div>

          {/* Milestones */}
          <div className="grid-item milestones-section">
            <MilestonesPanel
              milestones={milestones}
              onRefresh={fetchDashboardData}
            />
          </div>
        </div>
      </BlurOverlay>

      {/* Modals */}
      {isAddAccountOpen && (
        <AddAccountModal
          onClose={() => setIsAddAccountOpen(false)}
          onSuccess={handleAccountAdded}
        />
      )}
      {isUpdateValuesOpen && (
        <UpdateValuesModal
          accounts={accounts}
          onClose={() => setIsUpdateValuesOpen(false)}
          onSuccess={handleValuesUpdated}
        />
      )}
    </div>
  );
};

export default Financials;
