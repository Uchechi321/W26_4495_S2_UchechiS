import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import "../styles/SummaryReports.css";
import FleetWideReports from "./FleetWideReports";

const PIE_COLORS = ["#2b7cff", "#ff9500", "#28a745", "#6f42c1", "#e83e8c", "#20c997"];
const RISK_COLORS = { Low: "#28a745", Medium: "#ff9500", High: "#dc3545" };

function PieChart({ data, size = 160, title }) {
  if (!data || data.length === 0) return null;
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (total === 0) return <div className="summaryPieWrap"><span className="summaryPieEmpty">No data</span></div>;
  const r = 0.38 * size;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;
  const slices = data.map((d, i) => {
    const start = acc;
    acc += (d.value || 0) / total;
    const end = acc;
    const startAngle = 2 * Math.PI * (start - 0.25);
    const endAngle = 2 * Math.PI * (end - 0.25);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = end - start > 0.5 ? 1 : 0;
    const dPath = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { dPath, color: d.color || PIE_COLORS[i % PIE_COLORS.length], label: d.label, value: d.value };
  });

  return (
    <div className="summaryPieWrap">
      {title && <div className="summaryPieTitle">{title}</div>}
      <svg width={size} height={size} className="summaryPieSvg">
        {slices.map((s, i) => (
          <path key={i} d={s.dPath} fill={s.color} stroke="#fff" strokeWidth={1} />
        ))}
      </svg>
      <ul className="summaryPieLegend">
        {slices.map((s, i) => (
          <li key={i}><span className="summaryPieDot" style={{ background: s.color }} /> {s.label} ({s.value})</li>
        ))}
      </ul>
    </div>
  );
}

export default function SummaryReports() {
  return <FleetWideReports />;
  /*
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const printRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        const res = await fetch("/api/wells/summary", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (cancelled) return;
        if (!res.ok) throw new Error(`Failed to load summary: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setWells(Array.isArray(data) ? data : []);
      } catch (e) {
        if (cancelled) return;
        if (e.name === "AbortError") {
          setError("Request timed out. Make sure the backend is running (e.g. uvicorn on port 8000).");
        } else {
          setError(e.message || "Failed to load summary");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const nptByWell = wells
    .filter((w) => (w.kpis?.nptHours || 0) > 0)
    .map((w, i) => ({
      label: w.well_name || w.well_id,
      value: w.kpis?.nptHours || 0,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  const riskCounts = { Low: 0, Medium: 0, High: 0 };
  wells.forEach((w) => {
    const r = w.kpis?.maintenanceRisk || "Low";
    if (riskCounts[r] !== undefined) riskCounts[r]++;
  });
  const riskPieData = Object.entries(riskCounts)
    .filter(([, c]) => c > 0)
    .map(([label]) => ({ label, value: riskCounts[label], color: RISK_COLORS[label] }));

  const handleDownload = () => {
    window.print();
  };

  if (loading) return <div className="summaryReports"><div className="summaryLoading">Loading summary…</div></div>;
  if (error) return <div className="summaryReports"><div className="summaryError">{error}</div></div>;

  return (
    <div className="summaryReports">
      <div className="summaryToolbar">
        <h1 className="summaryTitle">Summary Reports</h1>
        <p className="summarySub">Overview of all wells — KPIs, NPT, and maintenance risk</p>
        <button type="button" className="summaryDownloadBtn" onClick={handleDownload}>
          Download report (PDF)
        </button>
      </div>

      <div ref={printRef} className="summaryReportPrint">
        <div className="summaryReportHeader">
          <h2>Drilling Ops DSS — Wells Summary Report</h2>
          <p className="summaryReportDate">Generated: {new Date().toLocaleString()}</p>
        </div>

        {wells.length === 0 ? (
          <p className="summaryEmpty">No wells or data yet. Upload reports from the Wells page.</p>
        ) : (
          <>
            <section className="summaryCharts">
              <PieChart data={nptByWell} title="NPT hours by well" />
              <PieChart data={riskPieData} title="Maintenance risk (well count)" />
            </section>

            <section className="summaryWellList">
              {wells.map((w) => (
                <article key={w.well_id} className="summaryWellCard">
                  <div className="summaryWellHead">
                    <h3>
                      <Link to={`/wells/${w.well_id}`} className="summaryWellLink">
                        {w.well_name || w.well_id}
                      </Link>
                    </h3>
                    <span className="summaryWellId">{w.well_id}</span>
                    {w.location && <p className="summaryWellLocation">{w.location}</p>}
                    <p className="summaryWellReports">{w.report_count ?? 0} report(s)</p>
                  </div>
                  <div className="summaryWellKpis">
                    <div className="summaryKpi"><span className="summaryKpiLabel">Max depth</span><span className="summaryKpiVal">{w.kpis?.depthMax ?? 0} ft</span></div>
                    <div className="summaryKpi"><span className="summaryKpiLabel">NPT</span><span className="summaryKpiVal">{w.kpis?.nptHours ?? 0} hrs</span></div>
                    <div className="summaryKpi"><span className="summaryKpiLabel">Events</span><span className="summaryKpiVal">{w.kpis?.eventCount ?? 0}</span></div>
                    <div className="summaryKpi"><span className="summaryKpiLabel">Critical</span><span className="summaryKpiVal">{w.kpis?.criticalEvents ?? 0}</span></div>
                    <div className="summaryKpi"><span className="summaryKpiLabel">High-risk zones</span><span className="summaryKpiVal">{w.kpis?.highRiskZones ?? 0}</span></div>
                    <div className="summaryKpi">
                      <span className="summaryKpiLabel">Maintenance risk</span>
                      <span className={`summaryKpiVal summaryRiskBadge summaryRisk--${(w.kpis?.maintenanceRisk || "Low").toLowerCase()}`}>
                        {w.kpis?.maintenanceRisk ?? "Low"}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>
    </div>
  );
  */
}
