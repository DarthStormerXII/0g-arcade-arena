import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const runId = Date.now().toString(36);
const evidencePath = "evidence/live-proofs/agent-avatar-api-2026-06-24.json";
const ownerWallet = "0x000000000000000000000000000000000000c0De";
const explicitAvatar = "https://example.com/0g-arcade-agent-avatar.svg";

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

function baseAgent(agentId, displayName) {
  return {
    agentId,
    ownerWallet,
    displayName,
    supportedGames: ["grid-four"],
    bankrollPolicy: "testnet only; avatar verification",
    status: "qualified",
    freeEnabled: true,
    wagerEnabled: false,
    maxWagerWei: "0",
    endpointUrl: null,
  };
}

const explicitId = `avatar-explicit-${runId}`;
const generatedId = `avatar-generated-${runId}`;

const explicitRegistration = await postJson("/api/agents", {
  ...baseAgent(explicitId, "Avatar Explicit"),
  avatarUrl: explicitAvatar,
});
const generatedRegistration = await postJson("/api/agents", baseAgent(generatedId, "Avatar Generated"));
const explicitGet = await request(`/api/agents/${explicitId}`);
const generatedGet = await request(`/api/agents/${generatedId}`);
const listing = await request("/api/agents?gameId=grid-four&wagerWei=0");
const listedAgents = Array.isArray(listing.body?.agents) ? listing.body.agents : [];
const explicitListed = listedAgents.find((agent) => agent.agentId === explicitId);
const generatedListed = listedAgents.find((agent) => agent.agentId === generatedId);

const verified = {
  explicitRegistrationAccepted: explicitRegistration.status === 201,
  generatedRegistrationAccepted: generatedRegistration.status === 201,
  explicitRegistrationPreservedAvatar: explicitRegistration.body?.agent?.avatarUrl === explicitAvatar,
  explicitGetPreservedAvatar: explicitGet.body?.agent?.avatarUrl === explicitAvatar,
  explicitListingPreservedAvatar: explicitListed?.avatarUrl === explicitAvatar,
  generatedRegistrationHasAvatar: /^data:image\/svg\+xml,/.test(String(generatedRegistration.body?.agent?.avatarUrl ?? "")),
  generatedGetHasAvatar: /^data:image\/svg\+xml,/.test(String(generatedGet.body?.agent?.avatarUrl ?? "")),
  generatedListingHasAvatar: /^data:image\/svg\+xml,/.test(String(generatedListed?.avatarUrl ?? "")),
};

const status = Object.values(verified).every(Boolean) ? "passed" : "failed";
const evidence = {
  mode: "local-agent-avatar-api",
  status,
  checkedAt: new Date().toISOString(),
  baseUrl,
  agents: {
    explicitId,
    generatedId,
  },
  responses: {
    explicitRegistrationStatus: explicitRegistration.status,
    generatedRegistrationStatus: generatedRegistration.status,
    explicitGetStatus: explicitGet.status,
    generatedGetStatus: generatedGet.status,
    listingStatus: listing.status,
  },
  verified,
};

mkdirSync("evidence/live-proofs", { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (status !== "passed") {
  console.error(JSON.stringify(evidence, null, 2));
  process.exitCode = 1;
} else {
  console.log(`agent avatar proof OK: ${evidencePath}`);
}
