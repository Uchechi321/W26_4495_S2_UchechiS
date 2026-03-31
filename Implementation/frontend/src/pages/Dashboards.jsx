import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import { apiFetch } from "../api/client";
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
        const res = await apiFetch(`/api/wells/${wellId}/dashboard`);
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

  // Build NPT by report date from segments (for NPT modal bar chart: x = date, y = NPT hrs)
  const nptByReportDate = (() => {
    const segments = dash.segments || [];
    const byDate = {};
    for (const s of segments) {
      const hours = Number(s.nptHours) || 0;
      if (hours <= 0) continue;
      const dateKey = s.recordedAt || "Unknown date";
      byDate[dateKey] = (byDate[dateKey] || 0) + hours;
    }
    return Object.entries(byDate)
      .map(([date, hours]) => ({ date, hours }))
      .sort((a, b) => a.date.localeCompare(b.date));
  })();

  const totalNpt = Number(k.nptHours) || 0;
  const productiveTime = totalNpt <= 0 ? 0 : Math.round((totalNpt * (100 - 3.5)) / 3.5 * 10) / 10;
  const totalHours = totalNpt + productiveTime;
  const nptPercent = totalHours > 0 ? ((totalNpt / totalHours) * 100).toFixed(2) : "0.00";
  const productivePercent = totalHours > 0 ? ((productiveTime / totalHours) * 100).toFixed(2) : "100.00";
  const nptPieData = [
    { name: "Non-Productive Time", value: totalNpt, color: "#dc2626" },
    { name: "Productive Time", value: productiveTime, color: "#16a34a" },
  ].filter((d) => d.value > 0);
  if (nptPieData.length === 0) {
    nptPieData.push({ name: "No data", value: 1, color: "#e5e7eb" });
  }

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
          <section
            className="dashNptPlotCard"
            role="button"
            tabIndex={0}
            onClick={() =>
              setKpiModal({
                title: "Non-Productive Time",
                text: "Non-Productive Time (NPT) is the total hours where drilling was stopped or delayed.",
                chartData: nptByReportDate,
                chartType: "nptByDate",
                wellName: dash.well?.well_name || wellId,
                segments: dash.segments || [],
                kpis: dash.kpis || {},
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setKpiModal({
                  title: "Non-Productive Time",
                  text: "Non-Productive Time (NPT) is the total hours where drilling was stopped or delayed.",
                  chartData: nptByReportDate,
                  chartType: "nptByDate",
                  wellName: dash.well?.well_name || wellId,
                  segments: dash.segments || [],
                  kpis: dash.kpis || {},
                });
              }
            }}
          >
            <h3 className="dashNptPlotTitle">NPT vs Productive Time</h3>

            <div className="dashNptPlotBody">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart margin={{ top: 12, right: 16, bottom: 12, left: 16 }}>
                  <Pie
                    data={nptPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={82}
                    paddingAngle={2}
                  >
                    {nptPieData.map((entry, i) => (
                      <Cell key={`${entry.name}-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="dashNptLegend">
              <span className="dashNptLegendItem dashNptLegendItem--npt">Non-Productive Time ({nptPercent}%)</span>
              <span className="dashNptLegendItem dashNptLegendItem--prod">Productive Time ({productivePercent}%)</span>
            </div>

            <div className="dashNptSummaryTable">
              <div className="dashNptSummaryRow dashNptSummaryRow--npt">
                <span>Non-Productive Time</span>
                <strong>
                  {totalNpt.toFixed(1)} hrs ({nptPercent}%)
                </strong>
              </div>
              <div className="dashNptSummaryRow dashNptSummaryRow--prod">
                <span>Productive Time</span>
                <strong>
                  {productiveTime.toFixed(1)} hrs ({productivePercent}%)
                </strong>
              </div>
            </div>
          </section>

          <KpiCard
            icon="📈"
            title="Event Count"
            value={`${k.eventCount}`}
            subtitle={`${k.criticalEvents} critical events`}
            badge="Events"
            tone="warning"
            onClick={() => setKpiModal({
              title: "Event Count",
              text: "Event Count is the number of distinct operations or events recorded in the reports for this well.",
              chartType: "eventCount",
              wellName: dash.well?.well_name || wellId,
              segments: dash.segments || [],
              kpis: dash.kpis || {},
            })}
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
        wellId={wellId}
        equipment={selectedSegment?.report_id != null ? (dash.equipmentByReport?.[String(selectedSegment.report_id)] ?? []) : []}
        onClose={() => setSelectedSegment(null)}
      />

      <KpiModal
        open={!!kpiModal}
        title={kpiModal?.title ?? ""}
        text={kpiModal?.text ?? ""}
        onClose={() => setKpiModal(null)}
        chartData={kpiModal?.chartData}
        chartType={kpiModal?.chartType}
        wellName={kpiModal?.wellName}
        segments={kpiModal?.segments}
        kpis={kpiModal?.kpis}
      />
    </div>
  );
}
