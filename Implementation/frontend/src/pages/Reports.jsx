import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import "../styles/Reports.css";
import UploadBox from "../components/UploadBox";

export default function Reports() {
  const { wellId } = useParams();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function handleDelete(reportId) {
      if (!window.confirm("Are you sure you want to delete this report?")) return;

      const res = await apiFetch(`/api/reports/${reportId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        alert("Failed to delete report");
        return;
      }

      // Remove from UI
      setReports((prev) => prev.filter((r) => r.report_id !== reportId));
    }


  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch(`/api/wells/${wellId}/reports`);
        if (!res.ok) throw new Error("Failed to load reports");
        const data = await res.json();
        setReports(data);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [wellId]);

  if (loading) return <div className="reportsLoading">Loading reports…</div>;
  if (error) return <div className="reportsError">{error}</div>;

  return (
    <div className="reportsPage">

      {/* PAGE TITLE */}
      <h2 className="reportsTitle">
        Reports for <span>{wellId}</span>
      </h2>

      {/* ✅ NEW — Upload Box directly on reports page */}
      <UploadBox wellId={wellId} />

      {/* REPORT LIST */}
      <div className="reportsContainer">
        {reports.length === 0 ? (
          <div className="emptyReports">No reports uploaded yet</div>
        ) : (
          reports.map((r) => (
            <div
              key={r.report_id}
              className="reportCard"
            >
              <div
                className="reportCardTop"
                onClick={() => navigate(`/wells/${wellId}/report/${r.report_id}`)}
              >
                <div className="reportIcon">📄</div>
                <div className="reportInfo">
                  <div className="reportName">{r.filename}</div>
                  <div className="reportMeta">
                    Date: {r.report_date} – Parser: {r.parser_type}
                  </div>
                </div>
              </div>

              <button
                className="deleteReportBtn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(r.report_id);
                }}
              >
                🗑 Delete
              </button>
            </div>

          ))
        )}
      </div>
      

      {/* FIXED — Back to Wells */}
      <button 
        className="backToWellsBtn"
        onClick={() => navigate("/wells")}
      >
        ← Back to Wells
      </button>
    </div>
  );
}
