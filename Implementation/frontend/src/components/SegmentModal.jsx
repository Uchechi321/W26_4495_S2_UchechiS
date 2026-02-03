import { useState, useEffect } from "react";
import "../styles/SegmentModal.css";

export default function SegmentModal({ open, segment, onClose }) {
  // ✅ Hooks MUST be before any return
  const [showExplanation, setShowExplanation] = useState(false);

  // reset to Details whenever a new segment opens
  useEffect(() => {
    if (open) setShowExplanation(false);
  }, [open, segment]);

  // If modal is not open or no segment selected, show nothing
  if (!open || !segment) return null;

  const severityText =
    segment.level === "critical"
      ? "Critical"
      : segment.level === "warning"
      ? "Warning"
      : "Normal";

  const exp = segment.explanation; // shortcut for explanation data

  return (
    <div className="modalOverlay" onClick={onClose}>
      {/* stopPropagation prevents closing when clicking inside the card */}
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modalHeader">
          <div className="modalTitleWrap">
            <div className="modalIcon">⚠️</div>

            <div>
              <h2 className="modalTitle">
                {showExplanation
                  ? exp?.title ?? "Detailed Explanation"
                  : "Depth Segment Details"}
              </h2>
              <div className="modalSub">
                {segment.from}m – {segment.to}m
              </div>
            </div>
          </div>

          <button className="modalClose" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* ✅ Switch screen based on showExplanation */}
        {!showExplanation ? (
          <>
            {/* DETAILS VIEW */}
            <div className="modalGrid">
              <div className="detailCard">
                <div className="detailLabel">Event Type</div>
                <div className="detailValue">{segment.eventType ?? "N/A"}</div>
              </div>

              <div className="detailCard danger">
                <div className="detailLabel">NPT Hours</div>
                <div className="detailValue">
                  {segment.nptHours !== undefined
                    ? `${segment.nptHours} hours`
                    : "N/A"}
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
                <button
                  className="primaryBtn"
                  type="button"
                  onClick={() => setShowExplanation(true)}
                  disabled={!exp}
                  title={!exp ? "No explanation data yet" : ""}
                >
                  View Detailed Explanation
                </button>

                <button className="secondaryBtn" type="button" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* EXPLANATION VIEW (your “3 pictures” screen) */}
            <div className="sectionCard blue">
              <div className="sectionTitle">Why Was This Flagged?</div>
              <div className="sectionText">
                {exp?.flaggedReason ??
                  "No explanation text added yet. Add segment.explanation to your data."}
              </div>
            </div>

            <h3 className="modalH3">Contributing Factors</h3>

            {(exp?.contributingFactors ?? []).map((f, i) => (
              <div
                key={i}
                className={`factorCard ${f.type === "danger" ? "danger" : "warning"}`}
              >
                <div className="factorHeading">{f.heading}</div>
                <div className="factorText">{f.text}</div>
              </div>
            ))}

            <div className="sectionCard">
              <div className="sectionTitle">Technical Factors Identified</div>
              <ul className="list">
                {(exp?.technicalFactors ?? []).map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>

            <div className="sectionCard green">
              <div className="sectionTitle">Recommended Prevention Measures</div>
              <ul className="list">
                {(exp?.preventionMeasures ?? []).map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>

            <div className="sectionCard warningBox">
              <div className="sectionTitle">Analysis Methodology</div>
              <div className="sectionText">{exp?.methodology ?? "N/A"}</div>
            </div>

            <div className="modalFooter">
              <div className="footerBtns">
                <button
                  className="secondaryBtn"
                  type="button"
                  onClick={() => setShowExplanation(false)}
                >
                  Back to Details
                </button>

                <button className="primaryBtn" type="button" onClick={onClose}>
                  Close Analysis
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
