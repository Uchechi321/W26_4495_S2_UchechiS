export default function ReportRow({ report, onClick }) {
  return (
    <div
      className="reportRow"
      onClick={onClick}
      style={{
        padding: "12px 16px",
        borderBottom: "1px solid #eee",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between"
      }}
    >
      <div>
        <div style={{ fontWeight: 600 }}>{report.filename}</div>
        <div style={{ fontSize: 13, color: "#666" }}>
          Date: {report.report_date} • Well: {report.well_id}
        </div>
      </div>

      <div style={{ fontSize: 13, color: "#999" }}>
        Parser: {report.parser_type || "N/A"}
      </div>
    </div>
  );
}
