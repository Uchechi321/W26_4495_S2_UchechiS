import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import Wellbore from "../components/Wellbore";
import KpiCard from "../components/KpiCard";
import SegmentModal from "../components/SegmentModal";
import "../styles/Dashboards.css";

export default function Dashboard() {
  const { wellId } = useParams();
  const navigate = useNavigate();

  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSegment, setSelectedSegment] = useState(null);

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
          />

          <KpiCard
            icon="📈"
            title="Event Count"
            value={`${k.eventCount}`}
            subtitle={`${k.criticalEvents} critical events`}
            badge="Events"
            tone="warning"
          />

          <KpiCard
            icon="⚠️"
            title="High-Risk Zones"
            value={`${k.highRiskZones}`}
            subtitle="Depth segments flagged"
            badge="Risk"
            tone="risk"
          />

          <KpiCard
            icon="🔧"
            title="Maintenance Risk"
            value={k.maintenanceRisk}
            subtitle="Prototype rule-based risk"
            badge="Status"
            tone="status"
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
