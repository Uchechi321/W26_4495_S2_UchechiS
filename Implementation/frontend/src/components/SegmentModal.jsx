import { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api/client";
import { getSegmentEventTypeLabel } from "../utils/segmentEventType";
import "../styles/SegmentModal.css";

export default function SegmentModal({ open, segment, equipment = [], onClose }) {
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanationData, setExplanationData] = useState(null);
  const [loadingExplanation, setLoadingExplanation] = useState(false);
  const [explanationError, setExplanationError] = useState("");
  const explainAbortRef = useRef(null);

  useEffect(() => {
    explainAbortRef.current?.abort();
    if (open) setShowExplanation(false);
    if (!open || !segment) {
      setExplanationData(null);
      setExplanationError("");
    }
  }, [open, segment]);

  async function handleViewDetailedExplanation() {
    if (!segment) return;
    if (explanationData) {
      setShowExplanation(true);
      return;
    }

    explainAbortRef.current?.abort();
    const controller = new AbortController();
    explainAbortRef.current = controller;

    setLoadingExplanation(true);
    setExplanationError("");
    try {
      const res = await apiFetch(`/api/wells/segment-text-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: segment.whyItMatters ?? "",
          depth_from: segment.from != null ? Number(segment.from) : null,
          depth_to: segment.to != null ? Number(segment.to) : null,
          operation_type: segment.operationType ?? segment.eventType ?? null,
          npt_hours: segment.nptHours != null ? Number(segment.nptHours) : null,
          level: segment.level ?? null,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(await res.text() || `Error ${res.status}`);
      const data = await res.json();
      if (!controller.signal.aborted) {
        setExplanationData(data);
        setShowExplanation(true);
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      if (!controller.signal.aborted) {
        setExplanationError(e.message || "Failed to load explanation");
      }
    } finally {
      if (!controller.signal.aborted) setLoadingExplanation(false);
    }
  }

  if (!open || !segment) return null;

  const severityText =
    segment.level === "critical"
      ? "Critical"
      : segment.level === "warning"
      ? "Warning"
      : "Normal";

  const exp = explanationData || segment.explanation;
  const mlRiskScore =
    exp?.riskScore != null && Number.isFinite(Number(exp.riskScore))
      ? Number(exp.riskScore).toFixed(2)
      : null;
  const mlPredictedSeverity =
    typeof exp?.predictedSeverity === "string" && exp.predictedSeverity.trim()
      ? exp.predictedSeverity
      : null;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        {showExplanation && exp ? (
          <div className="explanationViewHeader">
            <div className="explanationViewHeaderInner">
              <h2 className="explanationViewTitle">{exp.title ?? "Detailed Explanation"}</h2>
              <div className="explanationViewDepth">Depth: {exp.depthRange ?? `${segment.from}m - ${segment.to}m`}</div>
            </div>
            <button type="button" className="explanationViewClose" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        ) : (
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
        )}

        {!showExplanation ? (
          <>
            <div className="modalGrid">
              <div className="detailCard">
                <div className="detailLabel">Event Type</div>
                <div className="detailValue">{getSegmentEventTypeLabel(segment)}</div>
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

            <div className="sectionCard">
              <div className="sectionTitle">Equipment Involved</div>

              {Array.isArray(equipment) && equipment.length > 0 ? (
                <div className="segmentModalEquipmentWrap">
                  <table className="segmentModalEquipmentTable">
                    <thead>
                      <tr>
                        <th>Component</th>
                        <th>Joints</th>
                        <th>Length (ft)</th>
                        <th>OD (in)</th>
                        <th>Connection</th>
                      </tr>
                    </thead>
                    <tbody>
                      {equipment.map((eq, idx) => (
                        <tr key={idx}>
                          <td>{eq.component_type ?? "—"}</td>
                          <td>{eq.joints != null ? eq.joints : "—"}</td>
                          <td>{eq.length_ft != null ? eq.length_ft : "—"}</td>
                          <td>{eq.od_in != null ? eq.od_in : "—"}</td>
                          <td>{eq.connection ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="chips">
                  {(segment.equipment ?? []).length === 0 ? (
                    <span className="emptyText">No equipment recorded</span>
                  ) : (
                    (segment.equipment ?? []).map((eq) => (
                      <span key={eq} className="chip">
                        {typeof eq === "object" ? (eq.component_type ?? JSON.stringify(eq)) : eq}
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>

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

            <div className="sectionCard blue">
              <div className="sectionTitle">Description</div>
              <div className="sectionText">{segment.whyItMatters ?? "N/A"}</div>
            </div>

            <div className="modalFooter">
              <div className="recordedAt">Event recorded: {segment.recordedAt ?? "N/A"}</div>

              <div className="footerBtns">
                <button
                  className="primaryBtn"
                  type="button"
                  onClick={handleViewDetailedExplanation}
                  disabled={loadingExplanation}
                >
                  {loadingExplanation ? "Loading…" : "View Detailed Explanation"}
                </button>

                <button className="secondaryBtn" type="button" onClick={onClose}>
                  Close
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="explanationViewBody">
              {explanationError && (
                <div className="explanationError" role="alert">
                  {explanationError}
                </div>
              )}
              {(mlRiskScore || mlPredictedSeverity) && (
                <div className="sectionCard sectionCardMlSummary">
                  <div className="sectionTitleWithIcon">
                    <span className="sectionIcon sectionIconMl">ML</span>
                    Model Risk Summary
                  </div>
                  <div className="mlSummaryGrid">
                    <div className="mlSummaryItem">
                      <span className="mlSummaryLabel">Risk Score</span>
                      <strong className="mlSummaryValue">{mlRiskScore ?? "N/A"}</strong>
                    </div>
                    <div className="mlSummaryItem">
                      <span className="mlSummaryLabel">Predicted Severity</span>
                      <strong className="mlSummaryValue">{mlPredictedSeverity ?? "N/A"}</strong>
                    </div>
                  </div>
                </div>
              )}
              {exp?.titleSource && (
                <div className="sectionCard sectionCardTitleSource">
                  <div className="sectionTitleWithIcon">
                    <span className="sectionIcon sectionIconSource">📌</span>
                    How We Determined This Title
                  </div>
                  <div className="sectionText">{exp.titleSource}</div>
                </div>
              )}
              <div className="sectionCard blue explanationWhyCard">
                <div className="sectionTitleWithIcon">
                  <span className="sectionIcon sectionIconInfo">!</span>
                  Why Was This Flagged?
                </div>
                <div className="sectionText">{exp?.flaggedReason ?? "No explanation available."}</div>
              </div>

              <h3 className="modalH3">Contributing Factors</h3>

              {(exp?.contributingFactors ?? []).map((f, i) => (
                <div
                  key={i}
                  className={`factorCard ${f.type === "danger" ? "danger" : "warning"}`}
                >
                  <div className="factorHeading">
                    {f.type === "danger" ? (
                      <span className="factorIcon factorIconDanger">📈</span>
                    ) : (
                      <span className="factorIcon factorIconWarning">📍</span>
                    )}
                    {f.heading}
                  </div>
                  <div className="factorText">{f.text}</div>
                </div>
              ))}

              <div className="sectionCard sectionCardHistory">
                <div className="sectionTitleWithIcon">
                  <span className="sectionIcon sectionIconHistory">🕐</span>
                  Similar Events in Well History
                </div>
                <div className="sectionText">
                  {exp?.similarEventsInHistory ?? "No historical comparison available."}
                </div>
              </div>

              <div className="sectionCard">
                <div className="sectionTitle">Technical Factors Identified</div>
                <ul className="list">
                  {(exp?.technicalFactors ?? []).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>

              <div className="sectionCard green sectionCardPrevention">
                <div className="sectionTitle">Recommended Prevention Measures</div>
                <ul className="list listWithCheckmarks">
                  {(exp?.preventionMeasures ?? []).map((p, i) => (
                    <li key={i}>
                      <span className="checkmark">✓</span> {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="sectionCard sectionCardMethodology">
                <div className="sectionTitleWithIcon">
                  <span className="sectionIcon sectionIconMethodology">i</span>
                  Analysis Methodology
                </div>
                <div className="sectionText">{exp?.methodology ?? "N/A"}</div>
              </div>

              <div className="modalFooter">
                <div className="footerBtns">
                  <button className="secondaryBtn" type="button" onClick={() => setShowExplanation(false)}>
                    Back to Details
                  </button>

                  <button className="primaryBtn" type="button" onClick={onClose}>
                    Close Analysis
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
