import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../styles/ReportDetail.css";

export default function ReportDetail() {
  const { wellId, reportId } = useParams();

  const [report, setReport] = useState(null);
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/wells/${wellId}/report/${reportId}`
        );
        if (!res.ok) throw new Error("Failed to load report details");

        const data = await res.json();
        setReport(data.report);
        setOperations(data.operations);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [wellId, reportId]);

  if (loading) return <div className="rdLoading">Loading report...</div>;
  if (error) return <div className="rdError">{error}</div>;

  return (
    <div className="reportDetailPage">
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
                    </tr>
                </thead>

                <tbody>
                    {operations.map((op, i) => (
                    <tr key={i}>
                        <td>{op.depth_from}</td>
                        <td>{op.depth_to}</td>
                        <td>{op.operation_type}</td>
                        <td>{op.duration_hours}</td>
                        <td>{op.npt_hours || 0}</td>
                        <td>{op.description}</td>
                    </tr>
                    ))}
                </tbody>
            </table>

        </div>
    </div>
  );
}
