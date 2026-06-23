import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const runId = Date.now().toString(36);
const evidencePath = "evidence/live-proofs/multigame-room-api-2026-06-24.json";
const games = ["fleet-duel", "tile-race", "world-cup-draft"];
const ownerWallet = "0x0000000000000000000000000000000000004444";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: response.status, body };
}

function postJson(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

async function registerAgent(agentId, gameId) {
  return postJson("/api/agents", {
    agentId,
    ownerWallet,
    displayName: `Multi ${gameId} Agent`,
    supportedGames: [gameId],
    bankrollPolicy: "free multigame room proof only",
    status: "qualified",
    freeEnabled: true,
    wagerEnabled: false,
    maxWagerWei: "0",
  });
}

async function finishHumanRoom(gameId) {
  const roomId = `mg-${gameId}-${runId}`.replace(/[^a-z0-9-]/g, "-").slice(0, 32);
  const players = [
    { id: `human-a-${gameId}-${runId}`, kind: "human", displayName: "Human A", ownerWallet },
    { id: `human-b-${gameId}-${runId}`, kind: "human", displayName: "Human B", ownerWallet },
  ];
  const created = await postJson("/api/rooms", {
    roomId,
    gameId,
    opponentMode: "human",
    wagerWei: "0",
    host: players[0],
  });
  const joined = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/join`, { player: players[1] });
  const started = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});
  let latest = started.body?.room ?? null;
  const moves = [];
  for (let index = 0; index < 96 && latest?.status !== "finished"; index += 1) {
    const playerId = latest?.currentPlayerIds?.[0];
    const move = latest?.legalMoves?.[0];
    if (!playerId || !move) break;
    const result = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, { playerId, move });
    latest = result.body?.room ?? latest;
    moves.push({ status: result.status, playerId, move, roomStatus: latest?.status ?? null });
  }
  const proof = latest?.status === "finished" ? await request(`/api/proofs/match-${encodeURIComponent(roomId)}`) : null;
  return {
    gameId,
    roomId,
    kind: "human",
    created: { status: created.status, roomGameId: created.body?.room?.gameId ?? null },
    joined: { status: joined.status, roomStatus: joined.body?.room?.status ?? null },
    started: { status: started.status, roomStatus: started.body?.room?.status ?? null },
    moves: moves.length,
    final: {
      status: latest?.status ?? null,
      replayHash: latest?.replayHash ?? null,
      resultHash: latest?.resultHash ?? null,
      winnerIds: latest?.result?.winnerIds ?? [],
      reason: latest?.result?.reason ?? null,
    },
    proof: proof ? { status: proof.status, matchId: proof.body?.proof?.matchId ?? null, gameId: proof.body?.proof?.gameId ?? null } : null,
  };
}

async function finishAgentRoom(gameId) {
  const roomId = `mga-${gameId}-${runId}`.replace(/[^a-z0-9-]/g, "-").slice(0, 32);
  const agentId = `agent-${gameId}-${runId}`.replace(/[^a-z0-9-]/g, "-").slice(0, 48);
  const host = { id: `human-agent-${gameId}-${runId}`, kind: "human", displayName: "Human", ownerWallet };
  const registered = await registerAgent(agentId, gameId);
  const created = await postJson("/api/rooms", {
    roomId,
    gameId,
    opponentMode: "agent",
    wagerWei: "0",
    host,
  });
  const joined = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
    player: { id: agentId, kind: "agent", displayName: `Agent ${gameId}`, ownerWallet, agentId },
  });
  const started = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});
  let latest = started.body?.room ?? null;
  const moves = [];
  const agentMoves = [];
  for (let index = 0; index < 96 && latest?.status !== "finished"; index += 1) {
    const currentId = latest?.currentPlayerIds?.[0];
    const currentPlayer = latest?.players?.find((player) => player.id === currentId);
    let result;
    if (currentPlayer?.kind === "agent") {
      result = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/agent-move`, {});
      agentMoves.push({
        status: result.status,
        computeMode: result.body?.agentMove?.computeMode ?? null,
        fallbackReason: result.body?.agentMove?.fallbackReason ?? null,
      });
    } else {
      const move = latest?.legalMoves?.[0];
      if (!currentId || !move) break;
      result = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, { playerId: currentId, move });
    }
    latest = result.body?.room ?? latest;
    moves.push({ status: result.status, roomStatus: latest?.status ?? null });
  }
  const proof = latest?.status === "finished" ? await request(`/api/proofs/match-${encodeURIComponent(roomId)}`) : null;
  return {
    gameId,
    roomId,
    kind: "agent",
    registered: { status: registered.status, agentId: registered.body?.agent?.agentId ?? null },
    created: { status: created.status, roomGameId: created.body?.room?.gameId ?? null },
    joined: { status: joined.status, roomStatus: joined.body?.room?.status ?? null },
    started: { status: started.status, roomStatus: started.body?.room?.status ?? null },
    moves: moves.length,
    agentMoves,
    final: {
      status: latest?.status ?? null,
      replayHash: latest?.replayHash ?? null,
      resultHash: latest?.resultHash ?? null,
      winnerIds: latest?.result?.winnerIds ?? [],
      reason: latest?.result?.reason ?? null,
    },
    proof: proof ? { status: proof.status, matchId: proof.body?.proof?.matchId ?? null, gameId: proof.body?.proof?.gameId ?? null, computeMode: proof.body?.proof?.computeMode ?? null } : null,
  };
}

const humanRooms = [];
const agentRooms = [];
for (const gameId of games) {
  humanRooms.push(await finishHumanRoom(gameId));
  agentRooms.push(await finishAgentRoom(gameId));
}

function roomPassed(room) {
  return (
    room.created.status === 200 &&
    room.created.roomGameId === room.gameId &&
    room.joined.status === 200 &&
    room.started.status === 200 &&
    room.moves > 0 &&
    room.final.status === "finished" &&
    /^0x/.test(room.final.replayHash ?? "") &&
    /^0x/.test(room.final.resultHash ?? "") &&
    room.proof?.status === 200 &&
    room.proof?.gameId === room.gameId
  );
}

const verified = {
  humanRoomsFinished: humanRooms.every(roomPassed),
  agentRoomsFinished: agentRooms.every(roomPassed),
  agentRoomsRegistered: agentRooms.every((room) => room.registered?.status === 201),
  agentMovesFallbackDisclosed: agentRooms.every((room) =>
    room.agentMoves.length > 0 && room.agentMoves.every((move) => move.status === 200 && move.computeMode === "deterministic-fallback"),
  ),
  allProofsIndexed: [...humanRooms, ...agentRooms].every((room) => room.proof?.matchId === `match-${room.roomId}`),
};

const status = Object.values(verified).every(Boolean) ? "passed" : "failed";
const evidence = {
  mode: "local-multigame-room-api",
  status,
  checkedAt: new Date().toISOString(),
  baseUrl,
  games,
  humanRooms,
  agentRooms,
  verified,
};

mkdirSync("evidence/live-proofs", { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (status !== "passed") {
  console.error(JSON.stringify(evidence, null, 2));
  process.exitCode = 1;
} else {
  console.log(`multigame room API proof OK: ${evidencePath}`);
}
