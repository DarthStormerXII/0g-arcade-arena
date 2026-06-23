import { chooseFallbackMove, demoPlayers } from "./agents";
import type { GameAdapter, GameReplay, ProofReceipt, ScoreSummary } from "./game-pack";
import { getGame } from "./game-registry";
import { makeProofReceipt } from "./proofs";

export type MatchRecord = {
  matchId: string;
  gameId: string;
  replay: GameReplay;
  receipt: ProofReceipt;
  score: ScoreSummary;
};

const gameIds = ["world-cup-draft", "fleet-duel", "grid-four", "tile-race"];

export function gameIdFromMatchId(matchId = "match-grid-four-agent-free-local") {
  const normalized = matchId.startsWith("match-") ? matchId.slice(6) : matchId;
  return gameIds.find((id) => normalized === id || normalized.startsWith(`${id}-`)) ?? "grid-four";
}

export function makeMatchRecord(matchId: string, gameId: string, replay: GameReplay, score: ScoreSummary) {
  const manifest = getGame(gameId).manifest;
  return {
    matchId,
    gameId,
    replay,
    receipt: makeProofReceipt({ matchId, manifest, replay }),
    score,
  } satisfies MatchRecord;
}

export function runDemo(gameId = "grid-four", matchId = `match-${gameId}-receipt`) {
  const adapter = getGame(gameId) as GameAdapter<any, any, any>;
  let state = adapter.createInitialState({
    seed: `receipt-${gameId}`,
    players: demoPlayers,
    options: { maxTurns: 8, maxPicks: 2 },
  });
  let guard = 0;
  while (!adapter.isTerminal(state) && guard < 64) {
    const playerId = adapter.getCurrentPlayerIds(state)[0];
    const legal = adapter.getLegalMoves(state, playerId);
    if (legal.length === 0) break;
    const move = playerId.includes("agent")
      ? chooseFallbackMove(adapter, state, playerId).move
      : legal[0];
    state = adapter.applyMove(state, playerId, move);
    guard += 1;
  }
  return makeMatchRecord(matchId, gameId, adapter.serializeReplay(state), adapter.scoreState(state));
}

export function saveMatchRecord(record: MatchRecord) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(`arcade-match:${record.matchId}`, JSON.stringify(record));
}

export function loadMatchRecord(matchId: string) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(`arcade-match:${matchId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as MatchRecord;
  } catch {
    return null;
  }
}

export function resolveMatchRecord(matchId: string) {
  const gameId = gameIdFromMatchId(matchId);
  return loadMatchRecord(matchId) ?? runDemo(gameId, matchId);
}
