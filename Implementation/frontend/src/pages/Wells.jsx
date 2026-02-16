import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Wells.css";

export default function Wells() {
  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const [showModal, setShowModal] = useState(false);
  const [newWellId, setNewWellId] = useState("");
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");

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

        {/* Create Well Button */}
        <button className="createWellBtn" onClick={() => setShowModal(true)}>
          + Create Well
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modalOverlay">
          <div className="modalCard">
            <h3>Create New Well</h3>

            <input
              placeholder="Well ID"
              value={newWellId}
              onChange={(e) => setNewWellId(e.target.value)}
            />
            <input
              placeholder="Well Name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              placeholder="Location"
              value={newLocation}
              onChange={(e) => setNewLocation(e.target.value)}
            />

            <button
              className="createWellBtn2"
              onClick={async () => {
                await fetch(
                  `http://127.0.0.1:8000/wells?well_id=${newWellId}&well_name=${newName}&location=${newLocation}`,
                  { method: "POST" }
                );
                setShowModal(false);
                window.location.reload();
              }}
            >
              Create
            </button>

            <button onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Wells Grid */}
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
            <div className="wellLoc">Location: {w.location || "N/A"}</div>

            <div className="openDash">Open dashboard →</div>
          </div>
        ))}
      </div>
    </div>
  );
}