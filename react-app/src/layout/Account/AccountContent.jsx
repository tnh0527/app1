import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import Sidebar from "../Sidebar/Sidebar";
import profileImage from "../../assets/images/default-profile.jpg";
import EditProfile from "../../pages/Account/EditProfile";
import ProfileLeft from "../../pages/Account/AccountNav";
import Security from "../../pages/Security/Security";
import { ProfileProvider } from "../../utils/ProfileContext";

const Account = () => {
  const [profilePic, setProfilePic] = useState(profileImage);
  return (
    <ProfileProvider>
      <div className="app">
        <Sidebar profilePic={profilePic} setProfilePic={setProfilePic} />
        <ProfileLeft />
        <Routes>
          <Route path="/" element={<Navigate to="edit-profile" replace />} />
          <Route path="edit-profile" element={<EditProfile />} />
          <Route path="security" element={<Security />} />
        </Routes>
      </div>
    </ProfileProvider>
  );
};

export default Account;
