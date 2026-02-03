import { useParams } from "react-router-dom";
import { useState } from "react";
import Wellbore from "../components/Wellbore";
import KpiCard from "../components/KpiCard";
import SegmentModal from "../components/SegmentModal";
import "../styles/Dashboards.css";


// Sample well data (Week 4: hard-coded)
const WELL_DATA = {
  "WELL-01": {
    depthMax: 2000,
    nptHours: 2.1,
    eventCount: 1,
    criticalEvents: 0,
    highRiskZones: 0,
    maintenanceRisk: "Low",
    segments: [
      { from: 0, to: 200, level: "normal" },
      { from: 200, to: 400, level: "normal" },
      { from: 400, to: 600, level: "normal" },
      { from: 600, to: 800, level: "warning" },
      { from: 800, to: 1000, level: "normal" },
    ],
  },

  "WELL-02": {
    depthMax: 2000,
    nptHours: 5.4,
    eventCount: 3,
    criticalEvents: 1,
    highRiskZones: 1,
    maintenanceRisk: "Medium",
    segments: [
      { from: 0, to: 200, level: "normal" },
      { from: 200, to: 400, level: "normal" },
      { from: 400, to: 600, level: "warning" },
      { from: 600, to: 800, level: "normal" },
      { from: 800, to: 1000, level: "warning" },
      { from: 1000, to: 1200, level: "critical" },
    ],
  },

  "WELL-03": {
    depthMax: 2000,
    nptHours: 8.3,
    eventCount: 4,
    criticalEvents: 1,
    highRiskZones: 1,
    maintenanceRisk: "High",
    segments: [
      { from: 0, to: 200, level: "normal" },

      { from: 200, to: 400, level: "normal" },

      {
        from: 400,
        to: 600,
        level: "warning",
        eventType: "Minor Delay",
        nptHours: 0.5,
        operationType: "Drilling",
        equipment: ["Mud Pumps", "Drill String"],
        actionsTaken: ["Adjusted mud weight", "Resumed operations"],
        whyItMatters:
          "Detected anomaly in mud circulation pressure required temporary halt to adjust parameters.",
        recordedAt: "2026-01-12 09:15:00",
      },

      { from: 600, to: 800, level: "normal" },
      { from: 800, to: 1000, level: "warning" },
      { from: 1000, to: 1200, level: "critical" },
    ],

  },
};

export default function Dashboard() {
  const { wellId } = useParams();
  const data = WELL_DATA[wellId] ?? WELL_DATA["WELL-01"];
  const [selectedSegment, setSelectedSegment] = useState(null);


  return (
    <div className="dash">
      <div className="dashTop">
        <div>
          <div className="dashTitle">Drilling Dashboard — {wellId}</div>
          <div className="dashSub">Real-time drilling operations analysis (prototype)</div>
        </div>

        <button className="pmBtn">Predictive Maintenance</button>
      </div>

      <div className="dashGrid">
        <section className="dashLeft">
          <Wellbore
            depthMax={data.depthMax}
            segments={data.segments}
            onSelectSegment={setSelectedSegment}
          />

        </section>

        <aside className="dashRight">
          <KpiCard
            icon="🕒"
            title="Non-Productive Time"
            value={`${data.nptHours} hrs`}
            subtitle="Total across all events"
            badge="NPT"
          />

          <KpiCard
            icon="📈"
            title="Event Count"
            value={`${data.eventCount}`}
            subtitle={`${data.criticalEvents} critical events`}
            badge="Events"
          />

          <KpiCard
            icon="⚠️"
            title="High-Risk Zones"
            value={`${data.highRiskZones}`}
            subtitle="Depth segments flagged"
            badge="Risk"
          />

          <KpiCard
            icon="🔧"
            title="Maintenance Risk"
            value={data.maintenanceRisk}
            subtitle="Based on recorded operational stress"
            badge="Status"
          />
        </aside>
      </div>
      <SegmentModal
        open={!!selectedSegment}
        segment={selectedSegment}
        onClose={() => setSelectedSegment(null)}
      />
    </div>
  );
}
