import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/UploadReport.css";

export default function UploadReport() {
  const { wellId } = useParams();
  const navigate = useNavigate();

  const [reportDate, setReportDate] = useState("");
  const [parser, setParser] = useState("NNPC_FORMAT_A");
  const [file, setFile] = useState(null);

  const [status, setStatus] = useState("");

  async function submitForm(e) {
    e.preventDefault();
    setStatus("Uploading...");

    // log the values before sending
    console.log("Submitting form with:");
    console.log("wellId:", wellId);
    console.log("reportDate:", reportDate);
    console.log("parser:", parser);
    console.log("file:", file);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("well_id", wellId);
    formData.append("report_date", reportDate);
    formData.append("parser_type", parser);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload/daily-report", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = "Unknown error";

        try {
          const errJson = await res.json();
          errorMessage = errJson.detail || JSON.stringify(errJson);
        } catch {
          errorMessage = await res.text();
        }

        console.error("UPLOAD ERROR:", errorMessage);
        setStatus("Upload failed: " + errorMessage);
        return;
      }

      const data = await res.json();
      console.log("Upload response:", data);
      setStatus("success");
      alert("Upload successful! 🎉"); // or redirect automatically
      navigate(`/wells/${wellId}/reports`);
    } catch (err) {
      console.error("Network or unexpected error:", err);
      setStatus("Upload failed: " + err.message);
    }
  }

  return (
    <div className="uploadPage">
      <h2 className="uploadTitle">Upload Daily Report — {wellId}</h2>

      <form className="uploadForm" onSubmit={submitForm}>
        <label>Report Date</label>
        <input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          required
        />

        <label>Parser Type</label>
        <select value={parser} onChange={(e) => setParser(e.target.value)}>
          <option value="NNPC_FORMAT_A">NNPC Format A</option>
        </select>

        <label>PDF File</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />

        <button type="submit" className="uploadBtn2">
          Upload Report
        </button>
      </form>

      {status && status !== "success" && (
        <div className="uploadStatus">{status}</div>
      )}
    </div>
  );
}
