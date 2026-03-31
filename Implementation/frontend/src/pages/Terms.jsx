import MarketingShell from "../components/MarketingShell";

export default function Terms() {
  return (
    <MarketingShell
      title="Terms of use"
      lead="By using DrillOps Intelligence you agree to the following basic rules. Your organization may add its own policies for production deployments."
    >
      <div className="mktSection">
        <h2>Acceptable use</h2>
        <p>
          Use the application only for lawful drilling and operational purposes. Do not disrupt the
          service or access wells you are not authorized to view.
        </p>
      </div>

      <div className="mktSection">
        <h2>Accuracy of data</h2>
        <p>
          Dashboards and KPIs depend on the reports and inputs you provide. DrillOps Intelligence does not replace professional engineering judgment or site-specific safety procedures.
        </p>
      </div>

      <div className="mktSection">
        <h2>Availability</h2>
        <p>
          The service may be unavailable during maintenance or outages. Features may change as the product is improved.
        </p>
      </div>

      <div className="mktSection">
        <h2>Limitation of liability</h2>
        <p>
          To the extent permitted by law, the software is provided “as is”. Operators remain responsible for decisions made using information shown in the app.
        </p>
      </div>

      <div className="mktSection">
        <h2>Contact</h2>
        <p>
          Questions about these terms can be directed through the Contact page on this website.
        </p>
      </div>
    </MarketingShell>
  );
}

