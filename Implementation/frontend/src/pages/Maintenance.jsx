import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "../styles/Maintenance.css";

/** Default empty shape so the page always has valid data to render. */
const EMPTY_DATA = {
  overallRisk: 0,
  highRiskCount: 0,
  mediumRiskCount: 0,
  totalEquipment: 0,
  equipment: [],
};

function clampPercent(p) {
  if (Number.isNaN(p)) return 0;
  if (p < 0) return 0;
  if (p > 100) return 100;
  return p;
}

function RiskPill({ level }) {
  const text =
    level === "high" ? "HIGH RISK" : level === "medium" ? "MEDIUM RISK" : "LOW RISK";
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

export default function Maintenance() {
  const { wellId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/wells/${wellId}/maintenance`)
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Well not found" : `Error ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (cancelled) return;
        setData({
          overallRisk: json.overallRisk ?? 0,
          highRiskCount: json.highRiskCount ?? 0,
          mediumRiskCount: json.mediumRiskCount ?? 0,
          totalEquipment: json.totalEquipment ?? 0,
          equipment: Array.isArray(json.equipment) ? json.equipment : [],
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e.message || "Failed to load maintenance data");
        if (!cancelled) setData(EMPTY_DATA);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [wellId]);

  if (loading) {
    return (
      <div className="pmPage">
        <button className="pmBack" onClick={() => navigate(`/wells/${wellId}`)}>← Back to Dashboard</button>
        <div className="pmHeader">
          <div className="pmHeaderIcon">🔧</div>
          <div>
            <h1 className="pmTitle">Predictive Maintenance</h1>
            <div className="pmSub">Loading maintenance data…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pmPage">
      {error && (
        <div className="pmError" style={{ padding: "12px", marginBottom: "12px", background: "#fff0f0", border: "1px solid #ffd1d1", borderRadius: "12px", color: "#c00" }}>
          {error}
        </div>
      )}
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

      {/* Summary KPI cards */}
      <div className="pmSummaryGrid">
        <SummaryCard
          tone="purple"
          label="Overall Risk"
          value={`${data.overallRisk}%`}
          note={data.overallRisk >= 70 ? "High level" : data.overallRisk >= 40 ? "Medium level" : "Low level"}
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

      <div className="pmSectionTop">
        <h2 className="pmSectionTitle">Equipment Status</h2>

        <div className="pmLegend">
          <span className="pmDot low" /> Low Risk
          <span className="pmDot medium" /> Medium Risk
          <span className="pmDot high" /> High Risk
        </div>
      </div>

      {/* Equipment cards */}
      <div className="pmEquipList">
        {data.equipment.length === 0 ? (
          <div className="pmEquipCard low">
            <div className="pmEquipNote">No equipment data for this well yet. Upload reports with equipment (Assembly Components) to see maintenance analysis.</div>
          </div>
        ) : (
        data.equipment.map((eq) => {
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
        })
        )}
      </div>

      <div className="pmMethod">
        <div className="pmMethodTitle">Predictive Maintenance Methodology</div>
        <div className="pmMethodText">
          Risk scores are computed from equipment in uploaded reports and well NPT/critical events.
          Data is loaded from the backend based on reports for this well.
        </div>
      </div>
    </div>
  );
}
