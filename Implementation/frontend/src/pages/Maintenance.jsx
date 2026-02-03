import { useParams, useNavigate } from "react-router-dom";
import "../styles/Maintenance.css";

/**
 * Week 4 prototype: hard-coded data (later comes from backend).
 * Each well returns summary + a list of equipment cards.
 */
const MAINT_DATA = {
  "WELL-01": {
    overallRisk: 22,
    highRiskCount: 0,
    mediumRiskCount: 1,
    totalEquipment: 5,
    equipment: [
      {
        id: "eq-mudpumps",
        name: "Mud Pumps",
        tag: "Surface",
        riskLevel: "low",
        riskScore: 28,
        note: "Operating efficiently. Routine maintenance schedule on track.",
        hoursUsed: 920,
        hoursMax: 3000,
        action: "Monitor",
        nextMaintenanceHours: 580,
      },
      {
        id: "eq-topdrive",
        name: "Top Drive",
        tag: "Surface",
        riskLevel: "low",
        riskScore: 18,
        note: "Excellent condition. Recent inspection completed with no issues identified.",
        hoursUsed: 400,
        hoursMax: 2400,
        action: "Monitor",
        nextMaintenanceHours: 900,
      },
    ],
  },

  "WELL-02": {
    overallRisk: 44,
    highRiskCount: 1,
    mediumRiskCount: 2,
    totalEquipment: 6,
    equipment: [
      {
        id: "eq-drillbit",
        name: "Drill Bit",
        tag: "Primary",
        riskLevel: "high",
        riskScore: 78,
        note: "Approaching recommended replacement threshold. Reaming has accelerated wear.",
        hoursUsed: 245,
        hoursMax: 300,
        action: "Inspect",
        nextMaintenanceHours: 55,
      },
      {
        id: "eq-drillstring",
        name: "Drill String",
        tag: "Primary",
        riskLevel: "medium",
        riskScore: 61,
        note: "Operating within normal parameters. Recent stuck pipe event requires monitoring.",
        hoursUsed: 1600,
        hoursMax: 2500,
        action: "Monitor",
        nextMaintenanceHours: 420,
      },
      {
        id: "eq-motor",
        name: "Drilling Motor",
        tag: "Downhole",
        riskLevel: "medium",
        riskScore: 54,
        note: "Performance indicators within acceptable range. No immediate action required.",
        hoursUsed: 310,
        hoursMax: 600,
        action: "Monitor",
        nextMaintenanceHours: 250,
      },
    ],
  },

  "WELL-03": {
    overallRisk: 56,
    highRiskCount: 1,
    mediumRiskCount: 3,
    totalEquipment: 6,
    equipment: [
      {
        id: "eq-drillstring",
        name: "Drill String",
        tag: "Primary",
        riskLevel: "medium",
        riskScore: 65,
        note: "Operating within normal parameters. Recent stuck pipe event requires continued monitoring.",
        hoursUsed: 1850,
        hoursMax: 2500,
        action: "Monitor",
        nextMaintenanceHours: 500,
      },
      {
        id: "eq-drillbit",
        name: "Drill Bit",
        tag: "Primary",
        riskLevel: "high",
        riskScore: 82,
        note: "Approaching recommended replacement threshold. Multiple reaming operations have accelerated wear.",
        hoursUsed: 245,
        hoursMax: 300,
        action: "Inspect",
        nextMaintenanceHours: 55,
      },
      {
        id: "eq-motor",
        name: "Drilling Motor",
        tag: "Downhole",
        riskLevel: "medium",
        riskScore: 58,
        note: "Performance indicators within acceptable range. No immediate action required.",
        hoursUsed: 380,
        hoursMax: 600,
        action: "Monitor",
        nextMaintenanceHours: 220,
      },
      {
        id: "eq-topdrive",
        name: "Top Drive",
        tag: "Surface",
        riskLevel: "low",
        riskScore: 28,
        note: "Excellent condition. Recent inspection completed with no issues identified.",
        hoursUsed: 620,
        hoursMax: 2800,
        action: "Monitor",
        nextMaintenanceHours: 950,
      },
      {
        id: "eq-mudpumps",
        name: "Mud Pumps",
        tag: "Surface",
        riskLevel: "low",
        riskScore: 35,
        note: "Operating efficiently. Routine maintenance schedule on track.",
        hoursUsed: 920,
        hoursMax: 3000,
        action: "Monitor",
        nextMaintenanceHours: 580,
      },
      {
        id: "eq-bha",
        name: "Bottom Hole Assembly",
        tag: "Downhole",
        riskLevel: "medium",
        riskScore: 70,
        note: "Exposure to high-stress events. Recommend inspection at next trip.",
        hoursUsed: 280,
        hoursMax: 400,
        action: "Inspect",
        nextMaintenanceHours: 120,
      },
    ],
  },
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

  const data = MAINT_DATA[wellId] ?? MAINT_DATA["WELL-03"];

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
          Risk scores are computed from operating hours and exposure to high-stress drilling events
          (Week 4 prototype). In later weeks, this page will load analytics automatically from the
          backend based on the uploaded dataset.
        </div>
      </div>
    </div>
  );
}
