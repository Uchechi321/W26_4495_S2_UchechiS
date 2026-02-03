import "../styles/KpiCard.css";

export default function KpiCard({ icon, title, value, subtitle, badge, tone = "plain" }) {
  return (
    <div className={`kpiCard ${tone}`}>
      <div className="kpiTopRow">
        <div className="kpiIcon">{icon}</div>
        <div className="kpiBadge">{badge}</div>
      </div>

      <div className="kpiTitle">{title}</div>
      <div className="kpiValue">{value}</div>
      <div className="kpiSub">{subtitle}</div>
    </div>
  );
}
