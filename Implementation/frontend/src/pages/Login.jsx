import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";



export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin(e) {
        e.preventDefault();

        const users = JSON.parse(localStorage.getItem("users") || "[]");

        const found = users.find(
            (u) => u.email === email && u.password === password
        );

        if (found) {
            localStorage.setItem("auth", email); // store logged-in user
            navigate("/wells");
        } else {
            setError("Invalid email or password");
        }
    }


  return (
    <div className="loginPage">
      <div className="loginCard">
        <h1 className="loginTitle">Drilling Ops DSS</h1>
        <p className="loginSubtitle">Sign in to continue</p>

        <form className="loginForm" onSubmit={handleLogin}>
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

          {error && <div className="loginError">{error}</div>}

          <button type="submit" className="loginBtn">
            Sign In →
          </button>

          <div className="loginSwitch">
            Don’t have an account?{" "}
            <span onClick={() => navigate("/signup")}>Create one</span>
          </div>
        </form>
      </div>
    </div>
  );
}
