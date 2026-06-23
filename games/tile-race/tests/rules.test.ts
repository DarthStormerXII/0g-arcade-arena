import { describe, expect, it } from "vitest";
import { demoPlayers } from "../../../src/lib/agents";
import { tileRaceAdapter } from "../rules";

describe("Tile Race rules", () => {
  it("spawns seeded boards and ends after the fixed move budget", () => {
    let state = tileRaceAdapter.createInitialState({
      seed: "tile-test",
      players: demoPlayers,
      options: { maxTurns: 2 },
    });
    while (!tileRaceAdapter.isTerminal(state)) {
      const playerId = tileRaceAdapter.getCurrentPlayerIds(state)[0];
      const move = tileRaceAdapter.getLegalMoves(state, playerId)[0];
      state = tileRaceAdapter.applyMove(state, playerId, move);
    }
    expect(tileRaceAdapter.getResult(state)?.reason).toBe("fixed move budget reached");
    expect(tileRaceAdapter.hashReplay(tileRaceAdapter.serializeReplay(state))).toMatch(/^0x/);
  });
});
