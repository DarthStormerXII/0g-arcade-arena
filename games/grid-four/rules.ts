import { stableHash } from "../../src/lib/hash";
import type {
  GameAdapter,
  GameManifest,
  GamePlayer,
  GameReplay,
  GameResult,
} from "../../src/lib/game-pack";

export type GridFourMove = { column: number };
export type GridFourState = {
  gameId: "grid-four";
  version: string;
  seed: string;
  players: GamePlayer[];
  board: Array<Array<string | null>>;
  turn: number;
  moves: GameReplay["moves"];
  result: GameResult | null;
};

const width = 7;
const height = 6;

export const manifest: GameManifest = {
  id: "grid-four",
  name: "Grid Four",
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
  gameType: "alignment",
  turnType: "sequential",
  hiddenInformation: false,
  randomness: "none after seeded room creation",
  seedRequired: true,
  averageDuration: "2 minutes",
  moveSchemaHash: stableHash("GridFourMove:{column:number}"),
  rulesHash: stableHash("grid-four-rules-v1"),
  uiHash: stableHash("grid-four-ui-v1"),
  agentPromptHash: stableHash("grid-four-agent-v1"),
  replaySchemaHash: stableHash("arcade-replay-v1"),
};

function emptyBoard() {
  return Array.from({ length: height }, () => Array<string | null>(width).fill(null));
}

function winner(board: GridFourState["board"]) {
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const token = board[row][col];
      if (!token) continue;
      for (const [dx, dy] of directions) {
        const run = [0, 1, 2, 3].every((step) => board[row + dy * step]?.[col + dx * step] === token);
        if (run) return token;
      }
    }
  }
  return null;
}

function currentPlayer(state: GridFourState) {
  return state.players[state.turn % state.players.length]?.id;
}

export const gridFourAdapter: GameAdapter<GridFourState, GridFourMove, GridFourState> = {
  id: manifest.id,
  manifest,
  createInitialState: ({ seed, players }) => ({
    gameId: "grid-four",
    version: manifest.version,
    seed,
    players,
    board: emptyBoard(),
    turn: 0,
    moves: [],
    result: null,
  }),
  getPlayerView: (state) => state,
  getLegalMoves: (state, playerId) => {
    if (state.result || currentPlayer(state) !== playerId) return [];
    return Array.from({ length: width }, (_, column) => ({ column })).filter(
      ({ column }) => state.board[0][column] === null,
    );
  },
  validateMove: (state, playerId, move) => {
    if (state.result) return { ok: false, reason: "match already finished" };
    if (currentPlayer(state) !== playerId) return { ok: false, reason: "not current player" };
    if (!Number.isInteger(move.column) || move.column < 0 || move.column >= width) {
      return { ok: false, reason: "column out of range" };
    }
    if (state.board[0][move.column] !== null) return { ok: false, reason: "column is full" };
    return { ok: true };
  },
  applyMove: (state, playerId, move) => {
    const validation = gridFourAdapter.validateMove(state, playerId, move);
    if (!validation.ok) throw new Error(validation.reason);
    const next: GridFourState = JSON.parse(JSON.stringify(state));
    for (let row = height - 1; row >= 0; row -= 1) {
      if (next.board[row][move.column] === null) {
        next.board[row][move.column] = playerId;
        break;
      }
    }
    const winningPlayer = winner(next.board);
    const full = next.board[0].every(Boolean);
    next.turn += 1;
    if (winningPlayer) {
      next.result = {
        winnerIds: [winningPlayer],
        loserIds: next.players.map((p) => p.id).filter((id) => id !== winningPlayer),
        draw: false,
        reason: "four connected cells",
      };
    } else if (full) {
      next.result = { winnerIds: [], loserIds: [], draw: true, reason: "board full" };
    }
    next.moves.push({
      turn: state.turn,
      playerId,
      move,
      stateHash: stableHash(next.board),
    });
    return next;
  },
  getCurrentPlayerIds: (state) => (state.result ? [] : [currentPlayer(state)]),
  isTerminal: (state) => Boolean(state.result),
  getResult: (state) => state.result,
  scoreState: (state) => ({
    leaders: state.result?.winnerIds ?? [],
    scores: Object.fromEntries(state.players.map((p) => [p.id, state.board.flat().filter((cell) => cell === p.id).length])),
    turn: state.turn,
  }),
  serializeReplay: (state) => ({
    gameId: manifest.id,
    version: manifest.version,
    seed: state.seed,
    players: state.players,
    moves: state.moves,
    result: state.result,
    finalStateHash: stableHash(state.board),
  }),
  hashReplay: (replay) => stableHash(replay),
};
