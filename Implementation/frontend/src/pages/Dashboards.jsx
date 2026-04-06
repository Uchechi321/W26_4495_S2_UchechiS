import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { apiFetch } from "../api/client";
import Wellbore from "../components/Wellbore";
import KpiCard from "../components/KpiCard";
import SegmentModal from "../components/SegmentModal";
import KpiModal from "../components/KpiModal";
import { getSegmentEventTypeLabel } from "../utils/segmentEventType";
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

  // --- Event count by type (for dashboard card) ---
  const eventSegments = dash.segments || [];
  const totalEvents = eventSegments.length;
  const criticalEvents = eventSegments.filter((s) => (s.level || "").toLowerCase() === "critical").length;
  const warningEvents = eventSegments.filter((s) => (s.level || "").toLowerCase() === "warning").length;
  const normalEvents = eventSegments.filter((s) => (s.level || "").toLowerCase() === "normal").length;

  const criticalPct = totalEvents > 0 ? ((criticalEvents / totalEvents) * 100).toFixed(1) : "0.0";
  const warningPct = totalEvents > 0 ? ((warningEvents / totalEvents) * 100).toFixed(1) : "0.0";
  const normalPct = totalEvents > 0 ? ((normalEvents / totalEvents) * 100).toFixed(1) : "0.0";

  const eventCountByTypeData = [
    { name: "Critical", count: criticalEvents, color: "#dc2626" },
    { name: "Warning", count: warningEvents, color: "#f59e0b" },
    { name: "Normal", count: normalEvents, color: "#16a34a" },
  ];

  const severityRank = { critical: 3, warning: 2, normal: 1 };
  const topFlaggedSegments = eventSegments
    .filter((s) => {
      const lvl = (s.level || "").toLowerCase();
      return lvl === "critical" || lvl === "warning";
    })
    .sort((a, b) => {
      const rankDiff = (severityRank[(b.level || "").toLowerCase()] || 0) - (severityRank[(a.level || "").toLowerCase()] || 0);
      if (rankDiff !== 0) return rankDiff;
      return (Number(b.nptHours) || 0) - (Number(a.nptHours) || 0);
    })
    .slice(0, 5);
  const flaggedNptTotal = topFlaggedSegments.reduce((sum, seg) => sum + (Number(seg.nptHours) || 0), 0);
  const highestRiskDepth =
    topFlaggedSegments.length > 0
      ? `${topFlaggedSegments[0].from ?? 0}-${topFlaggedSegments[0].to ?? 0}m`
      : "N/A";

  const insightActions = [
    criticalEvents > 0 ? `Prioritize mitigation for ${criticalEvents} critical event${criticalEvents > 1 ? "s" : ""}.` : null,
    warningEvents > 0 ? `Review ${warningEvents} warning event${warningEvents > 1 ? "s" : ""} before next operation window.` : null,
    topFlaggedSegments.length > 0
      ? `Inspect interval ${topFlaggedSegments[0].from ?? 0}-${topFlaggedSegments[0].to ?? 0}m first (highest current risk).`
      : "No flagged intervals yet. Continue monitoring incoming reports.",
  ].filter(Boolean);

  // High-risk zones (matches backend KPI: segments with NPT hours recorded)
  const highRiskSegments = (dash.segments || [])
    .filter((s) => (Number(s.nptHours) || 0) > 0)
    .sort((a, b) => (Number(a.from) || 0) - (Number(b.from) || 0));
  const depthScaleMax = Math.max(
    Number(k.depthMax) || 0,
    ...highRiskSegments.map((s) => Math.max(Number(s.to) || 0, Number(s.from) || 0)),
    1
  );

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

          <section className="dashInsightsCard">
            <div className="dashInsightsHeader">
              <h3 className="dashInsightsTitle">Segment Insights</h3>
              <span className="dashInsightsMeta">Top flagged intervals</span>
            </div>

            {topFlaggedSegments.length > 0 ? (
              <div className="dashInsightsTableWrap">
                <table className="dashInsightsTable">
                  <thead>
                    <tr>
                      <th>Depth</th>
                      <th>Severity</th>
                      <th>Event Type</th>
                      <th>NPT (hrs)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topFlaggedSegments.map((seg, idx) => {
                      const level = (seg.level || "normal").toLowerCase();
                      return (
                        <tr
                          key={`${seg.report_id ?? "r"}-${seg.from ?? 0}-${seg.to ?? 0}-${idx}`}
                          className="dashInsightsRowClickable"
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedSegment(seg)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedSegment(seg);
                            }
                          }}
                        >
                          <td>{seg.from ?? 0}-{seg.to ?? 0}m</td>
                          <td>
                            <span className={`dashInsightsSeverity dashInsightsSeverity--${level}`}>
                              {level.charAt(0).toUpperCase() + level.slice(1)}
                            </span>
                          </td>
                          <td>{getSegmentEventTypeLabel(seg)}</td>
                          <td>{Number(seg.nptHours || 0).toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="dashInsightsEmpty">No critical or warning intervals found for this well yet.</p>
            )}
            <p className="dashInsightsHint">Tip: Click a row to open detailed segment information.</p>

            <div className="dashInsightsActions">
              <h4>Recommended actions</h4>
              <ul>
                {insightActions.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="dashInsightsSnapshot">
              <div className="dashInsightsSnapshotItem">
                <span>Flagged intervals</span>
                <strong>{topFlaggedSegments.length}</strong>
              </div>
              <div className="dashInsightsSnapshotItem">
                <span>Flagged NPT</span>
                <strong>{flaggedNptTotal.toFixed(1)} hrs</strong>
              </div>
              <div className="dashInsightsSnapshotItem">
                <span>Highest risk depth</span>
                <strong>{highestRiskDepth}</strong>
              </div>
            </div>
          </section>

          <KpiCard
            icon="🔧"
            title="Maintenance Risk"
            value={k.maintenanceRisk}
            subtitle="Prototype rule-based risk"
            badge="Status"
            tone="status"
            onClick={() => setKpiModal({ title: "Maintenance Risk", text: "Maintenance Risk is a rule-based indicator of how likely the well may need maintenance based on critical events and NPT." })}
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
            <div className="dashKpiSeeMoreRow">
              <span className="dashKpiSeeMore">See more</span>
            </div>
          </section>

          <section
            className="dashEventSeverityCard"
            role="button"
            tabIndex={0}
            onClick={() =>
              setKpiModal({
                title: "Event Count",
                text: "Event Count is the number of distinct operations or events recorded in the reports for this well.",
                chartType: "eventCount",
                wellName: dash.well?.well_name || wellId,
                segments: dash.segments || [],
                kpis: dash.kpis || {},
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setKpiModal({
                  title: "Event Count",
                  text: "Event Count is the number of distinct operations or events recorded in the reports for this well.",
                  chartType: "eventCount",
                  wellName: dash.well?.well_name || wellId,
                  segments: dash.segments || [],
                  kpis: dash.kpis || {},
                });
              }
            }}
          >
            <h3 className="dashEventSeverityTitle">Event Count by Type</h3>

            <div className="dashEventSeverityBody">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={eventCountByTypeData}
                  margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
                  barCategoryGap="22%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {eventCountByTypeData.map((entry, i) => (
                      <Cell key={`${entry.name}-${i}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="dashEventSeverityLegend">
              <span className="dashEventSeverityLegendItem dashEventSeverityLegendItem--critical">Critical ({criticalPct}%)</span>
              <span className="dashEventSeverityLegendItem dashEventSeverityLegendItem--warning">Warning ({warningPct}%)</span>
              <span className="dashEventSeverityLegendItem dashEventSeverityLegendItem--normal">Normal ({normalPct}%)</span>
            </div>

            <div className="dashEventSeveritySummaryTable">
              <div className="dashEventSeveritySummaryRow dashEventSeveritySummaryRow--critical">
                <span>Critical</span>
                <strong>
                  {criticalEvents} events ({criticalPct}%)
                </strong>
              </div>
              <div className="dashEventSeveritySummaryRow dashEventSeveritySummaryRow--warning">
                <span>Warning</span>
                <strong>
                  {warningEvents} events ({warningPct}%)
                </strong>
              </div>
              <div className="dashEventSeveritySummaryRow dashEventSeveritySummaryRow--normal">
                <span>Normal</span>
                <strong>
                  {normalEvents} events ({normalPct}%)
                </strong>
              </div>
            </div>
            <div className="dashKpiSeeMoreRow">
              <span className="dashKpiSeeMore">See more</span>
            </div>
          </section>

          <section
            className="dashHighRiskCard"
            role="button"
            tabIndex={0}
            onClick={() =>
              setKpiModal({
                title: "High-Risk Zones",
                text: "High-Risk Zones are depth segments that have been flagged due to NPT, stuck pipe, or other critical indicators.",
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setKpiModal({
                  title: "High-Risk Zones",
                  text: "High-Risk Zones are depth segments that have been flagged due to NPT, stuck pipe, or other critical indicators.",
                });
              }
            }}
          >
            <div className="dashHighRiskTop">
              <div className="dashHighRiskIcon" aria-hidden>
                ⚠️
              </div>
              <span className="dashHighRiskBadge">Risk</span>
            </div>
            <h3 className="dashHighRiskTitle">High-Risk Zones</h3>
            <p className="dashHighRiskLead">
              {highRiskSegments.length === 0
                ? "No depth intervals with recorded NPT yet."
                : `${highRiskSegments.length} segment${highRiskSegments.length !== 1 ? "s" : ""} with NPT — depth view below`}
            </p>

            {highRiskSegments.length > 0 && (
              <>
                <div className="dashHighRiskTrackWrap" aria-hidden>
                  <div className="dashHighRiskTrackLabels">
                    <span>0</span>
                    <span>{Math.round(depthScaleMax)} m</span>
                  </div>
                  <div className="dashHighRiskTrack">
                    {highRiskSegments.map((s, idx) => {
                      const from = Number(s.from) || 0;
                      const to = Number(s.to) ?? from;
                      const span = Math.max(to - from, depthScaleMax * 0.008);
                      const leftPct = (from / depthScaleMax) * 100;
                      const widthPct = Math.min(100 - leftPct, (span / depthScaleMax) * 100);
                      const lvl = (s.level || "warning").toLowerCase();
                      return (
                        <div
                          key={`hr-${idx}-${from}-${to}`}
                          className={`dashHighRiskBand dashHighRiskBand--${lvl === "critical" ? "critical" : "warn"}`}
                          style={{ left: `${leftPct}%`, width: `${Math.max(widthPct, 1.2)}%` }}
                          title={`${from}–${to} m · ${Number(s.nptHours).toFixed(1)} hrs NPT`}
                        />
                      );
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
                          <strong>
                            {from}–{to} m
                          </strong>
                          <span className="dashHighRiskChipMeta">
                            {hrs.toFixed(1)} hrs NPT
                            {lvl === "critical" ? " · Critical" : lvl === "warning" ? " · Warning" : ""}
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {highRiskSegments.length > 6 && (
                  <p className="dashHighRiskMore">+{highRiskSegments.length - 6} more in reports</p>
                )}
              </>
            )}
            <div className="dashKpiSeeMoreRow">
              <span className="dashKpiSeeMore">See more</span>
            </div>
          </section>
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
