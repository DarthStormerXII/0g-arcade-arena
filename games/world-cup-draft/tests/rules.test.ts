import { describe, expect, it } from "vitest";
import { demoPlayers } from "../../../src/lib/agents";
import { worldCupDraftAdapter } from "../rules";

describe("World Cup Draft rules", () => {
  it("drafts available players and rejects duplicate picks", () => {
    let state = worldCupDraftAdapter.createInitialState({
      seed: "draft-test",
      players: demoPlayers,
      options: { maxPicks: 1 },
    });
    const firstMove = worldCupDraftAdapter.getLegalMoves(state, demoPlayers[0].id)[0];
    state = worldCupDraftAdapter.applyMove(state, demoPlayers[0].id, firstMove);
    expect(worldCupDraftAdapter.validateMove(state, demoPlayers[1].id, firstMove).ok).toBe(false);
    const secondMove = worldCupDraftAdapter.getLegalMoves(state, demoPlayers[1].id)[0];
    state = worldCupDraftAdapter.applyMove(state, demoPlayers[1].id, secondMove);
    expect(worldCupDraftAdapter.isTerminal(state)).toBe(true);
    expect(worldCupDraftAdapter.hashReplay(worldCupDraftAdapter.serializeReplay(state))).toMatch(/^0x/);
  });
});
