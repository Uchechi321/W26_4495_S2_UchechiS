import "../styles/Wellbore.css";

export default function Wellbore({ depthMax = 0, segments = [], onSelectSegment }) {

  // 1️⃣ Auto-classify operation severity using keywords
  function classifyLevel(description = "") {
    const text = description.toLowerCase();

    // ---- CRITICAL EVENTS ----

    if (
      text.includes("stuck") ||
      text.includes("stuck pipe") ||
      text.includes("pipe stuck") ||
      text.includes("lost circulation") ||
      text.includes("loss of circulation") ||
      text.includes("loss") ||
      text.includes("kick") ||
      text.includes("well control") ||
      text.includes("blowout") ||
      text.includes("pack-off") ||
      text.includes("pack off")
    ) {
      return "critical";
    }

    // ---- WARNING EVENTS ----
    if (
      text.includes("issue") ||
      text.includes("problem") ||
      text.includes("vibration") ||
      text.includes("torque") ||
      text.includes("drag") ||
      text.includes("slow") ||
      text.includes("tight spot") ||
      text.includes("overpull") ||
      text.includes("high drag")
    ) {
      return "warning";
    }

    return "normal";
  }

  // 🛡️ Prevent crashes if segments is undefined/null
  const safeSegments = Array.isArray(segments) ? segments.filter(Boolean) : [];

  return (
    <div className="wellboreWrap">
      <div className="depthAxis">
        {[0, depthMax * 0.25, depthMax * 0.5, depthMax * 0.75, depthMax].map((d, i) => (
          <div key={i}>{Math.round(d)} m</div>
        ))}
      </div>

      <div className="wellPanel">
        <div className="wellHeader">
          <div>
            <div className="wellTitle">Depth-Based Drilling Events</div>
            <div className="wellSub">
              Vertical wellbore visualization (0–{depthMax}m)
            </div>
          </div>

          <div className="legend">
            <span className="dot normal" /> Normal
            <span className="dot warning" /> Warning
            <span className="dot critical" /> Critical
          </div>
        </div>

        <div className="pipeArea">
          <div className="pipe">
            {safeSegments.map((seg, idx) => {
              const autoLevel = classifyLevel(seg.whyItMatters || "");
              const finalLevel = (seg.level || autoLevel).toLowerCase();

              const heightPercent =
                depthMax > 0 ? ((seg.to - seg.from) / depthMax) * 100 : 0;

              return (
                <button
                  key={idx}
                  type="button"
                  className={`segment ${autoLevel}`}
                  title={`${autoLevel.toUpperCase()} (${seg.from}m–${seg.to}m)`}
                  style={{ height: `${Math.max(heightPercent, 1)}%` }} // ensure visible
                  onClick={() => onSelectSegment?.(seg)}
                />
              );
            })}
          </div>
        </div>

        <div className="wellHint">
          Click on colored segments to view detailed event information.
        </div>
      </div>
    </div>
  );
}
