import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const rpcUrl = process.env.ZEROG_RPC ?? "https://evmrpc-testnet.0g.ai";
const privateKey = process.env.OG_ARCADE_OPERATOR_PRIVATE_KEY;
const operatorAddress = process.env.OG_ARCADE_OPERATOR_ADDRESS;
const wagerEscrow = "0xd58960a15e1036efde2ca873716396c0f47031d4";
const wagerWei = "100000000000000";
const runId = Date.now().toString(36);
const roomId = `lbw-${runId}`;
const evidencePath = "evidence/live-proofs/wager-leaderboard-api-2026-06-24.json";

if (!privateKey || !operatorAddress) {
  throw new Error("Load ~/.codex/secrets/0g-arcade-arena/operator-wallet.env before running wager leaderboard proof.");
}

const players = [
  {
    id: `lbw-a-${runId}`,
    kind: "human",
    displayName: "Wager Leaderboard A",
    ownerWallet: operatorAddress,
  },
  {
    id: `lbw-b-${runId}`,
    kind: "human",
    displayName: "Wager Leaderboard B",
    ownerWallet: operatorAddress,
  },
];

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

function txSummary(tx) {
  return {
    transactionHash: tx.transactionHash ?? tx.hash ?? tx.txHash ?? null,
    status: tx.status ?? null,
    blockNumber: tx.blockNumber ?? null,
  };
}

function txHashFrom(output) {
  const hash = output.match(/0x[a-fA-F0-9]{64}/)?.[0];
  if (!hash) throw new Error(`could not parse transaction hash from cast output: ${output}`);
  return hash;
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

const created = await postJson("/api/rooms", {
  roomId,
  gameId: "grid-four",
  opponentMode: "human",
  wagerWei,
  host: players[0],
});
const joined = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/join`, { player: players[1] });

const matchId = wagerMatchId(roomId);
const fundA = castSend("createWager(uint256)", [matchId], ["--value", wagerWei]);
const fundB = castSend("createWager(uint256)", [matchId], ["--value", wagerWei]);

const started = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/start`, {});
let latestRoom = started.body?.room ?? null;
const moves = [
  [players[0].id, { column: 0 }],
  [players[1].id, { column: 1 }],
  [players[0].id, { column: 0 }],
  [players[1].id, { column: 1 }],
  [players[0].id, { column: 0 }],
  [players[1].id, { column: 1 }],
  [players[0].id, { column: 0 }],
];
const moveResults = [];
for (const [playerId, move] of moves) {
  const result = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, { playerId, move });
  moveResults.push({ status: result.status, roomStatus: result.body?.room?.status ?? null });
  latestRoom = result.body?.room ?? latestRoom;
}

const settlement = castSend("settleWinner(uint256,address)", [matchId, operatorAddress]);
const global = await request("/api/leaderboard?scope=global&mode=all");
const game = await request("/api/leaderboard?scope=game&mode=all&gameId=grid-four");
const wagerMode = await request("/api/leaderboard?scope=mode&mode=wager");
const wagerGameMode = await request("/api/leaderboard?scope=game-mode&mode=wager&gameId=grid-four");
const freeMode = await request("/api/leaderboard?scope=mode&mode=free");

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

const winnerId = latestRoom?.result?.winnerIds?.[0] ?? null;
const loserId = latestRoom?.result?.loserIds?.[0] ?? null;
const verified = {
  roomCreated: created.status === 200 && created.body?.room?.wagerWei === wagerWei,
  roomJoined: joined.status === 200 && joined.body?.room?.status === "ready",
  fundedTwice: fundA.status === "0x1" && fundB.status === "0x1",
  roomStartedAfterFunding: started.status === 200 && started.body?.room?.status === "active",
  matchFinished: latestRoom?.status === "finished" && winnerId === players[0].id,
  settlementMined: settlement.status === "0x1",
  globalIncludesWinner: hasEntry(global, players[0].id, { wins: 1 }),
  gameIncludesWinner: hasEntry(game, players[0].id, { wins: 1 }),
  wagerModeIncludesWinner: hasEntry(wagerMode, players[0].id, { wins: 1, wagerWins: 1 }),
  wagerGameModeIncludesWinner: hasEntry(wagerGameMode, players[0].id, { wins: 1, wagerWins: 1 }),
  freeModeDoesNotIncludeWagerWinner: !hasEntry(freeMode, players[0].id),
  loserIndexedInWagerMode: hasEntry(wagerMode, players[1].id, { losses: 1 }),
};

const status = Object.values(verified).every(Boolean) ? "passed" : "failed";
const evidence = {
  mode: "local-wager-leaderboard-api",
  status,
  checkedAt: new Date().toISOString(),
  baseUrl,
  roomId,
  matchId,
  wagerWei,
  players: players.map(({ id, displayName }) => ({ id, displayName })),
  winnerId,
  loserId,
  transactions: {
    fundA: txSummary(fundA),
    fundB: txSummary(fundB),
    settlement: txSummary(settlement),
  },
  api: {
    created: { status: created.status, roomStatus: created.body?.room?.status ?? null },
    joined: { status: joined.status, roomStatus: joined.body?.room?.status ?? null },
    started: { status: started.status, roomStatus: started.body?.room?.status ?? null },
    moveResults,
  },
  leaderboards: {
    global: entries(global).filter((entry) => entry.participantId.startsWith(`lbw-`)),
    game: entries(game).filter((entry) => entry.participantId.startsWith(`lbw-`)),
    wagerMode: entries(wagerMode).filter((entry) => entry.participantId.startsWith(`lbw-`)),
    wagerGameMode: entries(wagerGameMode).filter((entry) => entry.participantId.startsWith(`lbw-`)),
    freeMode: entries(freeMode).filter((entry) => entry.participantId.startsWith(`lbw-`)),
  },
  verified,
};

mkdirSync("evidence/live-proofs", { recursive: true });
writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (status !== "passed") {
  console.error(JSON.stringify(evidence, null, 2));
  process.exitCode = 1;
} else {
  console.log(`wager leaderboard proof OK: ${evidencePath}`);
}
