import { seededNumber, stableHash } from "../../src/lib/hash";
import type { GameAdapter, GameManifest, GamePlayer, GameReplay, GameResult } from "../../src/lib/game-pack";

export type TileMove = { direction: "up" | "down" | "left" | "right" };
export type TileBoard = number[][];
export type TileRaceState = {
  gameId: "tile-race";
  version: string;
  seed: string;
  players: GamePlayer[];
  boards: Record<string, TileBoard>;
  scores: Record<string, number>;
  turn: number;
  maxTurns: number;
  activePlayerIndex: number;
  moves: GameReplay["moves"];
  result: GameResult | null;
};

export const manifest: GameManifest = {
  id: "tile-race",
  name: "Tile Race",
  version: "1.0.0",
  author: "0G Arcade Arena",
  license: "MIT",
  minPlayers: 1,
  maxPlayers: 2,
  supportsSolo: true,
  supportsHumanVsHuman: true,
  supportsHumanVsAgent: true,
  supportsAgentVsAgent: true,
  supportsWagers: false,
  supportsTournaments: false,
  gameType: "score-race",
  turnType: "solo-or-asynchronous",
  hiddenInformation: false,
  randomness: "seeded deterministic tile spawn",
  seedRequired: true,
  averageDuration: "2 minutes",
  moveSchemaHash: stableHash("TileMove:{direction:up|down|left|right}"),
  rulesHash: stableHash("tile-race-rules-v1"),
  uiHash: stableHash("tile-race-ui-v1"),
  agentPromptHash: stableHash("tile-race-agent-v1"),
  replaySchemaHash: stableHash("arcade-replay-v1"),
};

const size = 4;
const directions: TileMove["direction"][] = ["up", "down", "left", "right"];

function emptyBoard(): TileBoard {
  return Array.from({ length: size }, () => Array(size).fill(0));
}

function addTile(board: TileBoard, seed: string, turn: number) {
  const next = board.map((row) => [...row]);
  const open = next.flatMap((row, y) => row.map((value, x) => ({ x, y, value }))).filter((cell) => cell.value === 0);
  if (open.length === 0) return next;
  const pick = open[Math.floor(seededNumber(seed, turn) * open.length) % open.length];
  next[pick.y][pick.x] = seededNumber(seed, turn + 99) > 0.88 ? 4 : 2;
  return next;
}

function mergeLine(line: number[]) {
  const compact = line.filter(Boolean);
  const out: number[] = [];
  let score = 0;
  for (let index = 0; index < compact.length; index += 1) {
    if (compact[index] === compact[index + 1]) {
      const merged = compact[index] * 2;
      out.push(merged);
      score += merged;
      index += 1;
    } else {
      out.push(compact[index]);
    }
  }
  return { line: [...out, ...Array(size - out.length).fill(0)], score };
}

function moveBoard(board: TileBoard, direction: TileMove["direction"]) {
  const next = emptyBoard();
  let score = 0;
  for (let index = 0; index < size; index += 1) {
    const line =
      direction === "left" || direction === "right"
        ? board[index]
        : board.map((row) => row[index]);
    const source = direction === "right" || direction === "down" ? [...line].reverse() : line;
    const merged = mergeLine(source);
    const finalLine = direction === "right" || direction === "down" ? merged.line.reverse() : merged.line;
    finalLine.forEach((value, offset) => {
      if (direction === "left" || direction === "right") next[index][offset] = value;
      else next[offset][index] = value;
    });
    score += merged.score;
  }
  return { board: next, score, changed: stableHash(board) !== stableHash(next) };
}

function currentPlayer(state: TileRaceState) {
  return state.players[state.activePlayerIndex % state.players.length]?.id;
}

function hasMove(board: TileBoard) {
  return directions.some((direction) => moveBoard(board, direction).changed);
}

export const tileRaceAdapter: GameAdapter<TileRaceState, TileMove, TileRaceState> = {
  id: manifest.id,
  manifest,
  createInitialState: ({ seed, players, options }) => {
    const maxTurns = Number(options.maxTurns ?? 24);
    const boards = Object.fromEntries(players.map((p, index) => [p.id, addTile(addTile(emptyBoard(), seed, index), seed, index + 10)]));
    return {
      gameId: "tile-race",
      version: manifest.version,
      seed,
      players,
      boards,
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      turn: 0,
      maxTurns,
      activePlayerIndex: 0,
      moves: [],
      result: null,
    };
  },
  getPlayerView: (state) => state,
  getLegalMoves: (state, playerId) => {
    if (state.result || currentPlayer(state) !== playerId) return [];
    return directions.map((direction) => ({ direction })).filter((move) => moveBoard(state.boards[playerId], move.direction).changed);
  },
  validateMove: (state, playerId, move) => {
    if (state.result) return { ok: false, reason: "race already finished" };
    if (currentPlayer(state) !== playerId) return { ok: false, reason: "not current player" };
    if (!directions.includes(move.direction)) return { ok: false, reason: "unknown direction" };
    if (!moveBoard(state.boards[playerId], move.direction).changed) return { ok: false, reason: "move changes nothing" };
    return { ok: true };
  },
  applyMove: (state, playerId, move) => {
    const validation = tileRaceAdapter.validateMove(state, playerId, move);
    if (!validation.ok) throw new Error(validation.reason);
    const next: TileRaceState = JSON.parse(JSON.stringify(state));
    const moved = moveBoard(next.boards[playerId], move.direction);
    next.boards[playerId] = addTile(moved.board, next.seed, next.turn + 20);
    next.scores[playerId] += moved.score;
    next.turn += 1;
    next.activePlayerIndex = (next.activePlayerIndex + 1) % next.players.length;
    next.moves.push({ turn: state.turn, playerId, move, stateHash: stableHash(next.boards[playerId]) });
    const noMoves = next.players.every((p) => !hasMove(next.boards[p.id]));
    if (next.turn >= next.maxTurns || noMoves) {
      const highScore = Math.max(...Object.values(next.scores));
      const winners = next.players.filter((p) => next.scores[p.id] === highScore).map((p) => p.id);
      next.result = {
        winnerIds: winners,
        loserIds: next.players.map((p) => p.id).filter((id) => !winners.includes(id)),
        draw: winners.length > 1,
        reason: next.turn >= next.maxTurns ? "fixed move budget reached" : "no legal moves remain",
      };
    }
    return next;
  },
  getCurrentPlayerIds: (state) => (state.result ? [] : [currentPlayer(state)]),
  isTerminal: (state) => Boolean(state.result),
  getResult: (state) => state.result,
  scoreState: (state) => ({
    leaders: Object.entries(state.scores).filter(([, score]) => score === Math.max(...Object.values(state.scores))).map(([id]) => id),
    scores: state.scores,
    turn: state.turn,
  }),
  serializeReplay: (state) => ({
    gameId: manifest.id,
    version: manifest.version,
    seed: state.seed,
    players: state.players,
    moves: state.moves,
    result: state.result,
    finalStateHash: stableHash({ boards: state.boards, scores: state.scores }),
  }),
  hashReplay: (replay) => stableHash(replay),
};
