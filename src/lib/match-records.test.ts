import { describe, expect, it } from "vitest";
import { loadMatchRecord, runDemo, saveMatchRecord } from "./match-records";

describe("match records", () => {
  it("persists a replay and proof receipt for result/proof routes", () => {
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
    const record = runDemo("grid-four", "match-grid-four-local-test");
    saveMatchRecord(record);
    const stored = loadMatchRecord("match-grid-four-local-test");

    expect(stored?.receipt.replayHash).toBe(record.receipt.replayHash);
    expect(stored?.replay.moves.length).toBeGreaterThan(0);
    expect(stored?.receipt.computeMode).toBe("deterministic-fallback");
  });
});
