import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Drill, ArrowLeft, Mail, Lock, Eye, EyeOff } from "lucide-react";
import "../styles/Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleLogin(e) {
    e.preventDefault();
    setError("");

    const users = JSON.parse(localStorage.getItem("users") || "[]");

    const found = users.find(
      (u) => u.email === email && u.password === password
    );

    if (found) {
      localStorage.setItem("auth", email);
      navigate("/wells");
    } else {
      setError("Invalid email or password");
    }
  }

  return (
    <div className="loginPage">
      <div className="loginBgOrbs" aria-hidden>
        <div className="loginBgOrb loginBgOrbA" />
        <div className="loginBgOrb loginBgOrbB" />
      </div>

      <div className="loginSplit">
        <div className="loginCol loginColForm">
          <div className="loginFormInner">
            <button
              type="button"
              className="loginBackBtn"
              onClick={() => navigate("/")}
            >
              <ArrowLeft size={20} />
              Back to Home
            </button>

            <div className="loginBrand">
              <div className="loginBrandIcon">
                <Drill size={28} strokeWidth={2} />
              </div>
              <span className="loginBrandText">DrillMain Intelligence</span>
            </div>

            <div className="loginHeader">
              <h1 className="loginHeading">Welcome Back</h1>
              <p className="loginLead">Sign in to continue to your dashboard</p>
            </div>

            <form className="loginForm" onSubmit={handleLogin}>
              <div className="loginField">
                <label className="loginLabel" htmlFor="login-email">
                  Email Address
                </label>
                <div className="loginInputWrap">
                  <Mail className="loginInputIcon" size={20} aria-hidden />
                  <input
                    id="login-email"
                    type="email"
                    className="loginInput"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="loginField">
                <label className="loginLabel" htmlFor="login-password">
                  Password
                </label>
                <div className="loginInputWrap">
                  <Lock className="loginInputIcon" size={20} aria-hidden />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="loginInput loginInputWithToggle"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="loginPwToggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="loginRowBetween">
                <label className="loginRemember">
                  <input type="checkbox" name="remember" />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  className="loginForgot"
                  onClick={() => navigate("/contact")}
                >
                  Forgot password?
                </button>
              </div>

              {error && <div className="loginError">{error}</div>}

              <button type="submit" className="loginSubmit">
                Sign In
              </button>
            </form>

            <div className="loginDivider">
              <span className="loginDividerLine" />
              <span className="loginDividerText">OR</span>
              <span className="loginDividerLine" />
            </div>

            <p className="loginFooterText">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="loginLinkBtn"
                onClick={() => navigate("/signup")}
              >
                Sign up for free
              </button>
            </p>
          </div>
        </div>

        <div className="loginCol loginColHero">
          <div className="loginHeroInner">
            <img
              className="loginHeroImg"
              src="https://images.unsplash.com/photo-1765048808260-9f48d96caf98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZzaG9yZSUyMHBsYXRmb3JtJTIwb2NlYW4lMjB0ZWNobm9sb2d5fGVufDF8fHx8MTc3NDUwMjg2MXww&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Offshore operations"
            />
            <h2 className="loginHeroTitle">Drilling intelligence from your data</h2>
            <p className="loginHeroDesc">
              Ingest daily drilling reports, explore operations by depth, and review
              fleet-level KPIs—all in one place.
            </p>
            <ul className="loginHeroList">
              {[
                "Wellbore visualization",
                "Daily drilling PDF upload and parsing",
                "Per-well dashboards: NPT, risk zones, and segment metrics",
                "Fleet summary reports and maintenance views",
              ].map((feature) => (
                <li key={feature} className="loginHeroItem">
                  <span className="loginHeroDot" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
