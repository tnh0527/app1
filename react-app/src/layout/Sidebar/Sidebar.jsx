import "./Sidebar.css";
import { navigationLinks } from "../../data/data";
import { useState, useContext, useEffect } from "react";
import { SidebarContext } from "./Context";
import { useLocation, useNavigate } from "react-router-dom";
import ProfilePicModal from "../../components/Modals/Profile/ProfilePicModal";
import { useAuth } from "../../utils/AuthContext";
import { ProfileContext } from "../../utils/ProfileContext";

const Sidebar = () => {
  const csrfToken = document.cookie
    .split(";")
    .find((cookie) => cookie.trim().startsWith("csrftoken="))
    .split("=")[1];
  const [sidebarClass, setSidebarClass] = useState("");
  const { profilePic, setProfilePic, profile } = useContext(ProfileContext);
  const { isSidebarOpen } = useContext(SidebarContext);
  const location = useLocation();
  const { logout } = useAuth();

  const navigate = useNavigate();

  useEffect(() => {
    if (isSidebarOpen) {
      setSidebarClass("sidebar-change");
    } else {
      setSidebarClass("");
    }
  }, [isSidebarOpen]);

  const handleLogout = async () => {
    const response = await fetch("http://localhost:8000/auth/logout/", {
      method: "POST",
      "X-CSRFToken": csrfToken,
    });
    if (response.ok) {
      logout();
      navigate("/");
    } else {
      console.error("An error occurred while logging out.");
    }
  };

  const getNameBar = () => {
    if (profile) {
      const { first_name, last_name, username } = profile;
      if (first_name && last_name) {
        return `${first_name} ${last_name}`;
      } else {
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
          <img src={profilePic} alt="profile image" />
        </div>
        <span className="info-name">{getNameBar()}</span>
        <ProfilePicModal onUpload={setProfilePic} />
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
