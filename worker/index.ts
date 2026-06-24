import {
  applyRoomMove,
  cancelRoom,
  createRoom,
  getRoomView,
  joinRoom,
  RoomRuntimeError,
  startRoom,
  type ArcadeRoomState,
  type AgentMoveProof,
} from "./game-runtime";
import { normalizeConfidence, parseAgentMoveContent } from "./agent-move-output";
import { gameAdapters } from "../src/lib/game-adapters";
import type { GamePlayer } from "../src/lib/game-pack";
import { stableHash } from "../src/lib/hash";

type Env = {
  ASSETS: { fetch(request: Request): Promise<Response> };
  ARCADE_DB: {
    prepare(sql: string): {
      bind(...values: unknown[]): {
        run(): Promise<unknown>;
        first<T = unknown>(): Promise<T | null>;
        all<T = unknown>(): Promise<{ results: T[] }>;
      };
      all<T = unknown>(): Promise<{ results: T[] }>;
    };
  };
  ACTIVE_GAME_REGISTRY: {
    get(key: string): Promise<string | null>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
  GAME_PACK_BUCKET: {
    put(key: string, value: string | ArrayBuffer): Promise<unknown>;
  };
  LIVE_ROOMS: DurableObjectNamespace;
  OG_GALILEO_CHAIN_ID: string;
  OG_CHAIN_STATUS: string;
  OG_STORAGE_STATUS: string;
  OG_COMPUTE_STATUS: string;
  OG_DA_STATUS: string;
  ZEROG_ROUTER_API_KEY?: string;
  ZEROG_COMPUTE_ROUTER?: string;
  ZEROG_COMPUTE_MODEL?: string;
};

export class ArcadeRoom {
  private state: DurableObjectState;
  private env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);
    try {
      if (request.method === "POST" && url.pathname.endsWith("/init")) {
        const input = await readJson<Record<string, unknown>>(request);
        const existing = await this.getRoom();
        if (existing) return json({ ok: false, error: "room already exists", room: getRoomView(existing) }, 409);
        const room = createRoom({
          roomId: String(input.roomId ?? ""),
          gameId: typeof input.gameId === "string" ? input.gameId : undefined,
          seed: typeof input.seed === "string" ? input.seed : undefined,
          opponentMode: input.opponentMode === "agent" ? "agent" : "human",
          wagerWei: typeof input.wagerWei === "string" ? input.wagerWei : undefined,
          host: input.host as never,
        });
        await this.putRoom(room);
        await upsertMatchIndex(this.env, room);
        return json({ ok: true, room: getRoomView(room) });
      }

      if (request.method === "POST" && url.pathname.endsWith("/join")) {
        const room = await this.requireRoom();
        const input = await readJson<Record<string, unknown>>(request);
        await ensureAgentCanJoinRoom(this.env, room, input.player);
        const next = joinRoom(room, { player: input.player as never });
        await this.putRoom(next);
        await upsertMatchIndex(this.env, next);
        return json({ ok: true, room: getRoomView(next) });
      }

      if (request.method === "POST" && url.pathname.endsWith("/start")) {
        const room = await this.requireRoom();
        await ensureWagerEscrowFunded(room);
        const next = startRoom(room);
        await this.putRoom(next);
        await upsertMatchIndex(this.env, next);
        return json({ ok: true, room: getRoomView(next) });
      }

      if (request.method === "POST" && url.pathname.endsWith("/cancel")) {
        const room = await this.requireRoom();
        const input = await readJson<Record<string, unknown>>(request);
        const next = cancelRoom(room, { playerId: String(input.playerId ?? "") });
        await this.putRoom(next);
        await upsertMatchIndex(this.env, next);
        return json({ ok: true, room: getRoomView(next) });
      }

      if (request.method === "POST" && url.pathname.endsWith("/agent-move")) {
        const room = await this.requireRoom();
        const agentMove = await chooseAgentMove(room, this.env);
        const playerId = getRoomView(room).currentPlayerIds[0] ?? "";
        const moved = applyRoomMove(room, { playerId, move: agentMove.move });
        const proof: AgentMoveProof = {
          turn: moved.replay?.moves.at(-1)?.turn ?? (room.replay?.moves.length ?? 0),
          playerId,
          mode: agentMove.computeMode,
          provider: agentMove.provider,
          requestId: agentMove.requestId,
          verified: agentMove.verified,
          model: agentMove.model,
          contentHash: agentMove.contentHash,
          fallbackReason: agentMove.fallbackReason,
        };
        const next: ArcadeRoomState = {
          ...moved,
          computeMode: agentMove.computeMode,
          computeProofs: [...(room.computeProofs ?? []), proof],
        };
        await this.putRoom(next);
        await persistRoomMove(this.env, room, next, proof);
        if (!room.result && next.result) {
          await persistTerminalRoom(this.env, next);
        } else {
          await upsertMatchIndex(this.env, next);
        }
        return json({
          ok: true,
          room: getRoomView(next),
          agentMove: {
            move: agentMove.move,
            confidence: agentMove.confidence,
            reasoningSummary: agentMove.reasoningSummary,
            risk: "low",
            computeMode: agentMove.computeMode,
            provider: agentMove.provider,
            requestId: agentMove.requestId,
            fallbackReason: agentMove.fallbackReason,
          },
        });
      }

      if (request.method === "POST" && url.pathname.endsWith("/move")) {
        const room = await this.requireRoom();
        if (!room.state) {
          await ensureWagerEscrowFunded(room);
        }
        const input = await readJson<Record<string, unknown>>(request);
        const playerId = String(input.playerId ?? "");
        const moved = applyRoomMove(room, {
          playerId,
          move: input.move as never,
        });
        const proof = parseExternalComputeProof(room, moved, playerId, input.computeProof);
        const next: ArcadeRoomState = proof
          ? {
              ...moved,
              computeMode: "0g-compute",
              computeProofs: [...(room.computeProofs ?? []), proof],
            }
          : moved;
        await this.putRoom(next);
        await persistRoomMove(this.env, room, next, proof);
        if (!room.result && next.result) {
          await persistTerminalRoom(this.env, next);
        } else {
          await upsertMatchIndex(this.env, next);
        }
        return json({ ok: true, room: getRoomView(next) });
      }

      if (request.method === "GET") {
        const room = await this.requireRoom();
        return json({ ok: true, room: getRoomView(room) });
      }

      return json({ ok: false, error: "method not allowed" }, 405);
    } catch (error) {
      if (error instanceof RoomRuntimeError) {
        return json({ ok: false, error: error.message }, error.status);
      }
      return json({ ok: false, error: error instanceof Error ? error.message : "unknown room error" }, 500);
    }
  }

  private async getRoom() {
    return ((await this.state.storage.get("room")) as ArcadeRoomState | undefined) ?? null;
  }

  private async requireRoom() {
    const room = await this.getRoom();
    if (!room) throw new RoomRuntimeError("room not found", 404);
    return room;
  }

  private async putRoom(room: ArcadeRoomState) {
    await this.state.storage.put("room", room);
  }
}

const galileoRpcUrl = "https://evmrpc-testnet.0g.ai";
const wagerEscrowAddress = "0xd58960a15e1036efde2ca873716396c0f47031d4";
const escrowedSelector = "0x34918bde";
const allGamesKey = "__all__";

async function ensureWagerEscrowFunded(room: ArcadeRoomState) {
  if (room.wagerWei === "0") return;
  if (room.players.length !== 2) return;
  const required = BigInt(room.wagerWei) * BigInt(room.players.length);
  const escrowed = await readEscrowedWager(room.roomId);
  if (escrowed < required) {
    throw new RoomRuntimeError(
      `wager escrow not fully funded: ${escrowed.toString()} of ${required.toString()} wei`,
      409,
    );
  }
}

async function readEscrowedWager(roomId: string) {
  const matchId = BigInt(stableHash(`wager:${roomId}`));
  const response = await fetch(galileoRpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [
        {
          to: wagerEscrowAddress,
          data: `${escrowedSelector}${uint256(matchId)}`,
        },
        "latest",
      ],
    }),
  });
  const payload = (await response.json()) as { result?: string; error?: { message?: string } };
  if (!payload.result) {
    throw new RoomRuntimeError(payload.error?.message ?? "could not verify wager escrow funding", 502);
  }
  return BigInt(payload.result);
}

function uint256(value: bigint) {
  return value.toString(16).padStart(64, "0");
}

type AgentMoveChoice = {
  move: unknown;
  confidence: number;
  reasoningSummary: string;
  computeMode: "0g-compute" | "deterministic-fallback";
  provider: string | null;
  requestId: string | null;
  verified: boolean;
  model: string | null;
  contentHash: string | null;
  fallbackReason: string | null;
};

export async function chooseAgentMove(room: ArcadeRoomState, env: Env): Promise<AgentMoveChoice> {
  assertAgentTurn(room);
  const adapter = adapterFor(room.gameId);
  const fallback = (reason: string): AgentMoveChoice => ({
    move: chooseDeterministicAgentMove(room, adapter),
    confidence: 0.62,
    reasoningSummary: `Deterministic fallback selected a legal ${room.gameId} move.`,
    computeMode: "deterministic-fallback",
    provider: null,
    requestId: null,
    verified: false,
    model: null,
    contentHash: null,
    fallbackReason: reason,
  });

  if (!env.ZEROG_ROUTER_API_KEY) return fallback("ZEROG_ROUTER_API_KEY is not configured in the Worker environment.");

  const router = env.ZEROG_COMPUTE_ROUTER || "https://router-api-testnet.integratenetwork.work/v1";
  const model = env.ZEROG_COMPUTE_MODEL || "qwen2.5-omni";
  const view = getRoomView(room);
  const currentPlayerId = view.currentPlayerIds[0] ?? "";
  const playerView = room.state ? adapter.getPlayerView(room.state, currentPlayerId) : null;
  const prompt = [
    `You are playing ${adapter.manifest.name} in 0G Arcade Arena.`,
    "Choose exactly one legal move for the current agent player.",
    "The move MUST exactly match one entry from legalMoves.",
    "Return only JSON with this shape:",
    '{"move":{},"confidence":0.7,"reasoningSummary":"short reason"}',
    "Do not include markdown or hidden reasoning.",
    JSON.stringify({
      gameId: room.gameId,
      manifest: {
        gameType: adapter.manifest.gameType,
        turnType: adapter.manifest.turnType,
        hiddenInformation: adapter.manifest.hiddenInformation,
        randomness: adapter.manifest.randomness,
      },
      playerId: currentPlayerId,
      legalMoves: view.legalMoves,
      playerView,
      players: room.players.map((player) => ({
        id: player.id,
        kind: player.kind,
        displayName: player.displayName,
      })),
    }),
  ].join("\n");

  try {
    const response = await fetch(`${router}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.ZEROG_ROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0,
        max_tokens: 160,
        verify_tee: true,
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
    const raw = await response.text();
    const errorPreview = raw.slice(0, 160);
    let payload: ComputeChatResponse | null = null;
    try {
      payload = JSON.parse(raw) as ComputeChatResponse;
    } catch {
      payload = null;
    }
    if (!response.ok) {
      return fallback(payload?.error?.message ?? (errorPreview || `0G Compute returned ${response.status}.`));
    }
    const content = payload?.choices?.[0]?.message?.content ?? "";
    const parsed = parseAgentMoveContent(content);
    const validation = room.state ? adapter.validateMove(room.state, currentPlayerId, parsed.move) : { ok: false };
    if (!validation.ok) {
      return fallback(`0G Compute returned an illegal move: ${JSON.stringify(parsed.move)}.`);
    }
    return {
      move: parsed.move,
      confidence: normalizeConfidence(parsed.confidence),
      reasoningSummary: parsed.reasoningSummary || "0G Compute selected a legal Grid Four move.",
      computeMode: "0g-compute",
      provider: payload?.x_0g_trace?.provider ?? null,
      requestId: payload?.x_0g_trace?.request_id ?? null,
      verified: payload?.x_0g_trace?.tee_verified === true,
      model,
      contentHash: stableHash(content),
      fallbackReason: null,
    };
  } catch (error) {
    return fallback(error instanceof Error ? error.message : "0G Compute request failed.");
  }
}

type ComputeChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
  x_0g_trace?: {
    provider?: string;
    request_id?: string;
    tee_verified?: boolean;
  };
};

function assertAgentTurn(room: ArcadeRoomState) {
  const view = getRoomView(room);
  const currentPlayerId = view.currentPlayerIds[0];
  const currentPlayer = room.players.find((player) => player.id === currentPlayerId);
  if (!currentPlayer || currentPlayer.kind !== "agent") {
    throw new RoomRuntimeError("current player is not an agent", 409);
  }
}

function chooseDeterministicAgentMove(room: ArcadeRoomState, adapter = adapterFor(room.gameId)) {
  assertAgentTurn(room);
  const view = getRoomView(room);
  const legalMoves = view.legalMoves;
  if (!legalMoves.length) throw new RoomRuntimeError("agent has no legal moves", 409);
  if (room.gameId === "grid-four") {
    return [...(legalMoves as Array<{ column: number }>)].sort((a, b) => Math.abs(a.column - 3) - Math.abs(b.column - 3))[0];
  }
  return [...legalMoves].sort((a, b) => JSON.stringify(b).length - JSON.stringify(a).length)[0];
}

export function parseExternalComputeProof(
  room: ArcadeRoomState,
  moved: ArcadeRoomState,
  playerId: string,
  proofInput: unknown,
): AgentMoveProof | undefined {
  if (!proofInput || typeof proofInput !== "object") return undefined;
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (player?.kind !== "agent") {
    throw new RoomRuntimeError("external compute proof can only be attached to agent moves", 400);
  }

  const proof = proofInput as Record<string, unknown>;
  if (proof.mode !== "0g-compute") {
    throw new RoomRuntimeError("external compute proof mode must be 0g-compute", 400);
  }

  const provider = stringOrNull(proof.provider);
  const model = stringOrNull(proof.model);
  const contentHash = stringOrNull(proof.contentHash);
  if (!provider || !model || !contentHash) {
    throw new RoomRuntimeError("external compute proof requires provider, model, and contentHash", 400);
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(provider)) {
    throw new RoomRuntimeError("external compute proof provider must be an address", 400);
  }
  if (!/^sha256:[a-fA-F0-9]{64}$/.test(contentHash) && !/^0x[a-fA-F0-9]{8,64}$/.test(contentHash)) {
    throw new RoomRuntimeError("external compute proof contentHash has invalid format", 400);
  }

  return {
    turn: moved.replay?.moves.at(-1)?.turn ?? (room.replay?.moves.length ?? 0),
    playerId,
    mode: "0g-compute",
    provider,
    requestId: stringOrNull(proof.requestId),
    verified: proof.verified === true,
    model,
    contentHash,
    fallbackReason: null,
  };
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function adapterFor(gameId: string) {
  const adapter = gameAdapters.find((candidate) => candidate.id === gameId);
  if (!adapter) throw new RoomRuntimeError(`unsupported game: ${gameId}`, 400);
  return adapter;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/status") {
      return Response.json({
        chainId: env.OG_GALILEO_CHAIN_ID,
        chain: env.OG_CHAIN_STATUS,
        storage: env.OG_STORAGE_STATUS,
        compute: env.OG_COMPUTE_STATUS,
        da: env.OG_DA_STATUS,
      });
    }

    if (url.pathname === "/api/leaderboard" && request.method === "GET") {
      const scope = url.searchParams.get("scope") ?? "global";
      const mode = url.searchParams.get("mode") ?? "all";
      const gameId = url.searchParams.get("gameId");
      const rows = await env.ARCADE_DB.prepare(
        `SELECT * FROM leaderboard_entries
         WHERE scope = ? AND mode = ? AND game_id = ?
         ORDER BY score DESC, wins DESC, updated_at DESC
         LIMIT 50`,
      )
        .bind(scope, mode, gameId ?? allGamesKey)
        .all<LeaderboardRow>();
      return json({ ok: true, entries: rows.results.map(leaderboardFromRow) });
    }

    if (url.pathname === "/api/proofs" && request.method === "GET") {
      const rows = await env.ARCADE_DB.prepare(
        `SELECT
            m.id, m.game_id, m.mode, m.room_id, m.opponent_mode, m.wager_wei, m.status,
            m.player_a, m.player_b, m.winner_id, m.replay_hash, m.result_hash,
            m.storage_uri, m.chain_tx, m.compute_mode, m.storage_mode, m.chain_mode, m.da_mode,
            p.storage_root, p.settlement_tx, p.compute_proof_json, m.created_at
         FROM matches m
         LEFT JOIN match_proofs p ON p.match_id = m.id
         ORDER BY m.created_at DESC
         LIMIT 50`,
      ).all<ProofRow>();
      return json({ ok: true, proofs: rows.results.map(proofFromRow) });
    }

    if (url.pathname.startsWith("/api/proofs/") && request.method === "GET") {
      const matchId = decodeURIComponent(url.pathname.split("/")[3] ?? "");
      const row = await env.ARCADE_DB.prepare(
        `SELECT
            m.id, m.game_id, m.mode, m.room_id, m.opponent_mode, m.wager_wei, m.status,
            m.player_a, m.player_b, m.winner_id, m.replay_hash, m.result_hash,
            m.storage_uri, m.chain_tx, m.compute_mode, m.storage_mode, m.chain_mode, m.da_mode,
            p.storage_root, p.settlement_tx, p.compute_proof_json, m.created_at
         FROM matches m
         LEFT JOIN match_proofs p ON p.match_id = m.id
         WHERE m.id = ?`,
      )
        .bind(matchId)
        .first<ProofRow>();
      if (!row) return json({ ok: false, error: "proof not found" }, 404);
      return json({ ok: true, proof: proofFromRow(row) });
    }

    if (url.pathname === "/api/agents" && request.method === "POST") {
      try {
        const input = await readJson<Record<string, unknown>>(request);
        const agent = normalizeAgentRegistration(input);
        await ensureAgentAvatarColumn(env);
        await env.ARCADE_DB.prepare(
          `INSERT OR REPLACE INTO agents
            (id, owner_wallet, display_name, avatar_url, supported_games, bankroll_policy, status, free_enabled, wager_enabled, max_wager_wei, endpoint_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            agent.agentId,
            agent.ownerWallet,
            agent.displayName,
            agent.avatarUrl,
            JSON.stringify(agent.supportedGames),
            agent.bankrollPolicy,
            agent.status,
            agent.freeEnabled ? 1 : 0,
            agent.wagerEnabled ? 1 : 0,
            agent.maxWagerWei,
            agent.endpointUrl,
          )
          .run();
        return json({ ok: true, agent }, 201);
      } catch (error) {
        if (error instanceof RoomRuntimeError) return json({ ok: false, error: error.message }, error.status);
        return json({ ok: false, error: error instanceof Error ? error.message : "could not register agent" }, 500);
      }
    }

    if (url.pathname === "/api/agents" && request.method === "GET") {
      const gameId = url.searchParams.get("gameId");
      const wagerWei = url.searchParams.get("wagerWei") ?? "0";
      const rows = await env.ARCADE_DB.prepare("SELECT * FROM agents WHERE status = 'qualified' ORDER BY created_at DESC").all<AgentRow>();
      const agents = rows.results.map(agentFromRow).filter((agent) => agentQualifies(agent, gameId, wagerWei));
      return json({ ok: true, agents });
    }

    if (url.pathname.startsWith("/api/agents/") && request.method === "GET") {
      const agentId = normalizeAgentId(url.pathname.split("/")[3] ?? "");
      const row = await env.ARCADE_DB.prepare("SELECT * FROM agents WHERE id = ?").bind(agentId).first<AgentRow>();
      if (!row) return json({ ok: false, error: "agent not found" }, 404);
      return json({ ok: true, agent: agentFromRow(row) });
    }

    if (url.pathname === "/api/matchmaking/human" && request.method === "POST") {
      try {
        const input = await readJson<Record<string, unknown>>(request);
        const result = await matchmakeHuman(env, request.url, input);
        return json({ ok: true, ...result });
      } catch (error) {
        if (error instanceof RoomRuntimeError) return json({ ok: false, error: error.message }, error.status);
        return json({ ok: false, error: error instanceof Error ? error.message : "could not match human players" }, 500);
      }
    }

    if (url.pathname === "/api/rooms" && request.method === "POST") {
      const input = await readJson<Record<string, unknown>>(request);
      const roomId = normalizeRoomId(String(input.roomId ?? makeRoomCode()));
      const id = env.LIVE_ROOMS.idFromName(roomId);
      const roomUrl = new URL(request.url);
      roomUrl.pathname = `/api/rooms/${roomId}/init`;
      return env.LIVE_ROOMS.get(id).fetch(
        new Request(roomUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...input, roomId }),
        }),
      );
    }

    if (url.pathname.startsWith("/api/rooms/")) {
      const roomId = normalizeRoomId(url.pathname.split("/")[3] || "demo");
      const id = env.LIVE_ROOMS.idFromName(roomId);
      return env.LIVE_ROOMS.get(id).fetch(await cloneForDurableObject(request));
    }

    if (url.pathname === "/api/games") {
      const games = await env.ARCADE_DB.prepare("SELECT * FROM games ORDER BY created_at DESC").all();
      return Response.json(games.results);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html") ?? false;
    const isAppRoute = !url.pathname.split("/").pop()?.includes(".");
    if (assetResponse.status !== 404 || request.method !== "GET" || (!acceptsHtml && !isAppRoute)) {
      return assetResponse;
    }

    const appShellUrl = new URL(request.url);
    appShellUrl.pathname = "/";
    const appShellResponse = await env.ASSETS.fetch(new Request(appShellUrl, request));
    return new Response(appShellResponse.body, {
      status: 200,
      headers: appShellResponse.headers,
    });
  },
};

async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new RoomRuntimeError("request body must be valid JSON", 400);
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

function makeRoomCode() {
  return crypto.randomUUID().slice(0, 8);
}

function normalizeRoomId(roomId: string) {
  return roomId.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 32);
}

function normalizeWagerWei(input: unknown) {
  const wagerWei = String(input ?? "0").trim() || "0";
  if (!/^\d+$/.test(wagerWei)) throw new RoomRuntimeError("wagerWei must be a decimal wei string", 400);
  return wagerWei;
}

async function cloneForDurableObject(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return request;
  return new Request(request.url, {
    method: request.method,
    headers: { "content-type": request.headers.get("content-type") ?? "application/json" },
    body: await request.text(),
  });
}

type MatchmakingMode = "waiting" | "joined" | "started";

async function matchmakeHuman(env: Env, requestUrl: string, input: Record<string, unknown>) {
  const gameId = String(input.gameId ?? "grid-four").trim();
  if (gameId !== "grid-four") throw new RoomRuntimeError("only grid-four human auto-match is implemented for live E2E", 400);
  const wagerWei = normalizeWagerWei(input.wagerWei);
  const matchGroup = String(input.matchGroup ?? "default")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .slice(0, 48);
  const player = input.player as Partial<GamePlayer> | null;
  if (!player || player.kind !== "human") throw new RoomRuntimeError("human player is required", 400);

  const queueKey = `matchmaking:human:${gameId}:${wagerWei}:${matchGroup || "default"}`;
  const waitingRoomId = await env.ACTIVE_GAME_REGISTRY.get(queueKey);
  if (waitingRoomId) {
    const waitingRoom = await fetchRoomById(env, requestUrl, waitingRoomId);
    if (waitingRoom?.status === "waiting" && waitingRoom.players.length === 1) {
      if (waitingRoom.players[0]?.id === player.id) {
        return { matchmaking: "waiting" as MatchmakingMode, queueKey, room: waitingRoom };
      }
      const joined = await joinRoomById(env, requestUrl, waitingRoomId, player as GamePlayer);
      await env.ACTIVE_GAME_REGISTRY.delete(queueKey);
      if (wagerWei !== "0") return { matchmaking: "joined" as MatchmakingMode, queueKey, room: joined };
      const started = await startRoomById(env, requestUrl, waitingRoomId);
      return { matchmaking: "started" as MatchmakingMode, queueKey, room: started };
    }
    await env.ACTIVE_GAME_REGISTRY.delete(queueKey);
  }

  const roomId = normalizeRoomId(`auto-${makeRoomCode()}`);
  const room = await createRoomById(env, requestUrl, {
    roomId,
    gameId,
    opponentMode: "human",
    wagerWei,
    host: player,
  });
  await env.ACTIVE_GAME_REGISTRY.put(queueKey, room.roomId);
  return { matchmaking: "waiting" as MatchmakingMode, queueKey, room };
}

async function createRoomById(env: Env, requestUrl: string, body: Record<string, unknown>) {
  const roomId = normalizeRoomId(String(body.roomId ?? makeRoomCode()));
  const id = env.LIVE_ROOMS.idFromName(roomId);
  const roomUrl = new URL(requestUrl);
  roomUrl.pathname = `/api/rooms/${roomId}/init`;
  const response = await env.LIVE_ROOMS.get(id).fetch(
    new Request(roomUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...body, roomId }),
    }),
  );
  return readRoomResponse(response);
}

async function fetchRoomById(env: Env, requestUrl: string, roomId: string) {
  const normalized = normalizeRoomId(roomId);
  const id = env.LIVE_ROOMS.idFromName(normalized);
  const roomUrl = new URL(requestUrl);
  roomUrl.pathname = `/api/rooms/${normalized}`;
  const response = await env.LIVE_ROOMS.get(id).fetch(new Request(roomUrl, { method: "GET" }));
  if (response.status === 404) return null;
  return readRoomResponse(response);
}

async function joinRoomById(env: Env, requestUrl: string, roomId: string, player: GamePlayer) {
  const normalized = normalizeRoomId(roomId);
  const id = env.LIVE_ROOMS.idFromName(normalized);
  const roomUrl = new URL(requestUrl);
  roomUrl.pathname = `/api/rooms/${normalized}/join`;
  const response = await env.LIVE_ROOMS.get(id).fetch(
    new Request(roomUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ player }),
    }),
  );
  return readRoomResponse(response);
}

async function startRoomById(env: Env, requestUrl: string, roomId: string) {
  const normalized = normalizeRoomId(roomId);
  const id = env.LIVE_ROOMS.idFromName(normalized);
  const roomUrl = new URL(requestUrl);
  roomUrl.pathname = `/api/rooms/${normalized}/start`;
  const response = await env.LIVE_ROOMS.get(id).fetch(
    new Request(roomUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    }),
  );
  return readRoomResponse(response);
}

async function readRoomResponse(response: Response) {
  const payload = (await response.json()) as { ok?: boolean; room?: ReturnType<typeof getRoomView>; error?: string };
  if (!response.ok || !payload.ok || !payload.room) {
    throw new RoomRuntimeError(payload.error ?? `room request failed with ${response.status}`, response.status);
  }
  return payload.room;
}

type RegisteredAgent = {
  agentId: string;
  ownerWallet: string;
  displayName: string;
  avatarUrl: string;
  supportedGames: string[];
  bankrollPolicy: string;
  status: "pending" | "qualified" | "disabled";
  freeEnabled: boolean;
  wagerEnabled: boolean;
  maxWagerWei: string;
  endpointUrl: string | null;
};

type AgentRow = {
  id: string;
  owner_wallet: string;
  display_name: string;
  avatar_url?: string | null;
  supported_games: string;
  bankroll_policy: string;
  status: "pending" | "qualified" | "disabled";
  free_enabled: number;
  wager_enabled: number;
  max_wager_wei: string;
  endpoint_url: string | null;
};

function normalizeAgentRegistration(input: Record<string, unknown>): RegisteredAgent {
  const agentId = normalizeAgentId(String(input.agentId ?? input.id ?? ""));
  const ownerWallet = String(input.ownerWallet ?? "").trim();
  const displayName = String(input.displayName ?? "").trim();
  const supportedGames = Array.isArray(input.supportedGames)
    ? input.supportedGames.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const maxWagerWei = String(input.maxWagerWei ?? "0").trim();
  if (!agentId) throw new RoomRuntimeError("agentId is required", 400);
  if (!/^0x[a-fA-F0-9]{40}$/.test(ownerWallet)) throw new RoomRuntimeError("ownerWallet must be an EVM address", 400);
  if (displayName.length < 2) throw new RoomRuntimeError("displayName is required", 400);
  if (!supportedGames.length) throw new RoomRuntimeError("supportedGames is required", 400);
  if (!supportedGames.every((game) => /^[a-z0-9-]+$/.test(game))) {
    throw new RoomRuntimeError("supportedGames must contain game slugs", 400);
  }
  if (!/^\d+$/.test(maxWagerWei)) throw new RoomRuntimeError("maxWagerWei must be a decimal wei string", 400);
  const status = input.status === "qualified" || input.status === "disabled" ? input.status : "pending";
  return {
    agentId,
    ownerWallet,
    displayName,
    avatarUrl: normalizeAgentAvatarUrl(input.avatarUrl, agentId),
    supportedGames,
    bankrollPolicy: String(input.bankrollPolicy ?? "testnet only").trim() || "testnet only",
    status,
    freeEnabled: input.freeEnabled !== false,
    wagerEnabled: input.wagerEnabled === true,
    maxWagerWei,
    endpointUrl: typeof input.endpointUrl === "string" && input.endpointUrl.trim() ? input.endpointUrl.trim() : null,
  };
}

function normalizeAgentId(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 64);
}

function normalizeAgentAvatarUrl(input: unknown, agentId: string) {
  const raw = typeof input === "string" ? input.trim() : "";
  if (/^https:\/\/[^\s<>"]{1,240}$/i.test(raw)) return raw;
  if (/^data:image\/svg\+xml,[^\s<>"]{1,1800}$/i.test(raw)) return raw;
  return generatedAgentAvatar(agentId);
}

function generatedAgentAvatar(agentId: string) {
  const palette = ["46ff9f", "57e2ff", "ffe66d", "ff8a8a"];
  let hash = 0;
  for (const char of agentId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const primary = palette[hash % palette.length];
  const secondary = palette[(hash >>> 3) % palette.length];
  const initials = agentId
    .split("-")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "0G";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" role="img"><rect width="240" height="240" rx="48" fill="#080b0e"/><circle cx="120" cy="108" r="70" fill="#${primary}"/><path d="M64 178c24-38 88-38 112 0" fill="#${secondary}"/><text x="120" y="128" text-anchor="middle" font-family="Arial,sans-serif" font-size="54" font-weight="900" fill="#080b0e">${initials}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function agentFromRow(row: AgentRow): RegisteredAgent {
  let supportedGames: string[] = [];
  try {
    supportedGames = JSON.parse(row.supported_games);
  } catch {
    supportedGames = [];
  }
  return {
    agentId: row.id,
    ownerWallet: row.owner_wallet,
    displayName: row.display_name,
    avatarUrl: normalizeAgentAvatarUrl(row.avatar_url, row.id),
    supportedGames,
    bankrollPolicy: row.bankroll_policy,
    status: row.status,
    freeEnabled: row.free_enabled === 1,
    wagerEnabled: row.wager_enabled === 1,
    maxWagerWei: row.max_wager_wei,
    endpointUrl: row.endpoint_url,
  };
}

async function ensureAgentAvatarColumn(env: Env) {
  try {
    await env.ARCADE_DB.prepare("ALTER TABLE agents ADD COLUMN avatar_url TEXT").run();
  } catch {
    // Existing D1 databases may already have the column; SQLite reports that as an error.
  }
}

function agentQualifies(agent: RegisteredAgent, gameId: string | null, wagerWei: string) {
  if (gameId && !agent.supportedGames.includes(gameId)) return false;
  if (wagerWei === "0") return agent.freeEnabled;
  if (!/^\d+$/.test(wagerWei)) return false;
  return agent.wagerEnabled && BigInt(agent.maxWagerWei) >= BigInt(wagerWei);
}

async function ensureAgentCanJoinRoom(env: Env, room: ArcadeRoomState, playerInput: unknown) {
  const player = playerInput as Partial<GamePlayer> | null;
  if (!player || player.kind !== "agent") return;

  const agentId = normalizeAgentId(String(player.agentId ?? player.id ?? ""));
  if (!agentId) throw new RoomRuntimeError("agentId is required for agent rooms", 400);

  const row = await env.ARCADE_DB.prepare("SELECT * FROM agents WHERE id = ?").bind(agentId).first<AgentRow>();
  if (!row) throw new RoomRuntimeError("agent is not registered", 404);

  const agent = agentFromRow(row);
  if (agent.status !== "qualified") throw new RoomRuntimeError("agent is not qualified", 403);
  if (!agent.supportedGames.includes(room.gameId)) {
    throw new RoomRuntimeError("agent is not qualified for this game", 403);
  }
  if (room.wagerWei === "0") {
    if (!agent.freeEnabled) throw new RoomRuntimeError("agent is not enabled for free matches", 403);
    return;
  }
  if (!/^\d+$/.test(room.wagerWei)) throw new RoomRuntimeError("room wager is invalid", 400);
  if (!agent.wagerEnabled) throw new RoomRuntimeError("agent is not enabled for wager matches", 403);
  if (!/^\d+$/.test(agent.maxWagerWei) || BigInt(agent.maxWagerWei) < BigInt(room.wagerWei)) {
    throw new RoomRuntimeError("agent max wager is below this room wager", 403);
  }
}

async function upsertMatchIndex(env: Env, room: ArcadeRoomState) {
  await ensureGameMirror(env, room.gameId);
  await env.ARCADE_DB.prepare(
    `INSERT INTO matches
      (id, game_id, mode, room_id, opponent_mode, wager_wei, status, seed, player_a, player_b, winner_id,
       replay_hash, result_hash, storage_uri, chain_tx, compute_mode, storage_mode, chain_mode, da_mode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       status = excluded.status,
       player_a = excluded.player_a,
       player_b = excluded.player_b,
       winner_id = excluded.winner_id,
       replay_hash = excluded.replay_hash,
       result_hash = excluded.result_hash,
       storage_uri = excluded.storage_uri,
       chain_tx = excluded.chain_tx,
       compute_mode = excluded.compute_mode,
       storage_mode = excluded.storage_mode,
       chain_mode = excluded.chain_mode,
       da_mode = excluded.da_mode`,
  )
    .bind(
      room.matchId,
      room.gameId,
      room.wagerWei === "0" ? "free" : "wager",
      room.roomId,
      room.opponentMode,
      room.wagerWei,
      room.status,
      room.seed,
      room.players[0]?.id ?? null,
      room.players[1]?.id ?? null,
      room.result?.winnerIds[0] ?? null,
      room.replay ? getRoomView(room).replayHash : null,
      room.result ? getRoomView(room).resultHash : null,
      room.replay ? `local://rooms/${room.roomId}/replay` : null,
      null,
      room.computeMode ?? "deterministic-fallback",
      "local-fallback",
      "local-mock",
      "not-configured",
    )
    .run();
}

async function ensureGameMirror(env: Env, gameId: string) {
  await env.ARCADE_DB.prepare(
    `INSERT OR IGNORE INTO games (id, name, version, manifest_hash, rules_hash, storage_uri)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      gameId,
      gameId === "grid-four" ? "Grid Four" : gameId,
      "1.0.0",
      stableHash(`${gameId}:manifest`),
      stableHash(`${gameId}:rules`),
      `local://game-packs/${gameId}`,
    )
    .run();
}

async function persistRoomMove(
  env: Env,
  before: ArcadeRoomState,
  after: ArcadeRoomState,
  computeProof?: AgentMoveProof,
) {
  const beforeCount = before.replay?.moves.length ?? 0;
  const move = after.replay?.moves.at(-1);
  if (!move || (after.replay?.moves.length ?? 0) <= beforeCount) return;
  await env.ARCADE_DB.prepare(
    `INSERT INTO moves (match_id, turn, player_id, move_json, state_hash, compute_provider, compute_chat_id, compute_verified)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      after.matchId,
      move.turn,
      move.playerId,
      JSON.stringify(move.move),
      move.stateHash,
      computeProof?.provider ?? null,
      computeProof?.requestId ?? null,
      computeProof?.verified ? 1 : 0,
    )
    .run();
}

async function persistTerminalRoom(env: Env, room: ArcadeRoomState) {
  await upsertMatchIndex(env, room);
  const view = getRoomView(room);
  await env.ARCADE_DB.prepare(
    `INSERT OR REPLACE INTO match_proofs
      (match_id, replay_hash, result_hash, storage_root, storage_uri, chain_tx, settlement_tx, compute_proof_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      room.matchId,
      view.replayHash,
      view.resultHash,
      null,
      `local://rooms/${room.roomId}/replay`,
      null,
      null,
      JSON.stringify({
        mode: room.computeMode ?? "deterministic-fallback",
        proofs: room.computeProofs ?? [],
        reason:
          room.computeMode === "0g-compute"
            ? "At least one agent move was selected through 0G Compute."
            : "No live 0G Compute move was used for this room.",
      }),
    )
    .run();
  await updateLeaderboards(env, room);
}

async function updateLeaderboards(env: Env, room: ArcadeRoomState) {
  if (!room.result) return;
  const mode = room.wagerWei === "0" ? "free" : "wager";
  for (const player of room.players) {
    const isWinner = room.result.winnerIds.includes(player.id);
    const isLoser = room.result.loserIds.includes(player.id);
    const delta = room.result.draw ? 1 : isWinner ? (mode === "wager" ? 18 : 12) : isLoser ? -6 : 0;
    const rows = [
      { scope: "global", gameId: allGamesKey, mode: "all" },
      { scope: "game", gameId: room.gameId, mode: "all" },
      { scope: "mode", gameId: allGamesKey, mode },
      { scope: "game-mode", gameId: room.gameId, mode },
    ];
    for (const row of rows) {
      await upsertLeaderboardEntry(env, {
        ...row,
        participantId: player.id,
        participantKind: player.kind,
        displayName: player.displayName,
        win: isWinner && !room.result.draw,
        loss: isLoser && !room.result.draw,
        draw: room.result.draw,
        wagerWin: mode === "wager" && isWinner && !room.result.draw,
        delta,
      });
    }
  }
}

async function upsertLeaderboardEntry(
  env: Env,
  input: {
    scope: string;
    gameId: string;
    mode: string;
    participantId: string;
    participantKind: string;
    displayName: string;
    win: boolean;
    loss: boolean;
    draw: boolean;
    wagerWin: boolean;
    delta: number;
  },
) {
  await env.ARCADE_DB.prepare(
    `INSERT INTO leaderboard_entries
      (scope, game_id, mode, participant_id, participant_kind, display_name, wins, losses, draws, wager_wins, score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(scope, game_id, mode, participant_id) DO UPDATE SET
       display_name = excluded.display_name,
       wins = wins + excluded.wins,
       losses = losses + excluded.losses,
       draws = draws + excluded.draws,
       wager_wins = wager_wins + excluded.wager_wins,
       score = score + ?,
       updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(
      input.scope,
      input.gameId,
      input.mode,
      input.participantId,
      input.participantKind,
      input.displayName,
      input.win ? 1 : 0,
      input.loss ? 1 : 0,
      input.draw ? 1 : 0,
      input.wagerWin ? 1 : 0,
      1000 + input.delta,
      input.delta,
    )
    .run();
}

type ProofRow = {
  id: string;
  game_id: string;
  mode: string;
  room_id: string | null;
  opponent_mode: string;
  wager_wei: string;
  status: string;
  player_a: string | null;
  player_b: string | null;
  winner_id: string | null;
  replay_hash: string | null;
  result_hash: string | null;
  storage_uri: string | null;
  chain_tx: string | null;
  compute_mode: string;
  storage_mode: string;
  chain_mode: string;
  da_mode: string;
  storage_root: string | null;
  settlement_tx: string | null;
  compute_proof_json: string | null;
  created_at: string;
};

function proofFromRow(row: ProofRow) {
  return {
    matchId: row.id,
    gameId: row.game_id,
    mode: row.mode,
    roomId: row.room_id,
    opponentMode: row.opponent_mode,
    wagerWei: row.wager_wei,
    status: row.status,
    players: [row.player_a, row.player_b].filter(Boolean),
    winnerId: row.winner_id,
    replayHash: row.replay_hash,
    resultHash: row.result_hash,
    storageUri: row.storage_uri,
    storageRoot: row.storage_root,
    chainTx: row.chain_tx,
    settlementTx: row.settlement_tx,
    computeMode: row.compute_mode,
    storageMode: row.storage_mode,
    chainMode: row.chain_mode,
    daMode: row.da_mode,
    computeProof: row.compute_proof_json ? safeJson(row.compute_proof_json) : null,
    createdAt: row.created_at,
  };
}

type LeaderboardRow = {
  scope: string;
  game_id: string | null;
  mode: string;
  participant_id: string;
  participant_kind: string;
  display_name: string;
  wins: number;
  losses: number;
  draws: number;
  wager_wins: number;
  score: number;
  updated_at: string;
};

function leaderboardFromRow(row: LeaderboardRow) {
  return {
    scope: row.scope,
    gameId: row.game_id === allGamesKey ? null : row.game_id,
    mode: row.mode,
    participantId: row.participant_id,
    participantKind: row.participant_kind,
    displayName: row.display_name,
    wins: row.wins,
    losses: row.losses,
    draws: row.draws,
    wagerWins: row.wager_wins,
    score: row.score,
    updatedAt: row.updated_at,
  };
}

function safeJson(input: string) {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return input;
  }
}
