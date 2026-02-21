import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "../styles/ReportDetail.css";

// ----------------------
// CLASSIFICATION FUNCTION
// ----------------------
function classifyOperation(op) {
  const desc = (op.description || "").toLowerCase();
  const npt = Number(op.npt_hours || 0);

  const criticalKeywords = [
    "stuck",
    "stuck pipe",
    "Pack-off",
    "lost string",
    "twist off",
    "well control",
    "severe loss",
    "major loss",
    "circulation loss severe",
  ];

  const warningKeywords = [
    "loss",
    "lost circulation",
    "torque high",
    "drag",
    "vibration",
    "stall",
    "tight spot",
    "circulation issue",
  ];

  // Critical by keyword
  if (criticalKeywords.some(k => desc.includes(k))) {
    return "critical";
  }

  // Critical by NPT
  if (npt >= 5) return "critical";

  // Warning by keyword
  if (warningKeywords.some(k => desc.includes(k))) {
    return "warning";
  }

  // Warning by NPT
  if (npt >= 2) return "warning";

  return "normal";
}

export default function ReportDetail() {
  const { wellId, reportId } = useParams();

  const [report, setReport] = useState(null);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [editedOps, setEditedOps] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/reports/${reportId}`);
        if (!res.ok) throw new Error("Failed to load report details");

        const data = await res.json();

        setReport(data.report);
        setOperations(data.operations);

        // deep clone for editing state
        setEditedOps(JSON.parse(JSON.stringify(data.operations)));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [wellId, reportId]);

  // --------------------------
  // SAVE CHANGES
  // --------------------------
  async function handleSave() {
    const res = await fetch(
      `http://127.0.0.1:8000/reports/${reportId}/operations`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operations: editedOps }),
      }
    );

    if (!res.ok) {
      alert("Failed to update");
      return;
    }

    alert("Operations updated!");
    setOperations(editedOps);
    setEditing(false);
  }

  // --------------------------
  // DELETE ROW
  // --------------------------
  function deleteRow(index) {
    const updated = [...editedOps];
    updated.splice(index, 1);
    setEditedOps(updated);
  }

  // --------------------------
  // ADD ROW
  // --------------------------
  function addRow() {
    const newRow = {
      depth_from: 0,
      depth_to: 0,
      operation_type: "",
      duration_hours: 0,
      npt_hours: 0,
      description: "",
    };

    setEditedOps([...editedOps, newRow]);
  }

  if (loading) return <div className="rdLoading">Loading report...</div>;
  if (error) return <div className="rdError">{error}</div>;

  return (
    <div className="reportDetailPage">

      <button 
        className="backBtn" 
        onClick={() => navigate(`/wells/${wellId}/reports`)}
      >
        ← Back to Reports
      </button>

      <h2 className="rdTitle">
        Report #{reportId} — <span>{report.filename}</span>
      </h2>

      <div className="rdMeta">
        <div><strong>Well:</strong> {wellId}</div>
        <div><strong>Date:</strong> {report.report_date}</div>
        <div><strong>Parser:</strong> {report.parser_type}</div>
      </div>

      <h3 className="rdSub">Extracted Operations</h3>

      <div className="rdOps">
        <table className="reportTable">
          <thead>
            <tr>
              <th>Depth From</th>
              <th>Depth To</th>
              <th>Operation Type</th>
              <th>Duration</th>
              <th>NPT</th>
              <th>Description</th>
              {editing && <th>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {(editing ? editedOps : operations).map((op, i) => (
              <tr key={i}>
                <td>
                  {editing ? (
                    <input
                      type="number"
                      value={op.depth_from}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].depth_from = Number(e.target.value);
                        setEditedOps(copy);
                      }}
                    />
                  ) : (
                    op.depth_from
                  )}
                </td>

                <td>
                  {editing ? (
                    <input
                      type="number"
                      value={op.depth_to}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].depth_to = Number(e.target.value);
                        setEditedOps(copy);
                      }}
                    />
                  ) : (
                    op.depth_to
                  )}
                </td>

                <td>
                  {editing ? (
                    <input
                      type="text"
                      value={op.operation_type}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].operation_type = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : (
                    op.operation_type
                  )}
                </td>

                <td>
                  {editing ? (
                    <input
                      type="number"
                      value={op.duration_hours}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].duration_hours = Number(e.target.value);
                        setEditedOps(copy);
                      }}
                    />
                  ) : (
                    op.duration_hours
                  )}
                </td>
                <td>
                  {editing ? (
                    <input
                      type="number"
                      value={op.npt_hours}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].npt_hours = Number(e.target.value);
                        setEditedOps(copy);
                      }}
                    />
                  ) : (
                    op.npt_hours
                  )}
                </td>

                <td>
                  {editing ? (
                    <textarea
                      value={op.description}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].description = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : (
                    op.description
                  )}
                </td>

                {editing && (
                  <td>
                    <button
                      className="deleteRowBtn"
                      onClick={() => deleteRow(i)}
                    >
                      🗑 Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!editing && (
          <button className="editBtn" onClick={() => setEditing(true)}>
            ✏ Edit Operations
          </button>
        )}

        {editing && (
          <div className="editActions">
            <button className="addRowBtn" onClick={addRow}>
              ➕ Add Row
            </button>

            <button className="saveBtn" onClick={handleSave}>
              💾 Save Changes
            </button>

            <button
              className="cancelBtn"
              onClick={() => {
                setEditing(false);
                setEditedOps(JSON.parse(JSON.stringify(operations)));
              }}
            >
              ✖ Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}