import api from "./axios";

const authApi = {
  login: (credentials) => api.post("/auth/login/", credentials),
  register: (userData) => api.post("/auth/register/", userData),
  logout: () => api.post("/auth/logout/"),
  googleAuth: (credential) => api.post("/auth/google/", { credential }),
  checkSession: () => api.get("/auth/session/"),

  // Google account linking
  getGoogleLinkStatus: () => api.get("/auth/google/status/"),
  linkGoogle: (credential) => api.post("/auth/google/link/", { credential }),
  unlinkGoogle: () => api.post("/auth/google/unlink/"),
  setPassword: (newPassword) =>
    api.post("/auth/set-password/", { new_password: newPassword }),

  // Email verification
  sendVerificationEmail: () => api.post("/auth/send-verification/"),
  verifyEmail: (uid, token) => api.post("/auth/verify-email/", { uid, token }),

  // Password management
  updatePassword: (currentPassword, newPassword) =>
    api.post("/auth/update-password/", {
      current_password: currentPassword,
      new_password: newPassword,
    }),
  forgotPassword: (email) => api.post("/auth/forgot-password/", { email }),
  resetPassword: (uid, token, newPassword) =>
    api.post("/auth/reset-password/", {
      uid,
      token,
      new_password: newPassword,
    }),
};

export default authApi;
