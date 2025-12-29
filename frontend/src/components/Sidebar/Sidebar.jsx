import "./Sidebar.css";
import { navigationLinks } from "../../data/data";
import { useState, useContext, useEffect } from "react";
import { SidebarContext } from "../../contexts/SidebarContext";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { ProfilePicModal } from "../Modals";
import { useAuth } from "../../contexts/AuthContext";
import { ProfileContext } from "../../contexts/ProfileContext";
import { personsImgs, iconsImgs } from "../../utils/images";
import { Tooltip } from "react-tooltip";
import authApi from "../../api/authApi";

const Sidebar = () => {
  const { profilePic, setProfilePic, profile } = useContext(ProfileContext);
  const { isSidebarOpen, toggleSidebar } = useContext(SidebarContext);
  const location = useLocation();
  const { logout } = useAuth();

  const navigate = useNavigate();

  const sidebarClass = isSidebarOpen ? "sidebar-change" : "";

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      navigate("/");
      window.location.reload();
    } catch (error) {
      console.error("An error occurred while logging out.", error);
    }
  };

  const getNameBar = () => {
    if (profile) {
      const { username } = profile;
      if (username) {
        return username;
      }
    }
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
    <div className={`sidebar ${sidebarClass}`}>
      <button
        className="toggle-button"
        onClick={toggleSidebar}
        data-tooltip-id="sidebar-tooltip"
        data-tooltip-content="Toggle sidebar"
        data-tooltip-place="right"
      >
        {isSidebarOpen ? (
          <i className="bi bi-caret-left-fill"></i>
        ) : (
          <i className="bi bi-caret-right-fill"></i>
        )}
      </button>

      <div className="sidebar-header">
        <div className="app-logo">
          <img src="/nexus_logo.svg" alt="Logo" />
        </div>
        <span className="info-name">{getNameBar()}</span>
        <div className="info-img img-fit-cover">
          <Link
            to="/account"
            data-tooltip-id="profile-tooltip"
            data-tooltip-content="My account"
            data-tooltip-place="bottom"
          >
            <img src={profilePic || personsImgs.default_user} alt="user pic" />
          </Link>
        </div>
        <ProfilePicModal onUpload={setProfilePic} />
      </div>

      <Tooltip id="sidebar-tooltip" style={{ zIndex: "999" }} />
      <Tooltip id="profile-tooltip" style={{ zIndex: "999" }} />

      <nav className="navigation">
        <div className="top-links">
          <ul className="nav-list">
            {navigationLinks.slice(0, -3).map((navigationLink) => (
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
                    <img
                      src={navigationLink.image}
                      className="nav-link-icon"
                      alt={navigationLink.title}
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

        {/* Bottom links placed after the main navigation */}
        <div className="bottom-links">
          <ul className="nav-list">
            {navigationLinks.slice(-3).map((navigationLink) => (
              <li className="nav-item" key={navigationLink.id}>
                <a
                  className={`nav-link ${
                    activeLinkIdx(navigationLink.path, navigationLink.children)
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleLinkClick(navigationLink)}
                >
                  <img
                    src={navigationLink.image}
                    className="nav-link-icon"
                    alt={navigationLink.title}
                  />
                  <span className="nav-link-text">{navigationLink.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;
