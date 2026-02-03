import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Wells from "./pages/Wells";
import Dashboard from "./pages/Dashboards";
import Reports from "./pages/Reports";
import Maintenance from "./pages/Maintenance";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Layout is the frame (sidebar + content area) */}
        <Route element={<Layout />}>
          {/* Default page */}
          <Route path="/" element={<Navigate to="/wells" replace />} />

          {/* Wells list page */}
          <Route path="/wells" element={<Wells />} />

          {/* One well dashboard page */}
          <Route path="/wells/:wellId" element={<Dashboard />} />

          {/* ✅ NEW: Predictive Maintenance page for a well */}
          <Route path="/wells/:wellId/maintenance" element={<Maintenance />} />

          {/* Reports page */}
          <Route path="/reports" element={<Reports />} />

          {/* If someone types a wrong URL */}
          <Route path="*" element={<div style={{ padding: 16 }}>Page not found</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
