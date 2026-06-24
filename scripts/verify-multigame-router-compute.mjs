import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const runId = Date.now().toString(36);
const evidencePath = "evidence/live-proofs/multigame-router-compute-api-2026-06-24.json";
const games = ["fleet-duel", "tile-race", "world-cup-draft"];
const ownerWallet = "0x0000000000000000000000000000000000005555";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers ?? {}) },
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

async function runGame(gameId) {
  const roomId = `mgr-${gameId}-${runId}`.replace(/[^a-z0-9-]/g, "-").slice(0, 34);
  const agentId = `router-agent-${gameId}-${runId}`.replace(/[^a-z0-9-]/g, "-").slice(0, 54);
  const human = { id: `human-${gameId}-${runId}`, kind: "human", displayName: "Router Human", ownerWallet };
  const agent = { id: agentId, kind: "agent", agentId, displayName: `Router ${gameId} Agent`, ownerWallet };

  const registered = await postJson("/api/agents", {
    agentId,
    ownerWallet,
    displayName: agent.displayName,
    supportedGames: [gameId],
    bankrollPolicy: "free live 0G Router multigame verification only",
    status: "qualified",
    freeEnabled: true,
    wagerEnabled: false,
    maxWagerWei: "0",
  });
  const created = await postJson("/api/rooms", {
    roomId,
    gameId,
    opponentMode: "agent",
    wagerWei: "0",
    host: human,
  });
  const joined = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/join`, { player: agent });
  const started = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});

  let latest = started.body?.room ?? null;
  const moves = [];
  let routerAgentMove = null;

  for (let index = 0; index < 128 && latest?.status !== "finished"; index += 1) {
    const currentId = latest?.currentPlayerIds?.[0];
    const currentPlayer = latest?.players?.find((player) => player.id === currentId);
    if (!currentId || !currentPlayer) break;

    let result;
    if (currentPlayer.kind === "agent" && !routerAgentMove) {
      result = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/agent-move`, {});
      routerAgentMove = {
        status: result.status,
        move: result.body?.agentMove?.move ?? null,
        computeMode: result.body?.agentMove?.computeMode ?? null,
        fallbackReason: result.body?.agentMove?.fallbackReason ?? null,
      };
    } else {
      const move = latest?.legalMoves?.[0];
      if (!move) break;
      result = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, { playerId: currentId, move });
    }

    latest = result.body?.room ?? latest;
    moves.push({
      status: result.status,
      playerId: currentId,
      playerKind: currentPlayer.kind,
      roomStatus: latest?.status ?? null,
      computeMode: result.body?.agentMove?.computeMode ?? null,
    });
  }

  const proof = latest?.status === "finished" ? await request(`/api/proofs/match-${encodeURIComponent(roomId)}`) : null;
  return {
    gameId,
    roomId,
    matchId: `match-${roomId}`,
    registered: { status: registered.status, agentId: registered.body?.agent?.agentId ?? null },
    created: { status: created.status, roomGameId: created.body?.room?.gameId ?? null },
    joined: { status: joined.status, roomStatus: joined.body?.room?.status ?? null },
    started: { status: started.status, roomStatus: started.body?.room?.status ?? null },
    routerAgentMove,
    moves,
    final: {
      status: latest?.status ?? null,
      replayHash: latest?.replayHash ?? null,
      resultHash: latest?.resultHash ?? null,
      winnerIds: latest?.result?.winnerIds ?? [],
      computeMode: latest?.computeMode ?? null,
      computeProofCount: latest?.computeProofs?.length ?? 0,
    },
    proof: proof
      ? {
          status: proof.status,
          matchId: proof.body?.proof?.matchId ?? null,
          gameId: proof.body?.proof?.gameId ?? null,
          computeMode: proof.body?.proof?.computeMode ?? null,
          roomStatus: proof.body?.proof?.status ?? null,
        }
      : null,
  };
}

const rooms = [];
for (const gameId of games) {
  rooms.push(await runGame(gameId));
}

function roomPassed(room) {
  return (
    room.registered.status === 201 &&
    room.created.status === 200 &&
    room.created.roomGameId === room.gameId &&
    room.joined.status === 200 &&
    room.started.status === 200 &&
    room.routerAgentMove?.status === 200 &&
    room.routerAgentMove?.computeMode === "0g-compute" &&
    room.routerAgentMove?.fallbackReason == null &&
    room.final.status === "finished" &&
    room.final.computeMode === "0g-compute" &&
    room.final.computeProofCount >= 1 &&
    /^0x/.test(room.final.replayHash ?? "") &&
    /^0x/.test(room.final.resultHash ?? "") &&
    room.proof?.status === 200 &&
    room.proof?.gameId === room.gameId &&
    room.proof?.matchId === room.matchId &&
    room.proof?.computeMode === "0g-compute"
  );
}

const verified = {
  allGamesCovered: rooms.map((room) => room.gameId).sort().join(",") === [...games].sort().join(","),
  allAgentsRegistered: rooms.every((room) => room.registered.status === 201),
  allRoomsFinished: rooms.every((room) => room.final.status === "finished"),
  allRouterMovesAccepted: rooms.every(
    (room) =>
      room.routerAgentMove?.status === 200 &&
      room.routerAgentMove?.computeMode === "0g-compute" &&
      room.routerAgentMove?.fallbackReason == null,
  ),
  allProofsIndexedCompute: rooms.every((room) => room.proof?.computeMode === "0g-compute"),
  allRoomsPassed: rooms.every(roomPassed),
};
const status = Object.values(verified).every(Boolean) ? "passed" : "failed";
const evidence = {
  mode: "multigame-router-compute-api",
  status,
  checkedAt: new Date().toISOString(),
  baseUrl,
  games,
  rooms,
  verified,
};

mkdirSync("evidence/live-proofs", { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (status !== "passed") {
  console.error(JSON.stringify(evidence, null, 2));
  process.exitCode = 1;
} else {
  console.log(`multigame Router Compute proof OK: ${evidencePath}`);
}
