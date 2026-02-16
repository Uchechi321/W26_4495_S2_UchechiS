import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Wells from "./pages/Wells";
import Dashboard from "./pages/Dashboards";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Maintenance from "./pages/Maintenance";
import UploadReport from "./pages/UploadReport";

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>

          <Route path="/" element={<Navigate to="/wells" replace />} />

          <Route path="/wells" element={<Wells />} />
          <Route path="/wells/:wellId" element={<Dashboard />} />

          <Route path="/wells/:wellId/reports" element={<Reports />} />

          <Route
            path="/wells/:wellId/report/:reportId"
            element={<ReportDetail />}
          />

          <Route path="/wells/:wellId/maintenance" element={<Maintenance />} />

          {/* ✅ FIX: Upload route must be BEFORE the wildcard */}
          <Route path="/wells/:wellId/upload" element={<UploadReport />} />

          {/* Wildcard last */}
          <Route path="*" element={<div style={{ padding: 16 }}>Page not found</div>} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}