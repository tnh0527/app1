import { useState } from "react";
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
  const navigate = useNavigate();
  const { login } = useAuth();

  const errorText = (value) => {
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };

  const handleSubmit = async (e, type) => {
    e.preventDefault();
    setErrors((prev) => ({ ...prev, [type]: {} }));
    setLoading(true);

    try {
      if (type === "register") {
        const firstName = newFirstName.trim();
        const lastName = newLastName.trim();

        if (!firstName || !lastName) {
          setErrors((prev) => ({
            ...prev,
            register: {
              ...prev.register,
              ...(firstName ? {} : { first_name: "This field is required." }),
              ...(lastName ? {} : { last_name: "This field is required." }),
            },
          }));
          setLoading(false);
          return;
        }

        const payload = {
          username: newUsername,
          email: newEmail,
          password: newPassword,
          first_name: firstName,
          last_name: lastName,
        };
        await authApi.register({
          ...payload,
        });
        setIsActive(false);
        setNewUsername("");
        setNewEmail("");
        setNewPassword("");
        setNewFirstName("");
        setNewLastName("");
        console.log("Registered successfully!");
      } else {
        await authApi.login({ username, password, remember_me: rememberMe });
        login(rememberMe);
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

            <div
              className="remember-row animation"
              style={{ "--i": 3, "--j": 24 }}
            >
              <label className="remember-label" htmlFor="rememberMe">
                <input
                  id="rememberMe"
                  type="checkbox"
                  checked={rememberMe}
                  disabled={loading}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember me
              </label>
            </div>
            <button
              type="submit"
              className="button animation"
              style={{ "--i": 4, "--j": 25 }}
            >
              {loading ? (
                <ClipLoader loading={loading} size={25} color={"#22D6D6"} />
              ) : (
                "Log In"
              )}
            </button>
            <div
              className="logreg-link animation"
              style={{ "--i": 5, "--j": 26 }}
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
              {errorText(errors.register.username) && (
                <div className="invalid-feedback">
                  {errorText(errors.register.username)}
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
              {errorText(errors.register.email) && (
                <div className="invalid-feedback">
                  {errorText(errors.register.email)}
                </div>
              )}
            </div>

            <div className="name-row animation" style={{ "--i": 20, "--j": 3 }}>
              <div
                className="input-box"
                style={{ width: "48%", marginRight: "4%" }}
              >
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
                <label> First name </label>
                {errorText(errors.register.first_name) && (
                  <div className="invalid-feedback">
                    {errorText(errors.register.first_name)}
                  </div>
                )}
              </div>

              <div className="input-box" style={{ width: "48%" }}>
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
                <label> Last name </label>
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
            >
              {loading ? (
                <ClipLoader loading={loading} size={25} color={"#22D6D6"} />
              ) : (
                "Sign Up"
              )}
            </button>
            <div
              className="logreg-link animation"
              style={{ "--i": 25, "--j": 8 }}
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
