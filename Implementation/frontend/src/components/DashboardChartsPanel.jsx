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

export default function DashboardChartsPanel({
  nptPieData,
  nptPercent,
  productivePercent,
  totalNpt,
  productiveTime,
  eventCountByTypeData,
  criticalPct,
  warningPct,
  normalPct,
  criticalEvents,
  warningEvents,
  normalEvents,
  openNpt,
  openEventCount,
}) {
  return (
    <>
      <section className="dashNptPlotCard" role="button" tabIndex={0} onClick={openNpt}>
        <h3 className="dashNptPlotTitle">NPT vs Productive Time</h3>
        <div className="dashNptPlotBody">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart margin={{ top: 12, right: 16, bottom: 12, left: 16 }}>
              <Pie data={nptPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={82} paddingAngle={2}>
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
            <strong>{totalNpt.toFixed(1)} hrs ({nptPercent}%)</strong>
          </div>
          <div className="dashNptSummaryRow dashNptSummaryRow--prod">
            <span>Productive Time</span>
            <strong>{productiveTime.toFixed(1)} hrs ({productivePercent}%)</strong>
          </div>
        </div>
        <div className="dashKpiSeeMoreRow"><span className="dashKpiSeeMore">See more</span></div>
      </section>

      <section className="dashEventSeverityCard" role="button" tabIndex={0} onClick={openEventCount}>
        <h3 className="dashEventSeverityTitle">Event Count by Type</h3>
        <div className="dashEventSeverityBody">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={eventCountByTypeData} margin={{ top: 12, right: 16, bottom: 0, left: 0 }} barCategoryGap="22%">
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
            <strong>{criticalEvents} events ({criticalPct}%)</strong>
          </div>
          <div className="dashEventSeveritySummaryRow dashEventSeveritySummaryRow--warning">
            <span>Warning</span>
            <strong>{warningEvents} events ({warningPct}%)</strong>
          </div>
          <div className="dashEventSeveritySummaryRow dashEventSeveritySummaryRow--normal">
            <span>Normal</span>
            <strong>{normalEvents} events ({normalPct}%)</strong>
          </div>
        </div>
        <div className="dashKpiSeeMoreRow"><span className="dashKpiSeeMore">See more</span></div>
      </section>
    </>
  );
}
