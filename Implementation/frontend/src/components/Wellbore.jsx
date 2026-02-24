import "../styles/Wellbore.css";

export default function Wellbore({ depthMax, segments, onSelectSegment }) {

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
      text.includes("pack-off") ||       // FIXED
      text.includes("pack off")
                // alternate phrasing
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
            {segments.map((seg, idx) => {

              // 2️⃣ Auto-classify if backend didn’t provide level
              const autoLevel = classifyLevel(seg.description || "");

              // 3️⃣ Ensure final level ALWAYS lowercase (IMPORTANT)
              const finalLevel = (seg.level || autoLevel).toLowerCase();

              // 4️⃣ Height based on interval
              const heightPercent =
                depthMax > 0 ? ((seg.to - seg.from) / depthMax) * 100 : 0;

              return (
                <button
                  key={idx}
                  type="button"
                  className={`segment ${finalLevel}`}
                  title={`${finalLevel.toUpperCase()} (${seg.from}m–${seg.to}m)`}
                  style={{ height: `${heightPercent}%` }}
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