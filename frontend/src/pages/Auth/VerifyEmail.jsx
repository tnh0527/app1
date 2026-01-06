import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import authApi from "../../api/authApi";
import "./Auth.css";

const VerifyEmail = () => {
  const { uid, token } = useParams();
  const canvasRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

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
        ctx.fillStyle = `rgba(74, 222, 128, ${this.opacity})`;
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

  // Verify email on mount
  useEffect(() => {
    const verifyEmail = async () => {
      if (!uid || !token) {
        setMessage({ type: "error", text: "Invalid verification link." });
        setLoading(false);
        return;
      }

      try {
        await authApi.verifyEmail(uid, token);
        setVerified(true);
        setMessage({
          type: "success",
          text: "Your email has been verified successfully!",
        });
      } catch (error) {
        const errorMsg =
          error.response?.data?.error ||
          "Failed to verify email. The link may be invalid or expired.";
        setMessage({ type: "error", text: errorMsg });
        setVerified(false);
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [uid, token]);

  return (
    <div className="auth-page verify-email-page">
      <canvas ref={canvasRef} className="auth-canvas" />

      <div className="auth-container">
        <div className="auth-card">
          {loading ? (
            <div className="auth-loading">
              <ClipLoader size={40} color="#4ade80" />
              <p>Verifying your email...</p>
            </div>
          ) : verified ? (
            <div className="auth-success">
              <div className="success-icon">
                <i className="bx bx-check-circle"></i>
              </div>
              <h2>Email Verified!</h2>
              <p>Your email address has been successfully verified.</p>
              <p className="success-subtitle">
                You can now enjoy all features of your account.
              </p>
              <Link to="/dashboard" className="auth-link-btn success-btn">
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <div className="auth-error">
              <div className="error-icon">
                <i className="bx bx-x-circle"></i>
              </div>
              <h2>Verification Failed</h2>
              <p>{message.text}</p>
              <div className="auth-error-actions">
                <Link to="/profile/settings" className="auth-link-btn">
                  Request New Link
                </Link>
                <Link to="/dashboard" className="auth-link-btn secondary">
                  Go to Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
