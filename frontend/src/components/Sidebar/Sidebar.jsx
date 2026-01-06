import "./Sidebar.css";
import { navigationLinks } from "../../data/data";
import { useContext } from "react";
import { SidebarContext } from "../../contexts/SidebarContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { Tooltip } from "react-tooltip";

const Sidebar = () => {
  const { isSidebarOpen, toggleSidebar } = useContext(SidebarContext);
  const location = useLocation();
  const navigate = useNavigate();

  // Apply collapsed styles only when sidebar is closed
  const sidebarClass = isSidebarOpen ? "" : "sidebar-change";

  const activeLinkIdx = (path, children) => {
    if (location.pathname === path) return true;
    if (children) {
      return children.some((child) => location.pathname.startsWith(child.path));
    }
  };

  const handleLinkClick = (link) => {
    if (link.path) {
      navigate(link.path);
    }
  };

  return (
    <>
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
          <Icon
            icon={isSidebarOpen ? "mdi:chevron-left" : "mdi:chevron-right"}
            className="toggle-icon"
          />
        </button>

        {/* Logo Header */}
        <div className="sidebar-header">
          <div className="app-logo">
            <img src="/nexus_logo.svg" alt="Logo" />
          </div>
          <span className="app-name" aria-label="Nexus">
            {"Nexus".split("").map((ch, idx) => (
              <span
                key={idx}
                className="app-letter"
                style={{ "--i": idx }}
                data-char={ch}
                aria-hidden="true"
              >
                {ch}
              </span>
            ))}
          </span>
        </div>

        {/* Themed divider below the logo/header */}
        <div className="divider" />

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

        {/* AI Assistant Section at Bottom */}
        <div className="guide-section">
          <ul className="nav-list">
            <li className="nav-item">
              <div
                className="nav-link disabled ai-link"
                aria-disabled="true"
                tabIndex={-1}
                data-tooltip-id="sidebar-tooltip"
                data-tooltip-content="AI Assistant (coming soon)"
                data-tooltip-place="right"
              >
                <Icon icon="mdi:robot" className="nav-link-icon" />
                <span className="nav-link-text">AI Assistant</span>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
