import "./TopHeader.css";
import { useContext, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { ProfileContext } from "../../contexts/ProfileContext";
import { SidebarContext } from "../../contexts/SidebarContext";
import { useAuth } from "../../contexts/AuthContext";
import { defaultUserIcon } from "../../utils/images";
import { Icon } from "@iconify/react";
import { Tooltip } from "react-tooltip";
import authApi from "../../api/authApi";

// Page metadata for dynamic header content
const PAGE_META = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Welcome back! Here's your overview.",
    icon: "solar:home-2-bold-duotone",
  },
  "/calendar": {
    title: "Calendar",
    subtitle: "Manage your schedule and events.",
    icon: "solar:calendar-bold-duotone",
  },
  "/weather": {
    title: "Weather",
    subtitle: "Current conditions and forecasts.",
    icon: "solar:cloud-sun-2-bold-duotone",
  },
  "/financials": {
    title: "Financials",
    subtitle: "Track your wealth and investments.",
    icon: "solar:wallet-money-bold-duotone",
  },
  "/subscriptions": {
    title: "Subscriptions",
    subtitle: "Manage your recurring payments.",
    icon: "solar:bill-list-bold-duotone",
  },
  "/travel": {
    title: "Travel",
    subtitle: "Plan and track your trips.",
    icon: "solar:airplane-bold-duotone",
  },
  "/ai-foundry": {
    title: "AI Foundry",
    subtitle: "Craft your own personalized AI models.",
    icon: "solar:cpu-bolt-bold-duotone",
  },
  "/profile": {
    title: "Profile",
    subtitle: "Manage your account settings.",
    icon: "solar:user-circle-bold-duotone",
  },
};

const TopHeader = () => {
  const { profilePic, profile } = useContext(ProfileContext);
  const { isSidebarOpen } = useContext(SidebarContext);
  const { logout } = useAuth();
  const location = useLocation();
  const [notificationCount] = useState(3); // Placeholder count
  const [showNotifications, setShowNotifications] = useState(false);

  // Get page metadata based on current path
  const getPageMeta = () => {
    const path = "/" + location.pathname.split("/")[1];
    return PAGE_META[path] || PAGE_META["/dashboard"];
  };

  const pageMeta = getPageMeta();

  const handleLogout = async () => {
    try {
      sessionStorage.setItem("justLoggedOut", "true");
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
            <p className="page-subtitle">{pageMeta.subtitle}</p>
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
            onClick={() => setShowNotifications(!showNotifications)}
            data-tooltip-id="header-tooltip"
            data-tooltip-content="Notifications"
            data-tooltip-place="bottom"
          >
            <Icon
              icon="solar:bell-bold-duotone"
              className="notification-icon"
            />
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
                  <Icon
                    icon="solar:info-circle-bold"
                    className="notif-icon info"
                  />
                  <div className="notif-content">
                    <p className="notif-text">System update available</p>
                    <span className="notif-time">2 hours ago</span>
                  </div>
                </div>
                <div className="notification-item unread">
                  <Icon
                    icon="solar:wallet-bold"
                    className="notif-icon success"
                  />
                  <div className="notif-content">
                    <p className="notif-text">Payment processed successfully</p>
                    <span className="notif-time">5 hours ago</span>
                  </div>
                </div>
                <div className="notification-item">
                  <Icon
                    icon="solar:calendar-bold"
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
            <Icon icon="solar:logout-2-bold-duotone" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
