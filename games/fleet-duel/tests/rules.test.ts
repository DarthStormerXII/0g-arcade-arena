import { describe, expect, it } from "vitest";
import { demoPlayers } from "../../../src/lib/agents";
import { fleetDuelAdapter } from "../rules";

describe("Fleet Duel rules", () => {
  it("uses seeded hidden fleets and rejects duplicate shots", () => {
    let state = fleetDuelAdapter.createInitialState({ seed: "fleet-test", players: demoPlayers, options: {} });
    const first = fleetDuelAdapter.getLegalMoves(state, demoPlayers[0].id)[0];
    state = fleetDuelAdapter.applyMove(state, demoPlayers[0].id, first);
    expect(fleetDuelAdapter.validateMove(state, demoPlayers[0].id, first).ok).toBe(false);
    expect(fleetDuelAdapter.serializeReplay(state).finalStateHash).toMatch(/^0x/);
    expect(fleetDuelAdapter.getPlayerView(state, demoPlayers[0].id).fleets).toHaveProperty(demoPlayers[0].id);
  });
});
