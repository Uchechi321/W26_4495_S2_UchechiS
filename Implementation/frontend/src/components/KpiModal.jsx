import "../styles/SegmentModal.css";
import "../styles/KpiModal.css";

export default function KpiModal({ open, title, text, onClose, chartData, chartType }) {
  if (!open) return null;

  const totalHours = chartData?.length ? chartData.reduce((sum, d) => sum + (d.hours || 0), 0) : 0;
  const maxHours = chartData?.length ? Math.max(...chartData.map((d) => d.hours || 0), 0.01) : 1;
  const midHours = maxHours / 2;

  const isNptByDate = chartType === "nptByDate";

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
        {chartData?.length > 0 && isNptByDate && (
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
            <div className="kpiModalChartTotal">
              Total: {totalHours.toFixed(1)} hrs
            </div>
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
