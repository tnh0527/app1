import { useState, useEffect, useRef, useCallback, useContext } from "react";
import "./Login.css";
import { useNavigate, useLocation } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { useAuth } from "../../contexts/AuthContext";
import { ProfileContext } from "../../contexts/ProfileContext";
import authApi from "../../api/authApi";
import { dashboardApi as financialsDashboardApi } from "../../api/financialsApi";
import { dashboardApi as subscriptionsDashboardApi } from "../../api/subscriptionsApi";
import {
  dashboardApi as travelDashboardApi,
  tripsApi,
} from "../../api/travelApi";
import {
  setCache,
  CACHE_KEYS,
  getWeatherCacheKey,
} from "../../utils/sessionCache";

// Google OAuth Client ID - should match backend GOOGLE_OAUTH_CLIENT_ID
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showLogoutOverlay, setShowLogoutOverlay] = useState(false);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState({
    type: "",
    text: "",
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { profile } = useContext(ProfileContext);
  const canvasRef = useRef(null);
  const mouseRef = useRef({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
  });
  const navTimeoutRef = useRef(null);
  const googleButtonRef = useRef(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // If we're showing the login success animation, let that flow control navigation.
      if (loginSuccess || sessionStorage.getItem("justLoggedIn") === "true") {
        return;
      }

      const redirectPath =
        sessionStorage.getItem("redirectAfterLogin") || "/dashboard";
      sessionStorage.removeItem("redirectAfterLogin");
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, loginSuccess]);

  // Check for session expired state
  useEffect(() => {
    if (location.state?.sessionExpired) {
      setSessionExpiredMessage(true);
      // Clear the state to prevent showing message on refresh
      window.history.replaceState({}, document.title);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => setSessionExpiredMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  // Mount animation trigger
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Show logout overlay if redirected after logout (flag set by Sidebar)
  useEffect(() => {
    const justLoggedOut = sessionStorage.getItem("justLoggedOut");
    if (justLoggedOut === "true") {
      setShowLogoutOverlay(true);
      sessionStorage.removeItem("justLoggedOut");
      const hideTimer = setTimeout(() => setShowLogoutOverlay(false), 800);
      return () => clearTimeout(hideTimer);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (navTimeoutRef.current) {
        clearTimeout(navTimeoutRef.current);
      }
    };
  }, []);

  // Cursor tracking for interactive effects (invisible but affects particles)
  const handleMouseMove = useCallback((e) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  // Advanced futuristic background with neural network, holographic elements, and energy effects
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationId;
    let nodes = [];
    let dataStreams = [];
    // eslint-disable-next-line no-unused-vars
    let holoStructures = [];
    // eslint-disable-next-line no-unused-vars
    let gridCracks = [];
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Neural network nodes - interconnected constellation points
    const createNode = () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      baseX: 0,
      baseY: 0,
      vx: 0,
      vy: 0,
      size: Math.random() * 2 + 1,
      pulsePhase: Math.random() * Math.PI * 2,
      energy: Math.random() * 0.5 + 0.3,
      isActive: Math.random() > 0.7,
      connectionStrength: Math.random() * 0.5 + 0.5,
    });

    // Data stream - vertical flowing lines
    const createDataStream = () => {
      const x = Math.random() * canvas.width;
      return {
        x,
        baseX: x,
        vx: 0,
        chars: [],
        speed: Math.random() * 1 + 0.5,
        opacity: Math.random() * 0.15 + 0.05,
        length: Math.floor(Math.random() * 15) + 5,
      };
    };

    const initElements = () => {
      // Neural network nodes (reduced)
      nodes = [];
      const nodeCount = Math.floor((canvas.width * canvas.height) / 35000);
      for (let i = 0; i < nodeCount; i++) {
        const node = createNode();
        node.baseX = node.x;
        node.baseY = node.y;
        nodes.push(node);
      }

      // 3D holographic structures removed per user request
      holoStructures = [];

      // Data streams
      dataStreams = [];
      const streamCount = Math.floor(canvas.width / 80);
      for (let i = 0; i < streamCount; i++) {
        const stream = createDataStream();
        stream.chars = Array(stream.length)
          .fill(0)
          .map(() => ({
            y: Math.random() * canvas.height,
            char: String.fromCharCode(0x30a0 + Math.random() * 96),
            opacity: Math.random(),
          }));
        dataStreams.push(stream);
      }
    };

    // Persistent active crack centered on cursor
    let activeCrack = null;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let mouseInactive = false;
    let inactivityTimer = null;
    let healingProgress = 0; // 0 = fully visible, 1 = fully healed
    const INACTIVITY_DELAY = 1500; // ms before healing starts
    const HEALING_DURATION = 4.0; // seconds for full heal (increased)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      time += 0.016;
      const mouse = mouseRef.current;

      // Track mouse activity for healing
      const currentMouseX = mouse?.x ?? -1000;
      const currentMouseY = mouse?.y ?? -1000;
      const mouseMoved =
        currentMouseX !== lastMouseX || currentMouseY !== lastMouseY;

      if (mouseMoved) {
        // Reset healing when mouse moves
        lastMouseX = currentMouseX;
        lastMouseY = currentMouseY;
        mouseInactive = false;
        healingProgress = 0;

        // Clear and restart inactivity timer
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
          mouseInactive = true;
        }, INACTIVITY_DELAY);
      }

      // Progress healing animation when inactive
      if (mouseInactive && healingProgress < 1) {
        healingProgress = Math.min(
          1,
          healingProgress + 0.016 / HEALING_DURATION
        );
      }

      // Maintain a persistent crack at the cursor position
      if (mouse && mouse.x != null) {
        if (!activeCrack)
          activeCrack = {
            x: mouse.x,
            y: mouse.y,
            maxRadius: 200,
            opacity: 0.8,
          };
        activeCrack.x = mouse.x;
        activeCrack.y = mouse.y;
      }

      // Draw persistent grid lines (crack) around the cursor
      if (activeCrack) {
        const gridSize = 100;
        const baseRadius = activeCrack.maxRadius;
        const globalOpacity = 1 - healingProgress; // Apply global healing fade

        // Vertical lines with irregular radius
        for (
          let px = activeCrack.x - baseRadius;
          px <= activeCrack.x + baseRadius;
          px += gridSize
        ) {
          const lineX = Math.round(px / gridSize) * gridSize;
          const distFromCenter = Math.abs(lineX - activeCrack.x);
          const normalizedDist = distFromCenter / baseRadius;

          // Irregular radius variation per line (using line position as seed)
          const radiusVariation = 0.7 + Math.sin(lineX * 0.05) * 0.3;
          const effectiveRadius = baseRadius * radiusVariation;

          if (distFromCenter < effectiveRadius) {
            // Quadratic falloff for brighter center
            const falloff = 1 - Math.pow(normalizedDist / radiusVariation, 0.6);
            const lineOpacity =
              activeCrack.opacity * Math.max(0, falloff) * 1.2 * globalOpacity;

            if (lineOpacity > 0.02) {
              // Variable line length based on distance from center
              const lengthVariation = 0.6 + (1 - normalizedDist) * 0.4;
              const lineHeight = effectiveRadius * lengthVariation;

              // Healing: outside-in (ends -> center). Visible central segment shrinks inward
              const healStart = activeCrack.y - lineHeight;
              const healEnd = activeCrack.y + lineHeight;
              const totalLen = healEnd - healStart;
              const healedEdge = (totalLen / 2) * healingProgress; // amount removed from each end
              const visibleTop = healStart + healedEdge;
              const visibleBottom = healEnd - healedEdge;

              if (visibleTop < visibleBottom) {
                // gravity-like inward pull: signed displacement toward cursor
                const MAX_BEND = 100;
                const distToCursorX = mouse.x - lineX; // signed distance
                const absDistX = Math.abs(distToCursorX);
                const bendInfluence = Math.max(
                  0,
                  1 - absDistX / effectiveRadius
                );
                // cubic falloff for more realistic gravity pull
                const gravityStrength = Math.pow(bendInfluence, 1.8);
                let rawBend = distToCursorX * 0.28 * gravityStrength;
                // damp when inactive or healing
                rawBend *= mouseInactive ? 0 : 1;
                rawBend *= 1 - healingProgress;
                const bend = Math.max(-MAX_BEND, Math.min(MAX_BEND, rawBend));

                ctx.beginPath();
                ctx.lineWidth = 1.4 + (1 - normalizedDist) * 0.8;
                const gradient = ctx.createLinearGradient(
                  lineX,
                  visibleTop,
                  lineX + bend,
                  visibleBottom
                );
                gradient.addColorStop(0, `rgba(212, 168, 83, 0)`);
                gradient.addColorStop(
                  0.15,
                  `rgba(212, 168, 83, ${lineOpacity})`
                );
                gradient.addColorStop(
                  0.85,
                  `rgba(212, 168, 83, ${lineOpacity})`
                );
                gradient.addColorStop(1, `rgba(212, 168, 83, 0)`);
                ctx.strokeStyle = gradient;
                const midY = (visibleTop + visibleBottom) * 0.5;
                ctx.moveTo(lineX, visibleTop);
                ctx.quadraticCurveTo(lineX + bend, midY, lineX, visibleBottom);
                ctx.stroke();
              }
            }
          }
        }

        // Horizontal lines with irregular radius
        for (
          let py = activeCrack.y - baseRadius;
          py <= activeCrack.y + baseRadius;
          py += gridSize
        ) {
          const lineY = Math.round(py / gridSize) * gridSize;
          const distFromCenter = Math.abs(lineY - activeCrack.y);
          const normalizedDist = distFromCenter / baseRadius;

          // Irregular radius variation per line (using line position as seed)
          const radiusVariation = 0.7 + Math.sin(lineY * 0.05) * 0.3;
          const effectiveRadius = baseRadius * radiusVariation;

          if (distFromCenter < effectiveRadius) {
            // Quadratic falloff for brighter center
            const falloff = 1 - Math.pow(normalizedDist / radiusVariation, 0.6);
            const lineOpacity =
              activeCrack.opacity * Math.max(0, falloff) * 1.2 * globalOpacity;

            if (lineOpacity > 0.02) {
              // Variable line length based on distance from center
              const lengthVariation = 0.6 + (1 - normalizedDist) * 0.4;
              const lineWidth = effectiveRadius * lengthVariation;

              // Healing: outside-in (ends -> center). Visible central segment shrinks inward
              const healStart = activeCrack.x - lineWidth;
              const healEnd = activeCrack.x + lineWidth;
              const totalLen = healEnd - healStart;
              const healedEdge = (totalLen / 2) * healingProgress;
              const visibleLeft = healStart + healedEdge;
              const visibleRight = healEnd - healedEdge;

              if (visibleLeft < visibleRight) {
                // gravity-like inward pull vertically: signed displacement toward cursor
                const MAX_BEND_H = 95;
                const distToCursorY = mouse.y - lineY; // signed distance
                const absDistY = Math.abs(distToCursorY);
                const bendInfluenceH = Math.max(
                  0,
                  1 - absDistY / effectiveRadius
                );
                // cubic falloff for more realistic gravity pull
                const gravityStrengthH = Math.pow(bendInfluenceH, 1.8);
                let rawBendV = distToCursorY * 0.24 * gravityStrengthH;
                rawBendV *= mouseInactive ? 0 : 1;
                rawBendV *= 1 - healingProgress;
                const bendV = Math.max(
                  -MAX_BEND_H,
                  Math.min(MAX_BEND_H, rawBendV)
                );

                ctx.beginPath();
                ctx.lineWidth = 1.4 + (1 - normalizedDist) * 0.8;
                const gradient = ctx.createLinearGradient(
                  visibleLeft,
                  lineY,
                  visibleRight,
                  lineY + bendV
                );
                gradient.addColorStop(0, `rgba(212, 168, 83, 0)`);
                gradient.addColorStop(
                  0.15,
                  `rgba(212, 168, 83, ${lineOpacity})`
                );
                gradient.addColorStop(
                  0.85,
                  `rgba(212, 168, 83, ${lineOpacity})`
                );
                gradient.addColorStop(1, `rgba(212, 168, 83, 0)`);
                ctx.strokeStyle = gradient;
                const midX = (visibleLeft + visibleRight) * 0.5;
                ctx.moveTo(visibleLeft, lineY);
                ctx.quadraticCurveTo(midX, lineY + bendV, visibleRight, lineY);
                ctx.stroke();
              }
            }
          }
        }

        // Small random cracks near the center (denser, random per-line pattern)
        const smallGridSize = 20;
        const innerRadiusMax = baseRadius * 0.6;
        // vertical small cracks
        for (
          let sx = activeCrack.x - innerRadiusMax;
          sx <= activeCrack.x + innerRadiusMax;
          sx += smallGridSize
        ) {
          const lineX = Math.round(sx / smallGridSize) * smallGridSize;
          // match randomness of outer grid per-line
          const radiusVariation = 0.7 + Math.sin(lineX * 0.05) * 0.3;
          const innerRadius = baseRadius * 0.36 * radiusVariation;
          const dx = Math.abs(lineX - activeCrack.x);
          const normalized = dx / innerRadius;
          // deterministic "random" seed per line so pattern is stable
          const seed = Math.abs(
            Math.sin(lineX * 0.043 + activeCrack.y * 0.027)
          );
          if (seed > 0.25 && normalized < 1) {
            const localFall = 1 - Math.pow(normalized, 1.2);
            const opacity =
              activeCrack.opacity * seed * localFall * 1.6 * globalOpacity;
            if (opacity > 0.02) {
              const length =
                innerRadius * (0.3 + (1 - normalized) * 0.9 * seed);

              // Healing: outside-in for small vertical cracks (central visible segment shrinks)
              const healStart = activeCrack.y - length;
              const healEnd = activeCrack.y + length;
              const totalLen = healEnd - healStart;
              const healedEdge = (totalLen / 2) * healingProgress;
              const visibleTop = healStart + healedEdge;
              const visibleBottom = healEnd - healedEdge;

              if (visibleTop < visibleBottom) {
                ctx.beginPath();
                ctx.lineWidth = 0.8 + seed * 0.8;
                const g = ctx.createLinearGradient(
                  lineX,
                  visibleTop,
                  lineX,
                  visibleBottom
                );
                g.addColorStop(0, `rgba(212, 168, 83, 0)`);
                g.addColorStop(0.15, `rgba(212, 168, 83, ${opacity})`);
                g.addColorStop(0.85, `rgba(212, 168, 83, ${opacity})`);
                g.addColorStop(1, `rgba(212, 168, 83, 0)`);
                ctx.strokeStyle = g;
                ctx.moveTo(lineX, visibleTop);
                ctx.lineTo(lineX, visibleBottom);
                ctx.stroke();
              }
            }
          }
        }

        // horizontal small cracks
        for (
          let sy = activeCrack.y - innerRadiusMax;
          sy <= activeCrack.y + innerRadiusMax;
          sy += smallGridSize
        ) {
          const lineY = Math.round(sy / smallGridSize) * smallGridSize;
          const radiusVariation = 0.7 + Math.sin(lineY * 0.05) * 0.3;
          const innerRadius = baseRadius * 0.36 * radiusVariation;
          const dy = Math.abs(lineY - activeCrack.y);
          const normalized = dy / innerRadius;
          const seed = Math.abs(
            Math.sin(lineY * 0.037 + activeCrack.x * 0.031)
          );
          if (seed > 0.25 && normalized < 1) {
            const localFall = 1 - Math.pow(normalized, 1.2);
            const opacity =
              activeCrack.opacity * seed * localFall * 1.6 * globalOpacity;
            if (opacity > 0.02) {
              const length =
                innerRadius * (0.3 + (1 - normalized) * 0.9 * seed);

              // Healing: outside-in for small horizontal cracks (central visible segment shrinks)
              const healStart = activeCrack.x - length;
              const healEnd = activeCrack.x + length;
              const totalLen = healEnd - healStart;
              const healedEdge = (totalLen / 2) * healingProgress;
              const visibleLeft = healStart + healedEdge;
              const visibleRight = healEnd - healedEdge;

              if (visibleLeft < visibleRight) {
                ctx.beginPath();
                ctx.lineWidth = 0.8 + seed * 0.8;
                const g = ctx.createLinearGradient(
                  visibleLeft,
                  lineY,
                  visibleRight,
                  lineY
                );
                g.addColorStop(0, `rgba(212, 168, 83, 0)`);
                g.addColorStop(0.15, `rgba(212, 168, 83, ${opacity})`);
                g.addColorStop(0.85, `rgba(212, 168, 83, ${opacity})`);
                g.addColorStop(1, `rgba(212, 168, 83, 0)`);
                ctx.strokeStyle = g;
                ctx.moveTo(visibleLeft, lineY);
                ctx.lineTo(visibleRight, lineY);
                ctx.stroke();
              }
            }
          }
        }
      }

      // Draw data streams (subtle matrix-like effect) with cursor push
      const STREAM_PUSH_RADIUS = 160;
      const STREAM_PUSH_STRENGTH = 1.2;
      const STREAM_DAMPING = 0.88;
      const STREAM_SPRING = 0.04;
      dataStreams.forEach((stream) => {
        // apply horizontal push and spring-back
        const dxStream = stream.x - mouse.x;
        const distStream = Math.abs(dxStream);
        if (!isNaN(mouse.x)) {
          const influence = Math.max(0, 1 - distStream / STREAM_PUSH_RADIUS);
          const force =
            (dxStream / (distStream + 0.001)) *
            influence *
            STREAM_PUSH_STRENGTH *
            (mouseInactive ? 0 : 1) *
            (1 - healingProgress);
          stream.vx += force;
        }
        // spring back to base and damping
        stream.vx += (stream.baseX - stream.x) * STREAM_SPRING;
        stream.vx *= STREAM_DAMPING;
        // clamp velocity
        stream.vx = Math.max(-40, Math.min(40, stream.vx));
        stream.x += stream.vx;
        // keep streams inside canvas bounds
        if (stream.x < -40) stream.x = -40;
        if (stream.x > canvas.width + 40) stream.x = canvas.width + 40;

        stream.chars.forEach((char, i) => {
          // falling
          char.y += stream.speed;
          if (char.y > canvas.height) {
            char.y = -20;
            char.char = String.fromCharCode(0x30a0 + Math.random() * 96);
          }
          // slight horizontal jitter per char for organic look
          const sway = Math.sin(time * 3 + i * 0.2) * 0.4;
          const charX = stream.x + sway;

          const distToMouse = Math.hypot(charX - mouse.x, char.y - mouse.y);
          const highlight = distToMouse < 100 ? 1.5 : 1;
          const fade =
            i === stream.chars.length - 1
              ? 1
              : 0.3 + (i / stream.chars.length) * 0.7;
          ctx.fillStyle = `rgba(212, 168, 83, ${
            stream.opacity * fade * highlight
          })`;
          ctx.font = "12px monospace";
          ctx.fillText(char.char, charX, char.y);
        });
      });

      // 3D structures disabled — removed per user request

      // Draw neural network nodes and connections
      nodes.forEach((node, i) => {
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = 180;

        // Cursor attraction/interaction
        if (dist < maxDist && dist > 0) {
          const force = ((maxDist - dist) / maxDist) * 0.8;
          node.vx += (dx / dist) * force * 0.05;
          node.vy += (dy / dist) * force * 0.05;
          node.energy = Math.min(1, node.energy + 0.02);
          node.isActive = true;
        } else {
          node.energy = Math.max(0.2, node.energy - 0.005);
          if (Math.random() > 0.995) node.isActive = !node.isActive;
        }

        // Spring back
        node.vx += (node.baseX - node.x) * 0.008;
        node.vy += (node.baseY - node.y) * 0.008;
        node.vx *= 0.97;
        node.vy *= 0.97;
        node.x += node.vx;
        node.y += node.vy;
        node.pulsePhase += 0.03;

        // Draw connections to nearby nodes
        nodes.slice(i + 1).forEach((other) => {
          const d = Math.hypot(node.x - other.x, node.y - other.y);
          if (d < 120 * node.connectionStrength) {
            const alpha =
              0.08 * (1 - d / (120 * node.connectionStrength)) * node.energy;
            // Connection line
            ctx.beginPath();
            ctx.moveTo(node.x, node.y);
            ctx.lineTo(other.x, other.y);
            const gradient = ctx.createLinearGradient(
              node.x,
              node.y,
              other.x,
              other.y
            );
            gradient.addColorStop(0, `rgba(212, 168, 83, ${alpha})`);
            gradient.addColorStop(0.5, `rgba(212, 168, 83, ${alpha * 1.5})`);
            gradient.addColorStop(1, `rgba(212, 168, 83, ${alpha})`);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.5;
            ctx.stroke();
            // Traveling pulse along connection
            if (node.isActive && Math.random() > 0.98) {
              const pulsePos = (time * 2) % 1;
              const px = node.x + (other.x - node.x) * pulsePos;
              const py = node.y + (other.y - node.y) * pulsePos;
              ctx.beginPath();
              ctx.arc(px, py, 2, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(212, 168, 83, ${alpha * 3})`;
              ctx.fill();
            }
          }
        });

        // Draw node with glow
        const pulseSize =
          node.size * (1 + Math.sin(node.pulsePhase) * 0.3 * node.energy);
        const nodeOpacity = 0.3 + node.energy * 0.5;

        // Outer glow
        const glowGradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          pulseSize * 4
        );
        glowGradient.addColorStop(
          0,
          `rgba(212, 168, 83, ${nodeOpacity * 0.3})`
        );
        glowGradient.addColorStop(1, "rgba(212, 168, 83, 0)");
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseSize * 4, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseSize, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 168, 83, ${nodeOpacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    };

    resize();
    initElements();
    draw();

    const handleResize = () => {
      resize();
      initElements();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      if (inactivityTimer) clearTimeout(inactivityTimer);
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
    // Username: 3-20 characters, letters, numbers, underscores only
    // No special characters like ;?{}[]<>|\\
    return (
      uname.length >= 3 && uname.length <= 20 && /^[a-zA-Z0-9_]+$/.test(uname)
    );
  };

  // Validate name fields - no numbers or special characters like ;?{}[]<>|\\
  const validateName = (name) => {
    if (!name || !name.trim()) return false;
    // Allow letters, spaces, hyphens, apostrophes (for names like O'Brien, Mary-Jane)
    // Disallow numbers and special characters: ; ? { } [ ] < > | \\ / @ # $ % ^ & * ( ) = + ~ `
    const invalidChars = /[0-9;?{}[\]<>|\\/@#$%^&*()=+~`!]/;
    if (invalidChars.test(name)) return false;
    // Must contain at least one letter
    return (
      /[a-zA-Z]/.test(name) &&
      name.trim().length >= 1 &&
      name.trim().length <= 50
    );
  };

  // Initialize Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn("Google OAuth Client ID not configured");
      return;
    }

    // Load Google Identity Services script
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleCallback,
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: false, // Disable FedCM to avoid browser blocking
          });
        } catch (error) {
          console.error("Google Sign-In initialization error:", error);
        }
      }
    };
    script.onerror = () => {
      console.error("Failed to load Google Identity Services script");
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      const existingScript = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]'
      );
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  // Handle Google Sign-In callback
  const handleGoogleCallback = async (response) => {
    if (!response.credential) {
      setErrors((prev) => ({
        ...prev,
        login: { non_field_errors: "Google sign-in failed. Please try again." },
      }));
      return;
    }

    setGoogleLoading(true);
    setErrors({ login: {}, register: {} });

    try {
      const { data } = await authApi.googleAuth(response.credential);

      if (!data) {
        throw new Error("Google sign-in failed");
      }

      login(true); // Remember Google users by default
      setLoginSuccess(true); // ensure the success animation plays for Google flows
      sessionStorage.setItem("justLoggedIn", "true");

      // Preload dashboard data
      const weatherLocation = profile?.location || "Houston, Texas, USA";
      const preloadPromises = [
        financialsDashboardApi.getFullDashboard("1y").catch(() => null),
        subscriptionsDashboardApi.getFullDashboard().catch(() => null),
        travelDashboardApi.getDashboard().catch(() => null),
        tripsApi.getUpcoming().catch(() => []),
        fetch(
          `http://localhost:8000/api/weather/?location=${encodeURIComponent(
            weatherLocation
          )}`
        )
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ];

      Promise.all(preloadPromises)
        .then(([financials, subscriptions, travel, trips, weather]) => {
          if (financials) setCache(CACHE_KEYS.HOME_FINANCIALS, financials);
          if (subscriptions)
            setCache(CACHE_KEYS.HOME_SUBSCRIPTIONS, subscriptions);
          if (travel)
            setCache(CACHE_KEYS.HOME_TRAVEL, {
              ...travel,
              upcomingTrips: trips,
            });
          if (weather) setCache(getWeatherCacheKey(weatherLocation), weather);
        })
        .catch(() => {});

      const redirectPath =
        sessionStorage.getItem("redirectAfterLogin") || "/dashboard";
      sessionStorage.removeItem("redirectAfterLogin");

      navTimeoutRef.current = setTimeout(() => {
        sessionStorage.removeItem("justLoggedIn");
        navigate(redirectPath);
      }, 2000);
    } catch (error) {
      console.error("Google auth error:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.credential?.[0] ||
        "Google sign-in failed. Please try again.";
      setErrors((prev) => ({
        ...prev,
        login: { non_field_errors: errorMessage },
      }));
    } finally {
      setGoogleLoading(false);
    }
  };

  // Trigger Google Sign-In popup
  const handleGoogleSignIn = () => {
    if (window.google && GOOGLE_CLIENT_ID) {
      try {
        // Directly trigger the One Tap prompt with error handling
        window.google.accounts.id.prompt((notification) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            const reason =
              notification.getNotDisplayedReason() ||
              notification.getSkippedReason();

            // Handle specific blocking scenarios
            if (
              reason === "browser_not_supported" ||
              reason === "opt_out_or_no_session"
            ) {
              setErrors((prev) => ({
                ...prev,
                login: {
                  non_field_errors:
                    "Google Sign-In was blocked. Please disable your adblocker or privacy extensions for this site, or check your browser settings to allow third-party sign-in.",
                },
              }));
            } else if (reason === "suppressed_by_user") {
              // User dismissed - don't show error
              console.log("Google Sign-In dismissed by user");
            } else {
              setErrors((prev) => ({
                ...prev,
                login: {
                  non_field_errors:
                    "Google Sign-In unavailable. Try allowing third-party cookies or disabling privacy blockers.",
                },
              }));
            }
          }
        });
      } catch (error) {
        console.error("Google Sign-In error:", error);
        setErrors((prev) => ({
          ...prev,
          login: {
            non_field_errors:
              "Google Sign-In blocked by browser or extension. Please disable adblockers/privacy tools for this site and try again.",
          },
        }));
      }
    } else {
      setErrors((prev) => ({
        ...prev,
        login: { non_field_errors: "Google Sign-In is not available." },
      }));
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordMessage({ type: "", text: "" });

    if (!forgotPasswordEmail || !validateEmail(forgotPasswordEmail)) {
      setForgotPasswordMessage({
        type: "error",
        text: "Please enter a valid email address.",
      });
      return;
    }

    setForgotPasswordLoading(true);
    try {
      await authApi.forgotPassword(forgotPasswordEmail);
      setForgotPasswordMessage({
        type: "success",
        text: "If an account with this email exists, you will receive a password reset link.",
      });
      // Clear email after success
      setForgotPasswordEmail("");
    } catch (error) {
      setForgotPasswordMessage({
        type: "error",
        text:
          error.response?.data?.error ||
          "Failed to send reset email. Please try again.",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, [type]: {} }));

    // Client-side validation
    if (type === "register") {
      const validationErrors = {};

      if (!validateUsername(newUsername)) {
        validationErrors.username =
          "3-20 characters (letters, numbers, underscores)";
      }
      if (!validateEmail(newEmail)) {
        validationErrors.email = "Please enter a valid email address";
      }
      if (!validatePassword(newPassword)) {
        validationErrors.password = "Password must be at least 8 characters";
      }
      if (!validateName(newFirstName)) {
        validationErrors.first_name = "Valid first name is required";
      }
      if (!validateName(newLastName)) {
        validationErrors.last_name = "Valid last name is required";
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

        // Preload dashboard data during animation and store in session cache
        const weatherLocation = profile?.location || "Houston, Texas, USA";
        const preloadPromises = [
          financialsDashboardApi.getFullDashboard("1y").catch(() => null),
          subscriptionsDashboardApi.getFullDashboard().catch(() => null),
          travelDashboardApi.getDashboard().catch(() => null),
          tripsApi.getUpcoming().catch(() => []),
          fetch(
            `http://localhost:8000/api/weather/?location=${encodeURIComponent(
              weatherLocation
            )}`
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ];

        // Store preloaded data in session cache for immediate use
        Promise.all(preloadPromises)
          .then(([financials, subscriptions, travel, trips, weather]) => {
            // Store each piece of data in the session cache separately
            if (financials) setCache(CACHE_KEYS.HOME_FINANCIALS, financials);
            if (subscriptions)
              setCache(CACHE_KEYS.HOME_SUBSCRIPTIONS, subscriptions);
            if (travel)
              setCache(CACHE_KEYS.HOME_TRAVEL, {
                ...travel,
                upcomingTrips: trips,
              });
            if (weather) setCache(getWeatherCacheKey(weatherLocation), weather);
          })
          .catch(() => {
            // Silently fail - Dashboard will fetch fresh data
          });

        // Show the success overlay briefly so the user sees feedback,
        // then navigate. Keep a short delay so animations can begin.
        const LOGIN_SUCCESS_DELAY_MS = 2000; // match the success animation duration
        navTimeoutRef.current = setTimeout(() => {
          sessionStorage.removeItem("justLoggedIn");
          navigate("/dashboard");
        }, LOGIN_SUCCESS_DELAY_MS);
      }
    } catch (error) {
      console.error("Error:", error);
      if (error.response && error.response.data) {
        const errorData = error.response.data;

        // Check if this is a Google-only account trying to use password login
        if (errorData.google_account) {
          setErrors((prev) => ({
            ...prev,
            [type]: {
              google_account: true,
              non_field_errors:
                errorData.message ||
                "This account uses Google sign-in. Please continue with Google.",
            },
          }));
        } else {
          setErrors((prev) => ({ ...prev, [type]: errorData }));
        }
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

  const switchToLogin = () => {
    console.log("Switching to login panel");
    setIsActive(false);
    setErrors({ login: {}, register: {} });
  };

  const switchToRegister = () => {
    console.log("Switching to register panel");
    setIsActive(true);
    setErrors({ login: {}, register: {} });
  };

  return (
    <div
      className={`login-page ${mounted ? "mounted" : ""} ${
        loginSuccess ? "login-success" : ""
      }`}
    >
      {/* Advanced futuristic canvas background */}
      <canvas ref={canvasRef} className="particle-canvas" />

      {/* Subtle ambient orbs */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>

      {/* Enhanced tech grid overlay */}
      <div className="grid-overlay"></div>

      {/* Corner tech decorations */}
      <div className="corner-decoration corner-tl"></div>
      <div className="corner-decoration corner-tr"></div>
      <div className="corner-decoration corner-bl"></div>
      <div className="corner-decoration corner-br"></div>

      {/* Login success overlay */}
      {loginSuccess && (
        <div className="success-overlay">
          <div className="success-content">
            <div className="success-logo">
              <img src="/nexus_logo.svg" alt="Nexus" />
            </div>
            <div className="success-text">
              {"Nexus".split("").map((ch, idx) => (
                <span
                  key={idx}
                  className="success-letter"
                  style={{ "--i": idx }}
                  data-char={ch}
                  aria-hidden="true"
                >
                  {ch}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logout overlay (shown when redirected here after logout) */}
      {showLogoutOverlay && (
        <div className="logout-overlay">
          <div className="logout-content">
            <div className="logout-logo">
              <img src="/nexus_logo.svg" alt="Nexus" />
            </div>
            <div className="logout-text">Signed out</div>
            <div className="logout-progress">
              <div className="logout-progress-bar"></div>
            </div>
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
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => setShowForgotPassword(true)}
              >
                Forgot Password?
              </button>
            </div>

            <button
              type="submit"
              className="button animation"
              style={{ "--i": 6, "--j": 6 }}
              disabled={loading || googleLoading}
            >
              <span className="btn-content">
                {loading ? (
                  <ClipLoader loading={loading} size={22} color={"#d4a853"} />
                ) : (
                  <>
                    <span>Sign In</span>
                  </>
                )}
              </span>
              <div className="btn-glow"></div>
            </button>

            {/* Divider */}
            <div
              className="auth-divider animation"
              style={{ "--i": 7, "--j": 7 }}
            >
              <span>or</span>
            </div>

            {/* Google Sign-In Button */}
            {GOOGLE_CLIENT_ID && (
              <button
                type="button"
                className="google-btn animation"
                style={{ "--i": 8, "--j": 8 }}
                onClick={handleGoogleSignIn}
                disabled={loading || googleLoading}
              >
                <span className="btn-content">
                  {googleLoading ? (
                    <ClipLoader
                      loading={googleLoading}
                      size={22}
                      color={"#fff"}
                    />
                  ) : (
                    <>
                      <svg
                        className="google-icon"
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                      >
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
                      <span>Continue with Google</span>
                    </>
                  )}
                </span>
              </button>
            )}
            {/* Hidden container for Google button fallback */}
            <div ref={googleButtonRef} style={{ display: "none" }}></div>

            {/* Session expired message */}
            {sessionExpiredMessage && (
              <div
                className="session-expired-message animation"
                style={{ "--i": 9, "--j": 9 }}
              >
                <i className="bx bx-info-circle"></i>
                <span>Your session has expired. Please sign in again.</span>
              </div>
            )}

            {/* Google account error - special handling */}
            {errors.login.google_account && (
              <div
                className="google-account-notice animation"
                style={{ "--i": 9, "--j": 9 }}
              >
                <i className="bx bxl-google"></i>
                <div className="notice-content">
                  <span>{errors.login.non_field_errors}</span>
                  <button
                    type="button"
                    className="google-continue-btn"
                    onClick={handleGoogleSignIn}
                    disabled={googleLoading}
                  >
                    Continue with Google
                  </button>
                </div>
              </div>
            )}

            {/* General error message */}
            {errors.login.non_field_errors && !errors.login.google_account && (
              <div
                className="general-error animation"
                style={{ "--i": 9, "--j": 9 }}
              >
                <i
                  className="fas fa-exclamation-circle"
                  style={{ marginRight: "8px" }}
                ></i>
                {errors.login.non_field_errors}
                {errors.login.non_field_errors.includes("blocked") && (
                  <div
                    style={{
                      marginTop: "12px",
                      paddingTop: "12px",
                      borderTop: "1px solid rgba(239, 68, 68, 0.2)",
                      textAlign: "left",
                      fontSize: "11px",
                      lineHeight: "1.5",
                    }}
                  >
                    <strong>Quick fixes:</strong>
                    <ul style={{ margin: "6px 0 0 20px", padding: 0 }}>
                      <li>
                        Disable browser extensions (uBlock, AdGuard, Privacy
                        Badger)
                      </li>
                      <li>Allow third-party cookies in browser settings</li>
                      <li>
                        Click the lock icon → Site settings → Allow third-party
                        sign-in
                      </li>
                      <li>
                        Try incognito/private mode with extensions disabled
                      </li>
                    </ul>
                  </div>
                )}
              </div>
            )}
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
                  </>
                )}
              </span>
              <div className="btn-glow"></div>
            </button>
          </form>
        </div>

        {/* Sliding panel */}
        <div className="toggle-panel">
          <div className="panel-content login-panel">
            <div className="panel-icon">
              <i className="bx bx-log-in-circle"></i>
            </div>
            <h3>Already registered?</h3>
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

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div
          className="forgot-password-overlay"
          onClick={() => setShowForgotPassword(false)}
        >
          <div
            className="forgot-password-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close-btn"
              onClick={() => {
                setShowForgotPassword(false);
                setForgotPasswordEmail("");
                setForgotPasswordMessage({ type: "", text: "" });
              }}
            >
              <i className="bx bx-x"></i>
            </button>
            <div className="modal-icon">
              <i className="bx bx-lock-open-alt"></i>
            </div>
            <h3>Reset Your Password</h3>
            <p>
              Enter your email address and we&apos;ll send you a link to reset your
              password.
            </p>

            <form onSubmit={handleForgotPassword}>
              <div className="modal-input-group">
                <i className="bx bx-envelope"></i>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={forgotPasswordEmail}
                  onChange={(e) => setForgotPasswordEmail(e.target.value)}
                  disabled={forgotPasswordLoading}
                />
              </div>

              {forgotPasswordMessage.text && (
                <div className={`modal-message ${forgotPasswordMessage.type}`}>
                  <i
                    className={`bx ${
                      forgotPasswordMessage.type === "success"
                        ? "bx-check-circle"
                        : "bx-error-circle"
                    }`}
                  ></i>
                  {forgotPasswordMessage.text}
                </div>
              )}

              <button
                type="submit"
                className="modal-submit-btn"
                disabled={forgotPasswordLoading}
              >
                {forgotPasswordLoading ? (
                  <ClipLoader
                    loading={forgotPasswordLoading}
                    size={18}
                    color={"#1a1a2e"}
                  />
                ) : (
                  <>
                    <i className="bx bx-send"></i>
                    Send Reset Link
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

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
