import { Link, NavLink, useNavigate } from "react-router-dom";
import { Drill } from "lucide-react";
import "../styles/MarketingPages.css";

const navItems = [
  { to: "/about", label: "About" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/help", label: "Help & FAQ" },
  { to: "/contact", label: "Contact" },
];

export function MarketingFooter() {
  return (
    <footer className="mktFooter">
      <div className="mktFooterGrid">
        <div className="mktFooterCol">
          <h4>Product</h4>
          <Link to="/how-it-works">How It Works</Link>
          <Link to="/help">Help Center</Link>
          <Link to="/contact">Contact Us</Link>
        </div>
        <div className="mktFooterCol">
          <h4>Company</h4>
          <Link to="/about">About Us</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms of Use</Link>
        </div>
        <div className="mktFooterCol">
          <h4>Get started</h4>
          <Link to="/signup">Create account</Link>
          <Link to="/login">Sign in</Link>
          <Link to="/">Home</Link>
        </div>
      </div>
      <div className="mktFooterBottom">© {new Date().getFullYear()} DrillMain Intelligence. All rights reserved.</div>
    </footer>
  );
}

export default function MarketingShell({ title, lead, children }) {
  const navigate = useNavigate();

  return (
    <div className="mktPage">
      <div className="mktBgLayer">
        <div className="mktGlow mktGlowA" />
        <div className="mktGlow mktGlowB" />
      </div>

      <div className="mktContainer">
        <header className="mktNav">
          <Link to="/" className="mktBrand">
            <span className="mktBrandIcon">
              <Drill size={22} />
            </span>
            DrillMain Intelligence
          </Link>

          <nav className="mktNavLinks" aria-label="Site">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `mktNavLink${isActive ? " mktNavLink--active" : ""}`}
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="mktNavActions">
            <button type="button" className="mktBtnGhost" onClick={() => navigate("/login")}>
              Login
            </button>
            <button type="button" className="mktBtnPrimary" onClick={() => navigate("/signup")}>
              Sign Up
            </button>
          </div>
        </header>

        <main className="mktMain">
          <Link to="/" className="mktBack">
            ← Back to home
          </Link>
          <h1 className="mktTitle">{title}</h1>
          {lead && <p className="mktLead">{lead}</p>}
          {children}
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}

