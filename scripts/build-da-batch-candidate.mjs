import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outFile = "evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json";
const checkedAt = "2026-06-24T07:48:30.335Z";
const routerWagerProofFile = "evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json";
const routerWagerRoomId = existsSync(routerWagerProofFile) ? readJson(routerWagerProofFile).roomId : null;
const multigameRouterProofFile = "evidence/live-proofs/multigame-router-compute-api-2026-06-24.json";
const multigameRouterRoomIds = existsSync(multigameRouterProofFile)
  ? readJson(multigameRouterProofFile).rooms?.map((room) => room.roomId) ?? []
  : [];
const roomStorageFiles = [
  "evidence/live-proofs/0g-storage-room-gr-zqvy.json",
  "evidence/live-proofs/0g-storage-room-h2a-wager-mqr1xs1b.json",
  "evidence/live-proofs/0g-storage-room-router-compute-mqrwdmmf.json",
  routerWagerRoomId ? `evidence/live-proofs/0g-storage-room-${routerWagerRoomId}.json` : null,
  ...multigameRouterRoomIds.map((roomId) => `evidence/live-proofs/0g-storage-room-${roomId}.json`),
].filter(Boolean);
const chainFiles = [
  "evidence/live-proofs/chain-actual-match-gr-zqvy.json",
  "evidence/live-proofs/chain-actual-match-h2a-wager-mqr1xs1b.json",
  "evidence/live-proofs/chain-actual-match-router-compute-mqrwdmmf.json",
  routerWagerRoomId ? `evidence/live-proofs/chain-actual-match-${routerWagerRoomId}.json` : null,
  ...multigameRouterRoomIds.map((roomId) => `evidence/live-proofs/chain-actual-match-${roomId}.json`),
].filter(Boolean);
const gamePackFiles = [
  "evidence/live-proofs/0g-storage-game-pack-grid-four.json",
  "evidence/live-proofs/0g-storage-game-pack-fleet-duel.json",
  "evidence/live-proofs/0g-storage-game-pack-tile-race.json",
  "evidence/live-proofs/0g-storage-game-pack-world-cup-draft.json",
];
const proofArtifactFile = "evidence/live-proofs/0g-storage-proof-artifacts-2026-06-24.json";

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function sha256Hex(value) {
  return `0x${createHash("sha256").update(value).digest("hex")}`;
}

const roomStorage = roomStorageFiles.map((file) => ({ file, evidence: readJson(file) }));
const chainProofs = chainFiles.map((file) => ({ file, evidence: readJson(file) }));
const gamePacks = gamePackFiles.map((file) => ({ file, evidence: readJson(file) }));
const proofArtifact = { file: proofArtifactFile, evidence: readJson(proofArtifactFile) };

const matches = roomStorage.map(({ file, evidence }) => {
  const chain = chainProofs.find((item) => item.evidence.roomId === evidence.roomId)?.evidence;
  return {
    roomId: evidence.roomId,
    matchId: evidence.matchId,
    gameId: evidence.gameId,
    replayHash: evidence.payloadSha256,
    resultHash: chain?.committed?.resultHash ?? evidence.resultHash,
    storageRoot: evidence.rootHash,
    storageTx: evidence.txHash,
    chainMatchId: chain?.onchainMatchId ?? null,
    chainCommitTx: chain?.transactions?.commitResult?.txHash ?? null,
  };
});

const payload = canonicalize({
  schema: "0g-arcade-da-batch@1",
  createdFor: "0g-zero-cup-localhost-first-e2e",
  chainId: 16602,
  daMode: "candidate-not-published",
  matches,
  gamePacks: gamePacks.map(({ evidence }) => ({
    gameId: evidence.gameId,
    storageRoot: evidence.rootHash,
    payloadSha256: evidence.payloadSha256,
  })),
  proofArtifacts: {
    schema: proofArtifact.evidence.schema,
    storageRoot: proofArtifact.evidence.rootHash,
    payloadSha256: proofArtifact.evidence.payloadSha256,
    artifactTypes: proofArtifact.evidence.artifactTypes,
  },
});

const canonicalPayload = JSON.stringify(payload);
const evidence = {
  mode: "0g-da-batch-candidate",
  status: "not-published",
  checkedAt,
  schema: payload.schema,
  daMode: payload.daMode,
  chainId: payload.chainId,
  batchHash: sha256Hex(canonicalPayload),
  payloadSha256: `sha256:${sha256Hex(canonicalPayload).slice(2)}`,
  sourceEvidence: [
    ...roomStorage.map((item) => item.file),
    ...chainProofs.map((item) => item.file),
    ...gamePacks.map((item) => item.file),
    proofArtifact.file,
  ],
  payload,
  verified: {
    hasPublishedStorageRoots: matches.every((item) => /^0x[a-fA-F0-9]{64}$/.test(item.storageRoot)),
    hasChainCommitTxs: matches.every((item) => /^0x[a-fA-F0-9]{64}$/.test(item.chainCommitTx ?? "")),
    hasAllGamePacks: payload.gamePacks.length === 4,
    hasProofArtifactBundle: /^0x[a-fA-F0-9]{64}$/.test(payload.proofArtifacts.storageRoot),
    doesNotClaimLiveDaPublication: payload.daMode === "candidate-not-published",
  },
  notes:
    "0G DA client credentials are not configured in this project. This file is the exact deterministic batch payload/hash Arcade would publish once a DA path is available; it is not a live DA publication claim.",
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(join(process.cwd(), outFile), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${outFile}: ${evidence.batchHash}`);
