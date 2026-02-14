import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Wells.css";

export default function Wells() {
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function loadWells() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("http://127.0.0.1:8000/wells/");
        if (!res.ok) throw new Error(`Backend error: ${res.status}`);
        const data = await res.json();
        setWells(data);
      } catch (e) {
        setError(e.message || "Failed to load wells");
      } finally {
        setLoading(false);
      }
    }

    loadWells();
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading wells…</div>;
  if (error) return <div style={{ padding: 16, color: "crimson" }}>{error}</div>;

  return (
    <div className="wellsWrap">
      <div className="wellsTop">
        <div>
          <h1 className="wellsTitle">Wells</h1>
          <div className="wellsSub">Choose a well to open its dashboard view.</div>
        </div>
      </div>

      <div className="wellsGrid">
        {wells.map((w) => (
          <div
            key={w.well_id}
            className="wellCard"
            onClick={() => navigate(`/wells/${w.well_id}`)}
            role="button"
            tabIndex={0}
          >
            <div className="wellCardTop">
              <div className="wellId">{w.well_id}</div>
              <div className="wellBadge">Open</div>
            </div>

            <div className="wellName">{w.well_name || w.well_id}</div>
            <div className="wellLoc">
              Location: {w.location ? w.location : "N/A"}
            </div>

            <div className="openDash">Open dashboard →</div>
          </div>
        ))}
      </div>
    </div>
  );
}
