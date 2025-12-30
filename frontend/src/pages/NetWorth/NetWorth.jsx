import { useState, useEffect, useCallback } from "react";
import "./NetWorth.css";
import { dashboardApi, snapshotsApi } from "../../api/networthApi";
import { HeroSection } from "../../components/NetWorth/HeroSection";
import { NetWorthTimeline } from "../../components/NetWorth/NetWorthTimeline";
import { AssetLiabilityBreakdown } from "../../components/NetWorth/AssetLiabilityBreakdown";
import { WhatChanged } from "../../components/NetWorth/WhatChanged";
import { SubscriptionsPanel } from "../../components/NetWorth/SubscriptionsPanel";
import { CashFlowPanel } from "../../components/NetWorth/CashFlowPanel";
import { MilestonesPanel } from "../../components/NetWorth/MilestonesPanel";
import { AccountsPanel } from "../../components/NetWorth/AccountsPanel";
import { AddAccountModal } from "../../components/NetWorth/AddAccountModal";
import { UpdateValuesModal } from "../../components/NetWorth/UpdateValuesModal";

const NetWorth = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timelineRange, setTimelineRange] = useState("1y");
  const [showForecast, setShowForecast] = useState(true);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [isUpdateValuesOpen, setIsUpdateValuesOpen] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getFullDashboard(timelineRange);
      setDashboardData(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [timelineRange]);

  useEffect(() => {
    fetchDashboardData();
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

  if (loading && !dashboardData) {
    return (
      <div className="networth-page">
        <div className="networth-loading">
          <div className="loading-spinner"></div>
          <p>Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="networth-page">
        <div className="networth-error">
          <i className="bi bi-exclamation-triangle"></i>
          <p>{error}</p>
          <button onClick={fetchDashboardData} className="retry-btn">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { summary, timeline, forecast, accounts, cash_flow, subscriptions, insights, milestones } =
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

        {/* Subscriptions */}
        <div className="grid-item subscriptions-section">
          <SubscriptionsPanel subscriptions={subscriptions} />
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

