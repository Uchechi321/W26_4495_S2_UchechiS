import "../styles/KpiCard.css";

export default function KpiCard({ icon, title, value, subtitle, badge }) {
  return (
    <div className="kpiCard">
      <div className="kpiTop">
        <div className="kpiIcon">{icon}</div>
        {badge ? <div className="kpiBadge">{badge}</div> : null}
      </div>

      <div className="kpiTitle">{title}</div>
      <div className="kpiValue">{value}</div>
      {subtitle ? <div className="kpiSubtitle">{subtitle}</div> : null}
    </div>
  );
}
