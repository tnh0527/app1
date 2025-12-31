import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

// API imports
import { dashboardApi as financialsDashboardApi } from "../../api/financialsApi";
import { dashboardApi as subscriptionsDashboardApi } from "../../api/subscriptionsApi";
import {
  dashboardApi as travelDashboardApi,
  tripsApi,
} from "../../api/travelApi";
import { ProfileContext } from "../../contexts/ProfileContext";

// Widget imports
import { CalendarWidget } from "./widgets/CalendarWidget";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { FinancialsWidget } from "./widgets/FinancialsWidget";
import { SubscriptionsWidget } from "./widgets/SubscriptionsWidget";
import { TravelWidget } from "./widgets/TravelWidget";
import DashboardSkeleton from "./HomeSkeleton";

const REQUEST_TIMEOUT = 15000;

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile } = useContext(ProfileContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);

  // Data states for each module
  const [financialsData, setFinancialsData] = useState(null);
  const [subscriptionsData, setSubscriptionsData] = useState(null);
  const [travelData, setTravelData] = useState(null);
  const [weatherData, setWeatherData] = useState(null);

  // Current time for greeting
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, [profile?.location]);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Fetch all dashboard data
  const fetchAllData = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(() => {
      setLoading(false);
    }, REQUEST_TIMEOUT);

    try {
      // Fetch all data in parallel
      const weatherLocation = profile?.location || "Richmond, Texas, USA";

      const [financials, subscriptions, travel, trips, weather] =
        await Promise.all([
          financialsDashboardApi.getFullDashboard("1y").catch(() => null),
          subscriptionsDashboardApi.getFullDashboard().catch(() => null),
          travelDashboardApi.getDashboard().catch(() => null),
          tripsApi.getUpcoming().catch(() => []),
          fetch(`http://localhost:8000/api/weather/?location=${encodeURIComponent(
            weatherLocation
          )}
        `)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ]);

      clearTimeout(timeoutRef.current);

      setFinancialsData(financials);
      setSubscriptionsData(subscriptions);
      setTravelData({ ...travel, upcomingTrips: trips });
      setWeatherData(weather);

      setError(null);
    } catch (err) {
      clearTimeout(timeoutRef.current);
      console.error("Failed to fetch dashboard data:", err);
      setError("Some data couldn't be loaded. Pull to refresh.");
    } finally {
      clearTimeout(timeoutRef.current);
      setLoading(false);
    }
  }, [profile?.location]);

  useEffect(() => {
    fetchAllData();
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fetchAllData]);

  // Navigation handlers
  const handleNavigate = (path) => {
    navigate(path);
  };

  // Format date
  const formatDate = () => {
    return currentTime.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading && !financialsData && !subscriptionsData && !travelData) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="home-page">
      {/* Header Section */}
      <header className="home-header">
        <div className="header-content">
          <div className="greeting-section">
            <h1 className="greeting-text">
              {getGreeting()},{" "}
              <span className="user-name">
                {profile?.display_name || "User"}
              </span>
            </h1>
            <p className="date-text">{formatDate()}</p>
          </div>
          <div className="header-actions">
            <button
              className="refresh-btn"
              onClick={fetchAllData}
              disabled={loading}
            >
              <i
                className={`bi bi-arrow-clockwise ${loading ? "spinning" : ""}`}
              ></i>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Grid - New Layout */}
      <main className="home-dashboard-grid">
        {/* Top Row: Financials (left) | Weather (right) */}
        <FinancialsWidget
          data={financialsData}
          onNavigate={() => handleNavigate("/financials")}
        />
        <WeatherWidget
          initialWeather={weatherData}
          onNavigate={() => handleNavigate("/weather")}
        />

        {/* Middle Row: Calendar (left) | Travel (right) */}
        <CalendarWidget onNavigate={() => handleNavigate("/calendar")} />
        <TravelWidget
          data={travelData}
          onNavigate={() => handleNavigate("/travel")}
        />

        {/* Bottom Left: Empty widget container for future use */}
        <div className="home-widget empty-widget"></div>

        {/* Bottom Right: Subscriptions */}
        <SubscriptionsWidget
          data={subscriptionsData}
          onNavigate={() => handleNavigate("/subscriptions")}
        />
      </main>
    </div>
  );
};

export { Dashboard };
export default Dashboard;
