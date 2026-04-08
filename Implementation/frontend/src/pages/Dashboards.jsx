import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../api/client";
import KpiCard from "../components/KpiCard";
import KpiModal from "../components/KpiModal";
import SegmentModal from "../components/SegmentModal";
import Wellbore from "../components/Wellbore";
import { getSegmentEventTypeLabel } from "../utils/segmentEventType";
import "../styles/Dashboards.css";

const DashboardChartsPanel = lazy(() => import("../components/DashboardChartsPanel"));
const DASHBOARD_TIMEOUT_MS = 12000;

export default function Dashboard() {
  const { wellId } = useParams();
  const navigate = useNavigate();
  const [well, setWell] = useState({ well_id: wellId, well_name: wellId, location: null });
  const [kpis, setKpis] = useState({
    depthMax: 0, nptHours: 0, eventCount: 0, criticalEvents: 0, highRiskZones: 0, maintenanceRisk: "Low",
  });
  const [segments, setSegments] = useState([]);
  const [chartData, setChartData] = useState({ nptByReportDate: [], eventCountByType: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState([]);
  const [kpiModal, setKpiModal] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchWithTimeout = async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), DASHBOARD_TIMEOUT_MS);
      try {
        return await apiFetch(url, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
    };

    async function load() {
      setLoading(true);
      setError("");
      const pSummary = fetchWithTimeout(`/api/wells/summary`).then((r) => (r.ok ? r.json() : null));
      const pSegmentsLite = fetchWithTimeout(`/api/wells/${wellId}/segments-v2?lite=true`).then((r) => (r.ok ? r.json() : null));
      const pFull = fetchWithTimeout(`/api/wells/${wellId}/segments-v2?lite=false`).then((r) => (r.ok ? r.json() : null));

      const [summaryRes, segmentsRes] = await Promise.allSettled([pSummary, pSegmentsLite]);
      if (cancelled) return;

      let anyLoaded = false;
      if (summaryRes.status === "fulfilled" && Array.isArray(summaryRes.value)) {
        const row = summaryRes.value.find((x) => String(x.well_id) === String(wellId));
        if (row) {
          anyLoaded = true;
          setWell({ well_id: row.well_id, well_name: row.well_name || row.well_id, location: row.location || null });
          setKpis(row.kpis || {});
        }
      }
      if (segmentsRes.status === "fulfilled" && segmentsRes.value) {
        anyLoaded = true;
        setSegments(Array.isArray(segmentsRes.value.segments) ? segmentsRes.value.segments : []);
      }
      setLoading(false);
      if (!anyLoaded) setError("Failed to load dashboard");

      // Hydrate full ML segments in background.
      try {
        const data = await pFull;
        if (!cancelled && data) {
          setSegments(Array.isArray(data?.segments) ? data.segments : []);
          const byDate = {};
          for (const s of data.segments || []) {
            const hrs = Number(s.nptHours) || 0;
            if (hrs <= 0 || !s.recordedAt) continue;
            byDate[s.recordedAt] = (byDate[s.recordedAt] || 0) + hrs;
          }
          setChartData({
            nptByReportDate: Object.entries(byDate).map(([date, hours]) => ({ date, hours })).sort((a, b) => a.date.localeCompare(b.date)),
            eventCountByType: [],
          });
        }
      } catch {
        // Keep lite segments if full fetch fails.
      }
    }
    load();
    return () => { cancelled = true; };
  }, [wellId]);

  useEffect(() => {
    let cancelled = false;
    async function loadSelectedEquipment() {
      if (!selectedSegment?.report_id) {
        setSelectedEquipment([]);
        return;
      }
      try {
        const res = await apiFetch(`/api/report-details/${selectedSegment.report_id}/equipment`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setSelectedEquipment(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setSelectedEquipment([]);
      }
    }
    loadSelectedEquipment();
    return () => { cancelled = true; };
  }, [selectedSegment?.report_id]);

  const k = kpis || {};
  const eventSegments = segments || [];
  const { topFlaggedSegments, highRiskSegments, counts, depthScaleMax } = useMemo(() => {
    const severityRank = { critical: 3, warning: 2, normal: 1 };
    const top = [...eventSegments]
      .filter((s) => ["critical", "warning"].includes((s.level || "").toLowerCase()))
      .sort((a, b) => {
        const rankDiff = (severityRank[(b.level || "").toLowerCase()] || 0) - (severityRank[(a.level || "").toLowerCase()] || 0);
        if (rankDiff !== 0) return rankDiff;
        return (Number(b.nptHours) || 0) - (Number(a.nptHours) || 0);
      })
      .slice(0, 5);
    const highs = [...eventSegments]
      .filter((s) => (Number(s.nptHours) || 0) > 0)
      .sort((a, b) => (Number(a.from) || 0) - (Number(b.from) || 0));
    const c = { critical: 0, warning: 0, normal: 0 };
    for (const s of eventSegments) c[(s.level || "normal").toLowerCase()] = (c[(s.level || "normal").toLowerCase()] || 0) + 1;
    const maxDepth = Math.max(Number(k.depthMax) || 0, ...highs.map((s) => Math.max(Number(s.to) || 0, Number(s.from) || 0)), 1);
    return { topFlaggedSegments: top, highRiskSegments: highs, counts: c, depthScaleMax: maxDepth };
  }, [eventSegments, k.depthMax]);

  const totalEvents = eventSegments.length;
  const criticalEvents = counts.critical || 0;
  const warningEvents = counts.warning || 0;
  const normalEvents = counts.normal || 0;
  const criticalPct = totalEvents > 0 ? ((criticalEvents / totalEvents) * 100).toFixed(1) : "0.0";
  const warningPct = totalEvents > 0 ? ((warningEvents / totalEvents) * 100).toFixed(1) : "0.0";
  const normalPct = totalEvents > 0 ? ((normalEvents / totalEvents) * 100).toFixed(1) : "0.0";
  const totalNpt = Number(k.nptHours) || 0;
  const productiveTime = totalNpt <= 0 ? 0 : Math.round((totalNpt * (100 - 3.5)) / 3.5 * 10) / 10;
  const totalHours = totalNpt + productiveTime;
  const nptPercent = totalHours > 0 ? ((totalNpt / totalHours) * 100).toFixed(2) : "0.00";
  const productivePercent = totalHours > 0 ? ((productiveTime / totalHours) * 100).toFixed(2) : "100.00";
  const nptPieData = [
    { name: "Non-Productive Time", value: totalNpt, color: "#dc2626" },
    { name: "Productive Time", value: productiveTime, color: "#16a34a" },
  ].filter((d) => d.value > 0);
  if (nptPieData.length === 0) nptPieData.push({ name: "No data", value: 1, color: "#e5e7eb" });
  const flaggedNptTotal = topFlaggedSegments.reduce((sum, seg) => sum + (Number(seg.nptHours) || 0), 0);
  const highestRiskDepth = topFlaggedSegments.length ? `${topFlaggedSegments[0].from ?? 0}-${topFlaggedSegments[0].to ?? 0}m` : "N/A";
  const insightActions = [
    criticalEvents > 0 ? `Prioritize mitigation for ${criticalEvents} critical event${criticalEvents > 1 ? "s" : ""}.` : null,
    warningEvents > 0 ? `Review ${warningEvents} warning event${warningEvents > 1 ? "s" : ""} before next operation window.` : null,
    topFlaggedSegments.length ? `Inspect interval ${topFlaggedSegments[0].from ?? 0}-${topFlaggedSegments[0].to ?? 0}m first (highest current risk).` : "No flagged intervals yet. Continue monitoring incoming reports.",
  ].filter(Boolean);

  const hasData = !!k || eventSegments.length > 0;

  return (
    <div className="dash">
      <div className="dashTop">
        <div>
          <div className="dashTitle">Drilling Dashboard — {wellId}</div>
          <div className="dashSub">Live data from backend (progressive loading)</div>
        </div>
        <button className="pmBtn" onClick={() => navigate(`/wells/${wellId}/maintenance`)}>Predictive Maintenance</button>
        <button className="reportsBtn" onClick={() => window.location.href = `/wells/${wellId}/reports`}>View Reports</button>
      </div>

      {error && !hasData && <div style={{ padding: 16, color: "crimson" }}>{error}</div>}
      {!hasData && loading && <div style={{ padding: 16 }}>Loading dashboard...</div>}

      <div className="dashGrid">
        <section className="dashLeft">
          <Wellbore depthMax={k.depthMax || 0} segments={eventSegments} onSelectSegment={setSelectedSegment} />
          <section className="dashInsightsCard">
            <div className="dashInsightsHeader">
              <h3 className="dashInsightsTitle">Segment Insights</h3>
              <span className="dashInsightsMeta">Top flagged intervals</span>
            </div>
            {topFlaggedSegments.length > 0 ? (
              <div className="dashInsightsTableWrap">
                <table className="dashInsightsTable">
                  <thead><tr><th>Depth</th><th>Severity</th><th>Event Type</th><th>NPT (hrs)</th></tr></thead>
                  <tbody>
                    {topFlaggedSegments.map((seg, idx) => {
                      const level = (seg.level || "normal").toLowerCase();
                      return (
                        <tr key={`${seg.report_id ?? "r"}-${seg.from ?? 0}-${seg.to ?? 0}-${idx}`} className="dashInsightsRowClickable" onClick={() => setSelectedSegment(seg)}>
                          <td>{seg.from ?? 0}-{seg.to ?? 0}m</td>
                          <td><span className={`dashInsightsSeverity dashInsightsSeverity--${level}`}>{level.charAt(0).toUpperCase() + level.slice(1)}</span></td>
                          <td>{getSegmentEventTypeLabel(seg)}</td>
                          <td>{Number(seg.nptHours || 0).toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : <p className="dashInsightsEmpty">No critical or warning intervals found yet.</p>}
            <div className="dashInsightsActions"><h4>Recommended actions</h4><ul>{insightActions.map((item, idx) => <li key={idx}>{item}</li>)}</ul></div>
            <div className="dashInsightsSnapshot">
              <div className="dashInsightsSnapshotItem"><span>Flagged intervals</span><strong>{topFlaggedSegments.length}</strong></div>
              <div className="dashInsightsSnapshotItem"><span>Flagged NPT</span><strong>{flaggedNptTotal.toFixed(1)} hrs</strong></div>
              <div className="dashInsightsSnapshotItem"><span>Highest risk depth</span><strong>{highestRiskDepth}</strong></div>
            </div>
          </section>
          <KpiCard icon="🔧" title="Maintenance Risk" value={k.maintenanceRisk || "Low"} subtitle="Prototype rule-based risk" badge="Status" tone="status"
            onClick={() => setKpiModal({ title: "Maintenance Risk", text: "Maintenance Risk is a rule-based indicator based on critical events and NPT." })} />
        </section>

        <aside className="dashRight">
          <Suspense fallback={<div style={{ padding: 12 }}>Loading charts...</div>}>
            <DashboardChartsPanel
              nptPieData={nptPieData}
              nptPercent={nptPercent}
              productivePercent={productivePercent}
              totalNpt={totalNpt}
              productiveTime={productiveTime}
              eventCountByTypeData={chartData.eventCountByType?.length ? chartData.eventCountByType : [
                { name: "Critical", count: criticalEvents, color: "#dc2626" },
                { name: "Warning", count: warningEvents, color: "#f59e0b" },
                { name: "Normal", count: normalEvents, color: "#16a34a" },
              ]}
              criticalPct={criticalPct}
              warningPct={warningPct}
              normalPct={normalPct}
              criticalEvents={criticalEvents}
              warningEvents={warningEvents}
              normalEvents={normalEvents}
              openNpt={() => setKpiModal({
                title: "Non-Productive Time",
                text: "Non-Productive Time (NPT) is the total hours where drilling was stopped or delayed.",
                chartData: chartData.nptByReportDate || [],
                chartType: "nptByDate",
                wellName: well.well_name || wellId,
                segments: eventSegments,
                kpis: k,
              })}
              openEventCount={() => setKpiModal({
                title: "Event Count",
                text: "Event Count is the number of distinct operations or events recorded for this well.",
                chartType: "eventCount",
                wellName: well.well_name || wellId,
                segments: eventSegments,
                kpis: k,
              })}
            />
          </Suspense>

          <section className="dashHighRiskCard" role="button" tabIndex={0} onClick={() => setKpiModal({ title: "High-Risk Zones", text: "High-Risk Zones are depth segments flagged due to NPT/stuck pipe/critical indicators." })}>
            <div className="dashHighRiskTop"><div className="dashHighRiskIcon" aria-hidden>⚠️</div><span className="dashHighRiskBadge">Risk</span></div>
            <h3 className="dashHighRiskTitle">High-Risk Zones</h3>
            <p className="dashHighRiskLead">{highRiskSegments.length === 0 ? "No depth intervals with recorded NPT yet." : `${highRiskSegments.length} segment${highRiskSegments.length !== 1 ? "s" : ""} with NPT — depth view below`}</p>
            {highRiskSegments.length > 0 && (
              <>
                <div className="dashHighRiskTrackWrap" aria-hidden>
                  <div className="dashHighRiskTrackLabels"><span>0</span><span>{Math.round(depthScaleMax)} m</span></div>
                  <div className="dashHighRiskTrack">
                    {highRiskSegments.map((s, idx) => {
                      const from = Number(s.from) || 0;
                      const to = Number(s.to) ?? from;
                      const span = Math.max(to - from, depthScaleMax * 0.008);
                      const leftPct = (from / depthScaleMax) * 100;
                      const widthPct = Math.min(100 - leftPct, (span / depthScaleMax) * 100);
                      const lvl = (s.level || "warning").toLowerCase();
                      return <div key={`hr-${idx}-${from}-${to}`} className={`dashHighRiskBand dashHighRiskBand--${lvl === "critical" ? "critical" : "warn"}`} style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1.2)}%` }} />;
                    })}
                  </div>
                </div>
                <ul className="dashHighRiskChips">
                  {highRiskSegments.slice(0, 6).map((s, idx) => {
                    const from = Number(s.from) || 0;
                    const to = Number(s.to) ?? from;
                    const hrs = Number(s.nptHours) || 0;
                    const lvl = (s.level || "warning").toLowerCase();
                    return (
                      <li key={`chip-${idx}-${from}-${to}`}>
                        <span className={`dashHighRiskChip dashHighRiskChip--${lvl === "critical" ? "critical" : "warn"}`}>
                          <strong>{from}–{to} m</strong>
                          <span className="dashHighRiskChipMeta">{hrs.toFixed(1)} hrs NPT{lvl === "critical" ? " · Critical" : lvl === "warning" ? " · Warning" : ""}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
            <div className="dashKpiSeeMoreRow"><span className="dashKpiSeeMore">See more</span></div>
          </section>
        </aside>
      </div>

      <SegmentModal open={!!selectedSegment} segment={selectedSegment} equipment={selectedEquipment} onClose={() => setSelectedSegment(null)} />
      <KpiModal open={!!kpiModal} title={kpiModal?.title ?? ""} text={kpiModal?.text ?? ""} onClose={() => setKpiModal(null)}
        chartData={kpiModal?.chartData} chartType={kpiModal?.chartType} wellName={kpiModal?.wellName} segments={kpiModal?.segments} kpis={kpiModal?.kpis} />
    </div>
  );
}
