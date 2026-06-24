import type { GamePlayer, GameReplay, GameResult, ScoreSummary } from "./game-pack";

export type AgentComputeMode = "0g-compute" | "sarvam-fallback" | "deterministic-fallback";

export type ArcadeRoomView = {
  roomId: string;
  matchId: string;
  gameId: string;
  seed: string;
  opponentMode: "human" | "agent";
  wagerWei: string;
  players: GamePlayer[];
  status: "waiting" | "ready" | "active" | "finished" | "cancelled";
  state: unknown | null;
  replay: GameReplay | null;
  result: GameResult | null;
  score: ScoreSummary | null;
  computeMode?: AgentComputeMode;
  computeProofs?: Array<{
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
  }>;
  currentPlayerIds: string[];
  legalMoves: unknown[];
  replayHash: string | null;
  resultHash: string | null;
  createdAt: string;
  updatedAt: string;
};

type RoomResponse = {
  ok: boolean;
  room?: ArcadeRoomView;
  error?: string;
};

export function parse0gToWei(amount: string) {
  const normalized = amount.trim();
  if (!normalized || normalized === "free") return "0";
  const [whole = "0", fraction = ""] = normalized.split(".");
  const wholeWei = BigInt(whole || "0") * 10n ** 18n;
  const fractionWei = BigInt((fraction.slice(0, 18).padEnd(18, "0") || "0").replace(/\D/g, "0"));
  return (wholeWei + fractionWei).toString();
}

export async function createRoom(input: {
  roomId: string;
  gameId: string;
  host: GamePlayer;
  wagerWei: string;
  opponentMode?: "human" | "agent";
}) {
  return roomRequest("/api/rooms", {
    roomId: input.roomId,
    gameId: input.gameId,
    host: input.host,
    wagerWei: input.wagerWei,
    opponentMode: input.opponentMode ?? "human",
  });
}

export async function autoMatchHuman(input: {
  gameId: string;
  player: GamePlayer;
  wagerWei: string;
}) {
  return roomRequest("/api/matchmaking/human", {
    gameId: input.gameId,
    player: input.player,
    wagerWei: input.wagerWei,
  });
}

export async function joinRoom(roomId: string, player: GamePlayer) {
  return roomRequest(`/api/rooms/${encodeURIComponent(roomId)}/join`, { player });
}

export async function startRoom(roomId: string) {
  return roomRequest(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});
}

export async function cancelRoom(roomId: string, playerId: string) {
  return roomRequest(`/api/rooms/${encodeURIComponent(roomId)}/cancel`, { playerId });
}

export async function playRoomMove(roomId: string, playerId: string, move: unknown) {
  return roomRequest(`/api/rooms/${encodeURIComponent(roomId)}/move`, { playerId, move });
}

export async function playAgentMove(roomId: string) {
  return roomRequest(`/api/rooms/${encodeURIComponent(roomId)}/agent-move`, {});
}

export async function getRoom(roomId: string) {
  return roomRequest(`/api/rooms/${encodeURIComponent(roomId)}`);
}

async function roomRequest(path: string, body?: unknown) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = (await response.json()) as RoomResponse;
  if (!response.ok || !payload.ok || !payload.room) {
    throw new Error(payload.error ?? `room request failed with ${response.status}`);
  }
  return payload.room;
}
