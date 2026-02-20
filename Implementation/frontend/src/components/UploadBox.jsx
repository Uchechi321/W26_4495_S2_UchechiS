import { useState } from "react";
import "../styles/UploadBox.css";

export default function UploadBox({ wellId }) {
  const [file, setFile] = useState(null);
  const [reportDate, setReportDate] = useState("");
  const [parserType, setParserType] = useState("NNPC_FORMAT_A");
  const [status, setStatus] = useState("");

  async function uploadReport(e) {
    e.preventDefault();
    if (!file) return;

    setStatus("Uploading...");

    const form = new FormData();
    form.append("file", file);
    form.append("well_id", wellId);
    form.append("report_date", reportDate);
    form.append("parser_type", parserType);

    const res = await fetch("http://127.0.0.1:8000/upload/daily-report", {
      method: "POST",
      body: form
    });

    if (!res.ok) {
      setStatus("error");
      return;
    }

    setStatus("success");
  }

  return (
    <div className="uploadBox">
      <h3 className="uploadBoxTitle">Upload Drilling Report</h3>

      <form className="uploadBoxForm" onSubmit={uploadReport}>
        <label>Report Date</label>
        <input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          required
        />

        <label>Parser Format</label>
        <select value={parserType} onChange={(e) => setParserType(e.target.value)}>
          <option value="NNPC_FORMAT_A">NNPC Format A</option>
        </select>

        <label>Upload PDF</label>
        <div
          className="uploadDrop"
          onClick={() => document.getElementById("fileInputBox").click()}
        >
          {file ? (
            <p>📄 {file.name}</p>
          ) : (
            <p>Click to upload or drag a PDF here</p>
          )}
        </div>

        <input
          type="file"
          id="fileInputBox"
          accept="application/pdf"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button className="uploadBoxBtn" type="submit">
          Upload Report →
        </button>
      </form>

      {status === "success" && (
        <div className="uploadSuccess">
          Upload successful! 🎉  
          <button
            className="backToReportsBtn"
            onClick={() => window.location.href = `/wells/${wellId}/reports`}
          >
            ← Back to Reports
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="uploadError">
          Upload failed. Please try again.
        </div>
      )}
    </div>
  );
}
