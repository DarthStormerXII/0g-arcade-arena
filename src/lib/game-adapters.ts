import { fleetDuelAdapter } from "../../games/fleet-duel/rules";
import { gridFourAdapter } from "../../games/grid-four/rules";
import { tileRaceAdapter } from "../../games/tile-race/rules";
import { worldCupDraftAdapter } from "../../games/world-cup-draft/rules";
import type { GameAdapter } from "./game-pack";

export const gameAdapters = [
  gridFourAdapter,
  fleetDuelAdapter,
  tileRaceAdapter,
  worldCupDraftAdapter,
] satisfies GameAdapter<unknown, unknown, unknown>[];

export function getGame(gameId = "grid-four") {
  return gameAdapters.find((game) => game.id === gameId) ?? gridFourAdapter;
}
