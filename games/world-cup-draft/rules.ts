import { seededNumber, stableHash } from "../../src/lib/hash";
import type { GameAdapter, GameManifest, GamePlayer, GameReplay, GameResult } from "../../src/lib/game-pack";

export type DraftMove = { pickId: string };
export type DraftPlayer = {
  id: string;
  name: string;
  country: string;
  role: "keeper" | "defender" | "creator" | "finisher";
  rating: number;
};
export type DraftTeam = { playerId: string; picks: DraftPlayer[]; score: number };
export type DraftState = {
  gameId: "world-cup-draft";
  version: string;
  seed: string;
  players: GamePlayer[];
  pool: DraftPlayer[];
  teams: Record<string, DraftTeam>;
  turn: number;
  maxPicks: number;
  moves: GameReplay["moves"];
  result: GameResult | null;
};

export const manifest: GameManifest = {
  id: "world-cup-draft",
  name: "World Cup Draft",
  version: "1.0.0",
  author: "0G Arcade Arena, adapted from 0G World Cup",
  license: "MIT",
  minPlayers: 1,
  maxPlayers: 4,
  supportsSolo: true,
  supportsHumanVsHuman: true,
  supportsHumanVsAgent: true,
  supportsAgentVsAgent: true,
  supportsWagers: true,
  supportsTournaments: false,
  gameType: "draft-simulation",
  turnType: "snake-draft",
  hiddenInformation: false,
  randomness: "seeded player ordering and tiebreakers",
  seedRequired: true,
  averageDuration: "3 minutes",
  moveSchemaHash: stableHash("DraftMove:{pickId:string}"),
  rulesHash: stableHash("world-cup-draft-rules-v1"),
  uiHash: stableHash("world-cup-draft-ui-v1"),
  agentPromptHash: stableHash("world-cup-draft-agent-v1"),
  replaySchemaHash: stableHash("arcade-replay-v1"),
};

const basePool: DraftPlayer[] = [
  { id: "arg-10", name: "Buenos Aires 10", country: "Argentina", role: "creator", rating: 95 },
  { id: "fra-9", name: "Paris 9", country: "France", role: "finisher", rating: 94 },
  { id: "bra-11", name: "Rio 11", country: "Brazil", role: "creator", rating: 93 },
  { id: "eng-7", name: "North London 7", country: "England", role: "finisher", rating: 91 },
  { id: "esp-6", name: "Madrid 6", country: "Spain", role: "creator", rating: 90 },
  { id: "ger-1", name: "Munich 1", country: "Germany", role: "keeper", rating: 89 },
  { id: "ita-3", name: "Milan 3", country: "Italy", role: "defender", rating: 88 },
  { id: "jpn-14", name: "Tokyo 14", country: "Japan", role: "creator", rating: 86 },
  { id: "usa-8", name: "California 8", country: "United States", role: "finisher", rating: 85 },
  { id: "gha-5", name: "Accra 5", country: "Ghana", role: "defender", rating: 84 },
  { id: "mar-4", name: "Atlas 4", country: "Morocco", role: "defender", rating: 84 },
  { id: "kor-18", name: "Seoul 18", country: "Korea Republic", role: "creator", rating: 83 },
];

function seededPool(seed: string) {
  return [...basePool].sort((a, b) => seededNumber(seed, a.id.length) - seededNumber(seed, b.id.length));
}

function currentPlayer(state: DraftState) {
  return state.players[state.turn % state.players.length]?.id;
}

function scoreTeam(team: DraftTeam, seed: string) {
  const roleBonus = new Set(team.picks.map((pick) => pick.role)).size * 8;
  const countryBonus = new Set(team.picks.map((pick) => pick.country)).size * 3;
  const seedBonus = Math.floor(seededNumber(seed, team.playerId.length) * 12);
  return team.picks.reduce((sum, pick) => sum + pick.rating, 0) + roleBonus + countryBonus + seedBonus;
}

export const worldCupDraftAdapter: GameAdapter<DraftState, DraftMove, DraftState> = {
  id: manifest.id,
  manifest,
  createInitialState: ({ seed, players, options }) => ({
    gameId: "world-cup-draft",
    version: manifest.version,
    seed,
    players,
    pool: seededPool(seed),
    teams: Object.fromEntries(players.map((p) => [p.id, { playerId: p.id, picks: [], score: 0 }])),
    turn: 0,
    maxPicks: Number(options.maxPicks ?? 4),
    moves: [],
    result: null,
  }),
  getPlayerView: (state) => state,
  getLegalMoves: (state, playerId) => {
    if (state.result || currentPlayer(state) !== playerId) return [];
    return state.pool.map((pick) => ({ pickId: pick.id }));
  },
  validateMove: (state, playerId, move) => {
    if (state.result) return { ok: false, reason: "draft already finished" };
    if (currentPlayer(state) !== playerId) return { ok: false, reason: "not current drafter" };
    if (!state.pool.some((pick) => pick.id === move.pickId)) return { ok: false, reason: "player not available" };
    return { ok: true };
  },
  applyMove: (state, playerId, move) => {
    const validation = worldCupDraftAdapter.validateMove(state, playerId, move);
    if (!validation.ok) throw new Error(validation.reason);
    const next: DraftState = JSON.parse(JSON.stringify(state));
    const pick = next.pool.find((candidate) => candidate.id === move.pickId)!;
    next.pool = next.pool.filter((candidate) => candidate.id !== move.pickId);
    next.teams[playerId].picks.push(pick);
    next.teams[playerId].score = scoreTeam(next.teams[playerId], next.seed);
    next.turn += 1;
    next.moves.push({ turn: state.turn, playerId, move, stateHash: stableHash(next.teams) });
    const complete = next.players.every((p) => next.teams[p.id].picks.length >= next.maxPicks);
    if (complete) {
      const highScore = Math.max(...Object.values(next.teams).map((team) => team.score));
      const winners = Object.values(next.teams).filter((team) => team.score === highScore).map((team) => team.playerId);
      next.result = {
        winnerIds: winners,
        loserIds: next.players.map((p) => p.id).filter((id) => !winners.includes(id)),
        draw: winners.length > 1,
        reason: "draft score resolved from ratings, role coverage, and seed tiebreaker",
      };
    }
    return next;
  },
  getCurrentPlayerIds: (state) => (state.result ? [] : [currentPlayer(state)]),
  isTerminal: (state) => Boolean(state.result),
  getResult: (state) => state.result,
  scoreState: (state) => ({
    leaders: Object.values(state.teams).filter((team) => team.score === Math.max(...Object.values(state.teams).map((t) => t.score))).map((team) => team.playerId),
    scores: Object.fromEntries(Object.values(state.teams).map((team) => [team.playerId, team.score])),
    turn: state.turn,
  }),
  serializeReplay: (state) => ({
    gameId: manifest.id,
    version: manifest.version,
    seed: state.seed,
    players: state.players,
    moves: state.moves,
    result: state.result,
    finalStateHash: stableHash(state.teams),
  }),
  hashReplay: (replay) => stableHash(replay),
};
