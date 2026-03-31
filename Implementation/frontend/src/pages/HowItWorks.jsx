import { Link } from "react-router-dom";
import MarketingShell from "../components/MarketingShell";

export default function HowItWorks() {
  return (
    <MarketingShell
      title="How to use the system"
      lead="Follow these steps from first visit to daily use. After you sign in, the app opens on your well list."
    >
      <div className="mktSection">
        <h2>Getting started</h2>
        <ol className="mktSteps">
          <li>
            <strong>Create an account</strong> on the sign-up page, or <strong>sign in</strong> if you already have one.
            Wells you add are visible only under your login.
          </li>
          <li>
            After login you land on <strong>Wells</strong>. Add a well with a name and location so you can find it later.
          </li>
          <li>
            Open a well to see its <strong>dashboard</strong>. You’ll get KPIs and a clear view of metrics by depth/segment.
          </li>
        </ol>
      </div>

      <div className="mktSection">
        <h2>Reports and uploads</h2>
        <p>
          From a well, use <strong>Reports</strong> to browse past uploads and open report details.
          Use <strong>Upload report</strong> to add a new drilling PDF; the system ties it to that well.
        </p>
      </div>

      <div className="mktSection">
        <h2>Maintenance and reliability</h2>
        <p>
          The <strong>Maintenance</strong> area helps you track equipment and work items for each well.
          Use it alongside the dashboard when planning or reviewing reliability work.
        </p>
      </div>

      <div className="mktSection">
        <h2>Fleet-wide views</h2>
        <p>
          <strong>Summary Reports</strong> give a higher-level picture across wells.
          <strong>Well Location</strong> shows where your wells are on a map.
        </p>
      </div>

      <div className="mktSection">
        <h2>Quick reference</h2>
        <div className="mktCard">
          <h3>Sidebar after login</h3>
          <p>
            <strong>Wells</strong> — pick and manage wells. <strong>Summary Reports</strong> — fleet summaries.
            <strong>Well Location</strong> — map of wells. Per-well pages are reached by choosing a well first.
          </p>
        </div>
        <p style={{ marginTop: 16 }}>
          More questions? See the{" "}
          <Link to="/help" style={{ color: "#60a5fa" }}>
            Help &amp; FAQ
          </Link>{" "}
          or{" "}
          <Link to="/contact" style={{ color: "#60a5fa" }}>
            contact us
          </Link>
          .
        </p>
      </div>
    </MarketingShell>
  );
}

