import MarketingShell from "../components/MarketingShell";

export default function About() {
  return (
    <MarketingShell
      title="About DrillOps Intelligence"
      lead="We help drilling teams turn well reports and operational data into clear dashboards—so you can spot problems by depth, track equipment health, and see where your wells sit on the map."
    >
      <div className="mktSection">
        <h2>What we do</h2>
        <p>
          DrillOps Intelligence is built for people who run and support drilling operations.
          You register wells, upload drilling PDF reports, and the system organizes that
          information into per-well dashboards, KPI views, maintenance tracking, and fleet-level
          summary reports.
        </p>
      </div>

      <div className="mktSection">
        <h2>Who it is for</h2>
        <p>
          Field engineers, drilling supervisors, maintenance planners, and anyone who needs a
          single place to review well performance. The interface uses plain language so you do
          not need a technical background to get value.
        </p>
      </div>

      <div className="mktSection">
        <h2>Our approach</h2>
        <div className="mktCard">
          <h3>Clarity first</h3>
          <p>
            Charts and KPIs are designed to answer “what happened, where, and when?” along the wellbore.
          </p>
        </div>
        <div className="mktCard">
          <h3>Structured around your wells</h3>
          <p>Everything starts from the well list: pick a well, open its dashboard, then drill into reports, maintenance, or location.</p>
        </div>
        <div className="mktCard">
          <h3>Built for ongoing use</h3>
          <p>Upload new reports as they arrive and revisit past runs from the report history. Use summary views when you need a big-picture look across your fleet.</p>
        </div>
      </div>
    </MarketingShell>
  );
}

