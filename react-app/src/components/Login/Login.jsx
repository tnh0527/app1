import React, { useState } from "react";
import "./Login.css";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [isActive, setIsActive] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    navigate("/home");
  };

  return (
    <div className="login-page">
      <div className={`wrapper ${isActive ? "active" : ""}`}>
        <span className="bg-animate"></span>
        <span className="bg-animate2"></span>

        <div className="form-box login">
          <h2 className="animation" style={{ "--i": 0, "--j": 21 }}>
            Login
          </h2>
          <form action="#">
            <div
              className="input-box animation"
              style={{ "--i": 1, "--j": 22 }}
            >
              <input type="text" />
              <label> Username </label>
              <i className="bx bxs-user"></i>
            </div>
            <div
              className="input-box animation"
              style={{ "--i": 2, "--j": 23 }}
            >
              <input type="password" />
              <label> Password </label>
              <i className="bx bxs-lock-alt"></i>
            </div>
            <button
              type="submit"
              className="btn animation"
              style={{ "--i": 3, "--j": 24 }}
              onClick={handleLogin}
            >
              Login
            </button>
            <div
              className="logreg-link animation"
              style={{ "--i": 4, "--j": 25 }}
            >
              <p>
                Don't have an account?
                <a
                  href="#"
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

        {/* Sign Up */}

        <div className="form-box register">
          <h2 className="animation" style={{ "--i": 17, "--j": 0 }}>
            Sign Up
          </h2>
          <form action="#">
            <div
              className="input-box animation"
              style={{ "--i": 18, "--j": 1 }}
            >
              <input type="text" />
              <label> Username </label>
              <i className="bx bxs-user"></i>
            </div>
            <div
              className="input-box animation"
              style={{ "--i": 19, "--j": 2 }}
            >
              <input type="text" />
              <label> Email </label>
              <i className="bx bxs-envelope"></i>
            </div>
            <div
              className="input-box animation"
              style={{ "--i": 20, "--j": 3 }}
            >
              <input type="password" />
              <label> Password </label>
              <i className="bx bxs-lock-alt"></i>
            </div>
            <button
              type="submit"
              className="btn animation"
              style={{ "--i": 21, "--j": 4 }}
            >
              Sign Up
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
