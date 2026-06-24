import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const rpcUrl = process.env.OG_ARCADE_RPC_URL || "https://evmrpc-testnet.0g.ai";
const privateKey = process.env.OG_ARCADE_OPERATOR_PRIVATE_KEY;
const operator = process.env.OG_ARCADE_OPERATOR_ADDRESS;
const explorer = "https://chainscan-galileo.0g.ai";
const roomId = process.argv[2] || "gr-zqvy";
const txFeeArgs = [
  "--gas-price",
  process.env.OG_ARCADE_GAS_PRICE || "3gwei",
  "--priority-gas-price",
  process.env.OG_ARCADE_PRIORITY_GAS_PRICE || "2gwei",
];

if (!privateKey || !operator) {
  console.error("missing OG_ARCADE_OPERATOR_PRIVATE_KEY or OG_ARCADE_OPERATOR_ADDRESS");
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
    ...options,
  });
  if (result.status !== 0) {
    const message = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args[0] || ""} failed\n${message}`);
  }
  return result.stdout.trim();
}

function cast(args) {
  return run("cast", [...args, "--rpc-url", rpcUrl]);
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function numberFromHex(value) {
  if (value == null) return null;
  return Number(typeof value === "string" && value.startsWith("0x") ? BigInt(value) : value);
}

function txHashFrom(output) {
  const hash = output.match(/0x[a-fA-F0-9]{64}/)?.[0];
  if (!hash) throw new Error(`could not parse transaction hash from output: ${output}`);
  return hash;
}

function receiptFor(txHash) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = spawnSync("cast", ["receipt", txHash, "--rpc-url", rpcUrl, "--json", "--async"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 4,
    });
    if (result.status === 0 && result.stdout.trim()) return JSON.parse(result.stdout);
    sleep(2000);
  }
  throw new Error(`receipt not found for ${txHash}`);
}

function send(address, signature, args = []) {
  const txHash = txHashFrom(run("cast", [
    "send",
    address,
    signature,
    ...args,
    "--rpc-url",
    rpcUrl,
    "--private-key",
    privateKey,
    "--async",
    ...txFeeArgs,
  ]));
  const receipt = receiptFor(txHash);
  if (receipt.status !== "0x1") throw new Error(`transaction failed: ${txHash}`);
  return {
    txHash,
    blockNumber: numberFromHex(receipt.blockNumber),
    gasUsed: numberFromHex(receipt.gasUsed),
    status: receipt.status,
  };
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function bytes32Text(value) {
  const bytes = Buffer.from(value);
  if (bytes.length > 32) throw new Error(`bytes32 text too long: ${value}`);
  return `0x${Buffer.concat([bytes, Buffer.alloc(32 - bytes.length)]).toString("hex")}`;
}

function sha256Json(value) {
  return `0x${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

function sha256Text(value) {
  return `0x${createHash("sha256").update(value).digest("hex")}`;
}

function storagePayloadHash(storageProof) {
  const value = String(storageProof.payloadSha256 || "");
  const hash = value.startsWith("sha256:") ? value.slice("sha256:".length) : "";
  if (!/^[a-fA-F0-9]{64}$/.test(hash)) throw new Error("storage proof payloadSha256 is not a sha256 hash");
  return `0x${hash}`;
}

function sourceRoomId(proof) {
  return proof.roomId ?? proof.app?.roomId ?? proof.acceptedRoom?.roomId ?? null;
}

function sourceProofForRoom(proof, targetRoomId) {
  if (sourceRoomId(proof) === targetRoomId) return proof;
  const room = proof.rooms?.find?.((item) => item.roomId === targetRoomId);
  if (!room) return null;
  return {
    mode: `${proof.mode}-room`,
    status: proof.status,
    checkedAt: proof.checkedAt,
    roomId: room.roomId,
    matchId: room.matchId,
    gameId: room.gameId,
    wagerWei: "0",
    completion: {
      finalStatus: room.final?.status ?? null,
      winnerIds: room.final?.winnerIds ?? [],
      replayHash: room.final?.replayHash ?? null,
      resultHash: room.final?.resultHash ?? null,
      computeMode: room.final?.computeMode ?? null,
      computeProofCount: room.final?.computeProofCount ?? 0,
    },
    routerAgentMove: room.routerAgentMove ?? null,
    proof: room.proof ?? null,
    parentEvidence: {
      mode: proof.mode,
      checkedAt: proof.checkedAt,
      status: proof.status,
    },
  };
}

function sourceMatchId(proof) {
  return proof.matchId ?? proof.app?.matchId ?? (sourceRoomId(proof) ? `match-${sourceRoomId(proof)}` : null);
}

function sourceGameId(proof, storageProof) {
  return proof.gameId ?? proof.app?.gameId ?? proof.acceptedRoom?.gameId ?? storageProof.gameId ?? "grid-four";
}

function sourceWagered(proof, storageProof) {
  const wagerWei = proof.wagerWei ?? proof.app?.wagerWei ?? proof.acceptedRoom?.wagerWei ?? storageProof.wagerWei ?? "0";
  return String(wagerWei) !== "0";
}

function sourceComputeClaim(proof) {
  if (proof.mode === "router-compute-agent-match" && proof.status === "passed") {
    return "The completed match includes at least one 0G testnet Router-selected agent move, and the app proof index recorded computeMode=0g-compute.";
  }
  if (proof.mode === "direct-broker-agent-move" && proof.status === "passed") {
    return "The completed match includes at least one direct 0G Compute broker-selected agent move, and the app proof index recorded computeMode=0g-compute.";
  }
  if (proof.expectedComputeMode === "0g-compute" && proof.verified?.agentMovesUseRouterCompute === true) {
    return "The completed wager match includes live 0G testnet Router-selected agent moves, and the app proof index recorded computeMode=0g-compute.";
  }
  if (proof.mode === "multigame-router-compute-api-room" && proof.routerAgentMove?.computeMode === "0g-compute") {
    return "The completed non-Grid match includes a live 0G testnet Router-selected legal agent move, and the app proof index recorded computeMode=0g-compute.";
  }
  return "No live 0G Compute execution is claimed by this proof.";
}

function sourceEvidenceKey(proof) {
  if (proof.mode === "router-compute-agent-match") return "routerCompute";
  if (proof.mode === "multigame-router-compute-api-room") return "multigameRouterCompute";
  if (proof.mode === "direct-broker-agent-move") return "directBroker";
  if (proof.mode?.includes?.("agent")) return "agentWager";
  return "wager";
}

const chainProofPath = join(root, "evidence/live-proofs/chain-check-latest.json");
const storageProofPath = join(root, `evidence/live-proofs/0g-storage-room-${roomId}.json`);

for (const file of [chainProofPath, storageProofPath]) {
  if (!existsSync(file)) throw new Error(`missing required evidence: ${file}`);
}

const sourceProofCandidates = [
  join(root, "evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json"),
  join(root, "evidence/live-proofs/agent-wager-match-api-2026-06-24.json"),
  join(root, "evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json"),
  join(root, "evidence/live-proofs/direct-broker-agent-move-2026-06-24.json"),
  join(root, "evidence/live-proofs/router-compute-agent-match-2026-06-24.json"),
  join(root, "evidence/live-proofs/multigame-router-compute-api-2026-06-24.json"),
];
const sourceProofPath = sourceProofCandidates.find((file) => {
  if (!existsSync(file)) return false;
  try {
    return sourceProofForRoom(readJson(file), roomId) !== null;
  } catch {
    return false;
  }
});
if (!sourceProofPath) throw new Error(`missing source match evidence for room ${roomId}`);

const chainProof = readJson(chainProofPath);
const sourceProof = sourceProofForRoom(readJson(sourceProofPath), roomId);
const storageProof = readJson(storageProofPath);
const matchRegistry = chainProof.deployments?.ArcadeMatchRegistry?.address;
if (!/^0x[a-fA-F0-9]{40}$/.test(matchRegistry || "")) throw new Error("chain proof is missing ArcadeMatchRegistry address");
if (!sourceProof || sourceRoomId(sourceProof) !== roomId || storageProof.roomId !== roomId) {
  throw new Error(`evidence does not match room ${roomId}`);
}
if (storageProof.reachable !== true) throw new Error(`storage root is not reachable for room ${roomId}`);

const chainId = cast(["chain-id"]);
if (chainId !== "16602") throw new Error(`expected chain id 16602, got ${chainId}`);

const nextMatchId = cast(["call", matchRegistry, "nextMatchId()(uint256)"]);
const gameId = bytes32Text(sourceGameId(sourceProof, storageProof));
const wagered = sourceWagered(sourceProof, storageProof);
const settlementTx =
  sourceProof.transactions?.settlement?.transactionHash ??
  sourceProof.transactions?.find?.((tx) => tx.type === "settle")?.transactionHash ??
  null;
const sourceResult =
  sourceProof.roomResult ?? {
    status:
      sourceProof.api?.proof?.roomStatus ??
      sourceProof.app?.completion?.finalStatus ??
      sourceProof.completion?.finalStatus ??
      "finished",
    winnerIds: sourceProof.winnerId
      ? [sourceProof.winnerId]
      : (sourceProof.app?.completion?.winnerIds ?? sourceProof.completion?.winnerIds ?? []),
    loserIds: sourceProof.loserId ? [sourceProof.loserId] : [],
    replayHash: storageProof.replayHash,
    resultHash: storageProof.resultHash,
    computeMode: storageProof.computeMode ?? sourceProof.app?.completion?.computeMode ?? sourceProof.completion?.computeMode ?? null,
  };
const appMatchId =
  typeof sourceProof.matchId === "string" && sourceProof.matchId.startsWith("match-")
    ? sourceProof.matchId
    : sourceProof.api?.proof?.matchId ?? sourceMatchId(sourceProof) ?? storageProof.matchId;
const resultHash = sha256Json({
  roomId: sourceRoomId(sourceProof),
  matchId: appMatchId,
  result: sourceResult,
  settlementTx,
});
const replayHash = storagePayloadHash(storageProof);
const storageUri = `0g://storage/${storageProof.rootHash}`;
const storageUriHash = sha256Text(storageUri);

const transactions = {
  createMatch: send(matchRegistry, "createMatch(bytes32,bool)", [gameId, String(wagered)]),
  commitResult: send(matchRegistry, "commitResult(uint256,bytes32,bytes32,string)", [
    nextMatchId,
    resultHash,
    replayHash,
    storageUri,
  ]),
};

const stored = cast([
  "call",
  matchRegistry,
  "matches(uint256)(bytes32,address,bool,bytes32,bytes32,string,bool)",
  nextMatchId,
]);
const verified = {
  createMatchMined: transactions.createMatch.status === "0x1",
  commitResultMined: transactions.commitResult.status === "0x1",
  storedGameId: stored.includes(gameId),
  storedCreator: stored.toLowerCase().includes(operator.toLowerCase()),
  storedWagered: wagered ? /\btrue\b/.test(stored) : /\bfalse\b/.test(stored),
  storedResultHash: stored.includes(resultHash),
  storedReplayHash: stored.includes(replayHash),
  storedStorageUri: stored.includes(storageUri),
};

const proof = {
  mode: "live-0g-galileo-actual-match-result",
  status: Object.values(verified).every(Boolean) ? "passed" : "failed",
  verifiedAt: new Date().toISOString(),
  chainId: Number(chainId),
  rpcUrl,
  explorer,
  operator,
  roomId,
  matchId: appMatchId,
  onchainMatchId: nextMatchId,
  contract: {
    name: "ArcadeMatchRegistry",
    address: matchRegistry,
  },
  sourceEvidence: {
    [sourceEvidenceKey(sourceProof)]: sourceProofPath.replace(`${root}/`, ""),
    storage: `evidence/live-proofs/0g-storage-room-${roomId}.json`,
    chainDeployments: "evidence/live-proofs/chain-check-latest.json",
  },
  committed: {
    gameId,
    resultHash,
    replayHash,
    appReplayHash: sourceResult?.replayHash ?? storageProof.replayHash,
    appResultHash: sourceResult?.resultHash ?? storageProof.resultHash,
    storageRoot: storageProof.rootHash,
    storageUri,
    storageUriHash,
    wagered,
    computeMode: sourceResult.computeMode,
  },
  transactions,
  stored,
  verified,
  claims: {
    chain: `The completed ${wagered ? "wager" : "free"} match result and reachable 0G Storage replay root were committed to the live Galileo ArcadeMatchRegistry.`,
    storage: "The committed replayHash is the sha256 payload hash from the reachable 0G Storage room replay evidence.",
    compute: sourceComputeClaim(sourceProof),
    da: "No 0G DA publication is claimed by this proof.",
  },
};

const outDir = join(root, "evidence/live-proofs");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `chain-actual-match-${roomId}.json`);
writeFileSync(outFile, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify({ ok: proof.status === "passed", evidenceFile: outFile, proof }, null, 2));
if (proof.status !== "passed") process.exitCode = 1;
