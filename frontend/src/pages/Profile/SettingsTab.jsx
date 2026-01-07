import { useState, useEffect, useCallback } from "react";
import { useAutoRetry } from "../../utils/connectionHooks";
import { SyncLoader } from "react-spinners";
import authApi from "../../api/authApi";

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const SettingsTab = () => {
  const [googleStatus, setGoogleStatus] = useState({
    google_linked: false,
    google_linked_at: null,
    has_password: true,
    email_verified: false,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // Fetch Google link status on mount
  const fetchGoogleStatus = useCallback(async () => {
    try {
      const response = await authApi.getGoogleLinkStatus();
      setGoogleStatus(response.data);
    } catch (error) {
      console.error("Failed to fetch Google status:", error);
      setMessage({ type: "error", text: "Failed to load account settings." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  // Retry fetching Google status when connection is restored
  useAutoRetry(fetchGoogleStatus, [], { enabled: true });

  const handleGoogleCallback = useCallback(
    async (response) => {
      if (response.credential) {
        setActionLoading(true);
        setMessage({ type: "", text: "" });
        try {
          await authApi.linkGoogle(response.credential);
          setMessage({
            type: "success",
            text: "Google account linked successfully!",
          });
          fetchGoogleStatus();
        } catch (error) {
          const errorMsg =
            error.response?.data?.error || "Failed to link Google account.";
          setMessage({ type: "error", text: errorMsg });
        } finally {
          setActionLoading(false);
        }
      }
    },
    [fetchGoogleStatus]
  );

  // Initialize Google Identity Services
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const initializeGoogle = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: false,
          });
        } catch (error) {
          console.error("Google Sign-In initialization error:", error);
          setMessage({
            type: "error",
            text: "Google Sign-In initialization failed. This may be due to browser privacy settings or extensions.",
          });
        }
      }
    };

    if (window.google) {
      initializeGoogle();
    } else {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = initializeGoogle;
      script.onerror = () => {
        console.error("Failed to load Google Identity Services");
        setMessage({
          type: "error",
          text: "Failed to load Google services. Please check your internet connection or disable content blockers.",
        });
      };
      document.body.appendChild(script);
    }
  }, [handleGoogleCallback]);

  const handleLinkGoogle = () => {
    if (window.google && GOOGLE_CLIENT_ID) {
      try {
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            const reason =
              notification.getNotDisplayedReason() ||
              notification.getSkippedReason();

            if (
              reason === "browser_not_supported" ||
              reason === "opt_out_or_no_session"
            ) {
              setMessage({
                type: "error",
                text: "Google Sign-In was blocked. Please disable your adblocker or privacy extensions, or allow third-party sign-in in your browser settings.",
              });
            } else if (reason !== "suppressed_by_user") {
              setMessage({
                type: "error",
                text: "Google Sign-In unavailable. Try allowing third-party cookies or disabling privacy blockers.",
              });
            }
          }
        });
      } catch (error) {
        console.error("Google Sign-In error:", error);
        setMessage({
          type: "error",
          text: "Google Sign-In blocked by browser or extension. Please disable adblockers/privacy tools and try again.",
        });
      }
    } else {
      setMessage({ type: "error", text: "Google Sign-In is not available." });
    }
  };

  const handleUnlinkGoogle = async () => {
    if (!googleStatus.has_password) {
      setMessage({
        type: "error",
        text: "Please set a password before unlinking Google to maintain account access.",
      });
      setShowPasswordForm(true);
      return;
    }

    if (
      !window.confirm("Are you sure you want to unlink your Google account?")
    ) {
      return;
    }

    setActionLoading(true);
    setMessage({ type: "", text: "" });
    try {
      await authApi.unlinkGoogle();
      setMessage({
        type: "success",
        text: "Google account unlinked successfully.",
      });
      fetchGoogleStatus();
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || "Failed to unlink Google account.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendVerification = async () => {
    setActionLoading(true);
    setMessage({ type: "", text: "" });
    try {
      await authApi.sendVerificationEmail();
      setMessage({
        type: "success",
        text: "Verification email sent! Please check your inbox.",
      });
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || "Failed to send verification email.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (!/[a-zA-Z]/.test(newPassword)) {
      setPasswordError("Password must contain at least one letter.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setActionLoading(true);
    try {
      if (googleStatus.has_password) {
        // Update existing password
        await authApi.updatePassword(currentPassword, newPassword);
        setMessage({
          type: "success",
          text: "Password updated successfully!",
        });
      } else {
        // Set new password (Google-only account)
        await authApi.setPassword(newPassword);
        setMessage({
          type: "success",
          text: "Password set successfully! You can now log in with email/password.",
        });
      }
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      fetchGoogleStatus();
    } catch (error) {
      const errorMsg =
        error.response?.data?.error || "Failed to update password.";
      setPasswordError(errorMsg);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    setActionLoading(true);

    try {
      // Call the delete account API with optional password
      await authApi.deleteAccount(deletePassword || null);

      // Account deleted successfully - redirect to auth page
      window.location.href = "/auth";
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        "Failed to delete account. Please try again.";
      setDeleteError(errorMsg);
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="settings-tab-content">
        {/* Skeleton for Connected Accounts Section */}
        <div className="settings-section">
          <div className="section-header">
            <h3>
              <div
                className="skeleton"
                style={{
                  width: "200px",
                  height: "20px",
                  display: "inline-block",
                }}
              ></div>
            </h3>
            <div className="section-description">
              <div
                className="skeleton"
                style={{ width: "300px", height: "14px" }}
              ></div>
            </div>
          </div>
          <div className="connected-accounts-list">
            <div
              className="account-card"
              style={{ background: "rgba(255, 255, 255, 0.02)" }}
            >
              <div
                className="skeleton"
                style={{ width: "48px", height: "48px", borderRadius: "10px" }}
              ></div>
              <div className="account-info" style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="skeleton"
                  style={{
                    width: "60%",
                    maxWidth: "120px",
                    height: "18px",
                    marginBottom: "8px",
                  }}
                ></div>
                <div
                  className="skeleton"
                  style={{ width: "40%", maxWidth: "150px", height: "14px" }}
                ></div>
              </div>
              <div
                className="skeleton"
                style={{ width: "120px", height: "36px", borderRadius: "6px" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Skeleton for Account Security Section */}
        <div className="settings-section">
          <div className="section-header">
            <h3>
              <div
                className="skeleton"
                style={{
                  width: "180px",
                  height: "20px",
                  display: "inline-block",
                }}
              ></div>
            </h3>
            <div className="section-description">
              <div
                className="skeleton"
                style={{ width: "280px", height: "14px" }}
              ></div>
            </div>
          </div>
          <div className="security-status">
            <div className="security-item">
              <div className="security-icon">
                <div
                  className="skeleton"
                  style={{ width: "100%", height: "100%", borderRadius: "8px" }}
                ></div>
              </div>
              <div className="security-info" style={{ flex: 1, minWidth: 0 }}>
                <span className="security-label">
                  <div
                    className="skeleton"
                    style={{
                      width: "100px",
                      height: "14px",
                      marginBottom: "4px",
                    }}
                  ></div>
                </span>
                <span className="security-value">
                  <div
                    className="skeleton"
                    style={{ width: "80px", height: "16px" }}
                  ></div>
                </span>
              </div>
              <div
                className="skeleton"
                style={{ width: "140px", height: "36px", borderRadius: "6px" }}
              ></div>
            </div>
            <div className="security-item">
              <div className="security-icon">
                <div
                  className="skeleton"
                  style={{ width: "100%", height: "100%", borderRadius: "8px" }}
                ></div>
              </div>
              <div className="security-info" style={{ flex: 1, minWidth: 0 }}>
                <span className="security-label">
                  <div
                    className="skeleton"
                    style={{
                      width: "80px",
                      height: "14px",
                      marginBottom: "4px",
                    }}
                  ></div>
                </span>
                <span className="security-value">
                  <div
                    className="skeleton"
                    style={{ width: "100px", height: "16px" }}
                  ></div>
                </span>
              </div>
              <div
                className="skeleton"
                style={{ width: "140px", height: "36px", borderRadius: "6px" }}
              ></div>
            </div>
          </div>
        </div>

        {/* Skeleton for Info Section */}
        <div className="settings-section info-section">
          <div className="info-card">
            <div
              className="skeleton"
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "4px",
                flexShrink: 0,
              }}
            ></div>
            <div className="info-content">
              <div
                className="skeleton"
                style={{ width: "180px", height: "18px", marginBottom: "8px" }}
              ></div>
              <div
                className="skeleton"
                style={{ width: "100%", height: "14px", marginBottom: "4px" }}
              ></div>
              <div
                className="skeleton"
                style={{ width: "90%", height: "14px" }}
              ></div>
            </div>
          </div>
        </div>

        <style>{`
          .skeleton {
            background: linear-gradient(
              90deg,
              rgba(255, 255, 255, 0.03) 0%,
              rgba(255, 255, 255, 0.08) 50%,
              rgba(255, 255, 255, 0.03) 100%
            );
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
            border-radius: 4px;
          }

          @keyframes shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="settings-tab-content">
      {/* Message Display */}
      {message.text && (
        <div className={`settings-message ${message.type}`}>
          <i
            className={`bi ${
              message.type === "success"
                ? "bi-check-circle"
                : "bi-exclamation-circle"
            }`}
          ></i>
          <span>{message.text}</span>
          <button
            className="dismiss-btn"
            onClick={() => setMessage({ type: "", text: "" })}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      {/* Connected Accounts Section */}
      <div className="settings-section">
        <div className="section-header">
          <h3>
            <i className="bi bi-link-45deg"></i>
            Connected Accounts
          </h3>
          <p className="section-description">
            Manage your connected accounts and sign-in methods.
          </p>
        </div>

        <div className="connected-accounts-list">
          {/* Google Account */}
          <div
            className={`account-card ${
              googleStatus.google_linked ? "connected" : ""
            }`}
          >
            <div className="account-icon google">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>
            <div className="account-info">
              <div className="account-name">Google</div>
              <div className="account-status">
                {googleStatus.google_linked ? (
                  <>
                    <span className="status-badge connected">
                      <i className="bi bi-check-circle-fill"></i>
                      Connected
                    </span>
                    {googleStatus.google_linked_at && (
                      <span className="connected-date">
                        Since {formatDate(googleStatus.google_linked_at)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="status-badge not-connected">
                    Not connected
                  </span>
                )}
              </div>
            </div>
            <div className="account-action">
              {googleStatus.google_linked ? (
                <button
                  className="unlink-btn"
                  onClick={handleUnlinkGoogle}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <SyncLoader loading={true} size={5} color="#ef4444" />
                  ) : (
                    <>
                      <i className="bi bi-link-break"></i>
                      Unlink
                    </>
                  )}
                </button>
              ) : (
                <button
                  className="link-btn"
                  onClick={handleLinkGoogle}
                  disabled={actionLoading || !GOOGLE_CLIENT_ID}
                >
                  {actionLoading ? (
                    <SyncLoader loading={true} size={5} color="#4285f4" />
                  ) : (
                    <>
                      <i className="bi bi-plus-lg"></i>
                      Link Account
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Account Security Section */}
      <div className="settings-section">
        <div className="section-header">
          <h3>
            <i className="bi bi-shield-lock"></i>
            Account Security
          </h3>
          <p className="section-description">
            Manage your password and security settings.
          </p>
        </div>

        <div className="security-status">
          {/* Email Verification */}
          <div className="security-item">
            <div className="security-icon">
              <i className="bi bi-envelope-check"></i>
            </div>
            <div className="security-info">
              <span className="security-label">Email Verified</span>
              <span
                className={`security-value ${
                  googleStatus.email_verified ? "verified" : "unverified"
                }`}
              >
                {googleStatus.email_verified ? (
                  <>
                    <i className="bi bi-check-circle-fill"></i> Verified
                  </>
                ) : (
                  <>
                    <i className="bi bi-exclamation-circle"></i> Not verified
                  </>
                )}
              </span>
            </div>
            {!googleStatus.email_verified && (
              <button
                type="button"
                className="verify-btn"
                onClick={handleSendVerification}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <SyncLoader loading={true} size={5} color="#22c55e" />
                ) : (
                  <>
                    <i className="bi bi-envelope"></i>
                    Send Verification
                  </>
                )}
              </button>
            )}
          </div>

          {/* Password Status */}
          <div className="security-item">
            <div className="security-icon">
              <i className="bi bi-key"></i>
            </div>
            <div className="security-info">
              <span className="security-label">Password</span>
              <span
                className={`security-value ${
                  googleStatus.has_password ? "set" : "not-set"
                }`}
              >
                {googleStatus.has_password ? (
                  <>
                    <i className="bi bi-check-circle-fill"></i> Password set
                  </>
                ) : (
                  <>
                    <i className="bi bi-exclamation-circle"></i> No password
                    (Google sign-in only)
                  </>
                )}
              </span>
            </div>
            <button
              type="button"
              className={
                googleStatus.has_password
                  ? "update-password-btn"
                  : "set-password-btn"
              }
              onClick={() => setShowPasswordForm(true)}
            >
              <i
                className={
                  googleStatus.has_password ? "bi bi-pencil" : "bi bi-plus-lg"
                }
              ></i>
              {googleStatus.has_password ? "Update Password" : "Set Password"}
            </button>
          </div>
        </div>

        {/* Set/Update Password Form */}
        {showPasswordForm && (
          <div className="password-form-container">
            <form onSubmit={handlePasswordSubmit} className="password-form">
              <h4>
                {googleStatus.has_password
                  ? "Update Password"
                  : "Set Account Password"}
              </h4>
              <p className="form-description">
                {googleStatus.has_password
                  ? "Enter your current password and a new password to update."
                  : "Setting a password allows you to log in with email/password in addition to Google."}
              </p>

              {googleStatus.has_password && (
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />
              </div>

              {passwordError && (
                <div className="password-error">
                  <i className="bi bi-exclamation-circle"></i>
                  {passwordError}
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError("");
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <SyncLoader loading={true} size={5} color="#fff" />
                  ) : googleStatus.has_password ? (
                    "Update Password"
                  ) : (
                    "Set Password"
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Sign-in Methods Info */}
      <div className="settings-section info-section">
        <div className="info-card">
          <i className="bi bi-info-circle"></i>
          <div className="info-content">
            <strong>About Sign-in Methods</strong>
            <p>
              You can use multiple sign-in methods. When you link Google, both
              Google sign-in and password sign-in (if set) will work. You cannot
              unlink Google if you haven&apos;t set a password, as you need at
              least one way to access your account.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone - Delete Account */}
      <div className="settings-section danger-zone">
        <h3 className="danger-heading">
          <i className="bi bi-exclamation-triangle"></i> Danger Zone
        </h3>
        <div className="danger-content">
          <div className="danger-info">
            <p>
              Permanently remove your Personal Account and all of its contents
              from the Nexus platform. This action is not reversible, so please
              continue with caution.
            </p>
          </div>
          <button
            type="button"
            className="danger-btn danger-btn--simple"
            onClick={() => setShowDeleteConfirmation(true)}
            disabled={actionLoading}
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div
          className="modal-overlay"
          onClick={() => !actionLoading && setShowDeleteConfirmation(false)}
        >
          <div
            className="modal-content delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                <i className="bi bi-exclamation-triangle-fill"></i>
                Confirm Account Deletion
              </h2>
              <button
                className="close-btn"
                onClick={() => setShowDeleteConfirmation(false)}
                disabled={actionLoading}
              >
                <i className="bi bi-x"></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="warning-banner">
                <i className="bi bi-exclamation-circle-fill"></i>
                <div>
                  <p>
                    Permanently remove your Personal Account and all of its
                    contents from the Vercel platform. This action is not
                    reversible, so please continue with caution.
                  </p>
                </div>
              </div>

              {googleStatus.has_password && (
                <div className="form-group">
                  <label htmlFor="deletePassword">
                    Enter your password to confirm:
                  </label>
                  <input
                    type="password"
                    id="deletePassword"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Your password"
                    autoComplete="current-password"
                    disabled={actionLoading}
                  />
                </div>
              )}

              {!googleStatus.has_password && (
                <p className="google-only-warning">
                  You are signed in with Google. Click Delete My Account to
                  proceed with deletion.
                </p>
              )}

              {deleteError && (
                <div className="delete-error">
                  <i className="bi bi-exclamation-circle"></i>
                  {deleteError}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setDeletePassword("");
                  setDeleteError("");
                }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="delete-confirm-btn"
                onClick={handleDeleteAccount}
                disabled={
                  actionLoading ||
                  (googleStatus.has_password && !deletePassword)
                }
              >
                {actionLoading ? (
                  <SyncLoader loading={true} size={5} color="#fff" />
                ) : (
                  <>Delete My Account</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
