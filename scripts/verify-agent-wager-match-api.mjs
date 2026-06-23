import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const rpcUrl = process.env.ZEROG_RPC ?? "https://evmrpc-testnet.0g.ai";
const privateKey = process.env.OG_ARCADE_OPERATOR_PRIVATE_KEY;
const operatorAddress = process.env.OG_ARCADE_OPERATOR_ADDRESS;
const wagerEscrow = "0xd58960a15e1036efde2ca873716396c0f47031d4";
const wagerWei = "100000000000000";
const runId = Date.now().toString(36);
const roomId = `h2a-wager-${runId}`;
const agentId = `agent-wager-warden-${runId}`;
const evidencePath = "evidence/live-proofs/agent-wager-match-api-2026-06-24.json";

if (!privateKey || !operatorAddress) {
  throw new Error("Load ~/.codex/secrets/0g-arcade-arena/operator-wallet.env before running agent wager match proof.");
}

const human = {
  id: `h2a-human-${runId}`,
  kind: "human",
  displayName: "H2A Wager Human",
  ownerWallet: operatorAddress,
};

const agentPlayer = {
  id: agentId,
  kind: "agent",
  displayName: "H2A Wager Grid Warden",
  ownerWallet: operatorAddress,
  agentId,
};

async function request(path, options = {}) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
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
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
  throw lastError;
}

function postJson(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

function stableHash(value) {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  let h = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    h ^= input.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return `0x${(h >>> 0).toString(16).padStart(8, "0")}`;
}

function wagerMatchId(value) {
  return BigInt(stableHash(`wager:${value}`)).toString();
}

function castSend(signature, args, extra = []) {
  const result = spawnSync(
    "cast",
    [
      "send",
      "--rpc-url",
      rpcUrl,
      "--private-key",
      privateKey,
      "--gas-price",
      "4000000000",
      "--priority-gas-price",
      "2000000000",
      "--async",
      wagerEscrow,
      signature,
      ...args,
      ...extra,
    ],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (result.status !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || "cast send failed";
    throw new Error(message.replace(privateKey, "[redacted-private-key]"));
  }
  const txHash = txHashFrom(result.stdout);
  return receiptFor(txHash);
}

function txHashFrom(output) {
  const hash = output.match(/0x[a-fA-F0-9]{64}/)?.[0];
  if (!hash) throw new Error(`could not parse transaction hash from cast output: ${output}`);
  return hash;
}

function txSummary(tx) {
  return {
    transactionHash: tx.transactionHash ?? tx.hash ?? tx.txHash ?? null,
    status: tx.status ?? null,
    blockNumber: tx.blockNumber ?? null,
  };
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function receiptFor(txHash) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = spawnSync("cast", ["receipt", txHash, "--rpc-url", rpcUrl, "--json", "--async"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status === 0 && result.stdout.trim()) {
      return { txHash, ...JSON.parse(result.stdout) };
    }
    sleep(2000);
  }
  throw new Error(`receipt not found for ${txHash}`);
}

function entries(response) {
  return Array.isArray(response.body?.entries) ? response.body.entries : [];
}

function hasEntry(response, participantId, checks = {}) {
  return entries(response).some((entry) => {
    if (entry.participantId !== participantId) return false;
    for (const [key, value] of Object.entries(checks)) {
      if (entry[key] !== value) return false;
    }
    return true;
  });
}

const registered = await postJson("/api/agents", {
  agentId,
  ownerWallet: operatorAddress,
  displayName: "H2A Wager Grid Warden",
  supportedGames: ["grid-four"],
  bankrollPolicy: "testnet only; 0.0001 0G max per match",
  status: "qualified",
  freeEnabled: true,
  wagerEnabled: true,
  maxWagerWei: wagerWei,
});
const listed = await request(`/api/agents?gameId=grid-four&wagerWei=${wagerWei}`);
const created = await postJson("/api/rooms", {
  roomId,
  gameId: "grid-four",
  opponentMode: "agent",
  wagerWei,
  host: human,
});
const joined = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/join`, { player: agentPlayer });

const matchId = wagerMatchId(roomId);
const fundHuman = castSend("createWager(uint256)", [matchId], ["--value", wagerWei]);
const fundAgent = castSend("createWager(uint256)", [matchId], ["--value", wagerWei]);

let started = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});
if (started.status === 409) {
  await new Promise((resolve) => setTimeout(resolve, 2500));
  started = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});
}

let latestRoom = started.body?.room ?? null;
const turns = [
  { kind: "human", playerId: human.id, move: { column: 0 } },
  { kind: "agent" },
  { kind: "human", playerId: human.id, move: { column: 0 } },
  { kind: "agent" },
  { kind: "human", playerId: human.id, move: { column: 0 } },
  { kind: "agent" },
  { kind: "human", playerId: human.id, move: { column: 0 } },
];
const moveResults = [];
for (const turn of turns) {
  const result =
    turn.kind === "agent"
      ? await postJson(`/api/rooms/${encodeURIComponent(roomId)}/agent-move`, {})
      : await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, { playerId: turn.playerId, move: turn.move });
  latestRoom = result.body?.room ?? latestRoom;
  moveResults.push({
    kind: turn.kind,
    status: result.status,
    roomStatus: result.body?.room?.status ?? null,
    currentPlayerIds: result.body?.room?.currentPlayerIds ?? null,
    agentMove: result.body?.agentMove
      ? {
          move: result.body.agentMove.move,
          computeMode: result.body.agentMove.computeMode,
          fallbackReason: result.body.agentMove.fallbackReason ?? null,
        }
      : null,
  });
}

const settlement = castSend("settleWinner(uint256,address)", [matchId, operatorAddress]);
const proof = await request(`/api/proofs/match-${encodeURIComponent(roomId)}`);
const global = await request("/api/leaderboard?scope=global&mode=all");
const wagerMode = await request("/api/leaderboard?scope=mode&mode=wager");
const gameWagerMode = await request("/api/leaderboard?scope=game-mode&mode=wager&gameId=grid-four");
const freeMode = await request("/api/leaderboard?scope=mode&mode=free");

const listedIds = Array.isArray(listed.body?.agents) ? listed.body.agents.map((agent) => agent.agentId) : [];
const winnerId = latestRoom?.result?.winnerIds?.[0] ?? null;
const loserId = latestRoom?.result?.loserIds?.[0] ?? null;
const agentMoves = moveResults.filter((move) => move.kind === "agent");
const verified = {
  agentRegistered: registered.status === 201 && registered.body?.agent?.agentId === agentId,
  agentListedForWager: listed.status === 200 && listedIds.includes(agentId),
  roomCreated: created.status === 200 && created.body?.room?.wagerWei === wagerWei,
  agentJoined: joined.status === 200 && joined.body?.room?.status === "ready",
  fundedTwice: fundHuman.status === "0x1" && fundAgent.status === "0x1",
  roomStartedAfterFunding: started.status === 200 && started.body?.room?.status === "active",
  agentMovedThreeTimes: agentMoves.length === 3 && agentMoves.every((move) => move.status === 200),
  agentMovesUseFallbackWhileComputeBlocked: agentMoves.every((move) => move.agentMove?.computeMode === "deterministic-fallback"),
  matchFinishedWithHumanWinner: latestRoom?.status === "finished" && winnerId === human.id && loserId === agentId,
  settlementMined: settlement.status === "0x1",
  proofIndexed:
    proof.status === 200 &&
    proof.body?.proof?.matchId === `match-${roomId}` &&
    proof.body?.proof?.roomId === roomId &&
    proof.body?.proof?.status === "finished",
  proofDisclosesFallbackCompute: proof.body?.proof?.computeMode === "deterministic-fallback",
  globalIncludesHumanWinner: hasEntry(global, human.id, { wins: 1 }),
  wagerIncludesHumanWinner: hasEntry(wagerMode, human.id, { wins: 1, wagerWins: 1 }),
  gameWagerIncludesHumanWinner: hasEntry(gameWagerMode, human.id, { wins: 1, wagerWins: 1 }),
  wagerIncludesAgentLoss: hasEntry(wagerMode, agentId, { losses: 1 }),
  freeModeDoesNotIncludeWagerWinner: !hasEntry(freeMode, human.id),
};

const status = Object.values(verified).every(Boolean) ? "passed" : "failed";
const evidence = {
  mode: "local-agent-wager-match-api",
  status,
  checkedAt: new Date().toISOString(),
  baseUrl,
  roomId,
  matchId,
  wagerWei,
  human: { id: human.id, displayName: human.displayName },
  agent: { id: agentId, displayName: agentPlayer.displayName },
  winnerId,
  loserId,
  transactions: {
    fundHuman: txSummary(fundHuman),
    fundAgent: txSummary(fundAgent),
    settlement: txSummary(settlement),
  },
  api: {
    registered: { status: registered.status },
    listed: { status: listed.status, listedIds },
    created: { status: created.status, roomStatus: created.body?.room?.status ?? null },
    joined: { status: joined.status, roomStatus: joined.body?.room?.status ?? null },
    started: { status: started.status, roomStatus: started.body?.room?.status ?? null },
    moveResults,
    proof: {
      status: proof.status,
      matchId: proof.body?.proof?.matchId ?? null,
      roomId: proof.body?.proof?.roomId ?? null,
      roomStatus: proof.body?.proof?.status ?? null,
      computeMode: proof.body?.proof?.computeMode ?? null,
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
  console.log(`agent wager match proof OK: ${evidencePath}`);
}
