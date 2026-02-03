import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Wells.css";

const wells = [
  { id: "WELL-01", name: "Well 01", location: "Field A", status: "Normal" },
  { id: "WELL-02", name: "Well 02", location: "Field B", status: "Warning" },
  { id: "WELL-03", name: "Well 03", location: "Field C", status: "Critical" },
];

function statusClass(status) {
  if (status === "Critical") return "critical";
  if (status === "Warning") return "warning";
  return "normal";
}

export default function Wells() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return wells;

    return wells.filter((w) => {
      return (
        w.id.toLowerCase().includes(q) ||
        w.name.toLowerCase().includes(q) ||
        w.location.toLowerCase().includes(q) ||
        w.status.toLowerCase().includes(q)
      );
    });
  }, [query]);

  return (
    <div className="wellsPage">
      <div className="wellsTop">
        <div>
          <h1 className="wellsTitle">Wells</h1>
          <p className="wellsSub">Choose a well to open its dashboard view.</p>
        </div>

        <input
          className="wellsSearch"
          placeholder="Search wells (e.g., WELL-03, critical, Field A)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="wellsGrid">
        {filtered.map((w) => (
          <div key={w.id}
              className={`wellCard ${statusClass(w.status)}`}
            >

            <div className="wellCardTop">
              <div>
                <div className="wellId">{w.id}</div>
                <div className="wellName">{w.name}</div>
                <div className="wellLoc">Location: {w.location}</div>
              </div>

              <span className={`statusPill ${statusClass(w.status)}`}>
                {w.status}
              </span>
            </div>

            <button
              className="openBtn"
              type="button"
              onClick={() => navigate(`/wells/${w.id}`)}
            >
              <span>Open dashboard</span>
              <span className="arrow">→</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
