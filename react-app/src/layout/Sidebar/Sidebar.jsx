import "./Sidebar.css";
import { navigationLinks } from "../../data/data";
import { useState, useContext, useEffect } from "react";
import { SidebarContext } from "./Context";
import { useLocation, useNavigate, Link } from "react-router-dom";
import ProfilePicModal from "../../components/Modals/Profile/ProfilePicModal";
import { useAuth } from "../../utils/AuthContext";
import { ProfileContext } from "../../utils/ProfileContext";
import { personsImgs } from "../../utils/images";
import { Tooltip } from "react-tooltip";

const Sidebar = () => {
  const csrfToken = document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith("csrftoken="))
    .split("=")[1];
  const { profilePic, setProfilePic, profile } = useContext(ProfileContext);
  const { isSidebarOpen, toggleSidebar } = useContext(SidebarContext);
  const location = useLocation();
  const { logout } = useAuth();

  const navigate = useNavigate();

  const sidebarClass = isSidebarOpen ? "sidebar-change" : "";

  const handleLogout = async () => {
    const response = await fetch("http://localhost:8000/auth/logout/", {
      method: "POST",
      "X-CSRFToken": csrfToken,
    });
    if (response.ok) {
      logout();
      navigate("/");
      window.location.reload();
    } else {
      console.error("An error occurred while logging out.");
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
      <div className="user-info">
        <div className="info-img img-fit-cover">
          <Link
            to="/account/edit-profile"
            data-tooltip-id="profile-tooltip"
            data-tooltip-content="Edit profile"
            data-tooltip-place="top"
          >
            <img src={profilePic || personsImgs.default_user} alt="user pic" />
          </Link>
        </div>
        <span className="info-name">{getNameBar()}</span>
        <button
          className="toggle-button"
          onClick={toggleSidebar}
          data-tooltip-id="sidebar-tooltip"
          data-tooltip-content="Toggle sidebar"
          data-tooltip-place="top"
        >
          {isSidebarOpen ? (
            <i className="bi bi-caret-right-fill"></i>
          ) : (
            <i className="bi bi-caret-left-fill"></i>
          )}
        </button>
        <Tooltip id="sidebar-tooltip" style={{ zIndex: "999" }} />
        <Tooltip id="profile-tooltip" style={{ zIndex: "999" }} />

        <ProfilePicModal onUpload={setProfilePic} />
      </div>

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
            {navigationLinks.slice(-2).map((navigationLink) => (
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
