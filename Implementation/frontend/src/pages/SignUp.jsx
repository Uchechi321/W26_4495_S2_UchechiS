import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, Drill, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import "../styles/SignUp.css";

export default function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");

  function handleSignUp(e) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    const users = JSON.parse(localStorage.getItem("users") || "[]");

    if (users.some((u) => u.email === email)) {
      setError("An account with this email already exists.");
      return;
    }

    users.push({
      fullName,
      company,
      email,
      password,
    });

    localStorage.setItem("users", JSON.stringify(users));
    navigate("/login");
  }

  return (
    <div className="suPage">
      <div className="suBg" aria-hidden>
        <span className="suBlob suBlobA" />
        <span className="suBlob suBlobB" />
      </div>

      <div className="suWrap">
        <section className="suShowcase" aria-label="Overview">
          <div className="suShowcaseMedia">
            <img
              src="https://images.unsplash.com/photo-1709243258335-77b3005ac3bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvaWwlMjBkcmlsbGluZyUyMHJpZyUyMHN1bnNldCUyMGluZHVzdHJpYWx8ZW58MXx8fHwxNzc0NTAyODYwfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Drilling rig at sunset"
              className="suRigImage"
            />
          </div>
          <div className="suShowcaseBody">
            <h2>Join Leading Drilling Teams</h2>
            <p>Create your free account and start using DrillOps Intelligence today.</p>
            <ul className="suBenefitList">
              <li>No credit card required</li>
              <li>Unlimited access</li>
              <li>Well and report management</li>
              <li>24/7 availability</li>
            </ul>
          </div>
        </section>

        <section className="suAuthPanel" aria-labelledby="signup-heading">
          <button type="button" className="suBack" onClick={() => navigate("/")}>
            <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
            <span>Back to Home</span>
          </button>

          <div className="suBrand">
            <span className="suBrandIcon">
              <Drill size={18} strokeWidth={2.25} aria-hidden />
            </span>
            <span className="suBrandText">DrillOps Intelligence</span>
          </div>

          <h1 id="signup-heading" className="suTitle">
            Create Account
          </h1>
          <p className="suSubtitle">Start optimizing your drilling operations today.</p>

          <form className="suForm" onSubmit={handleSignUp} noValidate>
            <div className="suField">
              <label htmlFor="fullName">Full name</label>
              <div className="suInputWrap">
                <User className="suInputIcon" size={18} strokeWidth={2} aria-hidden />
                <input
                  id="fullName"
                  className="suInput"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="suField">
              <label htmlFor="company">Company</label>
              <div className="suInputWrap">
                <Building2 className="suInputIcon" size={18} strokeWidth={2} aria-hidden />
                <input
                  id="company"
                  className="suInput"
                  type="text"
                  placeholder="Acme Drilling Co."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  autoComplete="organization"
                />
              </div>
            </div>

            <div className="suField">
              <label htmlFor="email">Email address</label>
              <div className="suInputWrap">
                <Mail className="suInputIcon" size={18} strokeWidth={2} aria-hidden />
                <input
                  id="email"
                  className="suInput"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="suField">
              <label htmlFor="password">Password</label>
              <div className="suInputWrap">
                <Lock className="suInputIcon" size={18} strokeWidth={2} aria-hidden />
                <input
                  id="password"
                  className="suInput suInputHasTrailing"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="suInputReveal"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="suField">
              <label htmlFor="confirmPassword">Confirm password</label>
              <div className="suInputWrap">
                <Lock className="suInputIcon" size={18} strokeWidth={2} aria-hidden />
                <input
                  id="confirmPassword"
                  className="suInput suInputHasTrailing"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="suInputReveal"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="suTerms">
              <input
                id="terms"
                className="suTermsCheck"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="terms" className="suTermsLabel">
                I agree to the <Link to="/terms">Terms of Service</Link> and{" "}
                <Link to="/privacy">Privacy Policy</Link>
              </label>
            </div>

            {error && <div className="suError">{error}</div>}

            <button type="submit" className="suBtn">
              Create Account
            </button>

            <div className="suDivider">
              <span />
              <small>OR</small>
              <span />
            </div>

            <p className="suSwitch">
              Already have an account?{" "}
              <button type="button" className="suSwitchBtn" onClick={() => navigate("/login")}>
                Sign in
              </button>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
