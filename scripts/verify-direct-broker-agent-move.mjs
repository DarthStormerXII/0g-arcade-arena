import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ethers } from "ethers";

const envFile =
  process.env.OG_ARCADE_LIVE_ENV ||
  "/Users/gabrielantonyxaviour/.codex/secrets/0g-arcade-arena/0g-live.env";
const baseUrl = process.env.ARCADE_BASE_URL ?? "http://localhost:3021";
const outFile = join(process.cwd(), "evidence/live-proofs/direct-broker-agent-move-2026-06-24.json");
const timeoutMs = Number(process.env.OG_COMPUTE_BROKER_TIMEOUT_MS || 30_000);
const minimumLedgerOg = Number(process.env.OG_COMPUTE_BROKER_MIN_LEDGER_OG || 3);
const autoFund = process.env.OG_COMPUTE_BROKER_AUTOFUND === "1";

function parseEnv(file) {
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
  }
  return env;
}

function hash(value) {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex")}`;
}

function safeMessage(error, privateKey) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(privateKey, "[redacted-private-key]").slice(0, 800);
}

async function withTimeout(label, task) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function providerAddress(service) {
  return String(
    service.provider ??
      service.providerAddress ??
      service.address ??
      service.serviceProvider ??
      service.provider_address ??
      "",
  );
}

function pickService(services) {
  const sanitized = services
    .map((service) => ({
      provider: providerAddress(service),
      serviceType: String(service.serviceType ?? service.type ?? service.name ?? "unknown"),
      model: String(service.model ?? service.modelName ?? service.serviceName ?? ""),
      verifiability: String(service.verifiability ?? service.verificationType ?? ""),
    }))
    .filter((service) => service.provider);
  return (
    sanitized.find((service) => /tee|teeml|tee-?tls/i.test(service.verifiability)) ??
    sanitized[0] ??
    null
  );
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("0G Compute response did not contain a JSON object.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeMove(value) {
  const move = value?.move ?? value;
  const column = Number(move?.column);
  if (!Number.isInteger(column) || column < 0 || column > 6) {
    throw new Error(`0G Compute returned an illegal Grid Four column: ${JSON.stringify(move)}`);
  }
  return { column };
}

function buildMessages() {
  const state = {
    gameId: "grid-four",
    objective: "Connect four pieces in a line before the opponent.",
    playerId: "agent-direct-broker",
    board: [
      ["human-direct-broker", null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
      [null, null, null, null, null, null],
    ],
    legalMoves: [0, 1, 2, 3, 4, 5, 6].map((column) => ({ column })),
  };
  return [
    {
      role: "system",
      content:
        "You are a 0G Arcade Arena agent. Choose exactly one legal move. Return only JSON with keys move, confidence, reasoningSummary, and risk.",
    },
    {
      role: "user",
      content: `Choose a legal Grid Four move for this state:\n${JSON.stringify(state)}\nReturn JSON only.`,
    },
  ];
}

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

async function submitComputedMove(move, computeProof) {
  const runId = Date.now().toString(36);
  const roomId = `broker-agent-${runId}`;
  const human = {
    id: "human-direct-broker",
    kind: "human",
    displayName: "Direct Broker Human",
    ownerWallet: "0x0000000000000000000000000000000000000001",
  };
  const agent = {
    id: "agent-direct-broker",
    kind: "agent",
    agentId: "agent-direct-broker",
    displayName: "Direct Broker Agent",
    ownerWallet: "0x0000000000000000000000000000000000000002",
  };
  const registered = await postJson("/api/agents", {
    agentId: agent.agentId,
    ownerWallet: agent.ownerWallet,
    displayName: agent.displayName,
    supportedGames: ["grid-four"],
    bankrollPolicy: "free direct-broker verification only",
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
  const humanMove = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, {
    playerId: human.id,
    move: { column: 0 },
  });
  const agentMove = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, {
    playerId: agent.id,
    move,
    computeProof,
  });
  const brokerColumn = Number(move.column);
  const targetColumn = brokerColumn === 0 ? 1 : 0;
  const manualAgentColumn = targetColumn === 6 ? 5 : 6;
  const completionMoves = [];
  let latestRoom = agentMove.body?.room ?? null;
  for (let index = 0; latestRoom?.status !== "finished" && index < 8; index += 1) {
    const currentPlayer = latestRoom?.currentPlayerIds?.[0];
    if (currentPlayer === human.id) {
      const result = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, {
        playerId: human.id,
        move: { column: targetColumn },
      });
      latestRoom = result.body?.room ?? latestRoom;
      completionMoves.push({ playerId: human.id, status: result.status, column: targetColumn });
    } else if (currentPlayer === agent.id) {
      const result = await postJson(`/api/rooms/${encodeURIComponent(roomId)}/move`, {
        playerId: agent.id,
        move: { column: manualAgentColumn },
      });
      latestRoom = result.body?.room ?? latestRoom;
      completionMoves.push({ playerId: agent.id, status: result.status, column: manualAgentColumn });
    } else {
      break;
    }
  }
  const proof = await request(`/api/proofs/match-${encodeURIComponent(roomId)}`);
  return {
    roomId,
    matchId: `match-${roomId}`,
    registered: { status: registered.status },
    created: { status: created.status },
    joined: { status: joined.status },
    started: { status: started.status },
    humanMove: { status: humanMove.status },
    agentMove: {
      status: agentMove.status,
      roomStatus: agentMove.body?.room?.status ?? null,
      currentPlayerIds: agentMove.body?.room?.currentPlayerIds ?? null,
      computeMode: agentMove.body?.room?.computeMode ?? null,
      computeProofCount: agentMove.body?.room?.computeProofs?.length ?? 0,
    },
    completion: {
      targetColumn,
      manualAgentColumn,
      moves: completionMoves,
      finalStatus: latestRoom?.status ?? null,
      winnerIds: latestRoom?.result?.winnerIds ?? [],
      replayHash: latestRoom?.replayHash ?? null,
      resultHash: latestRoom?.resultHash ?? null,
      computeMode: latestRoom?.computeMode ?? null,
      computeProofCount: latestRoom?.computeProofs?.length ?? 0,
    },
    proof: {
      status: proof.status,
      computeMode: proof.body?.proof?.computeMode ?? null,
      computeProofMode: proof.body?.proof?.computeProof?.mode ?? null,
      roomStatus: proof.body?.proof?.status ?? null,
    },
  };
}

mkdirSync(dirname(outFile), { recursive: true });

const artifact = {
  mode: "direct-broker-agent-move",
  status: "blocked",
  checkedAt: new Date().toISOString(),
  baseUrl,
  envFile,
  autofundEnabled: autoFund,
  minimumLedgerOg,
  wallet: { configured: false, address: null, nativeBalanceOg: null, canFundMinimumLedger: false },
  broker: { initialized: false, servicesListed: false, serviceCount: 0, preferredService: null, metadata: null },
  ledger: { readable: false, createdThisRun: false, error: null },
  compute: {
    requested: false,
    provider: null,
    endpointHost: null,
    model: null,
    requestId: null,
    requestHash: null,
    responseHash: null,
    teeVerified: null,
    move: null,
    error: null,
  },
  app: null,
  verified: {
    brokerInitialized: false,
    servicesListed: false,
    ledgerReady: false,
    liveComputeResponse: false,
    legalMove: false,
    appAcceptedComputedMove: false,
    matchFinishedAndIndexed: false,
  },
  reason: "",
};

if (!existsSync(envFile)) {
  artifact.reason = `missing env file ${envFile}`;
  writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`${outFile}: ${artifact.status}`);
  process.exit(0);
}

const env = parseEnv(envFile);
const privateKey = env.ZEROG_PRIVATE_KEY ?? "";
const rpcUrl = env.ZEROG_RPC || "https://evmrpc-testnet.0g.ai";

if (!privateKey) {
  artifact.reason = "Missing ZEROG_PRIVATE_KEY.";
  writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`${outFile}: ${artifact.status}`);
  process.exit(0);
}

try {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const balanceWei = await withTimeout("wallet balance", provider.getBalance(wallet.address));
  const balanceOg = Number(ethers.formatEther(balanceWei));
  artifact.wallet = {
    configured: true,
    address: wallet.address,
    nativeBalanceOg: ethers.formatEther(balanceWei),
    canFundMinimumLedger: balanceOg >= minimumLedgerOg,
  };

  const { createZGComputeNetworkBroker } = await import("@0gfoundation/0g-compute-ts-sdk");
  const broker = await withTimeout("broker initialization", createZGComputeNetworkBroker(wallet));
  artifact.broker.initialized = true;
  artifact.verified.brokerInitialized = true;

  const services = await withTimeout("broker service listing", broker.inference.listService());
  const serviceList = Array.isArray(services) ? services : [];
  const service = pickService(serviceList);
  artifact.broker.servicesListed = true;
  artifact.broker.serviceCount = serviceList.length;
  artifact.broker.preferredService = service;
  artifact.verified.servicesListed = Boolean(service);

  if (!service?.provider) {
    artifact.reason = "Direct broker listed no usable provider.";
    writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
    console.log(`${outFile}: ${artifact.status}`);
    process.exit(0);
  }

  const metadata = await withTimeout("broker service metadata", broker.inference.getServiceMetadata(service.provider));
  const endpoint = String(metadata.endpoint ?? "").replace(/\/$/, "");
  const model = String(metadata.model ?? service.model ?? "");
  artifact.broker.metadata = { endpoint, model };

  try {
    await withTimeout("broker ledger read", broker.ledger.getLedger());
    artifact.ledger.readable = true;
    artifact.verified.ledgerReady = true;
  } catch (error) {
    artifact.ledger.error = safeMessage(error, privateKey);
    if (!autoFund) {
      artifact.reason =
        "Direct broker ledger is not ready. Set OG_COMPUTE_BROKER_AUTOFUND=1 only after funding the project wallet and approving ledger creation.";
      writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
      console.log(`${outFile}: ${artifact.status}`);
      process.exit(0);
    }
    if (balanceOg < minimumLedgerOg) {
      artifact.reason = `Direct broker autofund needs at least ${minimumLedgerOg} 0G; wallet has ${ethers.formatEther(balanceWei)}.`;
      writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
      console.log(`${outFile}: ${artifact.status}`);
      process.exit(0);
    }
    await withTimeout("broker ledger creation", broker.ledger.addLedger(minimumLedgerOg));
    artifact.ledger.createdThisRun = true;
    artifact.ledger.readable = true;
    artifact.verified.ledgerReady = true;
  }

  const messages = buildMessages();
  const requestBody = { model, messages, temperature: 0.1 };
  artifact.compute.requested = true;
  artifact.compute.provider = service.provider;
  artifact.compute.endpointHost = new URL(endpoint).host;
  artifact.compute.model = model;
  artifact.compute.requestHash = hash(requestBody);

  const headers = await withTimeout(
    "broker request headers",
    broker.inference.getRequestHeaders(service.provider, JSON.stringify(requestBody)),
  );
  const response = await withTimeout(
    "broker chat completion",
    fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(requestBody),
    }),
  );
  const responseText = await response.text();
  artifact.compute.responseHash = hash(responseText);
  if (!response.ok) {
    artifact.compute.error = `HTTP ${response.status}: ${responseText.slice(0, 500)}`;
    artifact.reason = "Direct broker returned a non-OK response.";
    writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
    console.log(`${outFile}: ${artifact.status}`);
    process.exit(0);
  }

  const responseJson = JSON.parse(responseText);
  const content = responseJson.choices?.[0]?.message?.content;
  if (!content) throw new Error("Direct broker returned no assistant content.");
  const move = normalizeMove(extractJson(content));
  artifact.compute.move = move;
  artifact.verified.liveComputeResponse = true;
  artifact.verified.legalMove = true;

  const chatId = response.headers.get("ZG-Res-Key") || responseJson.x_0g_trace?.request_id || responseJson.id || "";
  artifact.compute.requestId = chatId || null;
  if (chatId) {
    try {
      artifact.compute.teeVerified = await withTimeout(
        "broker response verification",
        broker.inference.processResponse(service.provider, chatId),
      );
    } catch {
      artifact.compute.teeVerified = responseJson.x_0g_trace?.tee_verified ?? null;
    }
  }

  artifact.app = await submitComputedMove(move, {
    mode: "0g-compute",
    provider: service.provider,
    requestId: chatId || null,
    verified: artifact.compute.teeVerified === true,
    model,
    contentHash: artifact.compute.responseHash,
  });
  artifact.verified.appAcceptedComputedMove =
    artifact.app?.agentMove?.status === 200 &&
    artifact.app?.agentMove?.computeMode === "0g-compute" &&
    artifact.app?.proof?.computeMode === "0g-compute";
  artifact.verified.matchFinishedAndIndexed =
    artifact.app?.completion?.finalStatus === "finished" &&
    artifact.app?.proof?.status === 200 &&
    artifact.app?.proof?.roomStatus === "finished";
  artifact.status = Object.values(artifact.verified).every(Boolean) ? "passed" : "failed";
  artifact.reason =
    artifact.status === "passed"
      ? "Direct 0G Compute broker selected a legal Grid Four agent move; the app accepted it, completed the room, and indexed the proof as 0g-compute."
      : "Direct broker responded, but one or more app proof checks failed.";
} catch (error) {
  artifact.status = "blocked";
  artifact.compute.error = safeMessage(error, privateKey);
  artifact.reason = "Direct broker agent-move proof could not complete.";
}

writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`${outFile}: ${artifact.status}`);
