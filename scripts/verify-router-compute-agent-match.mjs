import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const runId = Date.now().toString(36);
const roomId = `router-compute-${runId}`;
const agentId = `agent-router-compute-${runId}`;
const outFile = join(process.cwd(), "evidence/live-proofs/router-compute-agent-match-2026-06-24.json");

const human = {
  id: `human-router-${runId}`,
  kind: "human",
  displayName: "Router Compute Human",
  ownerWallet: "0x0000000000000000000000000000000000000001",
};

const agent = {
  id: agentId,
  kind: "agent",
  agentId,
  displayName: "Router Compute Agent",
  ownerWallet: "0x0000000000000000000000000000000000000002",
};

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

async function main() {
  const artifact = {
    mode: "router-compute-agent-match",
    status: "failed",
    checkedAt: new Date().toISOString(),
    baseUrl,
    roomId,
    matchId: `match-${roomId}`,
    gameId: "grid-four",
    wagerWei: "0",
    steps: {},
    agentMove: null,
    completion: null,
    proof: null,
    verified: {
      agentRegistered: false,
      roomStarted: false,
      routerMoveAccepted: false,
      routerMoveWasLiveCompute: false,
      matchFinished: false,
      proofIndexedCompute: false,
    },
    reason: "",
  };

  artifact.steps.register = await postJson("/api/agents", {
    agentId,
    ownerWallet: agent.ownerWallet,
    displayName: agent.displayName,
    supportedGames: ["grid-four"],
    bankrollPolicy: "free live 0G Router verification only",
    status: "qualified",
    freeEnabled: true,
    wagerEnabled: false,
    maxWagerWei: "0",
  });
  artifact.verified.agentRegistered = [200, 201].includes(artifact.steps.register.status);

  artifact.steps.create = await postJson("/api/rooms", {
    roomId,
    gameId: "grid-four",
    opponentMode: "agent",
    wagerWei: "0",
    host: human,
  });
  artifact.steps.join = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/join`, { player: agent });
  artifact.steps.start = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});
  artifact.verified.roomStarted = artifact.steps.start.status === 200;

  artifact.steps.firstHumanMove = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, {
    playerId: human.id,
    move: { column: 0 },
  });

  const routerMove = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/agent-move`, {});
  artifact.steps.routerAgentMove = routerMove;
  artifact.agentMove = routerMove.body?.agentMove ?? null;
  artifact.verified.routerMoveAccepted = routerMove.status === 200;
  artifact.verified.routerMoveWasLiveCompute =
    routerMove.status === 200 &&
    routerMove.body?.agentMove?.computeMode === "0g-compute" &&
    routerMove.body?.agentMove?.fallbackReason == null;

  let latestRoom = routerMove.body?.room ?? null;
  const routerColumn = Number(routerMove.body?.agentMove?.move?.column);
  const humanColumn = routerColumn === 0 ? 1 : 0;
  const manualAgentColumn = routerColumn === 6 ? 5 : 6;
  const completionMoves = [];
  for (let index = 0; latestRoom?.status !== "finished" && index < 8; index += 1) {
    const currentPlayer = latestRoom?.currentPlayerIds?.[0];
    if (currentPlayer === human.id) {
      const result = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, {
        playerId: human.id,
        move: { column: humanColumn },
      });
      latestRoom = result.body?.room ?? latestRoom;
      completionMoves.push({ kind: "human", status: result.status, column: humanColumn });
    } else if (currentPlayer === agent.id) {
      const result = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, {
        playerId: agent.id,
        move: { column: manualAgentColumn },
      });
      latestRoom = result.body?.room ?? latestRoom;
      completionMoves.push({ kind: "agent-manual", status: result.status, column: manualAgentColumn });
    } else {
      break;
    }
  }

  artifact.completion = {
    humanColumn,
    manualAgentColumn,
    moves: completionMoves,
    finalStatus: latestRoom?.status ?? null,
    winnerIds: latestRoom?.result?.winnerIds ?? [],
    replayHash: latestRoom?.replayHash ?? null,
    resultHash: latestRoom?.resultHash ?? null,
    computeMode: latestRoom?.computeMode ?? null,
    computeProofCount: latestRoom?.computeProofs?.length ?? 0,
  };
  artifact.verified.matchFinished =
    artifact.completion.finalStatus === "finished" && artifact.completion.computeMode === "0g-compute";

  const proof = await request(`/api/proofs/match-${encodeURIComponent(roomId)}`);
  artifact.proof = {
    status: proof.status,
    matchId: proof.body?.proof?.matchId ?? null,
    roomStatus: proof.body?.proof?.status ?? null,
    computeMode: proof.body?.proof?.computeMode ?? null,
    computeProofMode: proof.body?.proof?.computeProof?.mode ?? null,
  };
  artifact.verified.proofIndexedCompute =
    proof.status === 200 &&
    artifact.proof.roomStatus === "finished" &&
    artifact.proof.computeMode === "0g-compute";

  artifact.status = Object.values(artifact.verified).every(Boolean) ? "passed" : "failed";
  artifact.reason =
    artifact.status === "passed"
      ? "0G testnet Router selected a legal Grid Four agent move; the app completed the room and indexed the proof as 0g-compute."
      : "Router-backed Compute match did not satisfy one or more evidence checks.";

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`${outFile}: ${artifact.status}`);
  if (artifact.status !== "passed") process.exitCode = 1;
}

await main();
