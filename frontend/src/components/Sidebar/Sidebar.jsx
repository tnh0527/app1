import "./Sidebar.css";
import { navigationLinks } from "../../data/data";
import { useContext, useState } from "react";
import { SidebarContext } from "../../contexts/SidebarContext";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ProfilePicModal } from "../Modals";
import { useAuth } from "../../contexts/AuthContext";
import { ProfileContext } from "../../contexts/ProfileContext";
import { defaultUserIcon } from "../../utils/images";
import { Icon } from "@iconify/react";
import { Tooltip } from "react-tooltip";
import authApi from "../../api/authApi";

const Sidebar = () => {
  const { profilePic, setProfilePic, profile } = useContext(ProfileContext);
  const { isSidebarOpen, toggleSidebar } = useContext(SidebarContext);
  const location = useLocation();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navigate = useNavigate();

  // Apply collapsed styles only when sidebar is closed
  const sidebarClass = isSidebarOpen ? "" : "sidebar-change";

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
      logout();
      // Wait for animation before navigating
      setTimeout(() => {
        navigate("/");
        window.location.reload();
      }, 800);
    } catch (error) {
      console.error("An error occurred while logging out.", error);
      setIsLoggingOut(false);
    }
  };

  const getNameBar = () => {
    if (!profile) return "User";

    // Prefer first + last name when both are available, otherwise fall back to username
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

  const activeLinkIdx = (path, children) => {
    if (location.pathname === path) return true;
    if (children) {
      return children.some((child) => location.pathname.startsWith(child.path));
    }
  };

  const handleLinkClick = (link) => {
    if (link.path) {
      navigate(link.path);
    } else if (link.id === 10) {
      handleLogout();
    }
  };

  return (
    <>
      {/* Logout overlay */}
      {isLoggingOut && (
        <div className="logout-overlay">
          <div className="logout-content">
            <div className="logout-logo">
              <img src="/nexus_logo.svg" alt="Nexus" />
            </div>
            <div className="logout-text">Signing out...</div>
            <div className="logout-progress">
              <div className="logout-progress-bar"></div>
            </div>
          </div>
        </div>
      )}

      <div className={`sidebar ${sidebarClass}`}>
        <button
          className="toggle-button"
          onClick={toggleSidebar}
          aria-expanded={isSidebarOpen}
          aria-label={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          data-tooltip-id="sidebar-tooltip"
          data-tooltip-content="Toggle sidebar"
          data-tooltip-place="right"
        >
          <span className={`toggle-icon ${isSidebarOpen ? "open" : "closed"}`}>
            <i
              className={`bi ${
                isSidebarOpen ? "bi-caret-left-fill" : "bi-caret-right-fill"
              }`}
            ></i>
          </span>
        </button>

        {/* Logo Header */}
        <div className="sidebar-header">
          <div className="app-logo">
            <img src="/nexus_logo.svg" alt="Logo" />
          </div>
          <span className="app-name">Nexus</span>
        </div>

        <Tooltip id="sidebar-tooltip" style={{ zIndex: "999" }} />
        <Tooltip id="profile-tooltip" style={{ zIndex: "999" }} />

        <nav className="navigation">
          <div className="top-links">
            <ul className="nav-list">
              {navigationLinks.slice(0, -2).map((navigationLink) => (
                <li className="nav-item" key={navigationLink.id}>
                  <div className="profile-icon">
                    <a
                      className={`nav-link ${
                        activeLinkIdx(
                          navigationLink.path,
                          navigationLink.children
                        )
                          ? "active"
                          : ""
                      }`}
                      onClick={() => handleLinkClick(navigationLink)}
                    >
                      <Icon
                        icon={navigationLink.icon}
                        className="nav-link-icon"
                      />
                      <span className="nav-link-text">
                        {navigationLink.title}
                        {navigationLink.title === "Market Insight" && (
                          <span className="beta-label">Beta</span>
                        )}
                      </span>
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom links - excluding Log Out which is in profile section */}
          <div className="bottom-links">
            <ul className="nav-list">
              {navigationLinks.slice(-2, -1).map((navigationLink) => (
                <li className="nav-item" key={navigationLink.id}>
                  <a
                    className={`nav-link ${
                      activeLinkIdx(
                        navigationLink.path,
                        navigationLink.children
                      )
                        ? "active"
                        : ""
                    }`}
                    onClick={() => handleLinkClick(navigationLink)}
                  >
                    <Icon
                      icon={navigationLink.icon}
                      className="nav-link-icon"
                    />
                    <span className="nav-link-text">
                      {navigationLink.title}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        {/* Profile Section at Bottom - Redesigned */}
        <div className="sidebar-profile">
          <Link
            to="/profile"
            className={`profile-section-left profile-link ${
              location.pathname === "/profile" ? "active" : ""
            }`}
            data-tooltip-id="profile-tooltip"
            data-tooltip-content="View Profile"
            data-tooltip-place="right"
          >
            <div className="profile-img img-fit-cover">
              {profilePic ? (
                <img src={profilePic} alt="user pic" />
              ) : (
                <Icon icon={defaultUserIcon} className="default-user-icon" />
              )}
            </div>
            <span className="profile-name">{getNameBar()}</span>
          </Link>
          <div className="profile-section-right">
            <button
              className="logout-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              data-tooltip-id="sidebar-tooltip"
              data-tooltip-content="Log out"
              data-tooltip-place="top"
            >
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
