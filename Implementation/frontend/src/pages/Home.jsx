import { Link, useNavigate } from "react-router-dom";
import { Drill, Activity, Shield, TrendingUp, BarChart3, Database } from "lucide-react";
import { MarketingFooter } from "../components/MarketingShell";
import "../styles/Home.css";

export default function Home() {
  const navigate = useNavigate();
  const features = [
    {
      icon: Activity,
      title: "Real-Time Monitoring",
      description: "Track drilling operations with live data insights",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Visualize problems by depth and time with precision",
    },
    {
      icon: Shield,
      title: "Predictive Maintenance",
      description: "Prevent failures before they happen with AI insights",
    },
    {
      icon: TrendingUp,
      title: "Performance Optimization",
      description: "Maximize efficiency and reduce non-productive time",
    },
    {
      icon: Database,
      title: "Data Integration",
      description: "Upload and analyze drilling data seamlessly",
    },
    {
      icon: Drill,
      title: "Depth Analysis",
      description: "Detailed segment-by-segment wellbore examination",
    },
  ];

  return (
    <div className="homePage">
      <div className="homeBgLayer">
        <div className="homeGlow homeGlowA" />
        <div className="homeGlow homeGlowB" />
      </div>

      <div className="homeContainer">
        <header className="homeNav">
          <Link to="/" className="homeBrand">
            <div className="homeBrandIcon">
              <Drill size={28} />
            </div>
            <span>DrillMain Intelligence</span>
          </Link>

          <nav className="homeNavLinks" aria-label="Site">
            <Link to="/about" className="homeNavLink">
              About
            </Link>
            <Link to="/how-it-works" className="homeNavLink">
              How It Works
            </Link>
            <Link to="/help" className="homeNavLink">
              Help
            </Link>
            <Link to="/contact" className="homeNavLink">
              Contact
            </Link>
          </nav>

          <div className="homeNavActions">
            <button type="button" className="homeBtnGhost" onClick={() => navigate("/login")}>
              Login
            </button>
            <button type="button" className="homeBtnPrimary" onClick={() => navigate("/signup")}>
              Sign Up
            </button>
          </div>
        </header>

        <section className="homeHero">
          <div className="homeHeroText">
            <div className="homeBadge">🚀 Next-Gen Drilling Intelligence</div>
            <h1 className="homeTitle">
              Transform Your
              <br />
              <span>Drilling Operations</span>
            </h1>
            <p className="homeSubtitle">
              Harness AI-powered insights to visualize drilling problems, predict equipment failures, and
              optimize operations in real-time.
            </p>

            <div className="homeHeroActions">
              <button type="button" className="homeBtnPrimary homeBtnLarge" onClick={() => navigate("/signup")}>
                Get started
              </button>
              <button type="button" className="homeBtnOutline homeBtnLarge" onClick={() => navigate("/how-it-works")}>
                How it works
              </button>
            </div>

            <div className="homeStats">
              <div>
                <div className="homeStatValue">95%</div>
                <div className="homeStatLabel">Accuracy Rate</div>
              </div>
              <div>
                <div className="homeStatValue homeStatCyan">24/7</div>
                <div className="homeStatLabel">Monitoring</div>
              </div>
              <div>
                <div className="homeStatValue">-40%</div>
                <div className="homeStatLabel">NPT Reduction</div>
              </div>
            </div>
          </div>

          <div className="homeHeroMedia">
            <img
              src="https://images.unsplash.com/photo-1709243258335-77b3005ac3bf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvaWwlMjBkcmlsbGluZyUyMHJpZyUyMHN1bnNldCUyMGluZHVzdHJpYWx8ZW58MXx8fHwxNzc0NTAyODYwfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Drilling Rig"
              className="homeRigImage"
            />
            <div className="homeImageOverlay" />
          </div>
        </section>

        <section className="homeFeaturesSection">
          <h2>Comprehensive Drilling Intelligence</h2>
          <p>Everything you need to optimize your drilling operations</p>
          <div className="homeFeaturesGrid">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="homeFeatureCard">
                  <div className="homeFeatureIconWrap">
                    <Icon size={24} />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="homeCta">
          <h2>Ready to Get Started?</h2>
          <p>Join leading drilling operations teams using AI-powered insights</p>
          <div className="homeCtaActions">
            <button type="button" className="homeBtnPrimary homeBtnLarge" onClick={() => navigate("/signup")}>
              Get started
            </button>
            <button type="button" className="homeBtnOutline homeBtnLarge" onClick={() => navigate("/login")}>
              Contact us
            </button>
          </div>
        </section>

        <MarketingFooter />
        </div>
    </div>
  );
}
