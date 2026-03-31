import { Link } from "react-router-dom";
import MarketingShell from "../components/MarketingShell";

const faqs = [
  {
    q: "Do I need to install anything?",
    a: "No. DrillOps Intelligence runs in your web browser.",
  },
  {
    q: "Why can’t I see the Wells page?",
    a: "You must be signed in. If you open the app without logging in, you stay on the public home page.",
  },
  {
    q: "Who can see my wells?",
    a: "Wells are scoped to your account.",
  },
  {
    q: "What file type should I upload?",
    a: "Upload drilling reports as PDFs for the well you are working on.",
  },
  {
    q: "What is the dashboard showing?",
    a: "The well dashboard combines wellbore visualization with KPI cards so you can relate metrics to depth.",
  },
  {
    q: "How do Summary Reports differ from a single-well report?",
    a: "Summary Reports look across your operation. Single-well views focus on one asset at a time.",
  },
  {
    q: "What is Well Location for?",
    a: "It shows your wells on a map for orientation and planning.",
  },
  {
    q: "I forgot my password. What do I do?",
    a: "Password recovery depends on your deployment. Use the Contact page so your team can guide you.",
  },
];

export default function Help() {
  return (
    <MarketingShell
      title="Help Center & FAQ"
      lead="Short answers to common questions. For a full walkthrough, read How It Works."
    >
      <div className="mktSection">
        <h2>Frequently asked questions</h2>
        {faqs.map(({ q, a }) => (
          <details key={q} className="mktFaqItem" open={false}>
            <summary>{q}</summary>
            <p>{a}</p>
          </details>
        ))}
      </div>

      <div className="mktSection">
        <h2>More resources</h2>
        <div className="mktCard">
          <h3>Step-by-step guide</h3>
          <p>
            <Link to="/how-it-works" style={{ color: "#60a5fa" }}>
              How to use the system
            </Link>{" "}
            — account, wells, uploads, dashboards, and fleet views.
          </p>
        </div>
        <div className="mktCard">
          <h3>About the product</h3>
          <p>
            <Link to="/about" style={{ color: "#60a5fa" }}>
              About DrillOps Intelligence
            </Link>{" "}
            — who it is for and what problems it solves.
          </p>
        </div>
      </div>
    </MarketingShell>
  );
}

