import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { Download } from "lucide-react";
import { apiFetch } from "../api/client";
import "../styles/FleetWideReports.css";
import "../styles/SeverityBadge.css";
import { getSegmentEventTypeLabel } from "../utils/segmentEventType";
import { typePillLabel, severityPillLabel, severityBadgeModifier } from "../utils/severityDisplay";

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
  if (Number.isNaN(d.getTime())) return dateStr.slice(0, 10);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function capitalizeWords(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

// Map operation type / description to display event type for fleet charts
function eventTypeLabel(seg) {
  const op = (seg.operationType || seg.eventType || "").toLowerCase();
  const desc = (seg.whyItMatters || "").toLowerCase();

  if (desc.includes("stuck") || op.includes("stuck")) return "Stuck Pipe";
  if (desc.includes("ream") || op.includes("ream")) return "Reaming Required";
  if (op.includes("equipment") || desc.includes("equipment") || op.includes("check") || desc.includes("check")) return "Equipment Check";
  if (op.includes("minor delay") || desc.includes("minor delay") || op.includes("delay") || desc.includes("delay")) return "Minor Delay";

  return capitalizeWords(op || seg.operationType || seg.eventType || "Other") || "Other";
}

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Map well summary status to pill style: red / amber / green */
function fleetStatusToModifier(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("needs")) return "critical";
  if (s.includes("excellent")) return "normal";
  return "warning";
}

function toCSV(rows) {
  const esc = (v) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes("\"") || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  if (!rows || !rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => esc(r[h])).join(","));
  }
  return lines.join("\r\n");
}

export default function FleetWideReports() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wellDashboards, setWellDashboards] = useState([]); // [{ wellSummary, dashboard }]

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);
        const res = await apiFetch("/api/wells/summary", { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`Failed to load fleet summary: ${res.status}`);
        const summary = await res.json();
        const wells = Array.isArray(summary) ? summary : [];

        if (cancelled) return;

        const activeWells = wells.filter((w) => (w.report_count ?? 0) > 0);
        const dashboards = await Promise.allSettled(
          activeWells.map(async (w) => {
            // Per-well timeout so one slow dashboard call doesn't block the whole fleet page.
            const dController = new AbortController();
            const dTimeout = setTimeout(() => dController.abort(), 15000);
            try {
              const r = await apiFetch(
                `/api/wells/${w.well_id}/dashboard?include_equipment=false`,
                { signal: dController.signal }
              );
              if (!r.ok) return { wellSummary: w, dashboard: null };
              const dash = await r.json();
              return { wellSummary: w, dashboard: dash };
            } catch {
              return { wellSummary: w, dashboard: null };
            } finally {
              clearTimeout(dTimeout);
            }
          })
        );

        if (cancelled) return;
        const resolvedDashboards = dashboards
          .map((x) => (x.status === "fulfilled" ? x.value : null))
          .filter((x) => x && x.dashboard);
        setWellDashboards(resolvedDashboards);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Failed to load fleet reports");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const computed = useMemo(() => {
    const wells = wellDashboards.map((x) => x.dashboard).filter(Boolean);
    const activeWellsCount = wellDashboards.length;

    const segmentsByWell = wellDashboards.map((x) => x.dashboard?.segments || []);
    const allSegments = segmentsByWell.flat();

    const eventsByWell = wellDashboards.map((x) => {
      const segs = x.dashboard?.segments || [];
      const total = segs.length;
      const critical = segs.filter((s) => (s.level || "").toLowerCase() === "critical").length;
      return {
        well_id: x.dashboard?.well?.well_id || x.wellSummary?.well_id,
        well_name: x.dashboard?.well?.well_name || x.wellSummary?.well_name,
        totalEvents: total,
        criticalEvents: critical,
        warningEvents: segs.filter((s) => (s.level || "").toLowerCase() === "warning").length,
        segments: segs,
      };
    });

    // NPT by date (fleet)
    const nptByDateMap = {};
    for (const seg of allSegments) {
      const dateKey = (seg.recordedAt || "").slice(0, 10);
      if (!dateKey) continue;
      nptByDateMap[dateKey] = (nptByDateMap[dateKey] || 0) + safeNum(seg.nptHours);
    }
    const nptByDate = Object.entries(nptByDateMap)
      .map(([date, hours]) => ({ date, hours }))
      .sort((a, b) => a.date.localeCompare(b.date));

    let cumulativeNpt = 0;
    const fleetNptTrend = nptByDate.map((d) => {
      cumulativeNpt += d.hours;
      return {
        shortDate: formatShortDate(d.date),
        nptHours: Math.round(cumulativeNpt * 10) / 10,
        avgPerWell: activeWellsCount > 0 ? Math.round((cumulativeNpt / activeWellsCount) * 10) / 10 : 0,
      };
    });

    // NPT totals by well
    const wellNptComparison = eventsByWell.map((w) => {
      const npt = w.segments.reduce((s, seg) => s + safeNum(seg.nptHours), 0);
      const maxDepth = w.segments.reduce((m, seg) => Math.max(m, safeNum(seg.to)), 0);
      return { well_id: w.well_id, well_name: w.well_name, nptHours: npt, maxDepth };
    });

    const totalNpt = wellNptComparison.reduce((s, w) => s + w.nptHours, 0);
    const totalEvents = eventsByWell.reduce((s, w) => s + w.totalEvents, 0);
    const criticalEventsTotal = eventsByWell.reduce((s, w) => s + w.criticalEvents, 0);

    // Productivity proxy per well: productive hours per date = max(0, 24 - NPT hours for that date)
    const wellProductivity = eventsByWell.map((w) => {
      const nptDayMap = {};
      for (const seg of w.segments) {
        const dateKey = (seg.recordedAt || "").slice(0, 10);
        if (!dateKey) continue;
        nptDayMap[dateKey] = (nptDayMap[dateKey] || 0) + safeNum(seg.nptHours);
      }
      const dayEntries = Object.entries(nptDayMap).map(([date, hours]) => ({ date, hours }));
      const totalNptWell = dayEntries.reduce((s, d) => s + d.hours, 0);
      const productive = dayEntries.reduce((s, d) => s + Math.max(0, 24 - d.hours), 0);
      const productivityPercent = totalNptWell + productive > 0 ? (productive / (totalNptWell + productive)) * 100 : 100;
      return {
        well_id: w.well_id,
        nptHours: totalNptWell,
        totalEvents: w.totalEvents,
        criticalEvents: w.criticalEvents,
        productivityPercent: Math.round(productivityPercent * 10) / 10,
      };
    });
    const avgProductivity = wellProductivity.length
      ? Math.round((wellProductivity.reduce((s, x) => s + x.productivityPercent, 0) / wellProductivity.length) * 10) / 10
      : 100;

    // Fleet event type distribution: counts + NPT hours
    const eventTypeCountMap = {};
    const eventTypeNptMap = {};
    for (const seg of allSegments) {
      const t = eventTypeLabel(seg);
      eventTypeCountMap[t] = (eventTypeCountMap[t] || 0) + 1;
      eventTypeNptMap[t] = (eventTypeNptMap[t] || 0) + safeNum(seg.nptHours);
    }
    const eventTypeDistribution = Object.keys(eventTypeCountMap).map((t) => ({
      type: t,
      count: eventTypeCountMap[t] || 0,
      nptHours: Math.round((eventTypeNptMap[t] || 0) * 10) / 10,
    }));

    // Events per well stacked: non-critical (yellow) + critical (red)
    const eventsPerWell = eventsByWell.map((w) => ({
      well_id: w.well_id,
      totalEvents: w.totalEvents,
      criticalEvents: w.criticalEvents,
      nonCritical: Math.max(0, w.totalEvents - w.criticalEvents),
    }));

    // Radar chart metrics for top 3 by productivity
    const maintenanceRiskByWell = {};
    for (const x of wellDashboards) {
      maintenanceRiskByWell[x.wellSummary?.well_id] = x.wellSummary?.kpis?.maintenanceRisk || "Low";
    }
    const riskToHealth = (risk) => (risk === "Low" ? 100 : risk === "Medium" ? 70 : 40);
    const maxNpt = Math.max(1, ...wellProductivity.map((w) => w.nptHours));
    const radarCandidates = wellProductivity.map((w) => {
      const total = w.totalEvents || 1;
      const crit = w.criticalEvents || 0;
      const safety = Math.max(0, Math.round((1 - crit / total) * 100 * 10) / 10);
      const productivity = Math.max(0, Math.min(100, w.productivityPercent));
      const efficiency = productivity;
      const equipmentHealth = riskToHealth(maintenanceRiskByWell[w.well_id]);
      const costPerformance = Math.round((1 - w.nptHours / maxNpt) * 100 * 10) / 10;
      return { ...w, safety, efficiency, equipmentHealth, costPerformance };
    });
    radarCandidates.sort((a, b) => b.productivityPercent - a.productivityPercent);
    const top3 = radarCandidates.slice(0, 3);

    const radarMetrics = ["Productivity", "Safety", "Efficiency", "Equipment Health", "Cost Performance"];
    const radarAxisData = radarMetrics.map((metric) => {
      const row = { metric };
      for (const w of top3) {
        const value =
          metric === "Productivity"
            ? w.productivityPercent
            : metric === "Safety"
            ? w.safety
            : metric === "Efficiency"
            ? w.efficiency
            : metric === "Equipment Health"
            ? w.equipmentHealth
            : metric === "Cost Performance"
            ? w.costPerformance
            : 0;
        row[w.well_id] = Math.max(0, Math.min(100, value));
      }
      return row;
    });

    // Table rows for detailed well summary
    const tableRows = wellProductivity
      .map((w) => {
        const nptRate = Math.round((100 - w.productivityPercent) * 10) / 10;
        let status = "Good";
        if (w.criticalEvents >= 3 || w.productivityPercent < 95) status = "Needs Attention";
        else if (w.productivityPercent >= 97) status = "Excellent";
        return {
          well_id: w.well_id,
          nptHours: `${w.nptHours.toFixed(1)} hrs`,
          totalEvents: w.totalEvents,
          critical: w.criticalEvents,
          productivity: `${w.productivityPercent}%`,
          nptRate: `${nptRate}%`,
          status,
        };
      })
      .sort((a, b) => a.well_id.localeCompare(b.well_id));

    let fleetDetailedEventId = 0;
    const fleetDetailedEvents = [];
    for (const x of wellDashboards) {
      const dash = x.dashboard;
      if (!dash) continue;
      const well_id = dash.well?.well_id || x.wellSummary?.well_id || "";
      for (const s of dash.segments || []) {
        const lvl = (s.level || "").toLowerCase();
        if (lvl !== "critical" && lvl !== "warning") continue;
        fleetDetailedEventId += 1;
        fleetDetailedEvents.push({
          id: fleetDetailedEventId,
          well_id,
          date: formatShortDate((s.recordedAt || "").slice(0, 10)),
          depthRange: `${s.from ?? 0}-${s.to ?? 0}m`,
          level: lvl,
          event: getSegmentEventTypeLabel(s),
          duration: s.nptHours != null ? Number(s.nptHours).toFixed(1) : "-",
        });
      }
    }

    return {
      activeWellsCount,
      totalNpt,
      totalEvents,
      criticalEventsTotal,
      avgProductivity,
      fleetNptTrend,
      wellNptComparison,
      eventTypeDistribution,
      eventsPerWell,
      radarAxisData,
      top3,
      tableRows,
      fleetDetailedEvents,
    };
  }, [wellDashboards]);

  const handlePDF = () => window.print();

  const handleDownloadJSON = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      fleet: {
        activeWells: computed.activeWellsCount,
        totalNptHours: computed.totalNpt,
        totalEvents: computed.totalEvents,
        criticalEvents: computed.criticalEventsTotal,
        avgProductivityPercent: computed.avgProductivity,
      },
      fleetNptTrend: computed.fleetNptTrend,
      nptComparisonAcrossWells: computed.wellNptComparison.map((w) => ({ well_id: w.well_id, nptHours: w.nptHours })),
      eventTypeDistribution: computed.eventTypeDistribution,
      eventsPerWell: computed.eventsPerWell,
      radar: {
        topWells: computed.top3.map((w) => w.well_id),
        axisData: computed.radarAxisData,
      },
      detailedWellSummary: computed.tableRows,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
    downloadBlob(`Fleet_Report_${new Date().toISOString().slice(0, 10)}.json`, blob);
  };

  const handleDownloadCSV = () => {
    // tableRows contains strings for some fields (like "8.3 hrs"), that's OK for CSV readability
    const rows = computed.tableRows.map((r) => ({
      "Well ID": r.well_id,
      "NPT (hrs)": r.nptHours,
      "Total Events": r.totalEvents,
      Critical: r.critical,
      "Productivity (%)": r.productivity,
      "NPT Rate (%)": r.nptRate,
      Status: r.status,
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    downloadBlob(`Fleet_Well_Summary_${new Date().toISOString().slice(0, 10)}.csv`, blob);
  };

  const handleExportTable = () => handleDownloadCSV();

  if (loading) return <div className="summaryReports"><div className="summaryLoading">Loading fleet reports…</div></div>;
  if (error) return <div className="summaryReports"><div className="summaryError">{error}</div></div>;

  return (
    <div className="summaryReports fleetReports">
      <div className="summaryToolbar fleetToolbar">
        <div className="fleetHeaderLeft">
          <h1 className="summaryTitle fleetTitle">Fleet-Wide Reports</h1>
          <p className="summarySub fleetSub">Comprehensive analysis across all wells</p>
        </div>

        <div className="fleetToolbarButtons">
          <button type="button" className="fleetBtn fleetBtn--ghost" onClick={handleDownloadCSV}>
            <span>CSV</span>
          </button>
          <button type="button" className="fleetBtn fleetBtn--ghost" onClick={handlePDF}>
            <span>PDF</span>
          </button>
          <button type="button" className="fleetBtn fleetBtn--primary" onClick={handleDownloadJSON}>
            <span>Full Report (JSON)</span>
          </button>
        </div>
      </div>

      <div className="summaryReportPrint fleetPrint">
        <div className="fleetTopKpis">
          <div className="fleetKpiCard fleetKpiCard--blue">
            <div className="fleetKpiIcon">~</div>
            <div className="fleetKpiMeta">
              <div className="fleetKpiLabel">Active Wells</div>
              <div className="fleetKpiValue">{computed.activeWellsCount}</div>
            </div>
          </div>
          <div className="fleetKpiCard fleetKpiCard--red">
            <div className="fleetKpiIcon">!</div>
            <div className="fleetKpiMeta">
              <div className="fleetKpiLabel">Total NPT</div>
              <div className="fleetKpiValue">{computed.totalNpt.toFixed(1)} hrs</div>
            </div>
          </div>
          <div className="fleetKpiCard fleetKpiCard--orange">
            <div className="fleetKpiIcon">#</div>
            <div className="fleetKpiMeta">
              <div className="fleetKpiLabel">Total Events</div>
              <div className="fleetKpiValue">{computed.totalEvents}</div>
            </div>
          </div>
          <div className="fleetKpiCard fleetKpiCard--purple">
            <div className="fleetKpiIcon">!</div>
            <div className="fleetKpiMeta">
              <div className="fleetKpiLabel">Critical Events</div>
              <div className="fleetKpiValue">{computed.criticalEventsTotal}</div>
            </div>
          </div>
          <div className="fleetKpiCard fleetKpiCard--green">
            <div className="fleetKpiIcon">✓</div>
            <div className="fleetKpiMeta">
              <div className="fleetKpiLabel">Avg Productivity</div>
              <div className="fleetKpiValue">{computed.avgProductivity}%</div>
            </div>
          </div>
        </div>

        <div className="fleetSection">
          <h2 className="fleetSectionTitle">NPT Comparison Across Wells</h2>
          <div className="fleetChartCard">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={computed.wellNptComparison} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="well_id" tick={{ fontSize: 12 }} />
                <YAxis label={{ value: "NPT Hours", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="nptHours" fill="#dc2626" radius={[6, 6, 0, 0]} name="NPT Hours" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="fleetSection">
          <h2 className="fleetSectionTitle">Fleet NPT Trend (Cumulative)</h2>
          <div className="fleetChartCard">
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={computed.fleetNptTrend} margin={{ top: 20, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="nptHours" stroke="#dc2626" strokeWidth={3} dot={{ r: 4 }} name="Total NPT" />
                <Line type="monotone" dataKey="avgPerWell" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Avg per Well" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="fleetSection">
          <h2 className="fleetSectionTitle">Event Type Distribution (All Wells)</h2>
          <div className="fleetChartCard">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={computed.eventTypeDistribution} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="left" label={{ value: "Count", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: "NPT Hours", angle: 90, position: "insideRight" }} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Event Count" />
                <Line yAxisId="right" type="monotone" dataKey="nptHours" stroke="#dc2626" strokeWidth={3} dot={{ r: 3 }} name="Total NPT" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="fleetSection">
          <h2 className="fleetSectionTitle">Events per Well</h2>
          <div className="fleetChartCard">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={computed.eventsPerWell} margin={{ top: 20, right: 20, bottom: 10, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="well_id" tick={{ fontSize: 12 }} />
                <YAxis label={{ value: "Event Count", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="nonCritical" stackId="a" fill="#f59e0b" name="Total Events" radius={[6, 6, 0, 0]} />
                <Bar dataKey="criticalEvents" stackId="a" fill="#dc2626" name="Critical Events" radius={[0, 0, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="fleetSection">
          <h2 className="fleetSectionTitle">Well Performance Comparison (Top 3 Wells)</h2>
          <div className="fleetChartCard">
            <ResponsiveContainer width="100%" height={340}>
              <RadarChart data={computed.radarAxisData} cx="50%" cy="45%" outerRadius="80%">
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                {computed.top3.map((w, i) => {
                  const colors = ["#3b82f6", "#f59e0b", "#22c55e"];
                  const c = colors[i % colors.length];
                  return (
                    <Radar key={w.well_id} name={w.well_id} dataKey={w.well_id} stroke={c} fill={c} fillOpacity={0.15} />
                  );
                })}
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {computed.fleetDetailedEvents.length > 0 && (
          <div className="fleetSection">
            <h2 className="fleetSectionTitle">Detailed Event Breakdown (All Wells)</h2>
            <div className="fleetTableWrap">
              <table className="fleetTable fleetTable--eventBreakdown">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Well ID</th>
                    <th>Date</th>
                    <th>Depth Range</th>
                    <th>Type</th>
                    <th>Event</th>
                    <th>Duration (hrs)</th>
                    <th>Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {computed.fleetDetailedEvents.map((row) => {
                    const mod = severityBadgeModifier(row.level);
                    return (
                      <tr key={`${row.well_id}-${row.id}`}>
                        <td>{row.id}</td>
                        <td>{row.well_id}</td>
                        <td>{row.date}</td>
                        <td>{row.depthRange}</td>
                        <td className="fleetTableCell--badge">
                          <span className={`sevBadge sevBadge--${mod}`}>{typePillLabel(row.level)}</span>
                        </td>
                        <td>{row.event}</td>
                        <td className="fleetTableCell--duration">{row.duration}</td>
                        <td className="fleetTableCell--badge">
                          <span className={`sevBadge sevBadge--${mod}`}>{severityPillLabel(row.level)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="fleetSection">
          <div className="fleetTableHeader">
            <h2 className="fleetSectionTitle" style={{ margin: 0 }}>Detailed Well Summary</h2>
            <button type="button" className="fleetTableExportBtn" onClick={handleExportTable}>
              <Download size={16} />
              <span>Export Table</span>
            </button>
          </div>
          <div className="fleetTableWrap">
            <table className="fleetTable">
              <thead>
                <tr>
                  <th>Well ID</th>
                  <th>NPT (hrs)</th>
                  <th>Total Events</th>
                  <th>Critical</th>
                  <th>Productivity (%)</th>
                  <th>NPT Rate</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {computed.tableRows.map((r) => (
                  <tr key={r.well_id}>
                    <td>{r.well_id}</td>
                    <td className={r.nptHours.includes("48") ? "fleetNptRed" : ""}>{r.nptHours}</td>
                    <td>{r.totalEvents}</td>
                    <td>{r.critical}</td>
                    <td>{r.productivity}</td>
                    <td>{r.nptRate}</td>
                    <td className="fleetTableCell--badge">
                      <span className={`sevBadge sevBadge--${fleetStatusToModifier(r.status)}`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="fleetExportOptions">
          <div className="fleetExportTitle">Report Export Options</div>
          <div className="fleetExportCards">
            <div className="fleetExportCard">
              <div className="fleetExportCardTitle">JSON Format</div>
              <div className="fleetExportCardSub">Complete data structure for API integration</div>
            </div>
            <div className="fleetExportCard">
              <div className="fleetExportCardTitle">CSV Format</div>
              <div className="fleetExportCardSub">Spreadsheet-compatible for Excel analysis</div>
            </div>
            <div className="fleetExportCard">
              <div className="fleetExportCardTitle">PDF Format</div>
              <div className="fleetExportCardSub">Formatted report for presentations</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

