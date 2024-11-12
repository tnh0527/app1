import { createContext, useState, useEffect } from "react";
import profileImage from "../assets/images/default-profile.jpg";
import { csrfToken } from "../data/data";
import { useAuth } from "./AuthContext";
export const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchProfilePic();
    } else {
      setProfile(null);
      setProfilePic(null);
    }
  }, [isAuthenticated]);

  const fetchProfile = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/profile/edit-profile/",
        {
          method: "GET",
          headers: {
            "X-CSRFToken": csrfToken,
          },
          credentials: "include",
        }
      );
      if (response.ok) {
        const profile = await response.json();
        const birthdate = profile.birthdate
          ? new Date(
              new Date(profile.birthdate).getTime() +
                new Date(profile.birthdate).getTimezoneOffset() * 60000
            )
          : null;
        setProfile({ ...profile, birthdate: birthdate });
      } else {
        console.error("Failed to fetch profile.");
      }
    } catch (error) {
      console.error("Caught an error:", error.message);
    }
  };

  const fetchProfilePic = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/profile/profile-pic/",
        {
          method: "GET",
          headers: {
            "X-CSRFToken": csrfToken,
          },
          credentials: "include",
        }
      );
      if (response.ok) {
        const profilePicUrl = URL.createObjectURL(await response.blob());
        setProfilePic(profilePicUrl);
      } else {
        setProfilePic(profileImage);
        console.log("Profile picture not found.");
      }
    } catch (error) {
      console.error("Error fetching profile picture:", error);
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile,
        profilePic,
        setProfilePic,
        fetchProfile,
        fetchProfilePic,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};
