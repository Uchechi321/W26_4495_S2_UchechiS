import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Wells.css";

const wells = [
  { id: "WELL-01", name: "Well 01", status: "Normal", location: "Field A" },
  { id: "WELL-02", name: "Well 02", status: "Warning", location: "Field B" },
  { id: "WELL-03", name: "Well 03", status: "Critical", location: "Field C" },
];

export default function Wells() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wells;
    return wells.filter(
      (w) =>
        w.id.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        w.status.toLowerCase().includes(q) ||
        w.location.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div>
      <div className="wellsHeader">
        <div>
          <h1 className="pageTitle">Wells</h1>
          <p className="pageSubtitle">Choose a well to open its dashboard view.</p>
        </div>

        <input
          className="search"
          placeholder="Search wells (e.g., WELL-03, critical, Field A)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="wellGrid">
        {filtered.map((w) => (
          <button
            key={w.id}
            className={`wellCard ${w.status.toLowerCase()}`}
            onClick={() => navigate(`/wells/${w.id}`)}
          >
            <div className="wellTop">
              <div>
                <div className="wellId">{w.id}</div>
                <div className="wellName">{w.name}</div>
              </div>

              <span className={`statusBadge ${w.status.toLowerCase()}`}>
                {w.status}
              </span>
            </div>

            <div className="wellMeta">
              <span className="metaLabel">Location:</span> {w.location}
            </div>

            <div className="openRow">
              <span>Open dashboard</span>
              <span className="arrow">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
