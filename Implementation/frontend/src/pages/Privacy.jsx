import MarketingShell from "../components/MarketingShell";

export default function Privacy() {
  return (
    <MarketingShell
      title="Privacy"
      lead="This page describes how DrillOps Intelligence treats information in general terms."
    >
      <div className="mktSection">
        <h2>Information you provide</h2>
        <p>
          When you register, we store account details needed to sign you in and keep your dashboard
          working. When you add wells and upload drilling reports, that content is used inside the
          app so you can review dashboards, KPIs, maintenance, and reports.
        </p>
      </div>

      <div className="mktSection">
        <h2>How we use it</h2>
        <p>
          Operational data is used to display wells, charts, KPIs, maintenance records, maps, and
          summaries in the app. We do not sell your data.
        </p>
      </div>

      <div className="mktSection">
        <h2>Retention</h2>
        <p>
          Reports and well records remain available until you or an administrator deletes them,
          depending on your deployment and hosting setup.
        </p>
      </div>

      <div className="mktSection">
        <h2>Your choices</h2>
        <p>
          You can stop using the service at any time. For account deletion or export requests,
          use the Contact page.
        </p>
      </div>
    </MarketingShell>
  );
}

