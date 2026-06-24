import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const outFile = join(root, "evidence/live-proofs/direct-broker-live-pipeline-2026-06-24.json");
const autoFund = process.env.OG_COMPUTE_BROKER_AUTOFUND === "1";

function runStep(label, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 16,
    env: process.env,
    ...options,
  });
  return {
    label,
    command: [command, ...args].join(" "),
    status: result.status,
    ok: result.status === 0,
    stdoutTail: result.stdout.trim().split(/\r?\n/).slice(-8),
    stderrTail: result.stderr.trim().split(/\r?\n/).slice(-8),
  };
}

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeArtifact(artifact) {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`${outFile}: ${artifact.status}`);
}

const directMovePath = join(root, "evidence/live-proofs/direct-broker-agent-move-2026-06-24.json");
const diagnosticPath = join(root, "evidence/live-proofs/0g-compute-broker-diagnostic-2026-06-24.json");
const steps = [];
const artifact = {
  mode: "direct-broker-live-pipeline",
  status: "blocked",
  checkedAt: new Date().toISOString(),
  autofundEnabled: autoFund,
  steps,
  roomId: null,
  evidence: {
    diagnostic: "evidence/live-proofs/0g-compute-broker-diagnostic-2026-06-24.json",
    directMove: "evidence/live-proofs/direct-broker-agent-move-2026-06-24.json",
    storage: null,
    chain: null,
  },
  verified: {
    diagnosticsRan: false,
    directBrokerMatchPassed: false,
    storageUploaded: false,
    chainCommitted: false,
  },
  reason: "",
};

steps.push(runStep("compute broker diagnostic", "pnpm", ["0g:compute-broker-diagnostic"]));
artifact.verified.diagnosticsRan = steps.at(-1)?.ok === true;

const directMoveEnv = {
  ...process.env,
  ...(autoFund ? { OG_COMPUTE_BROKER_AUTOFUND: "1" } : {}),
};
steps.push(runStep("direct broker agent move", "pnpm", ["0g:direct-broker-agent-move"], { env: directMoveEnv }));
const directMove = readJsonIfExists(directMovePath);
artifact.verified.directBrokerMatchPassed = directMove?.status === "passed";
artifact.roomId = directMove?.app?.roomId ?? null;

if (!artifact.verified.directBrokerMatchPassed) {
  const diagnostic = readJsonIfExists(diagnosticPath);
  artifact.reason =
    directMove?.reason ??
    diagnostic?.reason ??
    "Direct broker match did not pass; storage and chain steps were skipped.";
  writeArtifact(artifact);
  process.exit(0);
}

if (!artifact.roomId) {
  artifact.status = "failed";
  artifact.reason = "Direct broker match passed but did not expose app.roomId.";
  writeArtifact(artifact);
  process.exit(1);
}

steps.push(runStep("upload direct broker room replay", "pnpm", ["0g:upload-room-replay", artifact.roomId]));
const storagePath = join(root, "evidence/live-proofs", `0g-storage-room-${artifact.roomId}.json`);
const storageProof = readJsonIfExists(storagePath);
artifact.evidence.storage = `evidence/live-proofs/0g-storage-room-${artifact.roomId}.json`;
artifact.verified.storageUploaded = steps.at(-1)?.ok === true && storageProof?.reachable === true;

if (!artifact.verified.storageUploaded) {
  artifact.status = "failed";
  artifact.reason = "Direct broker match passed, but replay upload did not produce reachable 0G Storage evidence.";
  writeArtifact(artifact);
  process.exit(1);
}

steps.push(runStep("commit direct broker match result", "pnpm", ["chain:commit-actual-match", artifact.roomId]));
const chainPath = join(root, "evidence/live-proofs", `chain-actual-match-${artifact.roomId}.json`);
const chainProof = readJsonIfExists(chainPath);
artifact.evidence.chain = `evidence/live-proofs/chain-actual-match-${artifact.roomId}.json`;
artifact.verified.chainCommitted =
  steps.at(-1)?.ok === true &&
  chainProof?.status === "passed" &&
  chainProof?.committed?.wagered === false &&
  chainProof?.committed?.computeMode === "0g-compute";

artifact.status = Object.values(artifact.verified).every(Boolean) ? "passed" : "failed";
artifact.reason =
  artifact.status === "passed"
    ? "Direct broker live Compute match completed, replay uploaded to 0G Storage, and result committed to live Galileo."
    : "Direct broker pipeline finished, but one or more evidence checks failed.";
writeArtifact(artifact);
if (artifact.status !== "passed") process.exit(1);
