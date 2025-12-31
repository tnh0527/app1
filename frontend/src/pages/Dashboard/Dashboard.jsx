import { useState, useEffect, useContext } from "react";
import "./Dashboard.css";
import { ContentMain } from "../../components";
import { ProfileContext } from "../../contexts/ProfileContext";

const Dashboard = () => {
  const [showWelcome, setShowWelcome] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const { profile } = useContext(ProfileContext);

  useEffect(() => {
    // Check if user just logged in
    const justLoggedIn = sessionStorage.getItem("justLoggedIn");
    if (justLoggedIn === "true") {
      setShowWelcome(true);
      sessionStorage.removeItem("justLoggedIn");

      // Start content animation after welcome
      const timer = setTimeout(() => {
        setAnimationComplete(true);
      }, 2000);

      // Hide welcome overlay after animation
      const hideTimer = setTimeout(() => {
        setShowWelcome(false);
      }, 2500);

      return () => {
        clearTimeout(timer);
        clearTimeout(hideTimer);
      };
    } else {
      // No welcome animation, show content immediately
      setAnimationComplete(true);
    }
  }, []);

  const firstName = profile?.first_name || "User";

  return (
    <div className={`main-content ${animationComplete ? "animated" : ""}`}>
      {/* Welcome Overlay Animation */}
      {showWelcome && (
        <div
          className={`welcome-overlay ${animationComplete ? "fade-out" : ""}`}
        >
          <div className="welcome-content">
            {/* Animated logo */}
            <div className="welcome-logo">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  className="logo-path path-1"
                  d="M12 2L2 7L12 12L22 7L12 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="logo-path path-2"
                  d="M2 17L12 22L22 17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="logo-path path-3"
                  d="M2 12L12 17L22 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Welcome text */}
            <div className="welcome-text">
              <span className="welcome-label">Welcome back,</span>
              <span className="welcome-name">{firstName}</span>
            </div>

            {/* Loading bar */}
            <div className="welcome-loader">
              <div className="loader-bar"></div>
            </div>

            {/* Particle effects */}
            <div className="welcome-particles">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="particle"
                  style={{
                    "--delay": `${Math.random() * 2}s`,
                    "--x": `${Math.random() * 100}%`,
                    "--duration": `${1 + Math.random() * 2}s`,
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Content with entrance animations */}
      <div
        className="dashboard-header animate-item"
        style={{ "--delay": "0s" }}
      >
        <h1 className="dashboard-title">
          <span className="title-greeting">Good {getTimeOfDay()},</span>
          <span className="title-name">{firstName}</span>
        </h1>
        <p className="dashboard-subtitle">
          Here&apos;s what&apos;s happening with your account today.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="quick-stats animate-item" style={{ "--delay": "0.1s" }}>
        <div className="stat-card">
          <div className="stat-icon">
            <i className="bx bx-calendar-check"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">12</span>
            <span className="stat-label">Upcoming Events</span>
          </div>
          <div className="stat-trend up">
            <i className="bx bx-trending-up"></i>
            <span>+3</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon weather">
            <i className="bx bx-sun"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">72°F</span>
            <span className="stat-label">Current Weather</span>
          </div>
          <div className="stat-badge">Clear</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon finance">
            <i className="bx bx-wallet"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">$2,450</span>
            <span className="stat-label">Monthly Budget</span>
          </div>
          <div className="stat-progress">
            <div className="progress-bar" style={{ width: "65%" }}></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon travel">
            <i className="bx bx-map-alt"></i>
          </div>
          <div className="stat-info">
            <span className="stat-value">2</span>
            <span className="stat-label">Active Trips</span>
          </div>
          <div className="stat-action">
            <span>View</span>
            <i className="bx bx-right-arrow-alt"></i>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="animate-item" style={{ "--delay": "0.2s" }}>
        <ContentMain />
      </div>
    </div>
  );
};

// Helper function to get time of day greeting
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
};

export default Dashboard;
