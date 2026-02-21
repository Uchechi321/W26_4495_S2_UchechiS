import "../styles/Wellbore.css";

export default function Wellbore({ depthMax, segments, onSelectSegment }) {

  // 🔥 1. Auto-classify operation severity using keywords
  function classifyLevel(description = "") {
    const text = description.toLowerCase();

    // CRITICAL EVENTS
    if (
      text.includes("stuck") ||
      text.includes("stuck pipe") ||
      text.includes("pipe stuck") ||
      text.includes("loss") ||
      text.includes("lost circulation") ||
      text.includes("kick") ||
      text.includes("well control") ||
      text.includes("blowout") ||
      text.includes("Pack-off")
    ) {
      return "critical";
    }

    // WARNING EVENTS
    if (
      text.includes("issue") ||
      text.includes("problem") ||
      text.includes("vibration") ||
      text.includes("torque") ||
      text.includes("drag") ||
      text.includes("slow")
    ) {
      return "warning";
    }

    return "normal";
  }

  return (
    <div className="wellboreWrap">
      <div className="depthAxis">
        <div>0 m</div>
        <div>500 m</div>
        <div>1000 m</div>
        <div>1500 m</div>
        <div>{depthMax} m</div>
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
              // 🔥 2. Auto-detect severity if backend didn't provide one
              const autoLevel = classifyLevel(seg.description || "");
              const finalLevel = seg.level || autoLevel;

              // 🔥 3. Height scaling based on depth range
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