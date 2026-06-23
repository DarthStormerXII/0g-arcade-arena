import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const wagerWei = "100000000000000";
const runId = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
const roomRunId = Date.now().toString(36).slice(-8);
const evidencePath = "evidence/live-proofs/agent-wager-policy-api-2026-06-24.json";
const ownerWallet = "0x000000000000000000000000000000000000dEaD";
let roomCounter = 0;

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

async function postJson(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

async function registerAgent(agent) {
  return postJson("/api/agents", {
    ownerWallet,
    bankrollPolicy: "testnet only; obey room max wager",
    endpointUrl: null,
    ...agent,
  });
}

async function createRoom(label, wager = "0") {
  roomCounter += 1;
  const labelSlug = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 10);
  const roomId = `pol-${labelSlug}-${roomCounter}-${roomRunId}`;
  const result = await postJson("/api/rooms", {
    roomId,
    gameId: "grid-four",
    opponentMode: "agent",
    wagerWei: wager,
    host: {
      id: `human-${label}-${runId}`,
      kind: "human",
      displayName: "Policy Host",
      ownerWallet,
    },
  });
  if (result.status !== 200 && result.status !== 201) {
    throw new Error(`could not create room ${label}: ${result.status} ${JSON.stringify(result.body)}`);
  }
  return result.body?.room?.roomId ?? roomId;
}

async function joinAgent(roomId, agentId) {
  return postJson(`/api/rooms/${encodeURIComponent(roomId)}/join`, {
    player: {
      id: agentId,
      kind: "agent",
      displayName: `Agent ${agentId}`,
      ownerWallet,
      agentId,
    },
  });
}

async function expectJoin(label, agentId, expectedStatus, wager = "0") {
  const roomId = await createRoom(label, wager);
  const result = await joinAgent(roomId, agentId);
  const ok = result.status === expectedStatus;
  return {
    label,
    roomId,
    agentId,
    wagerWei: wager,
    expectedStatus,
    actualStatus: result.status,
    ok,
    error: result.body?.error ?? null,
    roomStatus: result.body?.room?.status ?? null,
  };
}

const registrations = [
  await registerAgent({
    agentId: `policy-pending-${runId}`,
    displayName: "Policy Pending",
    supportedGames: ["grid-four"],
    status: "pending",
    freeEnabled: true,
    wagerEnabled: true,
    maxWagerWei: wagerWei,
  }),
  await registerAgent({
    agentId: `policy-free-disabled-${runId}`,
    displayName: "Policy Free Disabled",
    supportedGames: ["grid-four"],
    status: "qualified",
    freeEnabled: false,
    wagerEnabled: true,
    maxWagerWei: wagerWei,
  }),
  await registerAgent({
    agentId: `policy-free-ok-${runId}`,
    displayName: "Policy Free OK",
    supportedGames: ["grid-four"],
    status: "qualified",
    freeEnabled: true,
    wagerEnabled: false,
    maxWagerWei: "0",
  }),
  await registerAgent({
    agentId: `policy-unsupported-${runId}`,
    displayName: "Policy Unsupported",
    supportedGames: ["fleet-duel"],
    status: "qualified",
    freeEnabled: true,
    wagerEnabled: true,
    maxWagerWei: wagerWei,
  }),
  await registerAgent({
    agentId: `policy-wager-disabled-${runId}`,
    displayName: "Policy Wager Disabled",
    supportedGames: ["grid-four"],
    status: "qualified",
    freeEnabled: true,
    wagerEnabled: false,
    maxWagerWei: wagerWei,
  }),
  await registerAgent({
    agentId: `policy-cap-low-${runId}`,
    displayName: "Policy Cap Low",
    supportedGames: ["grid-four"],
    status: "qualified",
    freeEnabled: true,
    wagerEnabled: true,
    maxWagerWei: "1",
  }),
  await registerAgent({
    agentId: `policy-cap-ok-${runId}`,
    displayName: "Policy Cap OK",
    supportedGames: ["grid-four"],
    status: "qualified",
    freeEnabled: true,
    wagerEnabled: true,
    maxWagerWei: wagerWei,
  }),
];

const badRegistration = registrations.find((item) => item.status !== 201);
if (badRegistration) {
  throw new Error(`agent registration failed: ${badRegistration.status} ${JSON.stringify(badRegistration.body)}`);
}

const cases = [
  await expectJoin("unregistered", `policy-missing-${runId}`, 404),
  await expectJoin("pending agent", `policy-pending-${runId}`, 403),
  await expectJoin("free disabled agent", `policy-free-disabled-${runId}`, 403),
  await expectJoin("free qualified agent", `policy-free-ok-${runId}`, 200),
  await expectJoin("unsupported game agent", `policy-unsupported-${runId}`, 403),
  await expectJoin("wager disabled agent", `policy-wager-disabled-${runId}`, 403, wagerWei),
  await expectJoin("wager cap below room", `policy-cap-low-${runId}`, 403, wagerWei),
  await expectJoin("wager cap equal room", `policy-cap-ok-${runId}`, 200, wagerWei),
];

const listing = await request(`/api/agents?gameId=grid-four&wagerWei=${wagerWei}`);
const listedIds = Array.isArray(listing.body?.agents) ? listing.body.agents.map((agent) => agent.agentId) : [];
const verified = {
  rejectedUnregistered: cases.some((item) => item.label === "unregistered" && item.ok),
  rejectedPending: cases.some((item) => item.label === "pending agent" && item.ok),
  rejectedFreeDisabled: cases.some((item) => item.label === "free disabled agent" && item.ok),
  acceptedFreeQualified: cases.some((item) => item.label === "free qualified agent" && item.ok && item.roomStatus === "ready"),
  rejectedUnsupportedGame: cases.some((item) => item.label === "unsupported game agent" && item.ok),
  rejectedWagerDisabled: cases.some((item) => item.label === "wager disabled agent" && item.ok),
  rejectedWagerCapBelow: cases.some((item) => item.label === "wager cap below room" && item.ok),
  acceptedWagerCapEqual: cases.some((item) => item.label === "wager cap equal room" && item.ok && item.roomStatus === "ready"),
  qualifiedListingFiltersByWager: listedIds.includes(`policy-cap-ok-${runId}`) && !listedIds.includes(`policy-cap-low-${runId}`),
};

const status = cases.every((item) => item.ok) && Object.values(verified).every(Boolean) ? "passed" : "failed";
const evidence = {
  mode: "local-agent-wager-policy-api",
  status,
  checkedAt: new Date().toISOString(),
  baseUrl,
  wagerWei,
  registrations: registrations.map((item) => ({
    status: item.status,
    agentId: item.body?.agent?.agentId ?? null,
  })),
  cases,
  listing: {
    status: listing.status,
    listedIds,
  },
  verified,
};

mkdirSync("evidence/live-proofs", { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (status !== "passed") {
  console.error(JSON.stringify(evidence, null, 2));
  process.exitCode = 1;
} else {
  console.log(`agent wager policy proof OK: ${evidencePath}`);
}
