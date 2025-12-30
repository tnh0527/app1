import { useState, useEffect, useCallback, useRef } from "react";
import "./Travel.css";
import { dashboardApi, tripsApi, goalsApi } from "../../api/travelApi";
import { TravelHero } from "../../components/Travel/TravelHero";
import { TripTimeline } from "../../components/Travel/TripTimeline";
import { UpcomingTrips } from "../../components/Travel/UpcomingTrips";
import { BudgetTracker } from "../../components/Travel/BudgetTracker";
import { TravelStats } from "../../components/Travel/TravelStats";
import { BucketList } from "../../components/Travel/BucketList";
import { QuickTools } from "../../components/Travel/QuickTools";
import { TripModal } from "../../components/Travel/TripModal";
import { AddTripModal } from "../../components/Travel/AddTripModal";
import { TravelSkeleton } from "./TravelSkeleton";
import {
  ErrorState,
  TimeoutState,
  EmptyState,
} from "../../components/shared/LoadingStates";

const REQUEST_TIMEOUT = 15000; // 15 seconds timeout

const Travel = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [trips, setTrips] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [isAddTripOpen, setIsAddTripOpen] = useState(false);
  const [viewMode, setViewMode] = useState("timeline"); // timeline | pipeline
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
      const [dashboard, tripsData, goalsData] = await Promise.all([
        dashboardApi.getDashboard(),
        tripsApi.getAll(),
        goalsApi.getAll(),
      ]);
      clearTimeout(timeoutRef.current);
      setDashboardData(dashboard);
      setTrips(tripsData);
      setGoals(goalsData);
      setError(null);
    } catch (err) {
      clearTimeout(timeoutRef.current);
      console.error("Failed to fetch travel data:", err);
      setError("Failed to load travel data. Please try again.");
    } finally {
      clearTimeout(timeoutRef.current);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fetchDashboardData]);

  const handleTripCreated = () => {
    setIsAddTripOpen(false);
    fetchDashboardData();
  };

  const handleTripUpdated = () => {
    setSelectedTrip(null);
    fetchDashboardData();
  };

  // Loading state - show skeleton
  if (loading && !dashboardData) {
    return <TravelSkeleton />;
  }

  // Timeout state
  if (isTimedOut && !dashboardData) {
    return (
      <div className="travel-page">
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
      <div className="travel-page">
        <ErrorState
          title="Failed to Load Travel Data"
          message={error}
          onRetry={fetchDashboardData}
        />
      </div>
    );
  }

  const { summary, active_trip, next_trip, goal_stats, budget_accuracy } =
    dashboardData || {};

  return (
    <div className="travel-page">
      {/* Header Actions */}
      <div className="travel-header">
        <div className="header-title">
          <h1>Travel Dashboard</h1>
          <span className="header-subtitle">
            Plan your adventures, track your journeys
          </span>
        </div>
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === "timeline" ? "active" : ""}`}
              onClick={() => setViewMode("timeline")}
            >
              <i className="bi bi-calendar3"></i>
              Timeline
            </button>
            <button
              className={`toggle-btn ${viewMode === "pipeline" ? "active" : ""}`}
              onClick={() => setViewMode("pipeline")}
            >
              <i className="bi bi-kanban"></i>
              Pipeline
            </button>
          </div>
          <button
            className="action-btn primary"
            onClick={() => setIsAddTripOpen(true)}
          >
            <i className="bi bi-plus-lg"></i>
            Plan New Trip
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <TravelHero
        summary={summary}
        activeTrip={active_trip}
        nextTrip={next_trip}
        onViewTrip={setSelectedTrip}
      />

      {/* Main Dashboard Grid */}
      <div className="travel-grid">
        {/* Trip Timeline */}
        <div className="grid-item timeline-section">
          <TripTimeline
            trips={trips}
            viewMode={viewMode}
            onSelectTrip={setSelectedTrip}
          />
        </div>

        {/* Upcoming Trips */}
        <div className="grid-item upcoming-section">
          <UpcomingTrips
            trips={trips.filter(
              (t) =>
                t.status !== "completed" &&
                t.status !== "cancelled" &&
                !t.is_archived
            )}
            onSelectTrip={setSelectedTrip}
          />
        </div>

        {/* Budget Tracker */}
        <div className="grid-item budget-section">
          <BudgetTracker
            activeTrip={active_trip}
            budgetAccuracy={budget_accuracy}
          />
        </div>

        {/* Quick Tools */}
        <div className="grid-item tools-section">
          <QuickTools />
        </div>

        {/* Travel Stats */}
        <div className="grid-item stats-section">
          <TravelStats summary={summary} />
        </div>

        {/* Bucket List */}
        <div className="grid-item bucketlist-section">
          <BucketList
            goals={goals}
            goalStats={goal_stats}
            onRefresh={fetchDashboardData}
          />
        </div>
      </div>

      {/* Modals */}
      {selectedTrip && (
        <TripModal
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
          onUpdate={handleTripUpdated}
        />
      )}

      {isAddTripOpen && (
        <AddTripModal
          onClose={() => setIsAddTripOpen(false)}
          onSuccess={handleTripCreated}
        />
      )}
    </div>
  );
};

export default Travel;

