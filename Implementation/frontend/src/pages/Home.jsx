import React from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Home.css";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="homePage">

      {/* Icon */}
      <div className="homeIcon">
        {/* Clean wellbore-style icon */}
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2v20" />
          <path d="M7 8h10" />
          <path d="M9 14h6" />
        </svg>
      </div>

      <h1 className="homeTitle">Wellbore Design Intelligence Studio</h1>

      <p className="homeSubtitle">
        Plan, validate, and optimize wellbore architecture before spud.
      </p>

      <div className="homeFeatures">
        <span className="homeFeature">Casing & liner design</span>
        <span className="homeFeature">Mud weight & window checks</span>
        <span className="homeFeature">Dogleg severity & trajectory control</span>
      </div>

      <button className="homeBtn" onClick={() => navigate("/login")}>
        Enter Dashboard
      </button>
    </div>
  );
}
