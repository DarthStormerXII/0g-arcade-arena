import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const runId = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const evidencePath = "evidence/live-proofs/human-automatch-api-2026-06-24.json";
const ownerWallet = "0x000000000000000000000000000000000000a11c";
const wagerWei = "100000000000000";

function player(label) {
  return {
    id: `human-auto-${label}-${runId}`,
    kind: "human",
    displayName: `Human Auto ${label.toUpperCase()}`,
    ownerWallet,
  };
}

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

async function autoMatch(label, wager = "0") {
  return postJson("/api/matchmaking/human", {
    gameId: "grid-four",
    wagerWei: wager,
    player: player(label),
  });
}

async function getRoom(roomId) {
  return request(`/api/rooms/${encodeURIComponent(roomId)}`);
}

const freeFirst = await autoMatch("free-a");
const freeSecond = await autoMatch("free-b");
const freeRoomId = freeFirst.body?.room?.roomId;
const freeRoomAfterPair = freeRoomId ? await getRoom(freeRoomId) : { status: 0, body: null };
const freeThird = await autoMatch("free-c");

const wagerFirst = await autoMatch("wager-a", wagerWei);
const wagerSecond = await autoMatch("wager-b", wagerWei);
const wagerRoomId = wagerFirst.body?.room?.roomId;
const wagerRoomAfterPair = wagerRoomId ? await getRoom(wagerRoomId) : { status: 0, body: null };

const verified = {
  freeFirstWaits:
    freeFirst.status === 200 &&
    freeFirst.body?.matchmaking === "waiting" &&
    freeFirst.body?.room?.status === "waiting" &&
    freeFirst.body?.room?.players?.length === 1,
  freeSecondPairsSameRoom:
    freeSecond.status === 200 &&
    freeSecond.body?.room?.roomId === freeRoomId &&
    freeSecond.body?.room?.players?.length === 2,
  freeMatchAutoStarts:
    freeSecond.body?.matchmaking === "started" &&
    freeSecond.body?.room?.status === "active" &&
    freeRoomAfterPair.body?.room?.status === "active",
  freeQueueClearsAfterPair:
    freeThird.status === 200 &&
    freeThird.body?.matchmaking === "waiting" &&
    freeThird.body?.room?.roomId !== freeRoomId &&
    freeThird.body?.room?.players?.length === 1,
  wagerFirstWaits:
    wagerFirst.status === 200 &&
    wagerFirst.body?.matchmaking === "waiting" &&
    wagerFirst.body?.room?.status === "waiting" &&
    wagerFirst.body?.room?.wagerWei === wagerWei,
  wagerSecondPairsSameRoom:
    wagerSecond.status === 200 &&
    wagerSecond.body?.matchmaking === "joined" &&
    wagerSecond.body?.room?.roomId === wagerRoomId &&
    wagerSecond.body?.room?.players?.length === 2,
  wagerMatchRequiresFundingBeforeStart:
    wagerSecond.body?.room?.status === "ready" &&
    wagerRoomAfterPair.body?.room?.status === "ready" &&
    wagerRoomAfterPair.body?.room?.wagerWei === wagerWei,
};

const status = Object.values(verified).every(Boolean) ? "passed" : "failed";
const evidence = {
  mode: "local-human-automatch-api",
  status,
  checkedAt: new Date().toISOString(),
  baseUrl,
  wagerWei,
  free: {
    first: {
      status: freeFirst.status,
      matchmaking: freeFirst.body?.matchmaking ?? null,
      roomId: freeFirst.body?.room?.roomId ?? null,
      roomStatus: freeFirst.body?.room?.status ?? null,
      playerCount: freeFirst.body?.room?.players?.length ?? null,
    },
    second: {
      status: freeSecond.status,
      matchmaking: freeSecond.body?.matchmaking ?? null,
      roomId: freeSecond.body?.room?.roomId ?? null,
      roomStatus: freeSecond.body?.room?.status ?? null,
      playerCount: freeSecond.body?.room?.players?.length ?? null,
    },
    third: {
      status: freeThird.status,
      matchmaking: freeThird.body?.matchmaking ?? null,
      roomId: freeThird.body?.room?.roomId ?? null,
      roomStatus: freeThird.body?.room?.status ?? null,
      playerCount: freeThird.body?.room?.players?.length ?? null,
    },
  },
  wager: {
    first: {
      status: wagerFirst.status,
      matchmaking: wagerFirst.body?.matchmaking ?? null,
      roomId: wagerFirst.body?.room?.roomId ?? null,
      roomStatus: wagerFirst.body?.room?.status ?? null,
      playerCount: wagerFirst.body?.room?.players?.length ?? null,
      wagerWei: wagerFirst.body?.room?.wagerWei ?? null,
    },
    second: {
      status: wagerSecond.status,
      matchmaking: wagerSecond.body?.matchmaking ?? null,
      roomId: wagerSecond.body?.room?.roomId ?? null,
      roomStatus: wagerSecond.body?.room?.status ?? null,
      playerCount: wagerSecond.body?.room?.players?.length ?? null,
      wagerWei: wagerSecond.body?.room?.wagerWei ?? null,
    },
  },
  verified,
};

mkdirSync("evidence/live-proofs", { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (status !== "passed") {
  console.error(JSON.stringify(evidence, null, 2));
  process.exitCode = 1;
} else {
  console.log(`human auto-match proof OK: ${evidencePath}`);
}
