import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/ReportDetail.css";

// ❌ REMOVED classifyOperation()
// ReportDetail should NOT classify events.
// Only Wellbore handles color coding.

export default function ReportDetail() {
  const { wellId, reportId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [operations, setOperations] = useState([]);
  const [editedOps, setEditedOps] = useState([]);

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  // --------------------------
  // LOAD REPORT
  // --------------------------
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/reports/${reportId}`);
        if (!res.ok) throw new Error("Failed to load report details");

        const data = await res.json();

        setReport(data.report);
        setOperations(data.operations);

        // deep clone
        setEditedOps(JSON.parse(JSON.stringify(data.operations)));

      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [reportId]);

  // --------------------------
  // SAVE CHANGES
  // --------------------------
  async function handleSave() {

    const payload = {
      operations: editedOps.map(op => ({
        operation_id: op.operation_id ?? null,
        report_id: Number(reportId),
        well_id: Number(wellId),

        depth_from: Number(op.depth_from),
        depth_to: Number(op.depth_to),
        operation_type: op.operation_type,
        description: op.description,
        duration_hours: Number(op.duration_hours),
        npt_hours: Number(op.npt_hours),
      }))
    };

    const res = await fetch(
      `http://127.0.0.1:8000/reports/${reportId}/operations`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      alert("Failed to update report operations.");
      return;
    }

    alert("Saved successfully!");
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
      operation_id: null,
      report_id: Number(reportId),
      well_id: Number(wellId),

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
                        copy[i].depth_from = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : op.depth_from}
                </td>

                <td>
                  {editing ? (
                    <input
                      type="number"
                      value={op.depth_to}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].depth_to = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : op.depth_to}
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
                  ) : op.operation_type}
                </td>

                <td>
                  {editing ? (
                    <input
                      type="number"
                      value={op.duration_hours}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].duration_hours = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : op.duration_hours}
                </td>

                <td>
                  {editing ? (
                    <input
                      type="number"
                      value={op.npt_hours}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].npt_hours = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : op.npt_hours}
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
                  ) : op.description}
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