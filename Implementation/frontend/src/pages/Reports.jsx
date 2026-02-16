import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/Reports.css";

export default function Reports() {
  const { wellId } = useParams();
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`http://127.0.0.1:8000/wells/${wellId}/reports`);
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

      {/* ✅ THIS WAS MISSING FROM YOUR RETURN */}
      <div className="reportsHeader">
        <h2 className="reportsTitle">
          Reports for <span>{wellId}</span>
        </h2>

        <button
          className="uploadBtn"
          onClick={() => navigate(`/wells/${wellId}/upload`)}
        >
          + Upload Report
        </button>
      </div>

      <div className="reportsContainer">
        {reports.length === 0 ? (
          <div className="emptyReports">No reports uploaded yet</div>
        ) : (
          reports.map((r) => (
            <div
              key={r.report_id}
              className="reportCard"
              onClick={() =>
                navigate(`/wells/${wellId}/report/${r.report_id}`)
              }
            >
              <div className="reportCardTop">
                <div className="reportIcon">📄</div>
                <div className="reportInfo">
                  <div className="reportName">{r.filename}</div>
                  <div className="reportMeta">
                    Date: {r.report_date} – Parser: {r.parser_type}
                  </div>
                </div>
              </div>

              <div className="reportArrow">→</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}