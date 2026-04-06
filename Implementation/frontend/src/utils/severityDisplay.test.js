import { describe, it, expect } from "vitest";
import {
  severityLevelKey,
  typePillLabel,
  severityPillLabel,
  severityBadgeModifier,
} from "./severityDisplay";

describe("severityDisplay", () => {
  it("severityLevelKey normalizes levels", () => {
    expect(severityLevelKey("Critical")).toBe("critical");
    expect(severityLevelKey("WARNING")).toBe("warning");
    expect(severityLevelKey(undefined)).toBe("normal");
  });

  it("typePillLabel returns Critical / Warning / Normal", () => {
    expect(typePillLabel("critical")).toBe("Critical");
    expect(typePillLabel("warning")).toBe("Warning");
    expect(typePillLabel("normal")).toBe("Normal");
  });

  it("severityPillLabel returns High / Medium / Low", () => {
    expect(severityPillLabel("critical")).toBe("High");
    expect(severityPillLabel("warning")).toBe("Medium");
    expect(severityPillLabel("normal")).toBe("Low");
  });

  it("severityBadgeModifier matches severityLevelKey", () => {
    expect(severityBadgeModifier("critical")).toBe(severityLevelKey("critical"));
  });
});
