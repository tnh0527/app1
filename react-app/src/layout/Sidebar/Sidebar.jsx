import "./Sidebar.css";
import { personsImgs } from "../../utils/images";
import { navigationLinks } from "../../data/data";
import { useState, useContext, useEffect } from "react";
import { SidebarContext } from "./Context";
import { useLocation, useNavigate } from "react-router-dom";

const Sidebar = () => {
  const [sidebarClass, setSidebarClass] = useState("");
  const { isSidebarOpen } = useContext(SidebarContext);
  const location = useLocation();

  const navigate = useNavigate();

  useEffect(() => {
    if (isSidebarOpen) {
      setSidebarClass("sidebar-change");
    } else {
      setSidebarClass("");
    }
  }, [isSidebarOpen]);

  const handleLogout = () => {
    navigate("/");
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
          <img src={personsImgs.Minji} alt="profile image" />
        </div>
        <span className="info-name">kim-minji</span>
      </div>

      <nav className="navigation">
        <ul className="nav-list top-links">
          {navigationLinks.slice(0, -2).map((navigationLink) => (
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

        {/* Bottom links placed after the main navigation */}
        <ul className="nav-list bottom-links">
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
      </nav>
    </div>
  );
};

export default Sidebar;
