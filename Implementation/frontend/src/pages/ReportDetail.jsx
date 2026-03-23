import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/client";
import "../styles/ReportDetail.css";

// ❌ REMOVED classifyOperation()
// ReportDetail should NOT classify events.
// Only Wellbore handles color coding.

export default function ReportDetail() {
  const { wellId, reportId } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [operations, setOperations] = useState([]);
  const [editedOps, setEditedOps] = useState([]);
  const [mud, setMud] = useState(null);
  const [mudDraft, setMudDraft] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [equipmentDraft, setEquipmentDraft] = useState([]);

  const [loading, setLoading] = useState(true);
  const [editingOps, setEditingOps] = useState(false);
  const [editingMud, setEditingMud] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(false);
  const [error, setError] = useState("");

  // --------------------------
  // LOAD REPORT (use /api so Vite proxy hits backend — avoids CORS)
  // --------------------------
  useEffect(() => {
    if (!reportId) {
      setLoading(false);
      setError("No report ID");
      return;
    }
    setError("");
    async function load() {
      try {
        const res = await apiFetch(`/api/reports/${reportId}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setReport(null);
          setOperations([]);
          setMud(null);
          setEquipment([]);
          setError(Array.isArray(data.detail) ? data.detail[0]?.msg : (data.detail || "Failed to load report details"));
          return;
        }

        const reportData = data.report;
        if (!reportData) {
          setError("Invalid response: no report data");
          return;
        }
        setReport(reportData);
        setOperations(Array.isArray(data.operations) ? data.operations : []);
        setMud(data.mud ?? null);
        setMudDraft(data.mud ? JSON.parse(JSON.stringify(data.mud)) : null);
        const eqArray = Array.isArray(data.equipment) ? data.equipment : [];
        setEquipment(eqArray);
        setEquipmentDraft(JSON.parse(JSON.stringify(eqArray)));
        setEditedOps(JSON.parse(JSON.stringify(data.operations || [])));
      } catch (e) {
        setError(e.message === "Failed to fetch"
          ? "Cannot reach server. Is the backend running at http://127.0.0.1:8000?"
          : e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [reportId]);

  // --------------------------
  // SAVE OPERATIONS
  // --------------------------
  async function handleSaveOps() {

    const payload = {
      operations: editedOps.map(op => ({
        operation_id: op.operation_id ?? null,
        report_id: Number(reportId),
        well_id: Number(wellId),

        depth_from: Number(op.depth_from),
        depth_to: Number(op.depth_to),
        operation_type: op.operation_type,
        description: op.description,
        duration_hours: Number(op.duration_hours),
        npt_hours: Number(op.npt_hours),
      }))
    };

    const res = await apiFetch(
      `/api/reports/${reportId}/operations`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      alert("Failed to update report operations.");
      return;
    }

    alert("Operations saved successfully!");
    setOperations(editedOps);
    setEditingOps(false);
  }

  // --------------------------
  // DELETE ROW
  // --------------------------
  function deleteRow(index) {
    const updated = [...editedOps];
    updated.splice(index, 1);
    setEditedOps(updated);
  }

  // --------------------------
  // ADD ROW
  // --------------------------
  function addRow() {
    const newRow = {
      operation_id: null,
      report_id: Number(reportId),
      well_id: Number(wellId),

      depth_from: 0,
      depth_to: 0,
      operation_type: "",
      duration_hours: 0,
      npt_hours: 0,
      description: "",
    };

    setEditedOps([...editedOps, newRow]);
  }

  // --------------------------
  // SAVE MUD
  // --------------------------
  async function handleSaveMud() {
    const res = await apiFetch(`/api/report-details/${reportId}/mud`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mudDraft || {}),
    });

    if (!res.ok) {
      alert("Failed to update mud details.");
      return;
    }

    setMud(mudDraft);
    setEditingMud(false);
    alert("Mud details saved.");
  }

  // --------------------------
  // SAVE EQUIPMENT
  // --------------------------
  async function handleSaveEquipment() {
    const payload = { items: equipmentDraft };
    const res = await apiFetch(`/api/report-details/${reportId}/equipment`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Failed to update equipment.");
      return;
    }

    setEquipment(equipmentDraft);
    setEditingEquipment(false);
    alert("Equipment saved.");
  }

  if (loading) return <div className="rdLoading" style={{ padding: 20 }}>Loading report...</div>;
  if (error) return <div className="rdError" style={{ padding: 20, color: "#c00" }}>{error}</div>;
  if (!report) return <div className="rdError" style={{ padding: 20, color: "#c00" }}>Report not found.</div>;

  return (
    <div className="reportDetailPage">

      <button 
        className="backBtn"
        onClick={() => navigate(`/wells/${wellId}/reports`)}
      >
        ← Back to Reports
      </button>

      <h2 className="rdTitle">
        Report #{reportId} — <span>{report.filename ?? "—"}</span>
      </h2>

      <div className="rdMeta">
        <div><strong>Well:</strong> {wellId}</div>
        <div><strong>Date:</strong> {report.report_date ?? "—"}</div>
        <div><strong>Parser:</strong> {report.parser_type ?? "—"}</div>
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
              {editingOps && <th>Actions</th>}
            </tr>
          </thead>

          <tbody>
            {(editingOps ? editedOps : operations).map((op, i) => (
              <tr key={i}>
                <td>
                  {editingOps ? (
                    <input
                      type="number"
                      value={op.depth_from}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].depth_from = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : op.depth_from}
                </td>

                <td>
                  {editingOps ? (
                    <input
                      type="number"
                      value={op.depth_to}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].depth_to = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : op.depth_to}
                </td>

                <td>
                  {editingOps ? (
                    <input
                      type="text"
                      value={op.operation_type}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].operation_type = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : op.operation_type}
                </td>

                <td>
                  {editingOps ? (
                    <input
                      type="number"
                      value={op.duration_hours}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].duration_hours = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : op.duration_hours}
                </td>

                <td>
                  {editingOps ? (
                    <input
                      type="number"
                      value={op.npt_hours}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].npt_hours = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : op.npt_hours}
                </td>

                <td>
                  {editingOps ? (
                    <textarea
                      value={op.description}
                      onChange={(e) => {
                        const copy = [...editedOps];
                        copy[i].description = e.target.value;
                        setEditedOps(copy);
                      }}
                    />
                  ) : op.description}
                </td>

                {editingOps && (
                  <td>
                    <button
                      className="deleteRowBtn"
                      onClick={() => deleteRow(i)}
                    >
                      🗑 Delete
                    </button>
                  </td>
                )}

              </tr>
            ))}
          </tbody>
        </table>

        {!editingOps && (
          <button className="editBtn" onClick={() => setEditingOps(true)}>
            ✏ Edit Operations
          </button>
        )}

        {editingOps && (
          <div className="editActions">
            <button className="addRowBtn" onClick={addRow}>
              ➕ Add Row
            </button>

            <button className="saveBtn" onClick={handleSaveOps}>
              💾 Save Changes
            </button>

            <button
              className="cancelBtn"
              onClick={() => {
                setEditingOps(false);
                setEditedOps(JSON.parse(JSON.stringify(operations)));
              }}
            >
              ✖ Cancel
            </button>
          </div>
        )}

      </div>

      {/* Mud details (4.1 Mud) */}
      <h3 className="rdSub">Mud details</h3>
      <div className="rdSection">
        {(mud || editingMud) ? (
          <table className="reportTable">
            <thead>
              <tr>
                <th>Mud desc.</th>
                <th>Density (ppg)</th>
                <th>Viscosity (s/qt)</th>
                <th>PV (cp)</th>
                <th>YP (lbf/100ft²)</th>
                <th>Cl⁻ (ppm)</th>
                <th>Ca⁺ (ppm)</th>
                <th>pH</th>
                <th>Pm</th>
                <th>Pf (cc)</th>
                <th>Mf (cc)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {editingMud ? (
                    <input
                      type="text"
                      value={(mudDraft || {}).mud_desc ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), mud_desc: e.target.value || null })
                      }
                    />
                  ) : (mud && mud.mud_desc) ? mud.mud_desc : "—"}
                </td>
                <td>
                  {editingMud ? (
                    <input
                      type="number"
                      value={mudDraft?.density_ppg ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), density_ppg: e.target.value })
                      }
                    />
                  ) : (mud && mud.density_ppg != null) ? mud.density_ppg : "—"}
                </td>
                <td>
                  {editingMud ? (
                    <input
                      type="number"
                      value={mudDraft?.viscosity_sqt ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), viscosity_sqt: e.target.value })
                      }
                    />
                  ) : (mud && mud.viscosity_sqt != null) ? mud.viscosity_sqt : "—"}
                </td>
                <td>
                  {editingMud ? (
                    <input
                      type="number"
                      value={mudDraft?.pv_cp ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), pv_cp: e.target.value })
                      }
                    />
                  ) : (mud && mud.pv_cp != null) ? mud.pv_cp : "—"}
                </td>
                <td>
                  {editingMud ? (
                    <input
                      type="number"
                      value={mudDraft?.yp_lbf100ft2 ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), yp_lbf100ft2: e.target.value })
                      }
                    />
                  ) : (mud && mud.yp_lbf100ft2 != null) ? mud.yp_lbf100ft2 : "—"}
                </td>
                <td>
                  {editingMud ? (
                    <input
                      type="number"
                      value={mudDraft?.cl_ppm ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), cl_ppm: e.target.value })
                      }
                    />
                  ) : (mud && mud.cl_ppm != null) ? mud.cl_ppm : "—"}
                </td>
                <td>
                  {editingMud ? (
                    <input
                      type="number"
                      value={mudDraft?.ca_ppm ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), ca_ppm: e.target.value })
                      }
                    />
                  ) : (mud && mud.ca_ppm != null) ? mud.ca_ppm : "—"}
                </td>
                <td>
                  {editingMud ? (
                    <input
                      type="number"
                      value={mudDraft?.pH ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), pH: e.target.value })
                      }
                    />
                  ) : (mud && mud.pH != null) ? mud.pH : "—"}
                </td>
                <td>
                  {editingMud ? (
                    <input
                      type="number"
                      value={mudDraft?.pm_cc ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), pm_cc: e.target.value })
                      }
                    />
                  ) : (mud && mud.pm_cc != null) ? mud.pm_cc : "—"}
                </td>
                <td>
                  {editingMud ? (
                    <input
                      type="number"
                      value={mudDraft?.pf_cc ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), pf_cc: e.target.value })
                      }
                    />
                  ) : (mud && mud.pf_cc != null) ? mud.pf_cc : "—"}
                </td>
                <td>
                  {editingMud ? (
                    <input
                      type="number"
                      value={mudDraft?.mf_cc ?? ""}
                      onChange={(e) =>
                        setMudDraft({ ...(mudDraft || {}), mf_cc: e.target.value })
                      }
                    />
                  ) : (mud && mud.mf_cc != null) ? mud.mf_cc : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p className="rdEmpty">No mud data extracted from this report.</p>
        )}
      </div>
      {!editingMud && (
        <div className="editActions">
          <button
            className="editBtn"
            onClick={() => {
              setMudDraft(mud ? JSON.parse(JSON.stringify(mud)) : {});
              setEditingMud(true);
            }}
          >
            {mud ? "✏ Edit Mud" : "➕ Add Mud details"}
          </button>
        </div>
      )}
      {editingMud && (
        <div className="editActions">
          <button className="saveBtn" onClick={handleSaveMud}>
            💾 Save Mud
          </button>
          <button
            className="cancelBtn"
            onClick={() => {
              setEditingMud(false);
              setMudDraft(mud ? JSON.parse(JSON.stringify(mud)) : null);
            }}
          >
            ✖ Cancel
          </button>
        </div>
      )}

      {/* Equipment used (Assembly Components) */}
      <h3 className="rdSub">Equipment used</h3>
      <div className="rdSection">
        {(equipment.length > 0 || editingEquipment) ? (
          <table className="reportTable">
            <thead>
              <tr>
                <th>Component type</th>
                <th>No. of joints</th>
                <th>Length (ft)</th>
                <th>OD (in)</th>
                <th>ID (in)</th>
                <th>Connection</th>
                <th>Weight (ppf)</th>
                <th>Grade</th>
                <th>Pin Box</th>
                <th>Serial no.</th>
                <th>Spiral</th>
                <th>Fish Neck Length (ft)</th>
                <th>Fish Neck OD (in)</th>
                {editingEquipment && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(editingEquipment ? equipmentDraft : equipment)?.map((eq, i) => (
                <tr key={i}>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="text"
                        value={eq.component_type ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].component_type = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : (
                      eq.component_type ?? "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="number"
                        value={eq.joints ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].joints = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : eq.joints != null ? (
                      eq.joints
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="number"
                        value={eq.length_ft ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].length_ft = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : eq.length_ft != null ? (
                      eq.length_ft
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="number"
                        value={eq.od_in ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].od_in = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : eq.od_in != null ? (
                      eq.od_in
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="number"
                        value={eq.id_in ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].id_in = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : eq.id_in != null ? (
                      eq.id_in
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="text"
                        value={eq.connection ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].connection = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : (
                      eq.connection ?? "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="number"
                        value={eq.weight_ppf ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].weight_ppf = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : eq.weight_ppf != null ? (
                      eq.weight_ppf
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="text"
                        value={eq.grade ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].grade = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : (
                      eq.grade ?? "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="text"
                        value={eq.pin_box ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].pin_box = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : (
                      eq.pin_box ?? "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="text"
                        value={eq.serial_no ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].serial_no = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : (
                      eq.serial_no ?? "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="text"
                        value={eq.spiral ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].spiral = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : (
                      eq.spiral ?? "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="number"
                        value={eq.fish_neck_length_ft ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].fish_neck_length_ft = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : eq.fish_neck_length_ft != null ? (
                      eq.fish_neck_length_ft
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {editingEquipment ? (
                      <input
                        type="number"
                        value={eq.fish_neck_od ?? ""}
                        onChange={(e) => {
                          const copy = [...equipmentDraft];
                          copy[i].fish_neck_od = e.target.value;
                          setEquipmentDraft(copy);
                        }}
                      />
                    ) : eq.fish_neck_od != null ? (
                      eq.fish_neck_od
                    ) : (
                      "—"
                    )}
                  </td>
                  {editingEquipment && (
                    <td>
                      <button
                        className="deleteRowBtn"
                        onClick={() => {
                          const copy = [...equipmentDraft];
                          copy.splice(i, 1);
                          setEquipmentDraft(copy);
                        }}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="rdEmpty">No equipment data extracted from this report.</p>
        )}
      </div>
      {!editingEquipment && (
        <div className="editActions">
          <button
            className="editBtn"
            onClick={() => {
              setEquipmentDraft(JSON.parse(JSON.stringify(equipment || [])));
              setEditingEquipment(true);
            }}
          >
            {equipment.length > 0 ? "✏ Edit Equipment" : "➕ Add Equipment"}
          </button>
        </div>
      )}
      {editingEquipment && (
        <div className="editActions">
          <button
            className="addRowBtn"
            onClick={() =>
              setEquipmentDraft([
                ...equipmentDraft,
                {
                  component_type: "",
                  joints: null,
                  length_ft: null,
                  od_in: null,
                  id_in: null,
                  connection: "",
                  weight_ppf: null,
                  grade: "",
                  pin_box: "",
                  serial_no: "",
                  spiral: "",
                  fish_neck_length_ft: null,
                  fish_neck_od: null,
                },
              ])
            }
          >
            ➕ Add Equipment Row
          </button>
          <button className="saveBtn" onClick={handleSaveEquipment}>
            💾 Save Equipment
          </button>
          <button
            className="cancelBtn"
            onClick={() => {
              setEditingEquipment(false);
              setEquipmentDraft(JSON.parse(JSON.stringify(equipment)));
            }}
          >
            ✖ Cancel
          </button>
        </div>
      )}
    </div>
  );
}