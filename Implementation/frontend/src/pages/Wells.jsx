import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Wells.css";

export default function Wells() {
  const [wells, setWells] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [newWellId, setNewWellId] = useState("");
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");

  // Modal for selecting well for actions
  const [actionModal, setActionModal] = useState(false);
  const [actionType, setActionType] = useState(""); // "reports" or "upload"

  // Soft color palette
  const colors = ["#e8f0fe", "#e6f7f1", "#fff7e6", "#f3e8ff", "#e8faff"];
  const getColor = (i) => colors[i % colors.length];

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

    // Load recently viewed wells
    const stored = JSON.parse(localStorage.getItem("recentWells") || "[]");
    setRecent(stored);

  }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading wells…</div>;
  if (error) return <div style={{ padding: 16, color: "crimson" }}>{error}</div>;

  // Stats
  const total = wells.length;
  const operators = new Set(wells.map((w) => w.operator)).size;

  return (
    <div className="wellsPage">

      {/* Top Section */}
      <div className="wellsTop">
        <div>
          <h1 className="wellsTitle">Wells</h1>
          <div className="wellsSub">Choose a well to open its dashboard view.</div>
        </div>

        <button className="createWellBtn" onClick={() => setShowModal(true)}>
          + Create Well
        </button>
      </div>

      {/* Quick Actions */}
      <div className="quickActions">
        <button onClick={() => { setActionType("reports"); setActionModal(true); }}>
          📄 View Reports
        </button>
        <button onClick={() => { setActionType("upload"); setActionModal(true); }}>
          ⬆ Upload Report
        </button>
      </div>

      <div className="dividerLine"></div>

      {/* Stats Bar */}
      <div className="wellsStats">
        <div className="statCard">Total Wells: {total}</div>
        <div className="statCard">Operators: {operators}</div>
      </div>

      {/* Recently Viewed Wells */}
      {recent.length > 0 && (
        <div className="recentSection">
          <h3 className="recentTitle">Recently Viewed</h3>

          <div className="recentRow">
            {recent.map((r, i) => (
              <div
                key={i}
                className="recentCard"
                onClick={() => navigate(`/wells/${r.well_id}`)}
              >
                <div className="recentAvatar">
                  {r.operator ? r.operator[0] : "?"}
                </div>
                <div className="recentName">{r.well_name || r.well_id}</div>
                <div className="recentLoc">{r.location}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Create Well */}
      {showModal && (
        <div className="modalOverlay">
          <div className="modalCard createWellModal">
            <h2 className="modalTitle">Create New Well</h2>

            <div className="modalInputs">
              <label>Well ID</label>
              <input
                placeholder="e.g. WELL-03"
                value={newWellId}
                onChange={(e) => setNewWellId(e.target.value)}
              />

              <label>Well Name</label>
              <input
                placeholder="e.g. Bonga North"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />

              <label>Location</label>
              <input
                placeholder="e.g. Lagos"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
            </div>

            <div className="modalActions">
              <button
                className="modalCreateBtn"
                onClick={async () => {
                  await fetch(
                    `http://127.0.0.1:8000/wells?well_id=${newWellId}&well_name=${newName}&location=${newLocation}`,
                    { method: "POST" }
                  );
                  setShowModal(false);
                  window.location.reload();
                }}
              >
                Create Well
              </button>

              <button className="modalCancelBtn" onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal: Select Well for Action */}
      {actionModal && (
        <div className="modalOverlay">
          <div className="modalCard">
            <h3>Select a Well</h3>

            {wells.map((w) => (
              <button
                key={w.well_id}
                className="selectWellBtn"
                onClick={() => {
                  setActionModal(false);
                  if (actionType === "reports") {
                    navigate(`/wells/${w.well_id}/reports`);
                  } else {
                    navigate(`/wells/${w.well_id}/upload`);
                  }
                }}
              >
                {w.well_id} — {w.well_name}
              </button>
            ))}

            <button onClick={() => setActionModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Wells Grid */}
      <div className="wellsGrid">
        {wells.map((w, i) => (
          <div
            key={w.well_id}
            className="wellCard"
            style={{ "--well-color": getColor(i) }}
            onClick={() => {
              // Save to recently viewed
              const viewed = JSON.parse(localStorage.getItem("recentWells") || "[]");

              const newEntry = {
                well_id: w.well_id,
                well_name: w.well_name,
                location: w.location,
                operator: w.operator
              };

              const filtered = viewed.filter(v => v.well_id !== w.well_id);
              filtered.unshift(newEntry);

              localStorage.setItem("recentWells", JSON.stringify(filtered.slice(0, 3)));

              navigate(`/wells/${w.well_id}`);
            }}
          >

            <div className="wellId">{w.well_id}</div>
            <div className="wellName">{w.well_name || w.well_id}</div>
            <div className="wellLoc">📍 {w.location || "Unknown"}</div>

            <div className="statusBadge status-open">OPEN</div>

            <div className="openDash">Open dashboard →</div>
          </div>
        ))}
      </div>
    </div>
  );
}
