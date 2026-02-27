import "../styles/KpiCard.css";

export default function KpiCard({ icon, title, value, subtitle, badge, tone = "default", onClick }) {
  const content = (
    <>
      <div className="kpiTop">
        <div className="kpiIcon">{icon}</div>
        <div className={`kpiBadge ${tone}`}>{badge}</div>
      </div>

      <div className="kpiTitle">{title}</div>
      <div className="kpiValue">{value}</div>
      <div className="kpiSub">{subtitle}</div>
    </>
  );

  const className = `kpiCard ${tone}${onClick ? " kpiCardClickable" : ""}`;

  if (onClick) {
    return (
      <div
        className={className}
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => e.key === "Enter" && onClick()}
      >
        {content}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
}
