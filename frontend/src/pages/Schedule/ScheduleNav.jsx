import { useContext } from "react";
import { iconsImgs } from "../../utils/images";
import { SidebarContext } from "../../contexts/SidebarContext";

const ScheduleNav = () => {
  const { toggleSidebar } = useContext(SidebarContext);
  return (
    <div className="main-content-top">
      <div className="content-top-left">
        <button
          type="button"
          className="sidebar-toggler"
          onClick={() => toggleSidebar()}
        >
          <img src={iconsImgs.menu} alt="" />
        </button>
        <h3 className="content-top-title">Schedule</h3>
      </div>
    </div>
  );
};

export default ScheduleNav;
