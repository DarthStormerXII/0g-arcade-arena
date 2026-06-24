import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ethers } from "ethers";
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";

const envFile =
  process.env.OG_ARCADE_LIVE_ENV ||
  "/Users/gabrielantonyxaviour/.codex/secrets/0g-arcade-arena/0g-live.env";
const root = process.cwd();
const outFile = join(root, "evidence/live-proofs/0g-storage-proof-artifacts-2026-06-24.json");

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

function readJson(file) {
  return JSON.parse(readFileSync(join(root, file), "utf8"));
}

function shaFile(file) {
  return `sha256:${createHash("sha256").update(readFileSync(join(root, file))).digest("hex")}`;
}

async function storageReachable(indexerUrl, rootHash) {
  const url = `${indexerUrl}/file?root=${rootHash}`;
  const head = await fetch(url, { method: "HEAD" }).catch(() => null);
  if (head && [200, 206, 308].includes(head.status)) return true;
  const get = await fetch(url, { method: "GET" }).catch(() => null);
  return Boolean(get && [200, 206, 308].includes(get.status));
}

for (const file of [
  "evidence/live-proofs/game-submission-workflow-2026-06-24.json",
  "evidence/live-proofs/agent-wager-match-api-2026-06-24.json",
  "evidence/live-proofs/chain-actual-match-gr-zqvy.json",
  "evidence/live-proofs/0g-storage-room-gr-zqvy.json",
]) {
  if (!existsSync(join(root, file))) {
    console.error(`missing source artifact ${file}`);
    process.exit(1);
  }
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

const submission = readJson("evidence/live-proofs/game-submission-workflow-2026-06-24.json");
const agentWager = readJson("evidence/live-proofs/agent-wager-match-api-2026-06-24.json");
const chainMatch = readJson("evidence/live-proofs/chain-actual-match-gr-zqvy.json");
const storageRoom = readJson("evidence/live-proofs/0g-storage-room-gr-zqvy.json");

const agentTurns = (agentWager.api?.moveResults ?? [])
  .filter((item) => item.kind === "agent" && item.agentMove)
  .map((item, index) => ({
    turnIndex: index + 1,
    move: item.agentMove.move,
    computeMode: item.agentMove.computeMode,
    fallbackReason: item.agentMove.fallbackReason ?? null,
  }));

const payload = {
  schema: "0g-arcade-proof-artifacts@1",
  artifactDate: "2026-06-24",
  sourceFiles: {
    submissionReview: {
      path: "evidence/live-proofs/game-submission-workflow-2026-06-24.json",
      sha256: shaFile("evidence/live-proofs/game-submission-workflow-2026-06-24.json"),
    },
    agentWagerMatch: {
      path: "evidence/live-proofs/agent-wager-match-api-2026-06-24.json",
      sha256: shaFile("evidence/live-proofs/agent-wager-match-api-2026-06-24.json"),
    },
    chainMatch: {
      path: "evidence/live-proofs/chain-actual-match-gr-zqvy.json",
      sha256: shaFile("evidence/live-proofs/chain-actual-match-gr-zqvy.json"),
    },
    storageRoom: {
      path: "evidence/live-proofs/0g-storage-room-gr-zqvy.json",
      sha256: shaFile("evidence/live-proofs/0g-storage-room-gr-zqvy.json"),
    },
  },
  submissionReviewReceipt: {
    type: "submission-review-receipt",
    status: submission.status,
    reviewedFlow: "pull-request-only-game-pack-submission",
    verified: submission.verified,
    repository: submission.repository,
    gamePacks: (submission.gamePacks ?? []).map((game) => ({
      id: game.id,
      name: game.name,
      cover: game.files?.cover === true,
      logo: game.files?.logo === true,
      hashesMatch: Object.values(game.hashes ?? {}).every(Boolean),
    })),
  },
  shareCardMetadata: {
    type: "share-card-metadata",
    product: "0G Arcade Arena",
    matchId: chainMatch.matchId,
    roomId: chainMatch.roomId,
    gameId: "grid-four",
    resultHash: chainMatch.committed?.resultHash,
    replayPayloadHash: chainMatch.committed?.replayHash,
    appReplayHash: chainMatch.committed?.appReplayHash,
    appResultHash: chainMatch.committed?.appResultHash,
    storageUri: chainMatch.committed?.storageUri,
    storageRoot: storageRoom.rootHash,
    chainTx: chainMatch.transactions?.commitResult?.txHash,
    text: `Grid Four result proof: replay ${chainMatch.committed?.appReplayHash}; storage ${chainMatch.committed?.storageUri}; chain ${chainMatch.transactions?.commitResult?.txHash}. Challenge this agent on 0G Arcade Arena.`,
  },
  agentReasoningTranscript: {
    type: "agent-reasoning-transcript",
    privacy: "non-sensitive move summary only; no hidden chain-of-thought",
    roomId: agentWager.roomId,
    matchId: agentWager.api?.proof?.matchId,
    agentId: "agent-wager-warden-mqr1xs1b",
    computeMode: agentWager.api?.proof?.computeMode,
    turns: agentTurns,
    verified: {
      agentMovedThreeTimes: agentWager.verified?.agentMovedThreeTimes === true,
      fallbackDisclosed: agentWager.verified?.agentMovesUseFallbackWhileComputeBlocked === true,
      proofIndexed: agentWager.verified?.proofIndexed === true,
    },
  },
};

const bytes = new TextEncoder().encode(JSON.stringify(payload));
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
  mode: "live-0g-storage-proof-artifacts",
  schema: payload.schema,
  artifactTypes: ["submission-review-receipt", "share-card-metadata", "agent-reasoning-transcript"],
  payloadSha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  rootHash,
  txHash,
  reachable,
  indexerUrl: env.ZEROG_INDEXER,
  uploader: signer.address,
  sourceFiles: payload.sourceFiles,
  verified: {
    submissionReviewReceiptIncluded: payload.submissionReviewReceipt.status === "passed",
    shareCardMetadataIncluded: Boolean(payload.shareCardMetadata.storageUri && payload.shareCardMetadata.chainTx),
    agentReasoningTranscriptIncluded: payload.agentReasoningTranscript.turns.length === 3,
    agentFallbackDisclosed: payload.agentReasoningTranscript.verified.fallbackDisclosed,
  },
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, evidenceFile: outFile, rootHash, txHash, reachable }, null, 2));
