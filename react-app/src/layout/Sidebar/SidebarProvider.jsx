import Sidebar from "./Sidebar";
import { useState } from "react";
import profileImage from "../../assets/images/default-profile.jpg";

const SidebarProvider = () => {
  const [profilePic, setProfilePic] = useState(profileImage);

  return <Sidebar profilePic={profilePic} setProfilePic={setProfilePic} />;
};

export default SidebarProvider;
