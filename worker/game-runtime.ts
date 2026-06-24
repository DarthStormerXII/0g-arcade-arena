import { gameAdapters } from "../src/lib/game-adapters";
import type { GamePlayer, GameReplay, GameResult, ScoreSummary } from "../src/lib/game-pack";
import { stableHash } from "../src/lib/hash";

export type OpponentMode = "human" | "agent";
export type RoomStatus = "waiting" | "ready" | "active" | "finished" | "cancelled";
export type AgentComputeMode = "0g-compute" | "sarvam-fallback" | "deterministic-fallback";

export type ArcadeRoomState = {
  roomId: string;
  matchId: string;
  gameId: string;
  seed: string;
  opponentMode: OpponentMode;
  wagerWei: string;
  players: GamePlayer[];
  status: RoomStatus;
  state: unknown | null;
  replay: GameReplay | null;
  result: GameResult | null;
  score: ScoreSummary | null;
  computeMode?: AgentComputeMode;
  computeProofs?: AgentMoveProof[];
  createdAt: string;
  updatedAt: string;
};

export type AgentMoveProof = {
  turn: number;
  playerId: string;
  mode: AgentComputeMode;
  provider: string | null;
  requestId: string | null;
  verified: boolean;
  model: string | null;
  contentHash: string | null;
  fallbackReason: string | null;
  primaryComputeError: string | null;
};

export type CreateRoomInput = {
  roomId: string;
  host: GamePlayer;
  gameId?: string;
  seed?: string;
  opponentMode?: OpponentMode;
  wagerWei?: string;
  now?: string;
};

export type JoinRoomInput = {
  player: GamePlayer;
  now?: string;
};

export type ApplyMoveInput = {
  playerId: string;
  move: unknown;
  now?: string;
};

export type CancelRoomInput = {
  playerId: string;
  now?: string;
};

export class RoomRuntimeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "RoomRuntimeError";
    this.status = status;
  }
}

export function createRoom(input: CreateRoomInput): ArcadeRoomState {
  const adapter = adapterFor(input.gameId ?? "grid-four");
  const host = normalizePlayer(input.host, "host");
  const now = input.now ?? new Date().toISOString();
  const roomId = normalizeRoomId(input.roomId);
  return {
    roomId,
    matchId: `match-${roomId}`,
    gameId: adapter.id,
    seed: input.seed ?? stableHash(`${roomId}:${now}`),
    opponentMode: input.opponentMode ?? "human",
    wagerWei: normalizeWager(input.wagerWei),
    players: [host],
    status: "waiting",
    state: null,
    replay: null,
    result: null,
    score: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function joinRoom(room: ArcadeRoomState, input: JoinRoomInput): ArcadeRoomState {
  ensureNotFinished(room);
  ensureNotCancelled(room);
  const player = normalizePlayer(input.player, "player");
  if (room.players.some((existing) => existing.id === player.id)) {
    return updateRoom(room, input.now, room.players.length === 2 ? "ready" : room.status);
  }
  if (room.players.length >= 2) {
    throw new RoomRuntimeError("room already has two players", 409);
  }
  const next = updateRoom(
    {
      ...room,
      players: [...room.players, player],
      status: "ready",
    },
    input.now,
  );
  return next;
}

export function startRoom(room: ArcadeRoomState, now?: string): ArcadeRoomState {
  ensureNotFinished(room);
  ensureNotCancelled(room);
  if (room.players.length !== 2) {
    throw new RoomRuntimeError("room needs exactly two players before start", 409);
  }
  if (room.state) {
    return updateRoom(room, now, room.status === "ready" ? "active" : room.status);
  }
  const adapter = adapterFor(room.gameId);
  const state = adapter.createInitialState({
    seed: room.seed,
    players: room.players,
    options: {},
  });
  return updateRoom({ ...room, state, status: "active" }, now);
}

export function applyRoomMove(room: ArcadeRoomState, input: ApplyMoveInput): ArcadeRoomState {
  const activeRoom = room.state ? room : startRoom(room, input.now);
  if (activeRoom.status === "finished" || activeRoom.result) {
    throw new RoomRuntimeError("match already finished", 409);
  }
  if (!activeRoom.players.some((player) => player.id === input.playerId)) {
    throw new RoomRuntimeError("player is not in this room", 403);
  }
  const adapter = adapterFor(activeRoom.gameId);
  const state = mustHaveState(activeRoom);
  const validation = adapter.validateMove(state, input.playerId, input.move);
  if (!validation.ok) {
    throw new RoomRuntimeError(validation.reason ?? "invalid move", 400);
  }
  const nextState = adapter.applyMove(state, input.playerId, input.move);
  const replay = adapter.serializeReplay(nextState);
  const result = adapter.getResult(nextState);
  return updateRoom(
    {
      ...activeRoom,
      state: nextState,
      replay,
      result,
      score: adapter.scoreState(nextState),
      status: result ? "finished" : "active",
    },
    input.now,
  );
}

export function cancelRoom(room: ArcadeRoomState, input: CancelRoomInput): ArcadeRoomState {
  ensureNotFinished(room);
  ensureNotCancelled(room);
  if (room.state || room.status === "active") {
    throw new RoomRuntimeError("active matches cannot be cancelled", 409);
  }
  if (room.players[0]?.id !== input.playerId) {
    throw new RoomRuntimeError("only the host can cancel this room", 403);
  }
  return updateRoom(room, input.now, "cancelled");
}

export function getRoomView(room: ArcadeRoomState) {
  const state = room.state;
  const adapter = adapterFor(room.gameId);
  const currentPlayerIds = state ? adapter.getCurrentPlayerIds(state) : [];
  const legalMoves =
    state && currentPlayerIds[0] ? adapter.getLegalMoves(state, currentPlayerIds[0]) : [];
  return {
    ...room,
    currentPlayerIds,
    legalMoves,
    replayHash: room.replay ? adapter.hashReplay(room.replay) : null,
    resultHash: room.result ? stableHash(room.result) : null,
  };
}

function adapterFor(gameId: string) {
  const adapter = gameAdapters.find((candidate) => candidate.id === gameId);
  if (!adapter) throw new RoomRuntimeError(`unsupported game: ${gameId}`, 400);
  return adapter;
}

function updateRoom(room: ArcadeRoomState, now?: string, status?: RoomStatus): ArcadeRoomState {
  return {
    ...room,
    status: status ?? room.status,
    updatedAt: now ?? new Date().toISOString(),
  };
}

function ensureNotFinished(room: ArcadeRoomState) {
  if (room.status === "finished" || room.result) {
    throw new RoomRuntimeError("match already finished", 409);
  }
}

function ensureNotCancelled(room: ArcadeRoomState) {
  if (room.status === "cancelled") {
    throw new RoomRuntimeError("room is cancelled", 409);
  }
}

function mustHaveState(room: ArcadeRoomState) {
  if (!room.state) {
    throw new RoomRuntimeError("match has not started", 409);
  }
  return room.state;
}

function normalizePlayer(player: GamePlayer | undefined, label: string): GamePlayer {
  if (!player || typeof player.id !== "string" || player.id.trim().length < 2) {
    throw new RoomRuntimeError(`${label} id is required`, 400);
  }
  if (!["human", "agent", "platform"].includes(player.kind)) {
    throw new RoomRuntimeError(`${label} kind is invalid`, 400);
  }
  return {
    ...player,
    id: player.id.trim(),
    displayName: player.displayName?.trim() || player.id.trim(),
  };
}

function normalizeRoomId(roomId: string) {
  const normalized = roomId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 32);
  if (normalized.length < 4) {
    throw new RoomRuntimeError("room id must be at least four characters", 400);
  }
  return normalized;
}

function normalizeWager(wagerWei?: string) {
  if (!wagerWei) return "0";
  if (!/^\d+$/.test(wagerWei)) {
    throw new RoomRuntimeError("wagerWei must be a decimal wei string", 400);
  }
  return wagerWei;
}
