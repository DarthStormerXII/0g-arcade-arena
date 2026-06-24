import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ethers } from "ethers";
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";

const envFile =
  process.env.OG_ARCADE_LIVE_ENV ||
  "/Users/gabrielantonyxaviour/.codex/secrets/0g-arcade-arena/0g-live.env";
const roomId = process.argv[2];
const baseUrl = process.env.OG_ARCADE_LOCAL_URL || "http://localhost:3021";

if (!roomId) {
  console.error("usage: pnpm 0g:upload-room-replay <room-id>");
  process.exit(1);
}

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

async function fetchRoom() {
  const response = await fetch(`${baseUrl}/api/rooms/${encodeURIComponent(roomId)}`);
  const payload = await response.json();
  if (!response.ok || !payload.ok || !payload.room) {
    throw new Error(payload.error ?? `room fetch failed with ${response.status}`);
  }
  return payload.room;
}

async function storageReachable(indexerUrl, rootHash) {
  const url = `${indexerUrl}/file?root=${rootHash}`;
  const head = await fetch(url, { method: "HEAD" }).catch(() => null);
  if (head && [200, 206, 308].includes(head.status)) return true;
  const get = await fetch(url, { method: "GET" }).catch(() => null);
  return Boolean(get && [200, 206, 308].includes(get.status));
}

if (!existsSync(envFile)) {
  console.error(`missing live env file: ${envFile}`);
  process.exit(1);
}

const env = parseEnv(envFile);
for (const key of ["ZEROG_PRIVATE_KEY", "ZEROG_RPC", "ZEROG_INDEXER"]) {
  if (!env[key]) {
    console.error(`missing ${key} in ${envFile}`);
    process.exit(1);
  }
}

const room = await fetchRoom();
if (!room.replay || !room.result) {
  throw new Error(`room ${roomId} has no completed replay/result`);
}

const uploadPayload = {
  schema: "0g-arcade-room-replay@1",
  uploadedAt: new Date().toISOString(),
  roomId: room.roomId,
  matchId: room.matchId,
  gameId: room.gameId,
  players: room.players,
  replay: room.replay,
  result: room.result,
  score: room.score,
  replayHash: room.replayHash,
  resultHash: room.resultHash,
  wagerWei: room.wagerWei,
  computeMode: room.computeMode ?? "deterministic-fallback",
  computeProofs: room.computeProofs ?? [],
};

const bytes = new TextEncoder().encode(JSON.stringify(uploadPayload));
const data = new MemData(bytes);
const [tree, treeErr] = await data.merkleTree();
if (treeErr !== null) throw new Error(`merkle: ${treeErr}`);
const computedRoot = tree?.rootHash() ?? "";

const provider = new ethers.JsonRpcProvider(env.ZEROG_RPC);
const signer = new ethers.Wallet(env.ZEROG_PRIVATE_KEY, provider);
const indexer = new Indexer(env.ZEROG_INDEXER);
const [tx, uploadErr] = await indexer.upload(data, env.ZEROG_RPC, signer);
if (uploadErr !== null) throw new Error(`upload: ${uploadErr}`);

const rootHash = tx?.rootHash ?? computedRoot;
const txHash = tx?.txHash ?? "";
const reachable = await storageReachable(env.ZEROG_INDEXER, rootHash);
const evidence = {
  checkedAt: new Date().toISOString(),
  mode: "live-0g-storage-room-replay",
  roomId: room.roomId,
  matchId: room.matchId,
  gameId: room.gameId,
  replayHash: room.replayHash,
  resultHash: room.resultHash,
  wagerWei: room.wagerWei,
  computeMode: uploadPayload.computeMode,
  computeProofCount: uploadPayload.computeProofs.length,
  payloadSha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  rootHash,
  txHash,
  reachable,
  indexerUrl: env.ZEROG_INDEXER,
  uploader: signer.address,
};

const outFile = join(process.cwd(), "evidence/live-proofs", `0g-storage-room-${room.roomId}.json`);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, evidenceFile: outFile, rootHash, txHash, reachable }, null, 2));
