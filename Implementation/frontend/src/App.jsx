import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Wells from "./pages/Wells";
import Dashboard from "./pages/Dashboards";
import Reports from "./pages/Reports";
import ReportDetail from "./pages/ReportDetail";
import Maintenance from "./pages/Maintenance";
import UploadReport from "./pages/UploadReport";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import EditReport from "./pages/EditReport";

import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* 🔹 Public routes (NO LAYOUT) */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        {/* 🔹 Protected routes (WITH LAYOUT) */}
        <Route element={<Layout />}>

          <Route path="/" element={<Navigate to="/wells" replace />} />

          <Route path="/wells" element={<Wells />} />
          <Route path="/wells/:wellId" element={<Dashboard />} />

          <Route path="/wells/:wellId/reports" element={<Reports />} />
          <Route path="/wells/:wellId/report/:reportId" element={<ReportDetail />} />

          <Route path="/wells/:wellId/maintenance" element={<Maintenance />} />
          <Route path="/wells/:wellId/upload" element={<UploadReport />} />

          <Route path="/reports/edit/:reportId" element={<EditReport />} />

          <Route path="*" element={<div style={{ padding: 16 }}>Page not found</div>} />

        </Route>
      </Routes>
    </BrowserRouter>
  );
}
