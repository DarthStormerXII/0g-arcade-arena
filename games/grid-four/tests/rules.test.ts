import { describe, expect, it } from "vitest";
import { demoPlayers } from "../../../src/lib/agents";
import { gridFourAdapter } from "../rules";

describe("Grid Four rules", () => {
  it("rejects invalid moves and resolves a deterministic winner", () => {
    let state = gridFourAdapter.createInitialState({ seed: "grid-test", players: demoPlayers, options: {} });
    expect(gridFourAdapter.validateMove(state, demoPlayers[0].id, { column: 9 }).ok).toBe(false);
    for (const column of [0, 1, 0, 1, 0, 1, 0]) {
      const playerId = gridFourAdapter.getCurrentPlayerIds(state)[0];
      state = gridFourAdapter.applyMove(state, playerId, { column });
    }
    expect(gridFourAdapter.isTerminal(state)).toBe(true);
    expect(gridFourAdapter.getResult(state)?.winnerIds).toEqual([demoPlayers[0].id]);
    expect(gridFourAdapter.hashReplay(gridFourAdapter.serializeReplay(state))).toMatch(/^0x/);
  });
});
