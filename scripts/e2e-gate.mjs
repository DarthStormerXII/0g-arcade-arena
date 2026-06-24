import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const mode = process.argv[2];
const validModes = new Set(["local", "live-0g"]);
const baseUrl = process.env.ARCADE_BASE_URL ?? process.env.ARCADE_LOCAL_URL ?? "http://localhost:3021";
const outFile =
  mode === "live-0g"
    ? "evidence/live-proofs/e2e-live-0g-gate-2026-06-24.json"
    : "evidence/live-proofs/e2e-local-gate-2026-06-24.json";

if (!validModes.has(mode)) {
  console.error("Usage: node scripts/e2e-gate.mjs <local|live-0g>");
  process.exit(1);
}

function runCommand(command, args, options = {}) {
  const label = `${command} ${args.join(" ")}`;
  console.log(`\n== ${label} ==`);
  return {
    label,
    ...spawnSync(command, args, {
      cwd: process.cwd(),
      stdio: "inherit",
      env: { ...process.env, CI: "true", ARCADE_BASE_URL: baseUrl, ARCADE_LOCAL_URL: baseUrl },
      ...options,
    }),
  };
}

function run(command, args, options = {}) {
  const result = runCommand(command, args, options);
  if (result.status !== 0) throw new Error(`${result.label} failed with status ${result.status}`);
}

function runQuiet(command, args, options = {}) {
  const label = `${command} ${args.join(" ")}`;
  return {
    label,
    ...spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: "pipe",
    encoding: "utf8",
    env: { ...process.env, CI: "true", ARCADE_BASE_URL: baseUrl, ARCADE_LOCAL_URL: baseUrl },
    ...options,
    }),
  };
}

function readJson(file) {
  if (!existsSync(file)) throw new Error(`Missing evidence file ${file}`);
  return JSON.parse(readFileSync(file, "utf8"));
}

function allTrue(record) {
  return Boolean(record) && Object.values(record).every((value) => value === true);
}

function requireEvidence(file, predicate, label) {
  const evidence = readJson(file);
  const passed = predicate(evidence);
  return { file, label, passed, mode: evidence.mode ?? null, status: evidence.status ?? null };
}

async function requireLocalhost() {
  const response = await fetch(baseUrl).catch(() => null);
  if (!response?.ok) {
    throw new Error(`Localhost app is not reachable at ${baseUrl}. Start the app on port 3021 before running this gate.`);
  }
}

async function runLocalGate() {
  await requireLocalhost();
  for (const args of [
    ["home:product-flow-check"],
    ["home:start-actions-check"],
    ["game-detail:start-actions-check"],
    ["h2h:all-game-browser-check"],
    ["human:automatch-check"],
    ["room:multigame-check"],
    ["agent:avatar-check"],
    ["agent:skill-check"],
    ["game:submission-workflow-check"],
  ]) {
    run("pnpm", args);
  }

  const checks = [
    requireEvidence(
      "evidence/live-proofs/home-product-flow-2026-06-24.json",
      (item) => item.status === "passed" && allTrue(item.verified),
      "home product flow browser proof",
    ),
    requireEvidence(
      "evidence/live-proofs/home-start-actions-2026-06-24.json",
      (item) => item.status === "passed" && allTrue(item.verified),
      "home start actions browser proof",
    ),
    requireEvidence(
      "evidence/live-proofs/game-detail-start-actions-2026-06-24.json",
      (item) => item.status === "passed" && allTrue(item.verified),
      "all game detail start actions browser proof",
    ),
    requireEvidence(
      "evidence/live-proofs/all-game-h2h-browser-2026-06-24.json",
      (item) => item.status === "passed" && item.games?.length === 4 && allTrue(item.verified),
      "all-game two-browser human-vs-human proof",
    ),
    requireEvidence(
      "evidence/live-proofs/human-automatch-api-2026-06-24.json",
      (item) => item.status === "passed" && allTrue(item.verified),
      "human auto-match proof",
    ),
    requireEvidence(
      "evidence/live-proofs/multigame-room-api-2026-06-24.json",
      (item) => item.status === "passed" && allTrue(item.verified),
      "multi-game room API proof",
    ),
    requireEvidence(
      "evidence/live-proofs/agent-avatar-api-2026-06-24.json",
      (item) => item.status === "passed" && allTrue(item.verified),
      "agent avatar/PFP proof",
    ),
    requireEvidence(
      "evidence/live-proofs/agent-skill-package-2026-06-24.json",
      (item) => item.status === "passed" && allTrue(item.checks),
      "external agent skill package proof",
    ),
    requireEvidence(
      "evidence/live-proofs/game-submission-workflow-2026-06-24.json",
      (item) => item.status === "passed" && allTrue(item.verified),
      "PR-based game submission proof",
    ),
  ];
  return checks;
}

async function runLiveGate() {
  await requireLocalhost();
  const checks = [];
  const readinessResult = runCommand("pnpm", ["0g:readiness"]);
  const readinessCheck = requireEvidence(
    "evidence/live-proofs/0g-readiness-latest.json",
    (item) => item.ready?.chain === true && item.ready?.compute === true && item.ready?.storageConfig === true && item.ready?.storageEndpoint === true,
    "live 0G readiness proof",
  );
  readinessCheck.commandStatus = readinessResult.status;
  checks.push(readinessCheck);
  if (readinessResult.status !== 0) return checks;

  if (process.env.E2E_LIVE_0G_RERUN_SPENDING === "1") {
    run("pnpm", ["leaderboard:wager-check"]);
    run("pnpm", ["0g:router-compute-agent-match"]);
    run("pnpm", ["agent:multigame-router-compute-check"]);
    run("pnpm", ["agent:wager-router-compute-match-check"]);
    const routerWager = readJson("evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json");
    run("pnpm", ["0g:upload-room-replay", routerWager.roomId]);
    run("pnpm", ["chain:commit-actual-match", routerWager.roomId]);
  }

  const routerWager = readJson("evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json");
  const routerWagerRoomId = routerWager.roomId;
  checks.push(
    requireEvidence(
      "evidence/live-proofs/two-privy-h2h-grid-four-2026-06-23.json",
      (item) =>
        item.mode === "human-vs-human free match" &&
        item.checks?.status === "finished" &&
        /^0x/.test(item.checks?.replayHash ?? "") &&
        /^0x/.test(item.checks?.resultHash ?? "") &&
        item.accounts?.length === 2,
      "authenticated two-Privy human-vs-human free proof",
    ),
    requireEvidence(
      "evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json",
      (item) =>
        item.status === "passed" &&
        item.wagerWeiPerPlayer === "100000000000000" &&
        item.roomResult?.status === "finished" &&
        item.transactions?.some((tx) => tx.type === "settle" && tx.status === "0x1"),
      "browser human-vs-human tiny-wager proof",
    ),
    requireEvidence(
      "evidence/live-proofs/router-compute-agent-match-2026-06-24.json",
      (item) => item.status === "passed" && item.wagerWei === "0" && item.verified?.routerMoveWasLiveCompute === true,
      "live Router Compute free human-vs-agent proof",
    ),
    requireEvidence(
      "evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json",
      (item) =>
        item.status === "passed" &&
        item.expectedComputeMode === "0g-compute" &&
        item.wagerWei === "100000000000000" &&
        item.verified?.agentMovesUseRouterCompute === true &&
        item.verified?.settlementMined === true,
      "live Router Compute wager human-vs-agent proof",
    ),
    requireEvidence(
      `evidence/live-proofs/0g-storage-room-${routerWagerRoomId}.json`,
      (item) => item.reachable === true && item.computeMode === "0g-compute" && item.wagerWei === "100000000000000",
      "current Router wager 0G Storage replay proof",
    ),
    requireEvidence(
      `evidence/live-proofs/chain-actual-match-${routerWagerRoomId}.json`,
      (item) =>
        item.status === "passed" &&
        item.committed?.wagered === true &&
        item.committed?.computeMode === "0g-compute" &&
        allTrue(item.verified),
      "current Router wager Galileo chain commit proof",
    ),
    requireEvidence(
      "evidence/live-proofs/multigame-router-compute-api-2026-06-24.json",
      (item) => item.status === "passed" && item.games?.length === 3 && allTrue(item.verified),
      "non-Grid live Router Compute proof",
    ),
    requireEvidence(
      "evidence/live-proofs/wager-leaderboard-api-2026-06-24.json",
      (item) => item.status === "passed" && allTrue(item.verified),
      "wager leaderboard proof",
    ),
    requireEvidence(
      "evidence/live-proofs/browser-proof-surfaces-2026-06-24.json",
      (item) => item.status === "passed",
      "proof, leaderboard, and explorer browser surfaces",
    ),
    requireEvidence(
      "evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json",
      (item) => item.status === "not-published" && item.daMode === "candidate-not-published" && allTrue(item.verified),
      "DA candidate truth boundary",
    ),
  );
  return checks;
}

let checks = [];
try {
  checks = mode === "local" ? await runLocalGate() : await runLiveGate();
} catch (error) {
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(
    outFile,
    `${JSON.stringify(
      {
        mode: `e2e-${mode}-gate`,
        status: "failed",
        checkedAt: new Date().toISOString(),
        baseUrl,
        error: error.message,
        checks,
      },
      null,
      2,
    )}\n`,
  );
  console.error(error.message);
  process.exit(1);
}

const passed = checks.every((check) => check.passed);
const evidence = {
  mode: `e2e-${mode}-gate`,
  status: passed ? "passed" : "failed",
  checkedAt: new Date().toISOString(),
  baseUrl,
  spendingRerun: mode === "live-0g" ? process.env.E2E_LIVE_0G_RERUN_SPENDING === "1" : false,
  checks,
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(evidence, null, 2)}\n`);

if (!passed) {
  console.error(`${outFile}: failed`);
  process.exit(1);
}

console.log(`${outFile}: passed`);
