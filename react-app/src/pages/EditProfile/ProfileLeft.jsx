import { useContext } from "react";
import { iconsImgs } from "../../utils/images";
import { SidebarContext } from "../../layout/Sidebar/Context";
import "./ProfileLeft.css";
import { useNavigate } from "react-router-dom";
import { profileNavLink } from "../../data/data";

const ProfileLeft = () => {
  const { toggleSidebar } = useContext(SidebarContext);
  const navigate = useNavigate();
  const activeLinkIdx = (path) => location.pathname === path;

  const handleLinkClick = (link) => {
    if (link.path) {
      navigate(link.path);
    }
  };
  return (
    <div className="main-profile-left">
      <div className="profile-top-left">
        <button
          type="button"
          className="sidebar-toggler"
          onClick={() => toggleSidebar()}
        >
          <img src={iconsImgs.menu} alt="" />
        </button>
        <h3 className="profile-top-title">Profile</h3>
      </div>
      <nav className="navigation">
        <ul className="nav-list">
          {profileNavLink.map((navigationLink) => (
            <li className="nav-item" key={navigationLink.id}>
              <a
                className={`nav-link ${
                  activeLinkIdx(navigationLink.path) ? "active" : ""
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

export default ProfileLeft;
