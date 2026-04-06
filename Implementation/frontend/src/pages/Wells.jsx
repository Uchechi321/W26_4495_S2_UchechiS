import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import "../styles/Wells.css";

export default function Wells() {
  const navigate = useNavigate();

  // Redirect to home if not authenticated (home page appears first)
  useEffect(() => {
    const loggedIn = localStorage.getItem("auth");
    if (!loggedIn) navigate("/");
  }, [navigate]);


  const [wells, setWells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [newWellId, setNewWellId] = useState("");
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [editModal, setEditModal] = useState(false);
  const [editWellId, setEditWellId] = useState("");
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");

  // Modal for selecting well for reports (which includes upload)
  const [actionModal, setActionModal] = useState(false);

  // Soft color palette
  const colors = ["#e8f0fe", "#e6f7f1", "#fff7e6", "#f3e8ff", "#e8faff"];
  const getColor = (i) => colors[i % colors.length];

  async function loadWells() {
      setLoading(true);
      setError("");

      try {
        const res = await apiFetch("/api/wells/");
        if (!res.ok) throw new Error(`Backend error: ${res.status}`);
        const data = await res.json();
        setWells(data);
      } catch (e) {
        setError(e.message || "Failed to load wells");
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadWells();
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

        <div className="topRightBtns">
          <button className="createWellBtn" onClick={() => setShowModal(true)}>
            + Create Well
          </button>

          <button
            className="logoutBtn"
            onClick={() => {
              localStorage.removeItem("auth");
              localStorage.removeItem("recentWells");
              navigate("/");
            }}
          >
            Logout
          </button>
        </div>
      </div>


      {/* Quick Actions */}
      <div className="quickActions">
        <button className="quickUploadBtn" onClick={() => setActionModal(true)}>
          ⬆ Upload Report
        </button>
      </div>

      <div className="dividerLine"></div>

      {/* Stats Bar */}
      <div className="wellsStats">
        <div className="statCard">Total Wells: {total}</div>
        <div className="statCard">Operators: {operators}</div>
      </div>

      {/* Workflow Tips */}
      <div className="workflowTips">
        <h3>Workflow Tips</h3>
        <ul>
          <li>Click any well card to open its dashboard instantly.</li>
          <li>Use the Upload Report button to pick a well and upload from Reports.</li>
          <li>Edit or delete a well from the card actions at the bottom-right.</li>
        </ul>
      </div>

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
                  await apiFetch(
                    `/api/wells?well_id=${encodeURIComponent(newWellId)}&well_name=${encodeURIComponent(newName)}&location=${encodeURIComponent(newLocation)}`,
                    { method: "POST" }
                  );
                  setShowModal(false);
                  await loadWells();
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

      {/* Modal: Select Well for Reports */}
      {actionModal && (
        <div className="modalOverlay">
          <div className="modalCard selectWellModal">
            <div className="selectWellHeader">
              <h3>Select a Well</h3>
              <p>Choose where you want to upload or review reports.</p>
            </div>

            {wells.length === 0 ? (
              <div className="selectWellEmpty">No wells found. Create a well first.</div>
            ) : (
              <div className="selectWellList">
                {wells.map((w) => (
                  <button
                    key={w.well_id}
                    className="selectWellBtn"
                    onClick={() => {
                      setActionModal(false);
                      navigate(`/wells/${w.well_id}/reports`);
                    }}
                  >
                    <span className="selectWellBtnTitle">{w.well_name || w.well_id}</span>
                    <span className="selectWellBtnMeta">{w.well_id}{w.location ? ` • ${w.location}` : ""}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="selectWellActions">
              <button className="modalCancelBtn" onClick={() => setActionModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Well */}
      {editModal && (
        <div className="modalOverlay">
          <div className="modalCard createWellModal">
            <h2 className="modalTitle">Edit Well</h2>

            <div className="modalInputs">
              <label>Well ID</label>
              <input value={editWellId} disabled />

              <label>Well Name</label>
              <input
                placeholder="e.g. Bonga North"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />

              <label>Location</label>
              <input
                placeholder="e.g. Lagos"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
              />
            </div>

            <div className="modalActions">
              <button
                className="modalCreateBtn"
                onClick={async () => {
                  await apiFetch(
                    `/api/wells/${encodeURIComponent(editWellId)}?well_name=${encodeURIComponent(editName)}&location=${encodeURIComponent(editLocation)}`,
                    { method: "PUT" }
                  );
                  setEditModal(false);
                  await loadWells();
                }}
              >
                Save Changes
              </button>

              <button className="modalCancelBtn" onClick={() => setEditModal(false)}>
                Cancel
              </button>
            </div>
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
              navigate(`/wells/${w.well_id}`);
            }}
          >
            <div className="wellId">{w.well_id}</div>
            <div className="wellName">{w.well_name || w.well_id}</div>
            <div className="wellLoc">📍 {w.location || "Unknown"}</div>

            <div className="statusBadge status-open">OPEN</div>

            <div className="openDash">Open dashboard →</div>
            <div className="wellCardActions">
              <button
                className="wellCardActionBtn"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditWellId(w.well_id);
                  setEditName(w.well_name || "");
                  setEditLocation(w.location || "");
                  setEditModal(true);
                }}
              >
                Edit
              </button>
              <button
                className="wellCardActionBtn wellCardActionBtnDanger"
                onClick={async (e) => {
                  e.stopPropagation();
                  const ok = window.confirm(
                    `Are you sure you want to delete ${w.well_name || w.well_id}? This will remove its reports and dashboard data.`
                  );
                  if (!ok) return;
                  await apiFetch(`/api/wells/${encodeURIComponent(w.well_id)}`, { method: "DELETE" });
                  await loadWells();
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {wells.length === 0 && (
        <div className="wellsSub" style={{ marginTop: 16 }}>
          No wells yet. Click <strong>Create Well</strong> to add your first well.
        </div>
      )}
      <div className="loggedInUser">Signed in as {localStorage.getItem("auth")}</div>
    </div>
  );
}
