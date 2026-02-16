import "../styles/KpiCard.css";

export default function KpiCard({ icon, title, value, subtitle, badge, tone = "default" }) {
  return (
    <div className={`kpiCard ${tone}`}>
      <div className="kpiTop">
        <div className="kpiIcon">{icon}</div>
        <div className={`kpiBadge ${tone}`}>{badge}</div>
      </div>

      <div className="kpiTitle">{title}</div>
      <div className="kpiValue">{value}</div>
      <div className="kpiSub">{subtitle}</div>
    </div>
  );
}
