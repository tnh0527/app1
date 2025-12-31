import { useState, useEffect, useRef, useCallback } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { useAuth } from "../../contexts/AuthContext";
import authApi from "../../api/authApi";

const Login = () => {
  const [isActive, setIsActive] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ login: {}, register: {} });
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const canvasRef = useRef(null);
  const mouseRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });

  // Mount animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Cursor tracking for interactive effects (invisible but affects particles)
  const handleMouseMove = useCallback((e) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // Enhanced particle background with cursor interaction and geometric objects
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;
    let particles = [];
    let geometricObjects = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticle = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 1.5 + 0.5,
      speedX: (Math.random() - 0.5) * 0.2,
      speedY: (Math.random() - 0.5) * 0.2,
      opacity: Math.random() * 0.3 + 0.1,
      pulse: Math.random() * Math.PI * 2,
      isGold: Math.random() > 0.3,
    });

    // Create geometric objects with physics properties
    const createGeometricObject = (type) => {
      const baseSize = 15 + Math.random() * 25;
      return {
        type, // 'hexagon', 'triangle', 'diamond', 'ring'
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: baseSize,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.008,
        vx: 0,
        vy: 0,
        baseX: 0,
        baseY: 0,
        opacity: 0.08 + Math.random() * 0.08,
        pulse: Math.random() * Math.PI * 2,
      };
    };

    const initParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 20000);
      for (let i = 0; i < count; i++) {
        particles.push(createParticle());
      }

      // Initialize geometric objects - sparse distribution
      geometricObjects = [];
      const types = ["hexagon", "triangle", "diamond", "ring"];
      const objectCount = Math.min(
        8,
        Math.floor((canvas.width * canvas.height) / 150000)
      );

      for (let i = 0; i < objectCount; i++) {
        const obj = createGeometricObject(types[i % types.length]);
        obj.baseX = obj.x;
        obj.baseY = obj.y;
        geometricObjects.push(obj);
      }
    };

    // Draw different geometric shapes
    const drawHexagon = (ctx, x, y, size, rotation) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = rotation + (Math.PI / 3) * i;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const drawTriangle = (ctx, x, y, size, rotation) => {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const angle = rotation + ((Math.PI * 2) / 3) * i - Math.PI / 2;
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const drawDiamond = (ctx, x, y, size, rotation) => {
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = rotation + (Math.PI / 2) * i;
        const stretch = i % 2 === 0 ? size * 1.4 : size * 0.8;
        const px = x + stretch * Math.cos(angle);
        const py = y + stretch * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };

    const drawRing = (ctx, x, y, size) => {
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.closePath();
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const mouse = mouseRef.current;

      // Draw and update geometric objects
      geometricObjects.forEach((obj) => {
        const dx = mouse.x - obj.x;
        const dy = mouse.y - obj.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 200;

        // Physics-based cursor repulsion with spring return
        if (dist < maxDist && dist > 0) {
          const force = ((maxDist - dist) / maxDist) * 3;
          const angle = Math.atan2(dy, dx);
          obj.vx -= Math.cos(angle) * force * 0.15;
          obj.vy -= Math.sin(angle) * force * 0.15;
          // Speed up rotation when near cursor
          obj.rotationSpeed = (Math.random() - 0.5) * 0.02;
        }

        // Spring force back to original position
        const springStrength = 0.02;
        const dampening = 0.95;
        obj.vx += (obj.baseX - obj.x) * springStrength;
        obj.vy += (obj.baseY - obj.y) * springStrength;
        obj.vx *= dampening;
        obj.vy *= dampening;

        // Update position
        obj.x += obj.vx;
        obj.y += obj.vy;
        obj.rotation += obj.rotationSpeed;
        obj.pulse += 0.02;

        // Subtle pulsing
        const pulseScale = 1 + Math.sin(obj.pulse) * 0.05;
        const drawSize = obj.size * pulseScale;
        const opacity = obj.opacity * (0.8 + Math.sin(obj.pulse * 0.5) * 0.2);

        // Draw the geometric object
        ctx.save();
        ctx.strokeStyle = `rgba(212, 168, 83, ${opacity})`;
        ctx.lineWidth = 1;

        switch (obj.type) {
          case "hexagon":
            drawHexagon(ctx, obj.x, obj.y, drawSize, obj.rotation);
            break;
          case "triangle":
            drawTriangle(ctx, obj.x, obj.y, drawSize, obj.rotation);
            break;
          case "diamond":
            drawDiamond(ctx, obj.x, obj.y, drawSize, obj.rotation);
            break;
          case "ring":
            drawRing(ctx, obj.x, obj.y, drawSize);
            break;
        }
        ctx.stroke();
        ctx.restore();
      });

      // Draw particles
      particles.forEach((p, i) => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 150;

        if (dist < maxDist) {
          const force = ((maxDist - dist) / maxDist) * 0.5;
          const angle = Math.atan2(dy, dx);
          p.x -= Math.cos(angle) * force;
          p.y -= Math.sin(angle) * force;
        }

        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.015;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const pulseOpacity = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));
        const color = p.isGold
          ? `rgba(212, 168, 83, ${pulseOpacity})`
          : `rgba(100, 180, 180, ${pulseOpacity * 0.5})`;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        // Connect nearby particles
        particles.slice(i + 1).forEach((p2) => {
          const dx2 = p.x - p2.x;
          const dy2 = p.y - p2.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (dist2 < 80) {
            const alpha = 0.06 * (1 - dist2 / 80);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(212, 168, 83, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(drawParticles);
    };

    resize();
    initParticles();
    drawParticles();

    const handleResize = () => {
      resize();
      initParticles();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const errorText = (value) => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (pwd) => {
    return pwd.length >= 8;
  };

  const validateUsername = (uname) => {
    return (
      uname.length >= 3 && uname.length <= 20 && /^[a-zA-Z0-9_]+$/.test(uname)
    );
  };

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, [type]: {} }));

    // Client-side validation
    if (type === "register") {
      const validationErrors = {};

      if (!validateUsername(newUsername)) {
        validationErrors.username =
          "Username must be 3-20 characters (letters, numbers, underscores only)";
      }
      if (!validateEmail(newEmail)) {
        validationErrors.email = "Please enter a valid email address";
      }
      if (!validatePassword(newPassword)) {
        validationErrors.password = "Password must be at least 8 characters";
      }
      if (!newFirstName.trim()) {
        validationErrors.first_name = "First name is required";
      }
      if (!newLastName.trim()) {
        validationErrors.last_name = "Last name is required";
      }

      if (Object.keys(validationErrors).length > 0) {
        setErrors((prev) => ({ ...prev, register: validationErrors }));
        return;
      }
    } else {
      // Login validation
      if (!username.trim()) {
        setErrors((prev) => ({
          ...prev,
          login: { username: "Username is required" },
        }));
        return;
      }
      if (!password) {
        setErrors((prev) => ({
          ...prev,
          login: { password: "Password is required" },
        }));
        return;
      }
    }

    setLoading(true);

    try {
      if (type === "register") {
        const firstName = newFirstName.trim();
        const lastName = newLastName.trim();

        const payload = {
          username: newUsername.trim(),
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          first_name: firstName,
          last_name: lastName,
        };
        await authApi.register({ ...payload });
        setIsActive(false);
        setNewUsername("");
        setNewEmail("");
        setNewPassword("");
        setNewFirstName("");
        setNewLastName("");
        console.log("Registered successfully!");
      } else {
        await authApi.login({
          username: username.trim(),
          password,
          remember_me: rememberMe,
        });
        login(rememberMe);
        // Trigger login success animation
        setLoginSuccess(true);
        // Store flag to trigger dashboard animation
        sessionStorage.setItem("justLoggedIn", "true");
        // Navigate after animation
        setTimeout(() => {
          navigate("/dashboard");
        }, 800);
        console.log("Logged in successfully!");
      }
    } catch (error) {
      console.error("Error:", error);
      if (error.response && error.response.data) {
        setErrors((prev) => ({ ...prev, [type]: error.response.data }));
      } else {
        setErrors((prev) => ({
          ...prev,
          [type]: { non_field_errors: "An error occurred. Please try again." },
        }));
      }
      if (type === "login") {
        setPassword("");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsActive(false);
    setErrors({ login: {}, register: {} });
  };

  const switchToRegister = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsActive(true);
    setErrors({ login: {}, register: {} });
  };

  return (
    <div
      className={`login-page ${mounted ? "mounted" : ""} ${
        loginSuccess ? "login-success" : ""
      }`}
    >
      {/* Animated particle canvas background */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* Subtle ambient orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      {/* Subtle grid overlay */}
      <div className="grid-overlay"></div>

      {/* Login success overlay */}
      {loginSuccess && (
        <div className="success-overlay">
          <div className="success-content">
            <div className="success-logo">
              <img src="/nexus_logo.svg" alt="Nexus" />
            </div>
            <div className="success-text">Welcome back</div>
          </div>
        </div>
      )}

      <div className={`wrapper ${isActive ? "active" : ""}`}>
        {/* Glow effects */}
        <div className="glow-effect glow-1"></div>
        <div className="glow-effect glow-2"></div>

        {/* Animated border */}
        <div className="border-glow"></div>

        {/* Login Form */}
        <div className="form-box login">
          <div className="form-header">
            <div
              className="logo-container animation"
              style={{ "--i": 0, "--j": 0 }}
            >
              <div className="logo-wrapper">
                <img src="/nexus_logo.svg" alt="Nexus" className="logo-image" />
                <div className="logo-glow"></div>
              </div>
            </div>
            <h2 className="animation" style={{ "--i": 1, "--j": 1 }}>
              Welcome Back
            </h2>
            <p className="subtitle animation" style={{ "--i": 2, "--j": 2 }}>
              Sign in to continue to your dashboard
            </p>
          </div>

          <form onSubmit={(e) => handleSubmit(e, "login")} noValidate>
            <div className="input-box animation" style={{ "--i": 3, "--j": 3 }}>
              <input
                type="text"
                id="username"
                value={username}
                autoComplete="off"
                required
                onFocus={() => {
                  if (errors.login.username) {
                    setErrors((prev) => ({
                      ...prev,
                      login: { ...prev.login, username: null },
                    }));
                  }
                }}
                onChange={(e) => setUsername(e.target.value)}
                className={`form-control ${
                  errors.login.username ? "is-invalid" : ""
                }`}
              />
              <label>Username</label>
              <i className="bx bxs-user"></i>
              <div className="input-glow"></div>
              {errors.login.username && (
                <div className="invalid-feedback">{errors.login.username}</div>
              )}
            </div>

            <div className="input-box animation" style={{ "--i": 4, "--j": 4 }}>
              <input
                type="password"
                id="password"
                value={password}
                autoComplete="off"
                required
                onFocus={() => {
                  if (errors.login.password) {
                    setErrors((prev) => ({
                      ...prev,
                      login: { ...prev.login, password: null },
                    }));
                  }
                }}
                onChange={(e) => setPassword(e.target.value)}
                className={`form-control ${
                  errors.login.password ? "is-invalid" : ""
                }`}
              />
              <label>Password</label>
              <i className="bx bxs-lock-alt"></i>
              <div className="input-glow"></div>
              {errors.login.password && (
                <div className="invalid-feedback">{errors.login.password}</div>
              )}
            </div>

            <div
              className="remember-row animation"
              style={{ "--i": 5, "--j": 5 }}
            >
              <label className="remember-label" htmlFor="rememberMe">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  disabled={loading}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkmark"></span>
                Remember me
              </label>
            </div>

            <button
              type="submit"
              className="button animation"
              style={{ "--i": 6, "--j": 6 }}
              disabled={loading}
            >
              <span className="btn-content">
                {loading ? (
                  <ClipLoader loading={loading} size={22} color={"#d4a853"} />
                ) : (
                  <>
                    <span>Sign In</span>
                    <i className="bx bx-right-arrow-alt"></i>
                  </>
                )}
              </span>
              <div className="btn-glow"></div>
            </button>

            <div
              className="logreg-link animation"
              style={{ "--i": 7, "--j": 7 }}
            >
              <p>
                Don&apos;t have an account?
                <a className="register-link" onClick={switchToRegister}>
                  Create Account
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* Register Form */}
        <div className="form-box register">
          <div className="form-header">
            <div
              className="logo-container animation"
              style={{ "--i": 17, "--j": 0 }}
            >
              <div className="logo-wrapper">
                <img src="/nexus_logo.svg" alt="Nexus" className="logo-image" />
                <div className="logo-glow"></div>
              </div>
            </div>
            <h2 className="animation" style={{ "--i": 18, "--j": 1 }}>
              Create Account
            </h2>
            <p className="subtitle animation" style={{ "--i": 19, "--j": 2 }}>
              Join us and start your journey
            </p>
          </div>

          <form onSubmit={(e) => handleSubmit(e, "register")} noValidate>
            <div
              className="input-box animation"
              style={{ "--i": 20, "--j": 3 }}
            >
              <input
                type="text"
                id="newusername"
                value={newUsername}
                maxLength={20}
                autoComplete="off"
                required
                onFocus={() => {
                  if (errors.register.username) {
                    setErrors((prev) => ({
                      ...prev,
                      register: { ...prev.register, username: null },
                    }));
                  }
                }}
                onChange={(e) => setNewUsername(e.target.value)}
                className={`form-control ${
                  errors.register.username ? "is-invalid" : ""
                }`}
              />
              <label>Username</label>
              <i className="bx bxs-user"></i>
              <div className="input-glow"></div>
              {errorText(errors.register.username) && (
                <div className="invalid-feedback">
                  {errorText(errors.register.username)}
                </div>
              )}
            </div>

            <div
              className="input-box animation"
              style={{ "--i": 21, "--j": 4 }}
            >
              <input
                type="text"
                id="email"
                value={newEmail}
                autoComplete="off"
                required
                onFocus={() => {
                  if (errors.register.email) {
                    setErrors((prev) => ({
                      ...prev,
                      register: { ...prev.register, email: null },
                    }));
                  }
                }}
                onChange={(e) => setNewEmail(e.target.value)}
                className={`form-control ${
                  errors.register.email ? "is-invalid" : ""
                }`}
              />
              <label>Email</label>
              <i className="bx bxs-envelope"></i>
              <div className="input-glow"></div>
              {errorText(errors.register.email) && (
                <div className="invalid-feedback">
                  {errorText(errors.register.email)}
                </div>
              )}
            </div>

            <div className="name-row animation" style={{ "--i": 22, "--j": 5 }}>
              <div className="input-box half">
                <input
                  type="text"
                  id="firstname"
                  value={newFirstName}
                  autoComplete="off"
                  required
                  onFocus={() => {
                    if (errors.register.first_name) {
                      setErrors((prev) => ({
                        ...prev,
                        register: { ...prev.register, first_name: null },
                      }));
                    }
                  }}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  className={`form-control ${
                    errors.register.first_name ? "is-invalid" : ""
                  }`}
                />
                <label>First name</label>
                <div className="input-glow"></div>
                {errorText(errors.register.first_name) && (
                  <div className="invalid-feedback">
                    {errorText(errors.register.first_name)}
                  </div>
                )}
              </div>

              <div className="input-box half">
                <input
                  type="text"
                  id="lastname"
                  value={newLastName}
                  autoComplete="off"
                  required
                  onFocus={() => {
                    if (errors.register.last_name) {
                      setErrors((prev) => ({
                        ...prev,
                        register: { ...prev.register, last_name: null },
                      }));
                    }
                  }}
                  onChange={(e) => setNewLastName(e.target.value)}
                  className={`form-control ${
                    errors.register.last_name ? "is-invalid" : ""
                  }`}
                />
                <label>Last name</label>
                <div className="input-glow"></div>
                {errorText(errors.register.last_name) && (
                  <div className="invalid-feedback">
                    {errorText(errors.register.last_name)}
                  </div>
                )}
              </div>
            </div>

            <div
              className="input-box animation"
              style={{ "--i": 23, "--j": 6 }}
            >
              <input
                type="password"
                id="newpassword"
                value={newPassword}
                maxLength={50}
                autoComplete="off"
                required
                onFocus={() => {
                  if (errors.register.password) {
                    setErrors((prev) => ({
                      ...prev,
                      register: { ...prev.register, password: null },
                    }));
                  }
                }}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`form-control ${
                  errors.register.password ? "is-invalid" : ""
                }`}
              />
              <label>Password</label>
              <i className="bx bxs-lock-alt"></i>
              <div className="input-glow"></div>
              {errorText(errors.register.password) && (
                <div className="invalid-feedback">
                  {errorText(errors.register.password)}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="button animation"
              style={{ "--i": 24, "--j": 7 }}
              disabled={loading}
            >
              <span className="btn-content">
                {loading ? (
                  <ClipLoader loading={loading} size={22} color={"#d4a853"} />
                ) : (
                  <>
                    <span>Create Account</span>
                    <i className="bx bx-right-arrow-alt"></i>
                  </>
                )}
              </span>
              <div className="btn-glow"></div>
            </button>

            <div
              className="logreg-link animation"
              style={{ "--i": 25, "--j": 8 }}
            >
              <p>
                Already have an account?
                <a className="login-link" onClick={switchToLogin}>
                  Sign In
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* Sliding panel */}
        <div className="toggle-panel">
          <div className="panel-content login-panel">
            <div className="panel-icon">
              <i className="bx bx-log-in-circle"></i>
            </div>
            <h3>Already a Member?</h3>
            <p>
              Sign in to access your personalized dashboard and continue where
              you left off.
            </p>
            <button type="button" onClick={switchToLogin}>
              Sign In
            </button>
          </div>
          <div className="panel-content register-panel">
            <div className="panel-icon">
              <i className="bx bx-user-plus"></i>
            </div>
            <h3>New Here?</h3>
            <p>
              Create an account and discover all the amazing features waiting
              for you.
            </p>
            <button type="button" onClick={switchToRegister}>
              Create Account
            </button>
          </div>
        </div>
      </div>

      {/* Floating decorative elements */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
        <div className="shape shape-4"></div>
      </div>
    </div>
  );
};

export default Login;
