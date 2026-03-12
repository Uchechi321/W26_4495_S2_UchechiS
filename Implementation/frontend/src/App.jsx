import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Wells from "./pages/Wells";
import Dashboard from "./pages/Dashboards";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Maintenance from "./pages/Maintenance";
import UploadReport from "./pages/UploadReport";
import SummaryReports from "./pages/SummaryReports";
import WellLocations from "./pages/WellLocations";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import EditReport from "./pages/EditReport";
import Home from "./pages/Home";

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home page first — default when opening the app */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* 🔹 Protected routes (WITH LAYOUT) */}
        <Route element={<Layout />}>

          <Route path="/wells" element={<Wells />} />
          <Route path="/wells/:wellId" element={<Dashboard />} />

          <Route path="/wells/:wellId/reports" element={<Reports />} />
          <Route path="/wells/:wellId/report/:reportId" element={<ReportDetail />} />

          <Route path="/wells/:wellId/maintenance" element={<Maintenance />} />
          <Route path="/wells/:wellId/upload" element={<UploadReport />} />

          <Route path="/summary-reports" element={<SummaryReports />} />

          <Route path="/well-locations" element={<WellLocations />} />

          <Route path="/reports/edit/:reportId" element={<EditReport />} />

          {/* 404 */}
          <Route path="*" element={<div style={{ padding: 16 }}>Page not found</div>} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}
