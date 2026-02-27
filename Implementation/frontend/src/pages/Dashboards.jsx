import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Wellbore from "../components/Wellbore";
import KpiCard from "../components/KpiCard";
import SegmentModal from "../components/SegmentModal";
import KpiModal from "../components/KpiModal";
import "../styles/Dashboards.css";

export default function Dashboard() {
  const { wellId } = useParams();
  const navigate = useNavigate();

  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [kpiModal, setKpiModal] = useState(null); // { title, text } or null

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`http://127.0.0.1:8000/wells/${wellId}/dashboard`);
        if (!res.ok) throw new Error(`Backend error: ${res.status}`);
        const data = await res.json();
        setDash(data);
      } catch (e) {
        setError(e.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [wellId]);

  if (loading) return <div style={{ padding: 16 }}>Loading dashboard…</div>;
  if (error) return <div style={{ padding: 16, color: "crimson" }}>{error}</div>;
  if (!dash) return <div style={{ padding: 16 }}>No data.</div>;

  const k = dash.kpis; // ✅ kpis object from backend
  console.log(k);

  return (
    <div className="dash">
      <div className="dashTop">
        <div>
          <div className="dashTitle">Drilling Dashboard — {wellId}</div>
          <div className="dashSub">Live data from backend (PDF ingestion)</div>
        </div>

        <button
          className="pmBtn"
          onClick={() => navigate(`/wells/${wellId}/maintenance`)}
        >
          Predictive Maintenance
        </button>

        <button
            className="reportsBtn"
            onClick={() => window.location.href = `/wells/${wellId}/reports`}
          >
            View Reports
        </button>

      </div>

      <div className="dashGrid">
        <section className="dashLeft">
          <Wellbore
            depthMax={k.depthMax}          // ✅ FIX: depthMax comes from kpis
            segments={dash.segments}       // ✅ segments is top-level
            onSelectSegment={setSelectedSegment}
          />
        </section>

        <aside className="dashRight">
          <KpiCard
            icon="🕒"
            title="Non-Productive Time"
            value={`${k.nptHours} hrs`}
            subtitle="Total across all events"
            badge="NPT"
            tone="danger"
            onClick={() => setKpiModal({ title: "Non-Productive Time", text: "Non-Productive Time (NPT) is the total hours where drilling was stopped or delayed. This includes equipment failures, weather, and other unplanned events." })}
          />

          <KpiCard
            icon="📈"
            title="Event Count"
            value={`${k.eventCount}`}
            subtitle={`${k.criticalEvents} critical events`}
            badge="Events"
            tone="warning"
            onClick={() => setKpiModal({ title: "Event Count", text: "Event Count is the number of distinct operations or events recorded in the reports for this well." })}
          />

          <KpiCard
            icon="⚠️"
            title="High-Risk Zones"
            value={`${k.highRiskZones}`}
            subtitle="Depth segments flagged"
            badge="Risk"
            tone="risk"
            onClick={() => setKpiModal({ title: "High-Risk Zones", text: "High-Risk Zones are depth segments that have been flagged due to NPT, stuck pipe, or other critical indicators." })}
          />

          <KpiCard
            icon="🔧"
            title="Maintenance Risk"
            value={k.maintenanceRisk}
            subtitle="Prototype rule-based risk"
            badge="Status"
            tone="status"
            onClick={() => setKpiModal({ title: "Maintenance Risk", text: "Maintenance Risk is a rule-based indicator of how likely the well may need maintenance based on critical events and NPT." })}
          />
        </aside>
      </div>

      <SegmentModal
        open={!!selectedSegment}
        segment={selectedSegment}
        onClose={() => setSelectedSegment(null)}
      />

      <KpiModal
        open={!!kpiModal}
        title={kpiModal?.title ?? ""}
        text={kpiModal?.text ?? ""}
        onClose={() => setKpiModal(null)}
      />
    </div>
  );
}
