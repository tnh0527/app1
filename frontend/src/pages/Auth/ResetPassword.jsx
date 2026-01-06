import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import authApi from "../../api/authApi";
import "./Auth.css";

const ResetPassword = () => {
  const { uid, token } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [validLink, setValidLink] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [success, setSuccess] = useState(false);

  // Animated background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.3 + 0.1;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 168, 83, ${this.opacity})`;
        ctx.fill();
      }
    }

    const init = () => {
      particles = [];
      for (let i = 0; i < 50; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.update();
        p.draw();
      });
      animationId = requestAnimationFrame(animate);
    };

    resize();
    init();
    animate();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Verify the token is valid on mount
  useEffect(() => {
    const verifyToken = async () => {
      try {
        // We'll just set validLink to true and let the actual reset handle verification
        // Since we don't have a separate verify endpoint, the reset will tell us if it's invalid
        setValidLink(true);
      } catch {
        setValidLink(false);
        setMessage({
          type: "error",
          text: "This password reset link is invalid or has expired.",
        });
      } finally {
        setVerifying(false);
      }
    };

    if (uid && token) {
      verifyToken();
    } else {
      setVerifying(false);
      setValidLink(false);
      setMessage({ type: "error", text: "Invalid password reset link." });
    }
  }, [uid, token]);

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "Please fill in all fields." });
      return;
    }

    if (!validatePassword(newPassword)) {
      setMessage({
        type: "error",
        text: "Password must be at least 8 characters long.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(uid, token, newPassword);
      setSuccess(true);
      setMessage({
        type: "success",
        text: "Your password has been reset successfully!",
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (error) {
      const errorMsg =
        error.response?.data?.error ||
        "Failed to reset password. The link may be invalid or expired.";
      setMessage({ type: "error", text: errorMsg });
      setValidLink(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <canvas ref={canvasRef} className="auth-canvas" />

      <div className="auth-container">
        <div className="auth-card">
          {verifying ? (
            <div className="auth-loading">
              <ClipLoader size={40} color="#d4a853" />
              <p>Verifying reset link...</p>
            </div>
          ) : success ? (
            <div className="auth-success">
              <div className="success-icon">
                <i className="bx bx-check-circle"></i>
              </div>
              <h2>Password Reset!</h2>
              <p>Your password has been changed successfully.</p>
              <p className="redirect-text">Redirecting to login...</p>
              <Link to="/" className="auth-link-btn">
                Go to Login
              </Link>
            </div>
          ) : validLink ? (
            <>
              <div className="auth-icon">
                <i className="bx bx-lock-alt"></i>
              </div>
              <h2>Reset Your Password</h2>
              <p className="auth-subtitle">Enter your new password below.</p>

              <form onSubmit={handleSubmit}>
                <div className="auth-input-group">
                  <i className="bx bx-lock"></i>
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="auth-input-group">
                  <i className="bx bx-lock-open"></i>
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                {message.text && (
                  <div className={`auth-message ${message.type}`}>
                    <i
                      className={`bx ${
                        message.type === "success"
                          ? "bx-check-circle"
                          : "bx-error-circle"
                      }`}
                    ></i>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={loading}
                >
                  {loading ? (
                    <ClipLoader size={18} color="#1a1a2e" />
                  ) : (
                    <>
                      <i className="bx bx-check"></i>
                      Reset Password
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="auth-error">
              <div className="error-icon">
                <i className="bx bx-x-circle"></i>
              </div>
              <h2>Invalid Link</h2>
              <p>
                {message.text ||
                  "This password reset link is invalid or has expired."}
              </p>
              <Link to="/" className="auth-link-btn">
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
