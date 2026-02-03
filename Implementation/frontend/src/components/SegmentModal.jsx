import "../styles/SegmentModal.css";

export default function SegmentModal({ open, segment, onClose }) {
  // If modal is not open or no segment selected, show nothing
  if (!open || !segment) return null;

  const severityText =
    segment.level === "critical"
      ? "Critical"
      : segment.level === "warning"
      ? "Warning"
      : "Normal";

  return (
    <div className="modalOverlay" onClick={onClose}>
      {/* stopPropagation prevents closing when clicking inside the card */}
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modalHeader">
          <div className="modalTitleWrap">
            <div className="modalIcon">⚠️</div>

            <div>
              <h2 className="modalTitle">Depth Segment Details</h2>
              <div className="modalSub">
                {segment.from}m – {segment.to}m
              </div>
            </div>
          </div>

          <button className="modalClose" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Top grid */}
        <div className="modalGrid">
          <div className="detailCard">
            <div className="detailLabel">Event Type</div>
            <div className="detailValue">{segment.eventType ?? "N/A"}</div>
          </div>

          <div className="detailCard danger">
            <div className="detailLabel">NPT Hours</div>
            <div className="detailValue">
              {segment.nptHours !== undefined ? `${segment.nptHours} hours` : "N/A"}
            </div>
          </div>

          <div className="detailCard info">
            <div className="detailLabel">Operation Type</div>
            <div className="detailValue">{segment.operationType ?? "N/A"}</div>
          </div>

          <div className="detailCard purple">
            <div className="detailLabel">Severity</div>
            <div className="detailValue">{severityText}</div>
          </div>
        </div>

        {/* Equipment */}
        <div className="sectionCard">
          <div className="sectionTitle">Equipment Involved</div>

          <div className="chips">
            {(segment.equipment ?? []).length === 0 ? (
              <span className="emptyText">No equipment recorded</span>
            ) : (
              segment.equipment.map((eq) => (
                <span key={eq} className="chip">
                  {eq}
                </span>
              ))
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="sectionCard green">
          <div className="sectionTitle">Actions Taken</div>

          {(segment.actionsTaken ?? []).length === 0 ? (
            <div className="emptyText">No actions recorded</div>
          ) : (
            <ul className="list">
              {segment.actionsTaken.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </div>

        {/* Why it matters */}
        <div className="sectionCard blue">
          <div className="sectionTitle">Why This Matters</div>
          <div className="sectionText">{segment.whyItMatters ?? "N/A"}</div>
        </div>

        {/* Footer */}
        <div className="modalFooter">
          <div className="recordedAt">
            Event recorded: {segment.recordedAt ?? "N/A"}
          </div>

          <div className="footerBtns">
            <button className="primaryBtn" type="button">
              View Detailed Explanation
            </button>

            <button className="secondaryBtn" type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
