import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/Maintenance.css";

/* ---------------------------------------------------------
   1) Fetch Predictive Maintenance results from backend
--------------------------------------------------------- */
async function fetchPredictive(ops, equipment, mud) {
  const res = await fetch("/api/predictive-maintenance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ operations: ops, equipment, mud }),
  });

  return await res.json();
}

/* UI helpers */
function clampPercent(p) {
  if (Number.isNaN(p)) return 0;
  if (p < 0) return 0;
  if (p > 100) return 100;
  return p;
}

function RiskPill({ level }) {
  const text =
    level === "high" ? "HIGH RISK" :
    level === "medium" ? "MEDIUM RISK" : "LOW RISK";

  return <span className={`pmPill ${level}`}>{text}</span>;
}

function SummaryCard({ tone, label, value, note }) {
  return (
    <div className={`pmSummaryCard ${tone}`}>
      <div className="pmSummaryLabel">{label}</div>
      <div className="pmSummaryValue">{value}</div>
      <div className="pmSummaryNote">{note}</div>
    </div>
  );
}

/* ---------------------------------------------------------
   MAIN COMPONENT
--------------------------------------------------------- */
export default function Maintenance() {
  const { wellId } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);

  /* ---------------------------------------------------------
     2) Load parsed PDF data + call backend predictive engine
  --------------------------------------------------------- */
  useEffect(() => {
    async function loadPredictive() {
      try {
        const stored = localStorage.getItem("parsedReport");

        if (!stored) {
          console.warn("No parsed report found. Predictive cannot run.");
          return;
        }

        const parsed = JSON.parse(stored);

        const result = await fetchPredictive(
          parsed.operations ?? [],
          parsed.equipment ?? [],
          parsed.mud ?? {}
        );

        console.log("Predictive response:", result);

        /* Build UI-friendly structure */
        setData({
          overallRisk: result.summary.overall_risk,
          highRiskCount: result.summary.high_risk,
          mediumRiskCount: result.summary.medium_risk,
          totalEquipment: result.equipment.length,

          equipment: result.equipment.map((eq, i) => {
            const [used, max] = eq.operatingHours.split("/").map(Number);

            return {
              id: `eq-${i}`,
              name: eq.name,
              tag:
                eq.name.toLowerCase().includes("surface") ? "Surface" :
                eq.name.toLowerCase().includes("motor") ? "Downhole" :
                eq.name.toLowerCase().includes("bha") ? "Downhole" :
                "Primary",

              riskLevel: eq.riskLevel.toLowerCase(),
              riskScore: eq.riskScore,
              note:
                eq.action === "Inspect"
                  ? "Inspection recommended based on recent stress and usage."
                  : "Operating within normal parameters.",

              hoursUsed: used,
              hoursMax: max,
              action: eq.action,
              nextMaintenanceHours: eq.nextMaintenanceHours,
            };
          }),
        });

      } catch (err) {
        console.error("Predictive Error:", err);
      }
    }

    loadPredictive();
  }, [wellId]);

  /* ---------------------------------------------------------
     3) Loading state
  --------------------------------------------------------- */
  if (!data) {
    return (
      <div className="pmPage">
        <div className="pmLoading">Loading predictive maintenance...</div>
      </div>
    );
  }

  /* ---------------------------------------------------------
     4) UI Rendering
  --------------------------------------------------------- */
  return (
    <div className="pmPage">
      <button className="pmBack" onClick={() => navigate(`/wells/${wellId}`)}>
        ← Back to Dashboard
      </button>

      <div className="pmHeader">
        <div className="pmHeaderIcon">🔧</div>
        <div>
          <h1 className="pmTitle">Predictive Maintenance</h1>
          <div className="pmSub">Equipment health monitoring and risk assessment</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="pmSummaryGrid">
        <SummaryCard
          tone="purple"
          label="Overall Risk"
          value={`${data.overallRisk}%`}
          note={
            data.overallRisk >= 70
              ? "High level"
              : data.overallRisk >= 40
              ? "Medium level"
              : "Low level"
          }
        />

        <SummaryCard
          tone="red"
          label="High Risk"
          value={`${data.highRiskCount}`}
          note="Requires attention"
        />

        <SummaryCard
          tone="yellow"
          label="Medium Risk"
          value={`${data.mediumRiskCount}`}
          note="Under monitoring"
        />

        <SummaryCard
          tone="blue"
          label="Total Equipment"
          value={`${data.totalEquipment}`}
          note="Active monitoring"
        />
      </div>

      {/* Section Header */}
      <div className="pmSectionTop">
        <h2 className="pmSectionTitle">Equipment Status</h2>

        <div className="pmLegend">
          <span className="pmDot low" /> Low Risk
          <span className="pmDot medium" /> Medium Risk
          <span className="pmDot high" /> High Risk
        </div>
      </div>

      {/* Equipment Cards */}
      <div className="pmEquipList">
        {data.equipment.map((eq) => {
          const pct = clampPercent((eq.hoursUsed / eq.hoursMax) * 100);

          return (
            <div key={eq.id} className={`pmEquipCard ${eq.riskLevel}`}>
              <div className="pmEquipRowTop">
                <div>
                  <div className="pmEquipName">
                    {eq.name} <span className="pmTag">{eq.tag}</span>
                  </div>

                  <div className="pmEquipNote">{eq.note}</div>
                </div>

                <div className="pmEquipRight">
                  <RiskPill level={eq.riskLevel} />

                  <div className="pmScoreBox">
                    <div className="pmScoreValue">{eq.riskScore}%</div>
                    <div className="pmScoreLabel">Risk Score</div>
                  </div>
                </div>
              </div>

              <div className="pmHoursRow">
                <div className="pmHoursLabel">Operating Hours</div>
                <div className="pmHoursValue">
                  {eq.hoursUsed} / {eq.hoursMax} hrs
                </div>
              </div>

              <div className="pmBarTrack">
                <div className="pmBarFill" style={{ width: `${pct}%` }} />
              </div>

              <div className="pmEquipRowBottom">
                <div className="pmAction">
                  <span className="pmActionIcon">
                    {eq.action === "Inspect" ? "⚠️" : "🕒"}
                  </span>
                  Action: <strong>{eq.action}</strong>
                </div>

                <div className="pmNext">
                  ↗ Next maintenance: {eq.nextMaintenanceHours} hours
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pmMethod">
        <div className="pmMethodTitle">Predictive Maintenance Methodology</div>
        <div className="pmMethodText">
          Risk scores are computed from operating hours and exposure to high-stress
          drilling events. This panel loads analytics from the backend based on
          the uploaded reports and parsed operation data.
        </div>
      </div>
    </div>
  );
}
