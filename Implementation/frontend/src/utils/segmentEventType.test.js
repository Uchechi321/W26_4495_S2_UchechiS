import { describe, it, expect } from "vitest";
import { getSegmentEventTypeLabel } from "./segmentEventType";

describe("getSegmentEventTypeLabel", () => {
  it("returns N/A for null segment", () => {
    expect(getSegmentEventTypeLabel(null)).toBe("N/A");
  });

  it("detects stuck pipe from description", () => {
    expect(
      getSegmentEventTypeLabel({
        whyItMatters: "Stuck pipe incident while drilling",
        operationType: "Drilling",
      })
    ).toBe("Stuck Pipe");
  });

  it("falls back to title-cased operation type when no specific match", () => {
    expect(
      getSegmentEventTypeLabel({
        whyItMatters: "Routine progress",
        operationType: "rotary drilling",
      })
    ).toBe("Rotary Drilling");
  });
});
