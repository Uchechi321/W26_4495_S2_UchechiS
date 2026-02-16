import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import "../styles/UploadReport.css";

export default function UploadReport() {
  const { wellId } = useParams();

  const [reportDate, setReportDate] = useState("");
  const [parser, setParser] = useState("NNPC_FORMAT_A");
  const [file, setFile] = useState(null);

  const [status, setStatus] = useState("");

  async function submitForm(e) {
    e.preventDefault();
    setStatus("Uploading...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("well_id", wellId);
    formData.append("report_date", reportDate);
    formData.append("parser_type", parser);

    const res = await fetch("http://127.0.0.1:8000/upload/daily-report", {
      method: "POST",
      body: formData
    });

    if (!res.ok) {
      setStatus("Upload failed");
      return;
    }

    setStatus("Upload successful! 🎉");
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

        <button type="submit" className="uploadBtn2">Upload Report</button>
      </form>

      {status && <div className="uploadStatus">{status}</div>}
    </div>
  );
}
