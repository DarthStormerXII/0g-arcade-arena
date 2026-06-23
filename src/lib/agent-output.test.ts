import { describe, expect, it } from "vitest";
import { agentOutputSchema as fleetSchema } from "../../games/fleet-duel/schema";
import { agentOutputSchema as gridSchema } from "../../games/grid-four/schema";
import { agentOutputSchema as tileSchema } from "../../games/tile-race/schema";
import { agentOutputSchema as draftSchema } from "../../games/world-cup-draft/schema";
import { chooseFallbackMove, demoPlayers } from "./agents";
import { gameAdapters } from "./game-registry";

const schemas = {
  "fleet-duel": fleetSchema,
  "grid-four": gridSchema,
  "tile-race": tileSchema,
  "world-cup-draft": draftSchema,
};

describe("agent move output standard", () => {
  it("fallback agents emit structured JSON compatible with every game schema", () => {
    for (const adapter of gameAdapters) {
      const typedAdapter = adapter as any;
      const state = typedAdapter.createInitialState({
        seed: `agent-test-${adapter.id}`,
        players: demoPlayers,
        options: { maxTurns: 8, maxPicks: 1 },
      });
      const playerId = typedAdapter.getCurrentPlayerIds(state)[0];
      const output = chooseFallbackMove(typedAdapter, state, playerId);
      expect(schemas[adapter.id as keyof typeof schemas].safeParse(output).success).toBe(true);
    }
  });
});
