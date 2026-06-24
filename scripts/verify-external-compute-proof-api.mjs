import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const runId = Date.now().toString(36);
const evidencePath = "evidence/live-proofs/external-compute-proof-api-2026-06-24.json";
const provider = "0xa48f01287233509FD694a22Bf840225062E67836";
const contentHash = "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

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

function players(suffix) {
  return {
    human: {
      id: `external-human-${suffix}`,
      kind: "human",
      displayName: "External Proof Human",
      ownerWallet: "0x0000000000000000000000000000000000000001",
    },
    agent: {
      id: `external-agent-${suffix}`,
      kind: "agent",
      agentId: `external-agent-${suffix}`,
      displayName: "External Proof Agent",
      ownerWallet: "0x0000000000000000000000000000000000000002",
    },
  };
}

async function createStartedRoom(roomId, human, agent) {
  const registered = await postJson("/api/agents", {
    agentId: agent.agentId,
    ownerWallet: agent.ownerWallet,
    displayName: agent.displayName,
    supportedGames: ["grid-four"],
    bankrollPolicy: "local external compute proof verification only",
    status: "qualified",
    freeEnabled: true,
    wagerEnabled: false,
    maxWagerWei: "0",
  });
  const created = await postJson("/api/rooms", {
    roomId,
    gameId: "grid-four",
    opponentMode: "agent",
    wagerWei: "0",
    host: human,
  });
  const joined = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/join`, { player: agent });
  const started = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});
  return { registered, created, joined, started };
}

function computeProof(requestId) {
  return {
    mode: "0g-compute",
    provider,
    requestId,
    verified: true,
    model: "qwen2.5-omni",
    contentHash,
  };
}

const accept = players(`accept-${runId}`);
const acceptRoomId = `external-proof-${runId}`;
const acceptSetup = await createStartedRoom(acceptRoomId, accept.human, accept.agent);
const humanMove = await postJson(`/api/rooms/${encodeURIComponent(acceptRoomId)}/move`, {
  playerId: accept.human.id,
  move: { column: 0 },
});
const agentMove = await postJson(`/api/rooms/${encodeURIComponent(acceptRoomId)}/move`, {
  playerId: accept.agent.id,
  move: { column: 3 },
  computeProof: computeProof(`external-proof-${runId}`),
});
const proof = await request(`/api/proofs/match-${encodeURIComponent(acceptRoomId)}`);

const reject = players(`reject-${runId}`);
const rejectRoomId = `external-proof-reject-${runId}`;
const rejectSetup = await createStartedRoom(rejectRoomId, reject.human, reject.agent);
const rejectedHumanProof = await postJson(`/api/rooms/${encodeURIComponent(rejectRoomId)}/move`, {
  playerId: reject.human.id,
  move: { column: 0 },
  computeProof: computeProof(`external-proof-reject-${runId}`),
});

const verified = {
  agentRegistered: acceptSetup.registered.status === 201,
  roomStarted: acceptSetup.started.status === 200 && acceptSetup.started.body?.room?.status === "active",
  humanMoveAccepted: humanMove.status === 200,
  agentMoveAccepted: agentMove.status === 200,
  roomMarkedCompute: agentMove.body?.room?.computeMode === "0g-compute",
  computeProofPersisted: agentMove.body?.room?.computeProofs?.some(
    (item) => item.mode === "0g-compute" && item.provider === provider && item.contentHash === contentHash,
  ),
  proofIndexedCompute: proof.status === 200 && proof.body?.proof?.computeMode === "0g-compute",
  humanProofRejected: rejectedHumanProof.status === 400,
};

const status = Object.values(verified).every(Boolean) ? "passed" : "failed";
const evidence = {
  mode: "local-external-compute-proof-api",
  status,
  checkedAt: new Date().toISOString(),
  baseUrl,
  acceptedRoom: {
    roomId: acceptRoomId,
    setup: {
      registered: acceptSetup.registered.status,
      created: acceptSetup.created.status,
      joined: acceptSetup.joined.status,
      started: acceptSetup.started.status,
    },
    humanMove: { status: humanMove.status },
    agentMove: {
      status: agentMove.status,
      computeMode: agentMove.body?.room?.computeMode ?? null,
      computeProofCount: agentMove.body?.room?.computeProofs?.length ?? 0,
    },
    proof: { status: proof.status, computeMode: proof.body?.proof?.computeMode ?? null },
  },
  rejectedHumanProof: {
    roomId: rejectRoomId,
    setup: {
      registered: rejectSetup.registered.status,
      created: rejectSetup.created.status,
      joined: rejectSetup.joined.status,
      started: rejectSetup.started.status,
    },
    status: rejectedHumanProof.status,
    error: rejectedHumanProof.body?.error ?? null,
  },
  verified,
};

mkdirSync(dirname(evidencePath), { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${evidencePath}: ${status}`);
if (status !== "passed") process.exitCode = 1;
