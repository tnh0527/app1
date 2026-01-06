import "./TopHeader.css";
import { useContext, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { ProfileContext } from "../../contexts/ProfileContext";
import { SidebarContext } from "../../contexts/SidebarContext";
import { useAuth } from "../../contexts/AuthContext";
import { iconsImgs, defaultUserIcon } from "../../utils/images";
import { Icon } from "@iconify/react";
import { Tooltip } from "react-tooltip";
import authApi from "../../api/authApi";

// Page metadata for dynamic header content
const PAGE_META = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: (currentDate) => currentDate, // Dynamic date for dashboard
    icon: iconsImgs.home,
  },
  "/calendar": {
    title: "Calendar",
    subtitle: "Manage your schedule and events.",
    icon: iconsImgs.calendar,
  },
  "/weather": {
    title: "Weather",
    subtitle: "Current conditions and forecasts.",
    icon: iconsImgs.weather,
  },
  "/financials": {
    title: "Financials",
    subtitle: "Track your wealth and investments.",
    icon: iconsImgs.wallet,
  },
  "/subscriptions": {
    title: "Subscriptions",
    subtitle: "Manage your recurring payments.",
    icon: iconsImgs.bills,
  },
  "/travel": {
    title: "Travel",
    subtitle: "Plan and track your trips.",
    icon: iconsImgs.plane,
  },
  "/ai-foundry": {
    title: "AI Foundry",
    subtitle: "Craft your own personalized AI models.",
    icon: iconsImgs.report,
  },
  "/profile": {
    title: "Profile",
    subtitle: "Manage your account settings.",
    icon: iconsImgs.user,
  },
};

const TopHeader = () => {
  const { profilePic, profile } = useContext(ProfileContext);
  const { isSidebarOpen } = useContext(SidebarContext);
  const { logout } = useAuth();
  const location = useLocation();
  const [notificationCount] = useState(3); // Placeholder count
  // eslint-disable-next-line no-unused-vars
  const [showNotifications, _setShowNotifications] = useState(false);

  // Get page metadata based on current path
  const getPageMeta = () => {
    const path = "/" + location.pathname.split("/")[1];
    return PAGE_META[path] || PAGE_META["/dashboard"];
  };

  const pageMeta = getPageMeta();

  // Format current date for dashboard
  const formatDate = () => {
    const currentTime = new Date();
    return currentTime.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get subtitle - if it's a function (dashboard), call it with the date
  const getSubtitle = () => {
    if (typeof pageMeta.subtitle === "function") {
      return pageMeta.subtitle(formatDate());
    }
    return pageMeta.subtitle;
  };

  const handleLogout = async () => {
    try {
      // Clear routing history and navigation state
      sessionStorage.removeItem("redirectAfterLogin");
      sessionStorage.setItem("justLoggedOut", "true");

      // Clear any page-specific session data
      Object.keys(sessionStorage).forEach((key) => {
        if (
          key.startsWith("weather_") ||
          key.startsWith("calendar_") ||
          key.startsWith("travel_") ||
          key.startsWith("subscription_")
        ) {
          sessionStorage.removeItem(key);
        }
      });

      logout();
      authApi.logout().catch((err) => {
        console.error("Background logout failed:", err);
      });
    } catch (error) {
      console.error("An error occurred while logging out.", error);
    }
  };

  const getDisplayName = () => {
    if (!profile) return "User";
    const first =
      profile.first_name ||
      profile.firstName ||
      profile.first ||
      profile.givenName;
    const last =
      profile.last_name ||
      profile.lastName ||
      profile.last ||
      profile.familyName;
    if (first && last) return `${first} ${last}`;
    if (profile.username) return profile.username;
    return "User";
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <header
      className={`top-header ${!isSidebarOpen ? "sidebar-collapsed" : ""}`}
    >
      <Tooltip id="header-tooltip" style={{ zIndex: "999" }} />

      {/* Left Section - Page Info */}
      <div className="header-left">
        <div className="page-info">
          <div className="page-icon-wrapper">
            <Icon icon={pageMeta.icon} className="page-icon" />
          </div>
          <div className="page-text">
            <h1 className="page-title">{pageMeta.title}</h1>
            <p className="page-subtitle">{getSubtitle()}</p>
          </div>
        </div>
      </div>

      {/* Center Section - Search (optional, can be expanded later) */}
      <div className="header-center">
        {/* Placeholder for global search - can be implemented later */}
      </div>

      {/* Right Section - Notifications & Profile */}
      <div className="header-right">
        {/* Notification Bell */}
        <div className="notification-wrapper">
          <button
            className="notification-btn"
            disabled
            aria-disabled="true"
            data-tooltip-id="header-tooltip"
            data-tooltip-content="Notifications"
            data-tooltip-place="bottom"
            title="Notifications are disabled"
          >
            <Icon icon={iconsImgs.bell} className="notification-icon" />
            {notificationCount > 0 && (
              <span className="notification-badge">{notificationCount}</span>
            )}
          </button>

          {/* Notification Dropdown (placeholder) */}
          {showNotifications && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <span>Notifications</span>
                <button className="mark-read-btn">Mark all read</button>
              </div>
              <div className="notification-list">
                <div className="notification-item unread">
                  <Icon icon={iconsImgs.alert} className="notif-icon info" />
                  <div className="notif-content">
                    <p className="notif-text">System update available</p>
                    <span className="notif-time">2 hours ago</span>
                  </div>
                </div>
                <div className="notification-item unread">
                  <Icon
                    icon={iconsImgs.wallet}
                    className="notif-icon success"
                  />
                  <div className="notif-content">
                    <p className="notif-text">Payment processed successfully</p>
                    <span className="notif-time">5 hours ago</span>
                  </div>
                </div>
                <div className="notification-item">
                  <Icon
                    icon={iconsImgs.calendar}
                    className="notif-icon warning"
                  />
                  <div className="notif-content">
                    <p className="notif-text">Upcoming event reminder</p>
                    <span className="notif-time">1 day ago</span>
                  </div>
                </div>
              </div>
              <div className="notification-footer">
                <button className="view-all-btn">View all notifications</button>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="header-divider"></div>

        {/* Profile Section */}
        <div className="profile-wrapper">
          <Link
            to="/profile"
            className={`profile-section ${
              location.pathname === "/profile" ? "active" : ""
            }`}
            data-tooltip-id="header-tooltip"
            data-tooltip-content="View Profile"
            data-tooltip-place="bottom"
          >
            <div className="profile-info">
              <span className="profile-greeting">{getGreeting()}</span>
              <span className="profile-name">{getDisplayName()}</span>
            </div>
            <div className="profile-avatar">
              {profilePic ? (
                <img src={profilePic} alt="Profile" />
              ) : (
                <Icon icon={defaultUserIcon} className="default-avatar-icon" />
              )}
            </div>
          </Link>

          {/* Logout Button */}
          <button
            className="logout-btn"
            onClick={handleLogout}
            data-tooltip-id="header-tooltip"
            data-tooltip-content="Log out"
            data-tooltip-place="bottom"
          >
            <Icon icon={iconsImgs.exit} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
