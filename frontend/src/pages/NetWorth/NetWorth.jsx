import { useState, useEffect, useCallback, useRef } from "react";
import "./NetWorth.css";
import { dashboardApi, snapshotsApi } from "../../api/networthApi";
import { HeroSection } from "../../components/NetWorth/HeroSection";
import { NetWorthTimeline } from "../../components/NetWorth/NetWorthTimeline";
import { AssetLiabilityBreakdown } from "../../components/NetWorth/AssetLiabilityBreakdown";
import { WhatChanged } from "../../components/NetWorth/WhatChanged";
import { CashFlowPanel } from "../../components/NetWorth/CashFlowPanel";
import { MilestonesPanel } from "../../components/NetWorth/MilestonesPanel";
import { AccountsPanel } from "../../components/NetWorth/AccountsPanel";
import { RetirementPanel } from "../../components/NetWorth/RetirementPanel";
import { AddAccountModal } from "../../components/NetWorth/AddAccountModal";
import { UpdateValuesModal } from "../../components/NetWorth/UpdateValuesModal";
import { NetWorthSkeleton } from "./NetWorthSkeleton";
import {
  ErrorState,
  TimeoutState,
  EmptyState,
} from "../../components/shared/LoadingStates";

const REQUEST_TIMEOUT = 15000; // 15 seconds timeout

const NetWorth = () => {
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
      await snapshotsApi.generateNetWorth();
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

  // Loading state - show skeleton
  if (loading && !dashboardData) {
    return <NetWorthSkeleton />;
  }

  // Timeout state
  if (isTimedOut && !dashboardData) {
    return (
      <div className="networth-page">
        <TimeoutState
          title="Request Timed Out"
          message="The server took too long to respond. Please check your connection and try again."
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  // Error state
  if (error && !dashboardData) {
    return (
      <div className="networth-page">
        <ErrorState
          title="Failed to Load Data"
          message={error}
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  const { summary, timeline, forecast, accounts, cash_flow, insights, milestones } =
    dashboardData || {};

  return (
    <div className="networth-page">
      {/* Header Actions */}
      <div className="networth-header">
        <div className="header-title">
          <h1>Net Worth Dashboard</h1>
          <span className="header-subtitle">Your complete financial picture</span>
        </div>
        <div className="header-actions">
          <button
            className="action-btn secondary"
            onClick={() => setIsUpdateValuesOpen(true)}
          >
            <i className="bi bi-pencil-square"></i>
            Update Values
          </button>
          <button
            className="action-btn secondary"
            onClick={() => setIsAddAccountOpen(true)}
          >
            <i className="bi bi-plus-lg"></i>
            Add Account
          </button>
          <button className="action-btn primary" onClick={handleRefresh}>
            <i className="bi bi-arrow-clockwise"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Hero Section - Net Worth Summary */}
      <HeroSection summary={summary} />

      {/* Main Dashboard Grid */}
      <div className="networth-grid">
        {/* Timeline Section */}
        <div className="grid-item timeline-section">
          <NetWorthTimeline
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
          <MilestonesPanel milestones={milestones} onRefresh={fetchDashboardData} />
        </div>
      </div>

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

export default NetWorth;

