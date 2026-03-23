import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function EditReport() {
  const { reportId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/reports/${reportId}`)
      .then((res) => res.json())
      .then((data) => {
        setReport(data.report);
        setLoading(false);
      });
  }, [reportId]);

  async function handleSave() {
    const res = await apiFetch(`/api/reports/${reportId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report_no: report.report_no,
        notes: report.notes,
      }),
    });

    if (!res.ok) {
      alert("Failed to save changes");
      return;
    }

    alert("Report updated successfully");
    navigate(-1);
  }

  if (loading) return <div>Loading…</div>;
  
  return (
    <div className="editReportPage">
      <h2>Edit Report</h2>

      <label>Report No</label>
      <input
        type="number"
        value={report.report_no || ""}
        onChange={(e) =>
          setReport({ ...report, report_no: Number(e.target.value) })
        }
      />

      <label>Notes</label>
      <textarea
        value={report.notes || ""}
        onChange={(e) => setReport({ ...report, notes: e.target.value })}
      />

      <button className="saveBtn" onClick={handleSave}>Save</button>
      <button className="cancelBtn" onClick={() => navigate(-1)}>Cancel</button>
    </div>
  );
}