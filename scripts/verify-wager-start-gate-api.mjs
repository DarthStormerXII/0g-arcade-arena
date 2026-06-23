import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const runId = Date.now().toString(36);
const roomId = `gate-${runId}`;
const wagerWei = "100000000000000";
const evidencePath = "evidence/live-proofs/wager-start-gate-api-2026-06-24.json";
const ownerWallet = "0x0000000000000000000000000000000000009a7e";
const players = [
  { id: `gate-a-${runId}`, kind: "human", displayName: "Gate A", ownerWallet },
  { id: `gate-b-${runId}`, kind: "human", displayName: "Gate B", ownerWallet },
];

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

const created = await postJson("/api/rooms", {
  roomId,
  gameId: "grid-four",
  opponentMode: "human",
  wagerWei,
  host: players[0],
});
const joined = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/join`, { player: players[1] });
const unfundedStart = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});
const unfundedMove = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, {
  playerId: players[0].id,
  move: { column: 3 },
});
const afterMoveAttempt = await request(`/api/rooms/${encodeURIComponent(roomId)}`);

const verified = {
  roomCreated: created.status === 200 && created.body?.room?.wagerWei === wagerWei,
  roomReady: joined.status === 200 && joined.body?.room?.status === "ready",
  unfundedStartRejected: unfundedStart.status === 409 && String(unfundedStart.body?.error ?? "").includes("wager escrow not fully funded"),
  unfundedMoveRejected: unfundedMove.status === 409 && String(unfundedMove.body?.error ?? "").includes("wager escrow not fully funded"),
  roomDidNotAutoStart: afterMoveAttempt.status === 200 && afterMoveAttempt.body?.room?.status === "ready" && afterMoveAttempt.body?.room?.state === null,
};

const status = Object.values(verified).every(Boolean) ? "passed" : "failed";
const evidence = {
  mode: "local-wager-start-gate-api",
  status,
  checkedAt: new Date().toISOString(),
  baseUrl,
  roomId,
  wagerWei,
  created: { status: created.status, roomStatus: created.body?.room?.status ?? null },
  joined: { status: joined.status, roomStatus: joined.body?.room?.status ?? null },
  unfundedStart: { status: unfundedStart.status, error: unfundedStart.body?.error ?? null },
  unfundedMove: { status: unfundedMove.status, error: unfundedMove.body?.error ?? null },
  afterMoveAttempt: {
    status: afterMoveAttempt.status,
    roomStatus: afterMoveAttempt.body?.room?.status ?? null,
    hasState: Boolean(afterMoveAttempt.body?.room?.state),
  },
  verified,
};

mkdirSync("evidence/live-proofs", { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (status !== "passed") {
  console.error(JSON.stringify(evidence, null, 2));
  process.exitCode = 1;
} else {
  console.log(`wager start gate proof OK: ${evidencePath}`);
}
