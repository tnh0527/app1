import Sidebar from "./Sidebar";
import { useState } from "react";
import profileImage from "../../assets/images/default-profile.jpg";

const SidebarProvider = () => {
  const [profilePic, setProfilePic] = useState(profileImage);

  return (
    <div className="side-bar-provider">
      <Sidebar profilePic={profilePic} setProfilePic={setProfilePic} />
    </div>
  );
};

export default SidebarProvider;
