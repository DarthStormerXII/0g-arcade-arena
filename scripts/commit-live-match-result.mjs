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

const chainProofPath = join(root, "evidence/live-proofs/chain-check-latest.json");
const storageProofPath = join(root, `evidence/live-proofs/0g-storage-room-${roomId}.json`);

for (const file of [chainProofPath, storageProofPath]) {
  if (!existsSync(file)) throw new Error(`missing required evidence: ${file}`);
}

const sourceProofCandidates = [
  join(root, "evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json"),
  join(root, "evidence/live-proofs/agent-wager-match-api-2026-06-24.json"),
];
const sourceProofPath = sourceProofCandidates.find((file) => {
  if (!existsSync(file)) return false;
  try {
    return readJson(file).roomId === roomId;
  } catch {
    return false;
  }
});
if (!sourceProofPath) throw new Error(`missing source wager evidence for room ${roomId}`);

const chainProof = readJson(chainProofPath);
const sourceProof = readJson(sourceProofPath);
const storageProof = readJson(storageProofPath);
const matchRegistry = chainProof.deployments?.ArcadeMatchRegistry?.address;
if (!/^0x[a-fA-F0-9]{40}$/.test(matchRegistry || "")) throw new Error("chain proof is missing ArcadeMatchRegistry address");
if (sourceProof.roomId !== roomId || storageProof.roomId !== roomId) throw new Error(`evidence does not match room ${roomId}`);
if (storageProof.reachable !== true) throw new Error(`storage root is not reachable for room ${roomId}`);

const chainId = cast(["chain-id"]);
if (chainId !== "16602") throw new Error(`expected chain id 16602, got ${chainId}`);

const nextMatchId = cast(["call", matchRegistry, "nextMatchId()(uint256)"]);
const gameId = bytes32Text(sourceProof.gameId ?? storageProof.gameId ?? "grid-four");
const settlementTx =
  sourceProof.transactions?.settlement?.transactionHash ??
  sourceProof.transactions?.find?.((tx) => tx.type === "settle")?.transactionHash ??
  null;
const sourceResult =
  sourceProof.roomResult ?? {
    status: sourceProof.api?.proof?.roomStatus ?? "finished",
    winnerIds: sourceProof.winnerId ? [sourceProof.winnerId] : [],
    loserIds: sourceProof.loserId ? [sourceProof.loserId] : [],
    replayHash: storageProof.replayHash,
    resultHash: storageProof.resultHash,
  };
const appMatchId =
  typeof sourceProof.matchId === "string" && sourceProof.matchId.startsWith("match-")
    ? sourceProof.matchId
    : sourceProof.api?.proof?.matchId ?? storageProof.matchId;
const resultHash = sha256Json({
  roomId: sourceProof.roomId,
  matchId: appMatchId,
  result: sourceResult,
  settlementTx,
});
const replayHash = storagePayloadHash(storageProof);
const storageUri = `0g://storage/${storageProof.rootHash}`;
const storageUriHash = sha256Text(storageUri);

const transactions = {
  createMatch: send(matchRegistry, "createMatch(bytes32,bool)", [gameId, "true"]),
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
  storedWagered: /\btrue\b/.test(stored),
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
    wager: sourceProofPath.replace(`${root}/`, ""),
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
  },
  transactions,
  stored,
  verified,
  claims: {
    chain: "The completed browser wager match result and reachable 0G Storage replay root were committed to the live Galileo ArcadeMatchRegistry.",
    storage: "The committed replayHash is the sha256 payload hash from the reachable 0G Storage room replay evidence.",
    compute: "No live 0G Compute execution is claimed by this proof.",
    da: "No 0G DA publication is claimed by this proof.",
  },
};

const outDir = join(root, "evidence/live-proofs");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, `chain-actual-match-${roomId}.json`);
writeFileSync(outFile, `${JSON.stringify(proof, null, 2)}\n`);
console.log(JSON.stringify({ ok: proof.status === "passed", evidenceFile: outFile, proof }, null, 2));
if (proof.status !== "passed") process.exitCode = 1;
