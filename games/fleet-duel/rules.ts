import { seededNumber, stableHash } from "../../src/lib/hash";
import type { GameAdapter, GameManifest, GamePlayer, GameReplay, GameResult } from "../../src/lib/game-pack";

export type FleetMove = { x: number; y: number };
export type FleetShip = { id: string; cells: string[]; hits: string[] };
export type FleetState = {
  gameId: "fleet-duel";
  version: string;
  seed: string;
  players: GamePlayer[];
  fleets: Record<string, FleetShip[]>;
  shots: Record<string, string[]>;
  publicLog: string[];
  turn: number;
  moves: GameReplay["moves"];
  result: GameResult | null;
};

const size = 6;

export const manifest: GameManifest = {
  id: "fleet-duel",
  name: "Fleet Duel",
  version: "1.0.0",
  author: "0G Arcade Arena",
  license: "MIT",
  minPlayers: 2,
  maxPlayers: 2,
  supportsSolo: false,
  supportsHumanVsHuman: true,
  supportsHumanVsAgent: true,
  supportsAgentVsAgent: true,
  supportsWagers: true,
  supportsTournaments: false,
  gameType: "hidden-information",
  turnType: "sequential",
  hiddenInformation: true,
  randomness: "seeded deterministic fleet placement",
  seedRequired: true,
  averageDuration: "3 minutes",
  moveSchemaHash: stableHash("FleetMove:{x:number,y:number}"),
  rulesHash: stableHash("fleet-duel-rules-v1"),
  uiHash: stableHash("fleet-duel-ui-v1"),
  agentPromptHash: stableHash("fleet-duel-agent-v1"),
  replaySchemaHash: stableHash("arcade-replay-v1"),
};

function cell(x: number, y: number) {
  return `${x},${y}`;
}

function placeFleet(seed: string, playerId: string): FleetShip[] {
  const lengths = [3, 2, 2];
  const occupied = new Set<string>();
  return lengths.map((length, index) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const vertical = seededNumber(seed, playerId.length + index + attempt) > 0.5;
      const x = Math.floor(seededNumber(seed, index * 7 + attempt) * (vertical ? size : size - length));
      const y = Math.floor(seededNumber(seed, index * 11 + attempt) * (vertical ? size - length : size));
      const cells = Array.from({ length }, (_, step) => cell(x + (vertical ? 0 : step), y + (vertical ? step : 0)));
      if (cells.every((c) => !occupied.has(c))) {
        cells.forEach((c) => occupied.add(c));
        return { id: `ship-${index + 1}`, cells, hits: [] };
      }
    }
    throw new Error("could not place fleet deterministically");
  });
}

function currentPlayer(state: FleetState) {
  return state.players[state.turn % state.players.length]?.id;
}

export const fleetDuelAdapter: GameAdapter<FleetState, FleetMove, Partial<FleetState>> = {
  id: manifest.id,
  manifest,
  createInitialState: ({ seed, players }) => ({
    gameId: "fleet-duel",
    version: manifest.version,
    seed,
    players,
    fleets: Object.fromEntries(players.map((p) => [p.id, placeFleet(seed, p.id)])),
    shots: Object.fromEntries(players.map((p) => [p.id, []])),
    publicLog: [],
    turn: 0,
    moves: [],
    result: null,
  }),
  getPlayerView: (state, playerId) => ({
    ...state,
    fleets: { [playerId]: state.fleets[playerId] },
  }),
  getLegalMoves: (state, playerId) => {
    if (state.result || currentPlayer(state) !== playerId) return [];
    const fired = new Set(state.shots[playerId]);
    return Array.from({ length: size * size }, (_, index) => ({
      x: index % size,
      y: Math.floor(index / size),
    })).filter((move) => !fired.has(cell(move.x, move.y)));
  },
  validateMove: (state, playerId, move) => {
    if (state.result) return { ok: false, reason: "match already finished" };
    if (currentPlayer(state) !== playerId) return { ok: false, reason: "not current player" };
    if (!Number.isInteger(move.x) || !Number.isInteger(move.y) || move.x < 0 || move.x >= size || move.y < 0 || move.y >= size) {
      return { ok: false, reason: "shot out of range" };
    }
    if (state.shots[playerId].includes(cell(move.x, move.y))) return { ok: false, reason: "duplicate shot" };
    return { ok: true };
  },
  applyMove: (state, playerId, move) => {
    const validation = fleetDuelAdapter.validateMove(state, playerId, move);
    if (!validation.ok) throw new Error(validation.reason);
    const next: FleetState = JSON.parse(JSON.stringify(state));
    const targetId = next.players.find((p) => p.id !== playerId)!.id;
    const shot = cell(move.x, move.y);
    next.shots[playerId].push(shot);
    const targetShip = next.fleets[targetId].find((ship) => ship.cells.includes(shot));
    if (targetShip) targetShip.hits.push(shot);
    next.publicLog.push(`${playerId} fired ${shot}: ${targetShip ? "hit" : "miss"}`);
    const sunkAll = next.fleets[targetId].every((ship) => ship.cells.every((c) => ship.hits.includes(c)));
    next.turn += 1;
    if (sunkAll) {
      next.result = {
        winnerIds: [playerId],
        loserIds: [targetId],
        draw: false,
        reason: "all opposing ships found",
      };
    }
    next.moves.push({ turn: state.turn, playerId, move, stateHash: stableHash(next.publicLog) });
    return next;
  },
  getCurrentPlayerIds: (state) => (state.result ? [] : [currentPlayer(state)]),
  isTerminal: (state) => Boolean(state.result),
  getResult: (state) => state.result,
  scoreState: (state) => ({
    leaders: state.result?.winnerIds ?? [],
    scores: Object.fromEntries(
      state.players.map((p) => [p.id, Object.values(state.fleets).flat().flatMap((ship) => ship.hits).filter((hit) => state.shots[p.id].includes(hit)).length]),
    ),
    turn: state.turn,
  }),
  serializeReplay: (state) => ({
    gameId: manifest.id,
    version: manifest.version,
    seed: state.seed,
    players: state.players,
    moves: state.moves,
    result: state.result,
    finalStateHash: stableHash({ publicLog: state.publicLog, shots: state.shots }),
  }),
  hashReplay: (replay) => stableHash(replay),
};
