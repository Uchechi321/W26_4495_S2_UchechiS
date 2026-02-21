import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/SignUp.css";


export default function SignUp() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  function handleSignUp(e) {
        e.preventDefault();

        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }

        // Load existing users
        const users = JSON.parse(localStorage.getItem("users") || "[]");

        // Check if email already exists
        if (users.some((u) => u.email === email)) {
            setError("An account with this email already exists");
            return;
        }

        // Add new user
        users.push({ email, password });

        // Save back to localStorage
        localStorage.setItem("users", JSON.stringify(users));

        navigate("/login");
    }


  return (
    <div className="signupPage">
      <div className="signupCard">
        <h1 className="signupTitle">Create Account</h1>
        <p className="signupSubtitle">Sign up to access the dashboard</p>

        <form className="signupForm" onSubmit={handleSignUp}>
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="•••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="•••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          {error && <div className="signupError">{error}</div>}

          <button type="submit" className="signupBtn">
            Create Account →
          </button>

          <div className="signupSwitch">
            Already have an account?{" "}
            <span onClick={() => navigate("/login")}>Sign in</span>
          </div>
        </form>
      </div>
    </div>
  );
}
