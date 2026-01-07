import { createContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useAutoRetry } from "../utils/connectionHooks";
import api from "../api/axios";

export const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const { isAuthenticated } = useAuth();

  const fetchProfile = useCallback(async () => {
    try {
      const { data: profile } = await api.get("/profile/edit-profile/");
      if (profile) {
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
      console.error("Caught an error:", error?.message || error);
    }
  }, []);

  // Retry profile fetch when connection is restored
  useAutoRetry(fetchProfile, [isAuthenticated], { enabled: isAuthenticated });

  const fetchProfilePic = useCallback(async () => {
    try {
      const response = await api.get("/profile/profile-pic/", {
        responseType: "blob",
        // If the backend returns 404 when no picture is set, don't treat it as an exception.
        validateStatus: (status) => status < 500,
      });

      if (response.status === 200 && response.data) {
        const profilePicUrl = URL.createObjectURL(response.data);
        setProfilePic(profilePicUrl);
        return;
      }

      setProfilePic(null);
    } catch (error) {
      console.error("Error fetching profile picture:", error);
      setProfilePic(null);
    }
  }, []);

  // Retry profile picture fetch when connection is restored
  useAutoRetry(fetchProfilePic, [isAuthenticated], {
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfile();
      fetchProfilePic();
    } else {
      setProfile(null);
      setProfilePic(null);
    }
  }, [isAuthenticated, fetchProfile, fetchProfilePic]);

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
