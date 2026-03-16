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

// Map operation type / description to display event type for NPT breakdown
function eventTypeLabel(seg) {
  const op = (seg.operationType || seg.eventType || "").toLowerCase();
  const desc = (seg.whyItMatters || "").toLowerCase();
  if (desc.includes("stuck") || op.includes("stuck")) return "Stuck Pipe";
  if (desc.includes("ream") || op.includes("ream")) return "Reaming Required";
  if (desc.includes("equipment") || op.includes("equipment") || op.includes("check")) return "Equipment Check";
  if (op || seg.operationType) return (seg.operationType || seg.eventType || "Other").trim() || "Other";
  return "Other";
}

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

  // NPT analytics derived data
  const totalNpt = Number(kpis.nptHours) ?? (chartData?.length ? chartData.reduce((s, d) => s + (d.hours || 0), 0) : 0);
  const productiveTime = totalNpt <= 0 ? 0 : Math.round(totalNpt * (100 - 3.5) / 3.5 * 10) / 10;
  const totalHours = totalNpt + productiveTime;
  const displayNptPercent = totalHours > 0 ? ((totalNpt / totalHours) * 100).toFixed(2) : "0";
  const displayProductivePercent = totalHours > 0 ? ((productiveTime / totalHours) * 100).toFixed(2) : "100";
  const nptEventCount = segments.filter((s) => (Number(s.nptHours) || 0) > 0).length;

  // NPT by event type (group segments with NPT by label)
  const nptByEventTypeMap = {};
  segments.forEach((s) => {
    const hrs = Number(s.nptHours) || 0;
    if (hrs <= 0) return;
    const label = eventTypeLabel(s);
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

  const pieData = [
    { name: "Non-Productive Time", value: totalNpt, color: "#dc2626" },
    { name: "Productive Time", value: productiveTime, color: "#16a34a" },
  ].filter((d) => d.value > 0);
  if (pieData.length === 0) pieData.push({ name: "No data", value: 1, color: "#e5e7eb" });

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
            <button type="button" className="kpiModalNptDownload" aria-label="Download NPT Report">
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

          {/* NPT vs Productive Time pie + summary */}
          <div className="kpiModalNptSection">
            <h3 className="kpiModalNptSectionTitle">NPT vs Productive Time</h3>
            <div className="kpiModalNptPieWrap">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ name, value }) => (value > 0 ? `${name}: ${name === "Non-Productive Time" ? displayNptPercent : displayProductivePercent}%` : null)}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${Number(v).toFixed(1)} hrs`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="kpiModalNptLegend">
                <span className="kpiModalNptLegendItem kpiModalNptLegendItem--npt">Non-Productive Time</span>
                <span className="kpiModalNptLegendItem kpiModalNptLegendItem--prod">Productive Time</span>
              </div>
              <div className="kpiModalNptSummaryTable">
                <div className="kpiModalNptSummaryRow kpiModalNptSummaryRow--npt">
                  <span>Non-Productive Time</span>
                  <span>{totalNpt.toFixed(1)} hrs ({displayNptPercent}%)</span>
                </div>
                <div className="kpiModalNptSummaryRow kpiModalNptSummaryRow--prod">
                  <span>Productive Time</span>
                  <span>{productiveTime.toFixed(1)} hrs ({displayProductivePercent}%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* NPT by Event Type bar chart */}
          {nptByEventType.length > 0 && (
            <div className="kpiModalNptSection">
              <h3 className="kpiModalNptSectionTitle">NPT by Event Type</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={nptByEventType} margin={{ top: 12, right: 16, bottom: 24, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
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
