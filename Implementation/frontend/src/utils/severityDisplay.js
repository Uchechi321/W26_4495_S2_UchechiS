/**
 * Shared labels/classes for severity pills (Critical/Warning/Normal ↔ High/Medium/Low).
 */

export function severityLevelKey(level) {
  const l = String(level || "normal").toLowerCase();
  if (l === "critical") return "critical";
  if (l === "warning") return "warning";
  return "normal";
}

/** Type column: Critical | Warning | Normal */
export function typePillLabel(level) {
  const k = severityLevelKey(level);
  if (k === "critical") return "Critical";
  if (k === "warning") return "Warning";
  return "Normal";
}

/** Severity column: High | Medium | Low */
export function severityPillLabel(level) {
  const k = severityLevelKey(level);
  if (k === "critical") return "High";
  if (k === "warning") return "Medium";
  return "Low";
}

/** CSS modifier: critical | warning | normal */
export function severityBadgeModifier(level) {
  return severityLevelKey(level);
}
