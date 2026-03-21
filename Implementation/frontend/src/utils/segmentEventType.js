/**
 * Human-readable event classification from segment description + operation type.
 * Used for "Event Type" in SegmentModal — distinct from raw "Operation Type" from the report.
 */

function titleCaseWords(s) {
  const t = String(s || "").trim();
  if (!t) return "";
  return t
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

/**
 * @param {object} segment - { whyItMatters, operationType, eventType, nptHours }
 * @returns {string}
 */
export function getSegmentEventTypeLabel(segment) {
  if (!segment) return "N/A";

  const desc = (segment.whyItMatters || "").toLowerCase();
  const op = (segment.operationType || segment.eventType || "").toLowerCase();
  const npt = segment.nptHours != null ? Number(segment.nptHours) : 0;

  const inDesc = (s) => desc.includes(s);
  const inOp = (s) => op.includes(s);
  const any = (s) => inDesc(s) || inOp(s);

  // Most specific / safety-critical first
  if (any("stuck pipe") || (inDesc("stuck") && !inDesc("unstuck"))) return "Stuck Pipe";
  if (
    any("lost circulation") ||
    (inDesc("loss") && inDesc("circulation")) ||
    inDesc("mud loss") ||
    inDesc("dyn loss") ||
    inDesc("lost returns")
  ) {
    return "Lost Circulation";
  }
  if (any("kick") || any("well control") || any("blowout")) return "Well Control";

  // Surface / flowline / lines (common in NPT narratives)
  if (
    any("flowline") ||
    any("flow line") ||
    any("poor boy") ||
    (inDesc("disconnection") && (inDesc("line") || inDesc("lines")))
  ) {
    return "Flowline / Surface Lines";
  }

  if (
    (inDesc("directional") || inOp("directional")) &&
    (inDesc("no success") || inDesc("failed") || inDesc("unable to flow"))
  ) {
    return "Directional / Flow Issue";
  }

  if (inDesc("no success") && (inDesc("flow") || inDesc("circulate"))) return "Flow / Circulation Issue";

  if (any("ream") || any("reaming")) return "Reaming Required";

  if (any("cement") || any("cementing")) return "Cementing";
  if (any("casing") || any("liner")) return "Casing / Liner";
  if (any("trip") || any("tripping")) return "Tripping";
  if (any("directional") || any("survey") || any("gyro")) return "Directional";

  if (
    any("equipment") ||
    any("inspection") ||
    any("baker") ||
    (any("check") && (inDesc("equipment") || inOp("equipment")))
  ) {
    return "Equipment Check";
  }

  if (any("minor delay") || (inDesc("delay") && !inDesc("no delay"))) return "Minor Delay";

  // NPT called out in text or recorded NPT without a finer label
  if (inDesc("npt") || (Number.isFinite(npt) && npt > 0)) return "NPT Event";

  // Fallback: show title-cased operation type from report (may still be "Drilling")
  const raw = (segment.operationType || segment.eventType || "").trim();
  if (raw) return titleCaseWords(raw);

  return "Other";
}
