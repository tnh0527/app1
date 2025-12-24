import { useState } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";
import { ClipLoader } from "react-spinners";
import { useAuth } from "../../utils/AuthContext";
import authApi from "../../api/authApi";

const Login = () => {
  const [isActive, setIsActive] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ login: {}, register: {} });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, [type]: {} }));
    setLoading(true);

    try {
      if (type === "register") {
        await authApi.register({
          username: newUsername,
          email: newEmail,
          password: newPassword,
        });
        setIsActive(false);
        console.log("Registered successfully!");
      } else {
        await authApi.login({ username, password });
        login();
        navigate("/home");
        console.log("Logged in successfully!");
      }
    } catch (error) {
      console.error("Error:", error);
      if (error.response && error.response.data) {
        setErrors((prev) => ({ ...prev, [type]: error.response.data }));
      }
      if (type === "login") {
        setPassword("");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className={`wrapper ${isActive ? "active" : ""}`}>
        <span className="bg-animate"></span>
        <span className="bg-animate2"></span>

        {/* Login Form */}

        <div className="form-box login">
          <h2 className="animation" style={{ "--i": 0, "--j": 21 }}>
            Login
          </h2>
          <form onSubmit={(e) => handleSubmit(e, "login")} noValidate>
            <div
              className="input-box animation"
              style={{ "--i": 1, "--j": 22 }}
            >
              <input
                type="text"
                id="username"
                value={username}
                autoComplete="off"
                required
                onFocus={(e) => {
                  if (errors.login.username) {
                    setErrors((prev) => ({
                      ...prev,
                      login: { ...prev.login, username: null },
                    }));
                  }
                }}
                onChange={(e) => {
                  setUsername(e.target.value);
                }}
                className={`form-control ${
                  errors.login.username ? "is-invalid" : ""
                }`}
              />
              <label> Username </label>
              <i className="bx bxs-user"></i>
              {errors.login.username && (
                <div className="invalid-feedback">{errors.login.username}</div>
              )}
            </div>
            <div
              className="input-box animation"
              style={{ "--i": 2, "--j": 23 }}
            >
              <input
                type="password"
                id="password"
                value={password}
                autoComplete="off"
                required
                onFocus={(e) => {
                  if (errors.login.password) {
                    setErrors((prev) => ({
                      ...prev,
                      login: { ...prev.login, password: null },
                    }));
                  }
                }}
                onChange={(e) => {
                  setPassword(e.target.value);
                }}
                className={`form-control ${
                  errors.login.password ? "is-invalid" : ""
                }`}
              />
              <label> Password </label>
              <i className="bx bxs-lock-alt"></i>
              {errors.login.password && (
                <div className="invalid-feedback">{errors.login.password}</div>
              )}
            </div>
            <button
              type="submit"
              className="button animation"
              style={{ "--i": 3, "--j": 24 }}
            >
              {loading ? (
                <ClipLoader loading={loading} size={25} color={"#22D6D6"} />
              ) : (
                "Log In"
              )}
            </button>
            <div
              className="logreg-link animation"
              style={{ "--i": 4, "--j": 25 }}
            >
              <p>
                Don't have an account?
                <a
                  className="register-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsActive(true);
                  }}
                >
                  Sign Up
                </a>
              </p>
            </div>
          </form>
        </div>
        <div className="info-text login">
          <h2 className="animation" style={{ "--i": 0, "--j": 20 }}>
            Welcome Back!
          </h2>
          <p className="animation" style={{ "--i": 1, "--j": 21 }}>
            (To be changed.)
          </p>
        </div>

        {/* Sign Up Form*/}

        <div className="form-box register">
          <h2 className="animation" style={{ "--i": 17, "--j": 0 }}>
            Sign Up
          </h2>
          <form onSubmit={(e) => handleSubmit(e, "register")} noValidate>
            <div
              className="input-box animation"
              style={{ "--i": 18, "--j": 1 }}
            >
              <input
                type="text"
                id="newusername"
                value={newUsername}
                maxLength={20}
                autoComplete="off"
                required
                onFocus={(e) => {
                  if (errors.register.username) {
                    setErrors((prev) => ({
                      ...prev,
                      register: { ...prev.register, username: null },
                    }));
                  }
                }}
                onChange={(e) => {
                  setNewUsername(e.target.value);
                }}
                className={`form-control ${
                  errors.register.username ? "is-invalid" : ""
                }`}
              />
              <label> Username </label>
              <i className="bx bxs-user"></i>
              {errors.register.username && (
                <div className="invalid-feedback">
                  {errors.register.username}
                </div>
              )}
            </div>
            <div
              className="input-box animation"
              style={{ "--i": 19, "--j": 2 }}
            >
              <input
                type="text"
                id="email"
                value={newEmail}
                autoComplete="off"
                required
                onFocus={(e) => {
                  if (errors.register.email) {
                    setErrors((prev) => ({
                      ...prev,
                      register: { ...prev.register, email: null },
                    }));
                  }
                }}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                }}
                className={`form-control ${
                  errors.register.email ? "is-invalid" : ""
                }`}
              />
              <label> Email </label>
              <i className="bx bxs-envelope"></i>
              {errors.register.email && (
                <div className="invalid-feedback">{errors.register.email}</div>
              )}
            </div>
            <div
              className="input-box animation"
              style={{ "--i": 20, "--j": 3 }}
            >
              <input
                type="password"
                id="newpassword"
                value={newPassword}
                maxLength={50}
                autoComplete="off"
                required
                onFocus={(e) => {
                  if (errors.register.password) {
                    setErrors((prev) => ({
                      ...prev,
                      register: { ...prev.register, password: null },
                    }));
                  }
                }}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                }}
                className={`form-control ${
                  errors.register.password ? "is-invalid" : ""
                }`}
              />
              <label> Password </label>
              <i className="bx bxs-lock-alt"></i>
              {errors.register.password && (
                <div className="invalid-feedback">
                  {errors.register.password}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="button animation"
              style={{ "--i": 21, "--j": 4 }}
            >
              {loading ? (
                <ClipLoader loading={loading} size={25} color={"#22D6D6"} />
              ) : (
                "Sign Up"
              )}
            </button>
            <div
              className="logreg-link animation"
              style={{ "--i": 22, "--j": 5 }}
            >
              <p>
                Already have an account?
                <a
                  href="#"
                  className="login-link"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsActive(false);
                  }}
                >
                  Login
                </a>
              </p>
            </div>
          </form>
        </div>
        <div className="info-text register">
          <h2 className="animation" style={{ "--i": 17, "--j": 0 }}>
            New here?
          </h2>
          <p className="animation" style={{ "--i": 18, "--j": 1 }}>
            (To be changed.)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
