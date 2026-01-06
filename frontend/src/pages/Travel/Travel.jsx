import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import BlurOverlay from "../../components/shared/BlurOverlay";
import {
  ErrorState,
  TimeoutState,
} from "../../components/shared/LoadingStates";

const REQUEST_TIMEOUT = 15000; // 15 seconds timeout

const Travel = () => {
  const { tab: urlTab, tripId: urlTripId } = useParams();
  const navigate = useNavigate();

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

  // Refs to prevent infinite loops
  const isInitialMount = useRef(true);
  const isNavigatingRef = useRef(false);

  // Valid tabs - using useMemo to prevent recreation
  const validTabs = useMemo(() => ["overview", "trips", "budget", "goals"], []);
  // eslint-disable-next-line no-unused-vars
  const _currentTab = validTabs.includes(urlTab) ? urlTab : "overview";

  // Initialize from URL on mount
  useEffect(() => {
    if (!validTabs.includes(urlTab)) {
      isNavigatingRef.current = true;
      navigate("/travel/overview", { replace: true });
    }
    isInitialMount.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync from URL when browser back/forward
  useEffect(() => {
    if (isInitialMount.current) return;
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }
    // URL changed via browser navigation - state will update via currentTab calculation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

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

  // Sync URL with tab - redirect to /travel/overview if no tab or invalid tab
  useEffect(() => {
    if (!urlTab || !validTabs.includes(urlTab)) {
      navigate("/travel/overview", { replace: true });
    }
  }, [urlTab, navigate, validTabs]);

  // Sync selected trip with URL tripId
  useEffect(() => {
    if (urlTripId && trips.length > 0) {
      const trip = trips.find((t) => t.id === parseInt(urlTripId));
      if (trip && trip !== selectedTrip) {
        setSelectedTrip(trip);
      } else if (!trip) {
        // Invalid tripId, navigate back to trips tab
        navigate("/travel/trips", { replace: true });
      }
    } else if (!urlTripId && selectedTrip) {
      setSelectedTrip(null);
    }
  }, [urlTripId, trips, selectedTrip, navigate]);

  const handleTripCreated = () => {
    setIsAddTripOpen(false);
    fetchDashboardData();
  };

  const handleTripUpdated = () => {
    setSelectedTrip(null);
    navigate("/travel/trips", { replace: true });
    fetchDashboardData();
  };

  const handleTripClick = (trip) => {
    isNavigatingRef.current = true;
    navigate(`/travel/trips/${trip.id}`);
  };

  // eslint-disable-next-line no-unused-vars
  const _handleTabChange = (tab) => {
    isNavigatingRef.current = true;
    navigate(`/travel/${tab}`);
  };

  // Loading state - show skeleton
  if (loading && !dashboardData) {
    return (
      <div className="travel-page">
        <BlurOverlay isActive={true} message="Travel features coming soon!">
          <TravelSkeleton />
        </BlurOverlay>
      </div>
    );
  }

  // Timeout state
  if (isTimedOut && !dashboardData) {
    return (
      <div className="travel-page">
        <BlurOverlay isActive={true} message="Travel features coming soon!">
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
      <div className="travel-page">
        <BlurOverlay isActive={true} message="Travel features coming soon!">
          <ErrorState
            title="Failed to Load Travel Data"
            message={error}
            onRetry={fetchDashboardData}
          />
        </BlurOverlay>
      </div>
    );
  }

  const { summary, active_trip, next_trip, goal_stats, budget_accuracy } =
    dashboardData || {};

  return (
    <div className="travel-page">
      <BlurOverlay isActive={true} message="Travel features coming soon!">
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
                className={`toggle-btn ${
                  viewMode === "timeline" ? "active" : ""
                }`}
                onClick={() => setViewMode("timeline")}
              >
                <i className="bi bi-calendar3"></i>
                Timeline
              </button>
              <button
                className={`toggle-btn ${
                  viewMode === "pipeline" ? "active" : ""
                }`}
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
          onViewTrip={handleTripClick}
        />

        {/* Main Dashboard Grid */}
        <div className="travel-grid">
          {/* Trip Timeline */}
          <div className="grid-item timeline-section">
            <TripTimeline
              trips={trips}
              viewMode={viewMode}
              onSelectTrip={handleTripClick}
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
              onSelectTrip={handleTripClick}
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
      </BlurOverlay>

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
