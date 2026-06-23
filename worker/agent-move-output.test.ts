import { describe, expect, it } from "vitest";
import { extractJson, normalizeConfidence, parseAgentMoveContent } from "./agent-move-output";

describe("0G Compute agent move output parsing", () => {
  it("parses plain JSON move output", () => {
    const parsed = parseAgentMoveContent(
      JSON.stringify({
        move: { column: 3 },
        confidence: 0.82,
        reasoningSummary: "Center control is strongest.",
      }),
    );

    expect(parsed).toEqual({
      move: { column: 3 },
      confidence: 0.82,
      reasoningSummary: "Center control is strongest.",
    });
  });

  it("extracts fenced and embedded JSON", () => {
    expect(extractJson('```json\n{"move":{"column":2}}\n```')).toBe('{"move":{"column":2}}');
    expect(extractJson('Chosen move: {"move":{"column":4},"confidence":0.7}.')).toBe(
      '{"move":{"column":4},"confidence":0.7}',
    );
  });

  it("rejects responses without JSON", () => {
    expect(() => parseAgentMoveContent("I would play the center column.")).toThrow(
      "0G Compute response did not contain JSON.",
    );
  });

  it("rejects non-integer columns", () => {
    expect(() => parseAgentMoveContent('{"move":{"column":"left"},"confidence":0.5}')).toThrow(
      "0G Compute response did not include an integer move.column.",
    );
    expect(() => parseAgentMoveContent('{"move":{"column":1.5},"confidence":0.5}')).toThrow(
      "0G Compute response did not include an integer move.column.",
    );
  });

  it("clamps confidence and truncates long summaries", () => {
    expect(normalizeConfidence(Number.NaN)).toBe(0.5);
    expect(normalizeConfidence(-1)).toBe(0);
    expect(normalizeConfidence(1.5)).toBe(1);

    const parsed = parseAgentMoveContent(
      JSON.stringify({
        move: { column: 1 },
        confidence: 2,
        reasoningSummary: "x".repeat(300),
      }),
    );
    expect(parsed.confidence).toBe(1);
    expect(parsed.reasoningSummary).toHaveLength(240);
  });
});
