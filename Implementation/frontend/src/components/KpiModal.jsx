import { ChevronLeft, Download, Clock, TrendingUp, Calendar } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../styles/SegmentModal.css";
import "../styles/KpiModal.css";
import "../styles/SeverityBadge.css";
import { getSegmentEventTypeLabel } from "../utils/segmentEventType";
import { typePillLabel, severityPillLabel, severityBadgeModifier } from "../utils/severityDisplay";

export default function KpiModal({
  open,
  title,
  text,
  onClose,
  chartData,
  chartType,
  wellName,
  segments = [],
  kpis = {},
}) {
  if (!open) return null;

  const isNptAnalytics = chartType === "nptByDate" && (wellName != null || chartData?.length > 0);
  const isEventAnalytics = chartType === "eventCount" && (segments?.length || 0) > 0;

  // NPT analytics derived data
  const totalNpt = Number(kpis.nptHours) ?? (chartData?.length ? chartData.reduce((s, d) => s + (d.hours || 0), 0) : 0);
  const productiveTime = totalNpt <= 0 ? 0 : Math.round(totalNpt * (100 - 3.5) / 3.5 * 10) / 10;
  const totalHours = totalNpt + productiveTime;
  const displayNptPercent = totalHours > 0 ? ((totalNpt / totalHours) * 100).toFixed(2) : "0";
  const nptEventCount = segments.filter((s) => (Number(s.nptHours) || 0) > 0).length;

  // NPT by event type (group segments with NPT by label)
  const nptByEventTypeMap = {};
  segments.forEach((s) => {
    const hrs = Number(s.nptHours) || 0;
    if (hrs <= 0) return;
    const label = getSegmentEventTypeLabel(s);
    if (!nptByEventTypeMap[label]) nptByEventTypeMap[label] = { hours: 0, count: 0 };
    nptByEventTypeMap[label].hours += hrs;
    nptByEventTypeMap[label].count += 1;
  });
  const nptByEventType = Object.entries(nptByEventTypeMap).map(([name, v]) => ({
    name,
    hours: Math.round(v.hours * 10) / 10,
    count: v.count,
  })).sort((a, b) => b.hours - a.hours);

  const formatShortDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr.includes("T") ? dateStr : dateStr + "T00:00:00");
      return isNaN(d.getTime()) ? dateStr.slice(0, 10) : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr.slice(5, 10).replace("-", "/");
    }
  };

  // Daily NPT vs Productive (from chartData = nptByReportDate)
  const dailyData = (chartData || []).map((d) => {
    const npt = Number(d.hours) || 0;
    const productive = Math.max(0, 24 - npt);
    return {
      date: d.date,
      shortDate: formatShortDate(d.date),
      npt: Math.round(npt * 10) / 10,
      productive: Math.round(productive * 10) / 10,
    };
  });

  // Cumulative NPT over time
  let cum = 0;
  const cumulativeData = (chartData || []).map((d) => {
    cum += Number(d.hours) || 0;
    return {
      date: d.date,
      shortDate: formatShortDate(d.date),
      cumulativeHours: Math.round(cum * 10) / 10,
    };
  });

  // Table rows: event type, NPT hours, occurrences, % of total NPT, avg per event
  const tableRows = nptByEventType.map((e) => ({
    eventType: e.name,
    nptHours: e.hours,
    occurrences: e.count,
    pctTotal: totalNpt > 0 ? ((e.hours / totalNpt) * 100).toFixed(1) : "0",
    avgPerEvent: e.count > 0 ? (e.hours / e.count).toFixed(2) : "0",
  }));
  const totalRow = totalNpt > 0 && tableRows.length > 0
    ? {
        eventType: "Total",
        nptHours: Math.round(totalNpt * 10) / 10,
        occurrences: tableRows.reduce((s, r) => s + r.occurrences, 0),
        pctTotal: "100",
        avgPerEvent: (totalNpt / tableRows.reduce((s, r) => s + r.occurrences, 0)).toFixed(2),
      }
    : null;

  function downloadNptReport() {
    // Match SummaryReports behaviour: open browser print dialog so user can save as PDF.
    window.print();
  }

  // --- Event analytics derived data (for Event Count card) ---
  const totalEvents = segments.length;
  const criticalEvents = segments.filter((s) => (s.level || "").toLowerCase() === "critical").length;
  const warningEvents = segments.filter((s) => (s.level || "").toLowerCase() === "warning").length;
  const normalEvents = segments.filter((s) => (s.level || "").toLowerCase() === "normal").length;
  const criticalRate = totalEvents > 0 ? ((criticalEvents / totalEvents) * 100).toFixed(1) : "0.0";

  const severityPieData = [
    { name: "Critical", value: criticalEvents, color: "#dc2626" },
    { name: "Warning", value: warningEvents, color: "#f59e0b" },
    { name: "Normal", value: normalEvents, color: "#16a34a" },
  ].filter((d) => d.value > 0);
  if (severityPieData.length === 0) {
    severityPieData.push({ name: "No events", value: 1, color: "#e5e7eb" });
  }

  const renderSeverityDonutLabel = ({ cx, cy, midAngle, outerRadius, name, value }) => {
    if (name === "No events" || cx == null || cy == null || !totalEvents) return null;
    const pct = ((value / totalEvents) * 100).toFixed(1);
    const RADIAN = Math.PI / 180;
    const r = (outerRadius ?? 100) + 32;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const textAnchor = Math.abs(cos) < 0.15 ? "middle" : cos > 0 ? "start" : "end";
    const fill =
      name === "Critical" ? "#b91c1c" : name === "Warning" ? "#d97706" : "#15803d";
    return (
      <text x={x} y={y} textAnchor={textAnchor} fill={fill} fontSize={11} fontWeight={700}>
        <tspan x={x} dy="-0.35em">
          {name}
        </tspan>
        <tspan x={x} dy="1.25em">
          {pct}%
        </tspan>
      </text>
    );
  };

  // Daily events by recordedAt date
  const eventsByDateMap = {};
  segments.forEach((s) => {
    const dateKey = (s.recordedAt || "").slice(0, 10) || "Unknown";
    if (!eventsByDateMap[dateKey]) {
      eventsByDateMap[dateKey] = { date: dateKey, total: 0, critical: 0, warning: 0 };
    }
    eventsByDateMap[dateKey].total += 1;
    const lvl = (s.level || "").toLowerCase();
    if (lvl === "critical") eventsByDateMap[dateKey].critical += 1;
    if (lvl === "warning") eventsByDateMap[dateKey].warning += 1;
  });
  const dailyEventsData = Object.values(eventsByDateMap)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      shortDate: formatShortDate(d.date),
    }));

  // Cumulative events over time
  let cumEvents = 0;
  const cumulativeEventsData = dailyEventsData.map((d) => {
    cumEvents += d.total;
    return { date: d.date, shortDate: d.shortDate, cumulative: cumEvents };
  });

  // Events by depth range buckets (0-400, 400-600, 600-1000, 1000-1220, 1220-1260, 1500-1700, 1700-2000+)
  const depthBuckets = [
    { label: "0-400m", min: 0, max: 400 },
    { label: "400-600m", min: 400, max: 600 },
    { label: "600-1000m", min: 600, max: 1000 },
    { label: "1000-1220m", min: 1000, max: 1220 },
    { label: "1220-1260m", min: 1220, max: 1260 },
    { label: "1500-1700m", min: 1500, max: 1700 },
    { label: "1700-2000m", min: 1700, max: 2000 },
  ];
  const depthData = depthBuckets.map((b) => ({
    ...b,
    critical: 0,
    warning: 0,
    normal: 0,
  }));
  segments.forEach((s) => {
    const from = Number(s.from) || 0;
    const to = Number(s.to) || from;
    const mid = (from + to) / 2;
    const lvl = (s.level || "").toLowerCase();
    const bucket = depthData.find((b) => mid >= b.min && mid < b.max);
    if (!bucket) return;
    if (lvl === "critical") bucket.critical += 1;
    else if (lvl === "warning") bucket.warning += 1;
    else bucket.normal += 1;
  });

  const detailedEventsRows = segments
    .filter((s) => {
      const lvl = (s.level || "").toLowerCase();
      return lvl === "critical" || lvl === "warning";
    })
    .map((s, idx) => ({
      id: idx + 1,
      date: formatShortDate((s.recordedAt || "").slice(0, 10)),
      depthRange: `${s.from ?? 0}-${s.to ?? 0}m`,
      type: (s.level || "normal").toLowerCase(),
      event: getSegmentEventTypeLabel(s),
      duration: s.nptHours != null ? Number(s.nptHours).toFixed(1) : "-",
      severity: (s.level || "normal").toLowerCase(),
    }));

  if (isNptAnalytics) {
    return (
      <div className="modalOverlay" onClick={onClose}>
        <div className="kpiModalNptAnalytics" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="kpiModalNptHeader">
            <button type="button" className="kpiModalNptBack" onClick={onClose} aria-label="Back to dashboard">
              <ChevronLeft size={20} />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="kpiModalNptTitle">NPT Analytics — {wellName || "Well"}</h1>
            <p className="kpiModalNptSubtitle">Non-Productive Time Analysis</p>
            <button type="button" className="kpiModalNptDownload" onClick={downloadNptReport} aria-label="Download NPT Report">
              <Download size={18} />
              <span>Download NPT Report</span>
            </button>
          </div>

          {/* KPI cards */}
          <div className="kpiModalNptKpiRow">
            <div className="kpiModalNptKpiCard kpiModalNptKpiCard--danger">
              <Clock size={22} className="kpiModalNptKpiIcon" />
              <span className="kpiModalNptKpiLabel">Total NPT</span>
              <span className="kpiModalNptKpiValue">{totalNpt.toFixed(1)} hrs</span>
            </div>
            <div className="kpiModalNptKpiCard kpiModalNptKpiCard--success">
              <TrendingUp size={22} className="kpiModalNptKpiIcon" />
              <span className="kpiModalNptKpiLabel">Productive Time</span>
              <span className="kpiModalNptKpiValue">{productiveTime.toFixed(1)} hrs</span>
            </div>
            <div className="kpiModalNptKpiCard kpiModalNptKpiCard--warning">
              <Calendar size={22} className="kpiModalNptKpiIcon" />
              <span className="kpiModalNptKpiLabel">NPT Percentage</span>
              <span className="kpiModalNptKpiValue">{displayNptPercent}%</span>
            </div>
            <div className="kpiModalNptKpiCard kpiModalNptKpiCard--info">
              <Clock size={22} className="kpiModalNptKpiIcon" />
              <span className="kpiModalNptKpiLabel">NPT Events</span>
              <span className="kpiModalNptKpiValue">{nptEventCount}</span>
            </div>
          </div>

          {/* NPT by Event Type bar chart */}
          {nptByEventType.length > 0 && (
            <div className="kpiModalNptSection">
              <h3 className="kpiModalNptSectionTitle">NPT by Event Type</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={nptByEventType} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-28} textAnchor="end" height={70} interval={0} />
                  <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} hrs`, "NPT"]} />
                  <Bar dataKey="hours" fill="#dc2626" radius={[4, 4, 0, 0]} name="NPT (hrs)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Daily NPT vs Productive Time line chart */}
          {dailyData.length > 0 && (
            <div className="kpiModalNptSection">
              <h3 className="kpiModalNptSectionTitle">Daily NPT vs Productive Time</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyData} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                  <YAxis label={{ value: "Hours", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="npt" stroke="#dc2626" strokeWidth={2} dot={{ r: 4 }} name="NPT" />
                  <Line type="monotone" dataKey="productive" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} name="Productive" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cumulative NPT Over Time */}
          {cumulativeData.length > 0 && (
            <div className="kpiModalNptSection">
              <h3 className="kpiModalNptSectionTitle">Cumulative NPT Over Time</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={cumulativeData} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                  <YAxis label={{ value: "Cumulative Hours", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => [`${v} hrs`, "Cumulative NPT"]} />
                  <Line type="monotone" dataKey="cumulativeHours" stroke="#dc2626" strokeWidth={2} dot={{ r: 4, fill: "#fff", stroke: "#dc2626" }} name="Cumulative NPT (hrs)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Detailed NPT Events Breakdown table */}
          {(tableRows.length > 0 || totalRow) && (
            <div className="kpiModalNptSection">
              <h3 className="kpiModalNptSectionTitle">Detailed NPT Events Breakdown</h3>
              <div className="kpiModalNptTableWrap">
                <table className="kpiModalNptTable">
                  <thead>
                    <tr>
                      <th>Event Type</th>
                      <th>NPT Hours</th>
                      <th>Occurrences</th>
                      <th>% of Total NPT</th>
                      <th>Avg per Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, i) => (
                      <tr key={i}>
                        <td>{row.eventType}</td>
                        <td className="kpiModalNptTableNpt">{row.nptHours} hrs</td>
                        <td>{row.occurrences}</td>
                        <td>{row.pctTotal}%</td>
                        <td>{row.avgPerEvent} hrs</td>
                      </tr>
                    ))}
                    {totalRow && (
                      <tr className="kpiModalNptTableTotal">
                        <td>{totalRow.eventType}</td>
                        <td className="kpiModalNptTableNpt">{totalRow.nptHours} hrs</td>
                        <td>{totalRow.occurrences}</td>
                        <td>{totalRow.pctTotal}%</td>
                        <td>{totalRow.avgPerEvent} hrs</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="kpiModalNptFooter">
            <button type="button" className="secondaryBtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isEventAnalytics) {
    return (
      <div className="modalOverlay" onClick={onClose}>
        <div className="kpiModalNptAnalytics" onClick={(e) => e.stopPropagation()}>
          <div className="kpiModalNptHeader">
            <button
              type="button"
              className="kpiModalNptBack"
              onClick={onClose}
              aria-label="Back to dashboard"
            >
              <ChevronLeft size={20} />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="kpiModalNptTitle">Event Analytics — {wellName || "Well"}</h1>
            <p className="kpiModalNptSubtitle">Drilling Events Analysis Across All Reports</p>
            <button
              type="button"
              className="kpiModalNptDownload"
              onClick={downloadNptReport}
              aria-label="Download Event Report"
            >
              <Download size={18} />
              <span>Download Event Report</span>
            </button>
          </div>

          {/* KPI cards */}
          <div className="kpiModalNptKpiRow">
            <div className="kpiModalNptKpiCard kpiModalNptKpiCard--info">
              <Clock size={22} className="kpiModalNptKpiIcon" />
              <span className="kpiModalNptKpiLabel">Total Events</span>
              <span className="kpiModalNptKpiValue">{totalEvents}</span>
            </div>
            <div className="kpiModalNptKpiCard kpiModalNptKpiCard--danger">
              <Clock size={22} className="kpiModalNptKpiIcon" />
              <span className="kpiModalNptKpiLabel">Critical Events</span>
              <span className="kpiModalNptKpiValue">{criticalEvents}</span>
            </div>
            <div className="kpiModalNptKpiCard kpiModalNptKpiCard--warning">
              <Clock size={22} className="kpiModalNptKpiIcon" />
              <span className="kpiModalNptKpiLabel">Warning Events</span>
              <span className="kpiModalNptKpiValue">{warningEvents}</span>
            </div>
            <div className="kpiModalNptKpiCard kpiModalNptKpiCard--success">
              <TrendingUp size={22} className="kpiModalNptKpiIcon" />
              <span className="kpiModalNptKpiLabel">Critical Rate</span>
              <span className="kpiModalNptKpiValue">{criticalRate}%</span>
            </div>
          </div>

          {/* Event Severity Distribution */}
          <div className="kpiModalNptSection">
            <h3 className="kpiModalNptSectionTitle">Event Severity Distribution</h3>
            <div className="kpiModalNptPieWrap">
              <ResponsiveContainer width="100%" height={320}>
                <PieChart margin={{ top: 28, right: 44, bottom: 28, left: 44 }}>
                  <Pie
                    data={severityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={renderSeverityDonutLabel}
                    labelLine={false}
                    animationBegin={0}
                    animationDuration={750}
                  >
                    {severityPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${Number(v).toFixed(0)} events`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="kpiModalNptLegend kpiModalNptLegend--pie kpiModalNptLegend--severity">
                <span className="kpiModalNptLegendItem kpiModalNptLegendItem--severity-critical">
                  Critical (
                  {totalEvents > 0 ? ((criticalEvents / totalEvents) * 100).toFixed(1) : "0.0"}
                  %)
                </span>
                <span className="kpiModalNptLegendItem kpiModalNptLegendItem--severity-warning">
                  Warning (
                  {totalEvents > 0 ? ((warningEvents / totalEvents) * 100).toFixed(1) : "0.0"}
                  %)
                </span>
                <span className="kpiModalNptLegendItem kpiModalNptLegendItem--severity-normal">
                  Normal (
                  {totalEvents > 0 ? ((normalEvents / totalEvents) * 100).toFixed(1) : "0.0"}
                  %)
                </span>
              </div>
              <div className="kpiModalNptSummaryTable">
                <div className="kpiModalNptSummaryRow kpiModalNptSummaryRow--npt">
                  <span>Critical</span>
                  <span>
                    {criticalEvents} events (
                    {totalEvents > 0 ? ((criticalEvents / totalEvents) * 100).toFixed(1) : "0.0"}
                    %)
                  </span>
                </div>
                <div className="kpiModalNptSummaryRow kpiModalNptSummaryRow--severity-warning">
                  <span>Warning</span>
                  <span>
                    {warningEvents} events (
                    {totalEvents > 0 ? ((warningEvents / totalEvents) * 100).toFixed(1) : "0.0"}
                    %)
                  </span>
                </div>
                <div className="kpiModalNptSummaryRow kpiModalNptSummaryRow--severity-normal">
                  <span>Normal</span>
                  <span>
                    {normalEvents} events (
                    {totalEvents > 0 ? ((normalEvents / totalEvents) * 100).toFixed(1) : "0.0"}
                    %)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Count by Type */}
          <div className="kpiModalNptSection">
            <h3 className="kpiModalNptSectionTitle">Event Count by Type</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={[
                  { name: "Critical", count: criticalEvents },
                  { name: "Warning", count: warningEvents },
                  { name: "Normal", count: normalEvents },
                ]}
                margin={{ top: 12, right: 16, bottom: 24, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis label={{ value: "Count", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v}`, "Events"]} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Events">
                  <Cell key="critical" fill="#dc2626" />
                  <Cell key="warning" fill="#f59e0b" />
                  <Cell key="normal" fill="#16a34a" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cumulative Events Over Time */}
          {cumulativeEventsData.length > 0 && (
            <div className="kpiModalNptSection">
              <h3 className="kpiModalNptSectionTitle">Cumulative Events Over Time</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={cumulativeEventsData} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                  <YAxis
                    label={{ value: "Cumulative Count", angle: -90, position: "insideLeft" }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(v) => [`${v}`, "Total Events"]} />
                  <Line
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#fff", stroke: "#3b82f6" }}
                    name="Total Events"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Daily Event Breakdown */}
          {dailyEventsData.length > 0 && (
            <div className="kpiModalNptSection">
              <h3 className="kpiModalNptSectionTitle">Daily Event Breakdown</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyEventsData} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 12 }} />
                  <YAxis label={{ value: "Events", angle: -90, position: "insideLeft" }} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="critical"
                    stroke="#dc2626"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Critical"
                  />
                  <Line
                    type="monotone"
                    dataKey="warning"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="Warning"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Events by Depth Range */}
          <div className="kpiModalNptSection">
            <h3 className="kpiModalNptSectionTitle">Events by Depth Range</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={depthData}
                layout="vertical"
                margin={{ top: 12, right: 16, bottom: 24, left: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend
                  formatter={(value, entry) => (
                    <span style={{ color: entry.color, fontWeight: 600 }}>{value}</span>
                  )}
                />
                <Bar dataKey="critical" stackId="a" fill="#dc2626" name="Critical" />
                <Bar dataKey="warning" stackId="a" fill="#f59e0b" name="Warning" />
                <Bar dataKey="normal" stackId="a" fill="#16a34a" name="Normal" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Event Breakdown table */}
          {detailedEventsRows.length > 0 && (
            <div className="kpiModalNptSection">
              <h3 className="kpiModalNptSectionTitle">Detailed Event Breakdown</h3>
              <div className="kpiModalNptTableWrap">
                <table className="kpiModalNptTable">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Date</th>
                      <th>Depth Range</th>
                      <th>Type</th>
                      <th>Event</th>
                      <th>Duration (hrs)</th>
                      <th>Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailedEventsRows.map((row) => {
                      const mod = severityBadgeModifier(row.type);
                      return (
                        <tr key={row.id}>
                          <td>{row.id}</td>
                          <td>{row.date}</td>
                          <td>{row.depthRange}</td>
                          <td className="kpiModalNptTableCell--badge">
                            <span className={`sevBadge sevBadge--${mod}`}>{typePillLabel(row.type)}</span>
                          </td>
                          <td>{row.event}</td>
                          <td className="kpiModalNptTableDuration">{row.duration}</td>
                          <td className="kpiModalNptTableCell--badge">
                            <span className={`sevBadge sevBadge--${mod}`}>{severityPillLabel(row.severity)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="kpiModalNptFooter">
            <button type="button" className="secondaryBtn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default modal (non-NPT or missing data)
  const totalHoursBar = chartData?.length ? chartData.reduce((sum, d) => sum + (d.hours || 0), 0) : 0;
  const maxHours = chartData?.length ? Math.max(...chartData.map((d) => d.hours || 0), 0.01) : 1;
  const midHours = maxHours / 2;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <div className="modalHeader">
          <h2 className="modalTitle">{title}</h2>
          <button className="modalClose" onClick={onClose} type="button">
            ✕
          </button>
        </div>
        <div className="sectionCard" style={{ marginTop: 16 }}>
          <div className="sectionText">{text}</div>
        </div>
        {chartData?.length > 0 && chartType === "nptByDate" && (
          <div className="kpiModalChartSection">
            <h3 className="kpiModalChartTitle">NPT by report date</h3>
            <div className="kpiModalAxisRow">
              <div className="kpiModalYAxisCol">
                <div className="kpiModalAxisTitle">NPT (hrs)</div>
                <div className="kpiModalYAxisTicks">
                  <div className="kpiModalYAxisTick">{maxHours.toFixed(1)}</div>
                  <div className="kpiModalYAxisTick">{midHours.toFixed(1)}</div>
                  <div className="kpiModalYAxisTick">0.0</div>
                </div>
              </div>
              <div className="kpiModalXAxisCol">
                <div className="kpiModalVerticalChart">
                  <div className="kpiModalBarsWrap">
                    {chartData.map((item, i) => (
                      <div key={i} className="kpiModalVerticalBarCell">
                        <div className="kpiModalVerticalBarValue">{item.hours.toFixed(1)} h</div>
                        <div className="kpiModalVerticalBarTrack">
                          <div
                            className="kpiModalVerticalBar"
                            style={{ height: `${((item.hours || 0) / maxHours) * 100}%` }}
                            title={`${item.date}: ${item.hours.toFixed(1)} hrs`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="kpiModalXAxis">
                    {chartData.map((item, i) => (
                      <div key={i} className="kpiModalXAxisLabel" title={item.date}>
                        {item.date}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="kpiModalAxisTitle kpiModalXAxisTitle">Report date</div>
              </div>
            </div>
            <div className="kpiModalChartTotal">Total: {totalHoursBar.toFixed(1)} hrs</div>
          </div>
        )}
        <div className="modalFooter">
          <button className="secondaryBtn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
