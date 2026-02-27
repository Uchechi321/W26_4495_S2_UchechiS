import "../styles/SegmentModal.css";

export default function KpiModal({ open, title, text, onClose }) {
  if (!open) return null;

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
        <div className="modalFooter">
          <button className="secondaryBtn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
