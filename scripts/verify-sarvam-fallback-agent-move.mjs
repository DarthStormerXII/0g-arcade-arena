import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const outFile =
  process.env.SARVAM_FALLBACK_EVIDENCE_PATH ?? "evidence/live-proofs/sarvam-fallback-agent-move-2026-06-25.json";
const roomId = process.env.SARVAM_FALLBACK_ROOM_ID ?? `sarvam-fallback-${Date.now().toString(36)}`;

async function postJson(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

const host = {
  id: `agent-sarvam-${roomId}`,
  kind: "agent",
  displayName: "Sarvam Fallback Agent",
  agentId: `agent-sarvam-${roomId}`,
};

const human = {
  id: `human-sarvam-${roomId}`,
  kind: "human",
  displayName: "Sarvam Fallback Human",
  ownerWallet: "0x1111111111111111111111111111111111111111",
};

const created = await postJson("/api/rooms", {
  roomId,
  gameId: "grid-four",
  host,
  opponentMode: "agent",
  wagerWei: "0",
});

const joined = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/join`, { player: human });
const started = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});
const agentMove = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/agent-move`, {});
const latestProof = agentMove.body?.room?.computeProofs?.at?.(-1) ?? null;

const verified = {
  roomCreated: created.status === 200 && created.body?.room?.roomId === roomId,
  roomJoined: joined.status === 200 && joined.body?.room?.players?.length === 2,
  roomStarted: started.status === 200 && started.body?.room?.status === "active",
  agentMoveAccepted: agentMove.status === 200,
  sarvamFallbackUsed: agentMove.body?.agentMove?.computeMode === "sarvam-fallback",
  providerDisclosed: agentMove.body?.agentMove?.provider === "sarvam",
  primary0gErrorDisclosed:
    typeof agentMove.body?.agentMove?.primaryComputeError === "string" &&
    agentMove.body.agentMove.primaryComputeError.length > 0,
  roomProofPersisted:
    latestProof?.mode === "sarvam-fallback" &&
    latestProof?.provider === "sarvam" &&
    typeof latestProof?.primaryComputeError === "string",
};

const artifact = {
  schema: "0g-arcade.sarvam-fallback-agent-move.v1",
  mode: "sarvam-fallback-agent-move",
  baseUrl,
  roomId,
  checkedAt: new Date().toISOString(),
  api: {
    created: { status: created.status, roomId: created.body?.room?.roomId ?? null },
    joined: { status: joined.status, playerCount: joined.body?.room?.players?.length ?? 0 },
    started: { status: started.status, roomStatus: started.body?.room?.status ?? null },
    agentMove: {
      status: agentMove.status,
      computeMode: agentMove.body?.agentMove?.computeMode ?? null,
      provider: agentMove.body?.agentMove?.provider ?? null,
      model: agentMove.body?.agentMove?.model ?? latestProof?.model ?? null,
      primaryComputeError: agentMove.body?.agentMove?.primaryComputeError ?? null,
      fallbackReason: agentMove.body?.agentMove?.fallbackReason ?? null,
      roomComputeProofCount: agentMove.body?.room?.computeProofs?.length ?? 0,
    },
  },
  latestProof,
  verified,
};

const required = [
  "roomCreated",
  "roomJoined",
  "roomStarted",
  "agentMoveAccepted",
  "sarvamFallbackUsed",
  "providerDisclosed",
  "primary0gErrorDisclosed",
  "roomProofPersisted",
];

artifact.status = required.every((key) => verified[key] === true) ? "passed" : "failed";

mkdirSync("evidence/live-proofs", { recursive: true });
writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(JSON.stringify(artifact, null, 2));

if (artifact.status !== "passed") {
  process.exit(1);
}
