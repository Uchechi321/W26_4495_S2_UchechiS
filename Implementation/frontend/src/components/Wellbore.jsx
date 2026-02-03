import "../styles/Wellbore.css";

export default function Wellbore({ depthMax, segments, onSelectSegment }) {
  // segments example:
  // [{ from: 0, to: 200, level: "normal" }, { from: 600, to: 800, level:"warning" }]

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
            {segments.map((s, idx) => (
              <button
                key={idx}
                type="button"
                className={`segment ${s.level}`}
                title={`${s.level.toUpperCase()} (${s.from}m–${s.to}m)`}
                onClick={() => onSelectSegment?.(s)}
              />
            ))}
          </div>
        </div>

        <div className="wellHint">
          Click on colored segments to view detailed event information.
        </div>
      </div>
    </div>
  );
}
