import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const games = ["grid-four", "fleet-duel", "tile-race", "world-cup-draft"];
const requiredGameFiles = [
  "manifest.json",
  "rules.ts",
  "schema.ts",
  "agent.md",
  "ui/GameView.tsx",
  "tests/rules.test.ts",
  "fixtures/demo-replay.json",
  "assets/cover.svg",
  "assets/logo.svg",
  "README.md",
  "LICENSE.md",
];
const manifestFields = [
  "id",
  "name",
  "version",
  "author",
  "license",
  "minPlayers",
  "maxPlayers",
  "supportsSolo",
  "supportsHumanVsHuman",
  "supportsHumanVsAgent",
  "supportsAgentVsAgent",
  "supportsWagers",
  "supportsTournaments",
  "gameType",
  "turnType",
  "hiddenInformation",
  "randomness",
  "seedRequired",
  "averageDuration",
  "moveSchemaHash",
  "rulesHash",
  "uiHash",
  "agentPromptHash",
  "replaySchemaHash",
];
const hashFields = ["moveSchemaHash", "rulesHash", "uiHash", "agentPromptHash", "replaySchemaHash"];
const requiredDocs = [
  "docs/0G_ARCHITECTURE.md",
  "docs/AGENT_PLAY_STANDARD.md",
  "docs/COMPLETION_AUDIT.md",
  "docs/EVIDENCE_REPORT.md",
  "docs/GAME_PACK_SCHEMA.md",
  "docs/GAME_SUBMISSION.md",
  "docs/REPLAY_PROOF_STANDARD.md",
  "docs/SOURCE_REUSE.md",
  "docs/SUBMISSION.md",
  "docs/TRUTH_AUDIT.md",
];
const requiredAppFiles = [
  "src/App.tsx",
  "src/components/PlayableMatch.tsx",
  "src/lib/agents.ts",
  "src/lib/game-pack.ts",
  "src/lib/integration-status.ts",
  "src/lib/match-records.ts",
  "src/lib/proofs.ts",
  "src/lib/share-card.ts",
  "src/lib/submission-checks.ts",
  ".github/PULL_REQUEST_TEMPLATE/game-submission.md",
  ".github/workflows/game-pack-ci.yml",
  "scripts/verify-game-submission-workflow.mjs",
  "scripts/verify-hosted-privy-origin.mjs",
  "scripts/verify-home-product-flow.mjs",
  "scripts/verify-home-start-actions.mjs",
  "scripts/verify-game-detail-start-actions.mjs",
  "scripts/verify-all-game-h2h-browser.mjs",
  "scripts/e2e-gate.mjs",
  "scripts/upload-proof-artifacts-0g.mjs",
  "scripts/build-da-batch-candidate.mjs",
  "scripts/diagnose-compute-broker.mjs",
  "scripts/verify-direct-broker-agent-move.mjs",
  "scripts/run-direct-broker-live-pipeline.mjs",
  "scripts/verify-router-compute-agent-match.mjs",
  "scripts/verify-multigame-router-compute.mjs",
  "scripts/verify-external-compute-proof-api.mjs",
  "scripts/verify-agent-avatar-api.mjs",
  "wrangler.jsonc",
  "worker/index.ts",
  "cloudflare/schema.sql",
  "evidence/live-proofs/0g-readiness-latest.json",
  "evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json",
  "evidence/live-proofs/0g-storage-room-gr-zqvy.json",
  "evidence/live-proofs/chain-actual-match-gr-zqvy.json",
  "evidence/live-proofs/0g-storage-room-h2a-wager-mqr1xs1b.json",
  "evidence/live-proofs/chain-actual-match-h2a-wager-mqr1xs1b.json",
  "evidence/live-proofs/0g-storage-game-pack-grid-four.json",
  "evidence/live-proofs/0g-storage-game-pack-fleet-duel.json",
  "evidence/live-proofs/0g-storage-game-pack-tile-race.json",
  "evidence/live-proofs/0g-storage-game-pack-world-cup-draft.json",
  "evidence/live-proofs/0g-storage-proof-artifacts-2026-06-24.json",
  "evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json",
  "evidence/live-proofs/0g-compute-broker-diagnostic-2026-06-24.json",
  "evidence/live-proofs/direct-broker-agent-move-2026-06-24.json",
  "evidence/live-proofs/direct-broker-live-pipeline-2026-06-24.json",
  "evidence/live-proofs/router-compute-agent-match-2026-06-24.json",
  "evidence/live-proofs/0g-storage-room-router-compute-mqrwdmmf.json",
  "evidence/live-proofs/chain-actual-match-router-compute-mqrwdmmf.json",
  "evidence/live-proofs/external-compute-proof-api-2026-06-24.json",
  "evidence/live-proofs/multigame-router-compute-api-2026-06-24.json",
  "evidence/live-proofs/0g-storage-room-mgr-fleet-duel-mqrxg2lh.json",
  "evidence/live-proofs/chain-actual-match-mgr-fleet-duel-mqrxg2lh.json",
  "evidence/live-proofs/0g-storage-room-mgr-tile-race-mqrxg2lh.json",
  "evidence/live-proofs/chain-actual-match-mgr-tile-race-mqrxg2lh.json",
  "evidence/live-proofs/0g-storage-room-mgr-world-cup-draft-mqrxg2lh.json",
  "evidence/live-proofs/chain-actual-match-mgr-world-cup-draft-mqrxg2lh.json",
  "evidence/live-proofs/d1-proof-leaderboard-api-2026-06-23.json",
  "evidence/live-proofs/agent-registry-room-api-2026-06-23.json",
  "evidence/live-proofs/wager-negative-api-2026-06-24.json",
  "evidence/live-proofs/wager-start-gate-api-2026-06-24.json",
  "evidence/live-proofs/wager-leaderboard-api-2026-06-24.json",
  "evidence/live-proofs/agent-compute-router-bound-api-2026-06-24.json",
  "evidence/live-proofs/agent-wager-policy-api-2026-06-24.json",
  "evidence/live-proofs/agent-avatar-api-2026-06-24.json",
  "evidence/live-proofs/agent-wager-match-api-2026-06-24.json",
  "evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json",
  "evidence/live-proofs/0g-storage-room-h2a-router-wager-mqs1kt45.json",
  "evidence/live-proofs/chain-actual-match-h2a-router-wager-mqs1kt45.json",
  "evidence/live-proofs/agent-skill-package-2026-06-24.json",
  "evidence/live-proofs/multigame-room-api-2026-06-24.json",
  "evidence/live-proofs/human-automatch-api-2026-06-24.json",
  "evidence/live-proofs/human-automatch-ui-2026-06-24.json",
  "evidence/live-proofs/home-product-flow-2026-06-24.json",
  "evidence/live-proofs/home-product-flow-2026-06-24.png",
  "evidence/live-proofs/home-start-actions-2026-06-24.json",
  "evidence/live-proofs/home-start-human-room-2026-06-24.png",
  "evidence/live-proofs/home-start-agent-match-2026-06-24.png",
  "evidence/live-proofs/home-start-human-wager-room-2026-06-24.png",
  "evidence/live-proofs/home-start-agent-wager-room-2026-06-24.png",
  "evidence/live-proofs/game-detail-start-actions-2026-06-24.json",
  "evidence/live-proofs/game-detail-start-grid-four-human-room-2026-06-24.png",
  "evidence/live-proofs/game-detail-start-grid-four-agent-match-2026-06-24.png",
  "evidence/live-proofs/game-detail-start-fleet-duel-human-room-2026-06-24.png",
  "evidence/live-proofs/game-detail-start-fleet-duel-agent-match-2026-06-24.png",
  "evidence/live-proofs/game-detail-start-tile-race-human-room-2026-06-24.png",
  "evidence/live-proofs/game-detail-start-tile-race-agent-match-2026-06-24.png",
  "evidence/live-proofs/game-detail-start-world-cup-draft-human-room-2026-06-24.png",
  "evidence/live-proofs/game-detail-start-world-cup-draft-agent-match-2026-06-24.png",
  "evidence/live-proofs/all-game-h2h-browser-2026-06-24.json",
  "evidence/live-proofs/e2e-local-gate-2026-06-24.json",
  "evidence/live-proofs/e2e-live-0g-gate-2026-06-24.json",
  "evidence/live-proofs/all-game-h2h-grid-four-host-finished-2026-06-24.png",
  "evidence/live-proofs/all-game-h2h-grid-four-guest-finished-2026-06-24.png",
  "evidence/live-proofs/all-game-h2h-fleet-duel-host-finished-2026-06-24.png",
  "evidence/live-proofs/all-game-h2h-fleet-duel-guest-finished-2026-06-24.png",
  "evidence/live-proofs/all-game-h2h-tile-race-host-finished-2026-06-24.png",
  "evidence/live-proofs/all-game-h2h-tile-race-guest-finished-2026-06-24.png",
  "evidence/live-proofs/all-game-h2h-world-cup-draft-host-finished-2026-06-24.png",
  "evidence/live-proofs/all-game-h2h-world-cup-draft-guest-finished-2026-06-24.png",
  "evidence/live-proofs/browser-proof-surfaces-2026-06-24.json",
  "evidence/live-proofs/browser-proof-game-detail-agents-2026-06-24.png",
  "evidence/live-proofs/browser-proof-leaderboard-2026-06-24.png",
  "evidence/live-proofs/browser-proof-explorer-2026-06-24.png",
  "evidence/live-proofs/browser-proof-proof-page-2026-06-24.png",
  "evidence/live-proofs/explorer-all-game-pack-storage-2026-06-24.json",
  "evidence/live-proofs/explorer-all-game-pack-storage-2026-06-24.png",
  "evidence/live-proofs/explorer-proof-artifact-storage-2026-06-24.json",
  "evidence/live-proofs/explorer-proof-artifact-storage-2026-06-24.png",
  "evidence/live-proofs/explorer-da-batch-candidate-2026-06-24.json",
  "evidence/live-proofs/explorer-da-batch-candidate-2026-06-24.png",
  "evidence/live-proofs/agent-picker-all-games-2026-06-24.json",
  "evidence/live-proofs/agent-picker-grid-four-2026-06-24.png",
  "evidence/live-proofs/agent-picker-fleet-duel-2026-06-24.png",
  "evidence/live-proofs/agent-picker-tile-race-2026-06-24.png",
  "evidence/live-proofs/agent-picker-world-cup-draft-2026-06-24.png",
  "evidence/live-proofs/non-grid-room-ui-2026-06-24.json",
  "evidence/live-proofs/non-grid-room-ui-2026-06-24.png",
  "evidence/live-proofs/non-grid-room-ui-fleet-duel-2026-06-24.png",
  "evidence/live-proofs/non-grid-room-ui-tile-race-2026-06-24.png",
  "evidence/live-proofs/non-grid-room-ui-world-cup-draft-2026-06-24.png",
  "evidence/live-proofs/game-submission-workflow-2026-06-24.json",
  "evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.json",
  "evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.png",
  "docs/agent-skills/0g-arcade-player/SKILL.md",
  "docs/agent-skills/0g-arcade-player/api.md",
  "docs/agent-skills/0g-arcade-player/registration.md",
  "docs/agent-skills/0g-arcade-player/grid-four.md",
  "docs/agent-skills/0g-arcade-player/fleet-duel.md",
  "docs/agent-skills/0g-arcade-player/tile-race.md",
  "docs/agent-skills/0g-arcade-player/world-cup-draft.md",
  "docs/agent-skills/0g-arcade-player/wagers.md",
  "docs/agent-skills/0g-arcade-player/examples.md",
];
const requiredContracts = [
  "contracts/src/ArcadeAgentRegistry.sol",
  "contracts/src/ArcadeContributorRegistry.sol",
  "contracts/src/ArcadeGameRegistry.sol",
  "contracts/src/ArcadeMatchRegistry.sol",
  "contracts/src/ArcadeTournamentRegistry.sol",
  "contracts/src/ArcadeWagerEscrow.sol",
  "contracts/test/ArcadeRegistries.t.sol",
];
const appRoutes = [
  "/",
  "/games",
  "/games/:gameId",
  "/play/:gameId/create",
  "/room/:roomId",
  "/match/:matchId",
  "/result/:matchId",
  "/proof/:matchId",
  "/agents",
  "/agents/:agentId",
  "/submit-game",
  "/developers",
  "/leaderboard",
  "/explorer",
];
const requiredNavItems = [
  ['"/games"', '"Games"'],
  ['"/agents"', '"Agents"'],
  ['"/submit-game"', '"Submit"'],
  ['"/leaderboard"', '"Leaderboard"'],
  ['"/explorer"', '"Explorer"'],
];
const visualRoutes = ["home", "games", "agents", "leaderboard", "explorer", "submit-game"];
const visualWidths = [375, 768, 1440];
const errors = [];

function requireFile(file) {
  if (!existsSync(file)) errors.push(`missing ${file}`);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`invalid JSON in ${file}: ${error.message}`);
    return null;
  }
}

function findMediaFiles(dir) {
  if (!existsSync(dir)) return [];
  const entries = [];
  for (const item of readdirSync(dir)) {
    const file = path.join(dir, item);
    const stats = statSync(file);
    if (stats.isDirectory()) entries.push(...findMediaFiles(file));
    if (stats.isFile() && /\.(png|jpe?g|webp)$/i.test(file)) entries.push(file);
  }
  return entries;
}

function validateVisualManifest(file) {
  if (!existsSync(file)) {
    errors.push(`missing ${file}`);
    return;
  }
  const manifest = readJson(file);
  if (!manifest?.results || !Array.isArray(manifest.results)) {
    errors.push(`${file} must include a results array`);
    return;
  }
  for (const width of visualWidths) {
    for (const route of visualRoutes) {
      const result = manifest.results.find((item) => item.width === width && item.route === route);
      if (!result) {
        errors.push(`${file} missing ${width}px ${route} result`);
      } else if (result.horizontalOverflow) {
        errors.push(`${file} reports horizontal overflow for ${width}px ${route}`);
      }
    }
  }
}

for (const file of [...requiredDocs, ...requiredAppFiles, ...requiredContracts]) {
  requireFile(file);
}

for (const game of games) {
  for (const file of requiredGameFiles) {
    requireFile(`games/${game}/${file}`);
  }

  const manifest = readJson(`games/${game}/manifest.json`);
  if (!manifest) continue;
  for (const field of manifestFields) {
    if (!(field in manifest)) errors.push(`${game} manifest missing ${field}`);
  }
  if (manifest.id !== game) errors.push(`${game} manifest id does not match folder`);
  if (manifest.supportsTournaments !== false) {
    errors.push(`${game} manifest must keep supportsTournaments false for the hackathon 1v1 scope`);
  }
  for (const field of hashFields) {
    if (typeof manifest[field] !== "string" || !/^0x[a-f0-9]{64}$/.test(manifest[field])) {
      errors.push(`${game} manifest ${field} is not a concrete 32-byte hex hash`);
    }
  }

  requireFile(`dist/game-packs/${game}.receipt.json`);
  requireFile(`dist/publish-receipts/${game}.publish.json`);
  requireFile(`public/proofs/match-${game}-receipt-proof.json`);
  requireFile(`public/proofs/match-${game}-receipt-replay.json`);

  const publishPath = `dist/publish-receipts/${game}.publish.json`;
  const publish = existsSync(publishPath) ? readJson(publishPath) : null;
  if (publish && publish.mode !== "local-fallback") {
    errors.push(`${game} publish receipt should be local-fallback unless 0G Storage was verified`);
  }

  const proofPath = `public/proofs/match-${game}-receipt-proof.json`;
  const proof = existsSync(proofPath) ? readJson(proofPath) : null;
  if (proof) {
    if (proof.computeMode !== "deterministic-fallback") errors.push(`${game} proof must disclose deterministic fallback compute`);
    if (proof.storageMode !== "local-fallback") errors.push(`${game} proof must disclose local fallback storage`);
    if (proof.chainMode !== "local-mock") errors.push(`${game} proof must disclose local mock chain`);
    if (proof.daMode !== "not-configured") errors.push(`${game} proof must disclose DA not configured`);
  }
}

if (existsSync("src/App.tsx")) {
  const app = readFileSync("src/App.tsx", "utf8");
  for (const route of appRoutes) {
    if (!app.includes(`path="${route}"`)) errors.push(`missing app route ${route}`);
  }
  for (const [href, label] of requiredNavItems) {
    if (!app.includes(`[${href}, ${label}]`)) errors.push(`missing requested top-nav item ${href} ${label}`);
  }
  if (/["']\/pitch["']|PitchPage|Demo video|demo paths/i.test(app)) {
    errors.push("top-level app navigation must not expose pitch/demo framing");
  }
}

if (existsSync("src/pages/ArenaPages.tsx")) {
  const arenaPages = readFileSync("src/pages/ArenaPages.tsx", "utf8");
  for (const term of ["Featured game", "PlaySetup", "All Games", "Submit Game"]) {
    if (!arenaPages.includes(term)) errors.push(`home route missing product start surface term ${term}`);
  }
}

if (existsSync("src/pages/GameDetailPage.tsx")) {
  const gameDetail = readFileSync("src/pages/GameDetailPage.tsx", "utf8");
  for (const term of ["Play with 0G agent", "Play with humans", "Free match", "Testnet wager", "Auto-match", "Room code"]) {
    if (!gameDetail.includes(term)) errors.push(`match setup missing required control ${term}`);
  }
}

if (existsSync("evidence/live-proofs/0g-readiness-latest.json")) {
  const readiness = readJson("evidence/live-proofs/0g-readiness-latest.json");
  if (readiness) {
    if (readiness.chain?.chainId !== 16602 || readiness.ready?.chain !== true) {
      errors.push("0G readiness evidence does not prove Galileo chain readiness");
    }
    if (readiness.ready?.storageConfig !== true || readiness.ready?.storageEndpoint !== true) {
      errors.push("0G readiness evidence does not prove storage config and endpoint readiness");
    }
    if (readiness.ready?.compute !== true || readiness.compute?.configuredModelProbe?.ok !== true) {
      errors.push("0G readiness evidence does not prove live testnet Router Compute readiness");
    }
    if (readiness.compute?.networkDiagnostic) {
      const diagnostic = readiness.compute.networkDiagnostic;
      if (diagnostic.chainNetwork !== "galileo-testnet" || diagnostic.storageNetwork !== "testnet") {
        errors.push("0G readiness network diagnostic must identify the app as testnet-targeted");
      }
      if (diagnostic.configuredRouterLooksMainnet !== false) {
        errors.push("0G readiness network diagnostic must record the configured testnet Router host");
      }
      if (readiness.compute?.configuredModelProbe?.ok !== true) {
        errors.push("0G readiness must record a successful configured testnet Router chat probe");
      }
      if (!String(diagnostic.conclusion ?? "").includes("configured for the 0G testnet Router")) {
        errors.push("0G readiness network diagnostic must describe the successful testnet Router configuration");
      }
    } else {
      errors.push("0G readiness evidence missing compute network diagnostic");
    }
  }
}

if (existsSync("evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json")) {
  const wager = readJson("evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json");
  if (wager) {
    if (wager.status !== "passed") errors.push("wager browser proof did not pass");
    if (wager.escrowWeiAfterBothFunds !== "200000000000000") {
      errors.push("wager browser proof does not show full escrow funding");
    }
    if (wager.escrowWeiAfterSettlement !== "0") {
      errors.push("wager browser proof does not show escrow settlement to zero");
    }
    if (!wager.transactions?.some((tx) => tx.type === "settle" && tx.status === "0x1")) {
      errors.push("wager browser proof does not include a successful settlement tx");
    }
  }
}

if (existsSync("evidence/live-proofs/0g-storage-room-gr-zqvy.json")) {
  const storage = readJson("evidence/live-proofs/0g-storage-room-gr-zqvy.json");
  if (storage) {
    if (storage.mode !== "live-0g-storage-room-replay") {
      errors.push("0G Storage room proof has wrong mode");
    }
    if (storage.reachable !== true) {
      errors.push("0G Storage room proof is not reachable");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(storage.rootHash ?? "")) {
      errors.push("0G Storage room proof has invalid root hash");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(storage.txHash ?? "")) {
      errors.push("0G Storage room proof has invalid tx hash");
    }
  }
}

if (existsSync("evidence/live-proofs/chain-actual-match-gr-zqvy.json")) {
  const actualMatchChain = readJson("evidence/live-proofs/chain-actual-match-gr-zqvy.json");
  if (actualMatchChain) {
    if (actualMatchChain.mode !== "live-0g-galileo-actual-match-result" || actualMatchChain.status !== "passed") {
      errors.push("actual match chain proof did not pass");
    }
    if (actualMatchChain.chainId !== 16602) {
      errors.push("actual match chain proof is not on Galileo chain ID 16602");
    }
    if (actualMatchChain.roomId !== "gr-zqvy" || actualMatchChain.matchId !== "match-gr-zqvy") {
      errors.push("actual match chain proof is not for room gr-zqvy");
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(actualMatchChain.contract?.address ?? "")) {
      errors.push("actual match chain proof has invalid match registry address");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(actualMatchChain.committed?.resultHash ?? "")) {
      errors.push("actual match chain proof has invalid committed result hash");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(actualMatchChain.committed?.replayHash ?? "")) {
      errors.push("actual match chain proof has invalid committed replay hash");
    }
    if (actualMatchChain.committed?.storageRoot !== "0xe22ca7771560aca78982bcc16d00c01683f28ffb9e8f18c7aaa01a2a9221c8c7") {
      errors.push("actual match chain proof did not commit the known 0G Storage replay root");
    }
    if (actualMatchChain.transactions?.createMatch?.status !== "0x1" || actualMatchChain.transactions?.commitResult?.status !== "0x1") {
      errors.push("actual match chain proof does not include successful create/commit txs");
    }
    for (const [key, value] of Object.entries(actualMatchChain.verified ?? {})) {
      if (value !== true) errors.push(`actual match chain proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/0g-storage-room-h2a-wager-mqr1xs1b.json")) {
  const h2aStorage = readJson("evidence/live-proofs/0g-storage-room-h2a-wager-mqr1xs1b.json");
  if (h2aStorage) {
    if (h2aStorage.mode !== "live-0g-storage-room-replay") {
      errors.push("H2A 0G Storage room proof has wrong mode");
    }
    if (h2aStorage.roomId !== "h2a-wager-mqr1xs1b" || h2aStorage.gameId !== "grid-four") {
      errors.push("H2A 0G Storage room proof is not for the expected Grid Four room");
    }
    if (h2aStorage.reachable !== true) {
      errors.push("H2A 0G Storage room proof is not reachable");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(h2aStorage.rootHash ?? "")) {
      errors.push("H2A 0G Storage room proof has invalid root hash");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(h2aStorage.txHash ?? "")) {
      errors.push("H2A 0G Storage room proof has invalid tx hash");
    }
  }
}

if (existsSync("evidence/live-proofs/chain-actual-match-h2a-wager-mqr1xs1b.json")) {
  const h2aChain = readJson("evidence/live-proofs/chain-actual-match-h2a-wager-mqr1xs1b.json");
  if (h2aChain) {
    if (h2aChain.mode !== "live-0g-galileo-actual-match-result" || h2aChain.status !== "passed") {
      errors.push("H2A actual match chain proof did not pass");
    }
    if (h2aChain.chainId !== 16602 || h2aChain.roomId !== "h2a-wager-mqr1xs1b") {
      errors.push("H2A actual match chain proof is not on Galileo for the expected room");
    }
    if (h2aChain.sourceEvidence?.wager !== "evidence/live-proofs/agent-wager-match-api-2026-06-24.json") {
      errors.push("H2A actual match chain proof does not source the agent wager evidence");
    }
    if (h2aChain.committed?.storageRoot !== "0x3df0db7d73b6a2833281daa275a55dc925ebf3c3fd6b6f092e68d6260bb93b17") {
      errors.push("H2A actual match chain proof did not commit the known 0G Storage replay root");
    }
    if (h2aChain.transactions?.createMatch?.status !== "0x1" || h2aChain.transactions?.commitResult?.status !== "0x1") {
      errors.push("H2A actual match chain proof does not include successful create/commit txs");
    }
    for (const [key, value] of Object.entries(h2aChain.verified ?? {})) {
      if (value !== true) errors.push(`H2A actual match chain proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/0g-storage-room-router-compute-mqrwdmmf.json")) {
  const routerStorage = readJson("evidence/live-proofs/0g-storage-room-router-compute-mqrwdmmf.json");
  if (routerStorage) {
    if (routerStorage.mode !== "live-0g-storage-room-replay" || routerStorage.roomId !== "router-compute-mqrwdmmf") {
      errors.push("router Compute 0G Storage room proof has wrong mode or room");
    }
    if (routerStorage.reachable !== true || routerStorage.computeMode !== "0g-compute" || routerStorage.computeProofCount < 1) {
      errors.push("router Compute 0G Storage room proof must be reachable and carry compute proof metadata");
    }
    if (routerStorage.rootHash !== "0xa27dceac2040f491db0993daa24e3823b247e7b666c1e1e7877f6031faa9e3de") {
      errors.push("router Compute 0G Storage room proof did not preserve the known root");
    }
  }
}

if (existsSync("evidence/live-proofs/chain-actual-match-router-compute-mqrwdmmf.json")) {
  const routerChain = readJson("evidence/live-proofs/chain-actual-match-router-compute-mqrwdmmf.json");
  if (routerChain) {
    if (routerChain.mode !== "live-0g-galileo-actual-match-result" || routerChain.status !== "passed") {
      errors.push("router Compute actual match chain proof did not pass");
    }
    if (routerChain.chainId !== 16602 || routerChain.roomId !== "router-compute-mqrwdmmf") {
      errors.push("router Compute actual match chain proof is not on Galileo for the expected room");
    }
    if (routerChain.sourceEvidence?.routerCompute !== "evidence/live-proofs/router-compute-agent-match-2026-06-24.json") {
      errors.push("router Compute actual match chain proof does not source the router Compute evidence");
    }
    if (routerChain.committed?.storageRoot !== "0xa27dceac2040f491db0993daa24e3823b247e7b666c1e1e7877f6031faa9e3de") {
      errors.push("router Compute actual match chain proof did not commit the known 0G Storage replay root");
    }
    if (routerChain.committed?.wagered !== false || routerChain.committed?.computeMode !== "0g-compute") {
      errors.push("router Compute actual match chain proof must commit a free 0g-compute match");
    }
    if (routerChain.transactions?.createMatch?.status !== "0x1" || routerChain.transactions?.commitResult?.status !== "0x1") {
      errors.push("router Compute actual match chain proof does not include successful create/commit txs");
    }
    for (const [key, value] of Object.entries(routerChain.verified ?? {})) {
      if (value !== true) errors.push(`router Compute actual match chain proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/0g-storage-room-h2a-router-wager-mqrx23nu.json")) {
  const routerWagerStorage = readJson("evidence/live-proofs/0g-storage-room-h2a-router-wager-mqrx23nu.json");
  if (routerWagerStorage) {
    if (
      routerWagerStorage.mode !== "live-0g-storage-room-replay" ||
      routerWagerStorage.roomId !== "h2a-router-wager-mqrx23nu" ||
      routerWagerStorage.gameId !== "grid-four"
    ) {
      errors.push("Router H2A wager 0G Storage proof has wrong mode, room, or game");
    }
    if (
      routerWagerStorage.reachable !== true ||
      routerWagerStorage.computeMode !== "0g-compute" ||
      routerWagerStorage.computeProofCount !== 3 ||
      routerWagerStorage.wagerWei !== "100000000000000"
    ) {
      errors.push("Router H2A wager 0G Storage proof must be reachable, wagered, and carry three Compute proofs");
    }
    if (routerWagerStorage.rootHash !== "0xd2257f3360af245910fe9b916832506daec60a629a2a03739f08198db18900cf") {
      errors.push("Router H2A wager 0G Storage proof did not preserve the known root");
    }
  }
}

if (existsSync("evidence/live-proofs/chain-actual-match-h2a-router-wager-mqrx23nu.json")) {
  const routerWagerChain = readJson("evidence/live-proofs/chain-actual-match-h2a-router-wager-mqrx23nu.json");
  if (routerWagerChain) {
    if (routerWagerChain.mode !== "live-0g-galileo-actual-match-result" || routerWagerChain.status !== "passed") {
      errors.push("Router H2A wager actual match chain proof did not pass");
    }
    if (routerWagerChain.chainId !== 16602 || routerWagerChain.roomId !== "h2a-router-wager-mqrx23nu") {
      errors.push("Router H2A wager actual match chain proof is not on Galileo for the expected room");
    }
    if (routerWagerChain.sourceEvidence?.agentWager !== "evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json") {
      errors.push("Router H2A wager actual match chain proof does not source the Router wager evidence");
    }
    if (routerWagerChain.committed?.storageRoot !== "0xd2257f3360af245910fe9b916832506daec60a629a2a03739f08198db18900cf") {
      errors.push("Router H2A wager actual match chain proof did not commit the known 0G Storage replay root");
    }
    if (routerWagerChain.committed?.wagered !== true || routerWagerChain.committed?.computeMode !== "0g-compute") {
      errors.push("Router H2A wager actual match chain proof must commit a wagered 0g-compute match");
    }
    if (routerWagerChain.transactions?.createMatch?.status !== "0x1" || routerWagerChain.transactions?.commitResult?.status !== "0x1") {
      errors.push("Router H2A wager actual match chain proof does not include successful create/commit txs");
    }
    for (const [key, value] of Object.entries(routerWagerChain.verified ?? {})) {
      if (value !== true) errors.push(`Router H2A wager actual match chain proof did not verify ${key}`);
    }
  }
}

for (const game of games) {
  const gamePackStoragePath = `evidence/live-proofs/0g-storage-game-pack-${game}.json`;
  if (existsSync(gamePackStoragePath)) {
    const gamePackStorage = readJson(gamePackStoragePath);
    if (gamePackStorage) {
      if (gamePackStorage.mode !== "live-0g-storage-game-pack") {
        errors.push(`${game} 0G Storage game-pack proof has wrong mode`);
      }
      if (gamePackStorage.gameId !== game) {
        errors.push(`${game} 0G Storage game-pack proof has wrong game id`);
      }
      if (gamePackStorage.fileCount < requiredGameFiles.length) {
        errors.push(`${game} 0G Storage game-pack proof has too few files`);
      }
      if (gamePackStorage.reachable !== true) {
        errors.push(`${game} 0G Storage game-pack proof is not reachable`);
      }
      if (!/^0x[a-fA-F0-9]{64}$/.test(gamePackStorage.rootHash ?? "")) {
        errors.push(`${game} 0G Storage game-pack proof has invalid root hash`);
      }
      if (!/^0x[a-fA-F0-9]{64}$/.test(gamePackStorage.txHash ?? "")) {
        errors.push(`${game} 0G Storage game-pack proof has invalid tx hash`);
      }
      if (!/^sha256:[a-fA-F0-9]{64}$/.test(gamePackStorage.payloadSha256 ?? "")) {
        errors.push(`${game} 0G Storage game-pack proof has invalid payload hash`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/0g-storage-proof-artifacts-2026-06-24.json")) {
  const proofArtifactStorage = readJson("evidence/live-proofs/0g-storage-proof-artifacts-2026-06-24.json");
  if (proofArtifactStorage) {
    if (proofArtifactStorage.mode !== "live-0g-storage-proof-artifacts") {
      errors.push("0G Storage proof artifact bundle has wrong mode");
    }
    if (proofArtifactStorage.schema !== "0g-arcade-proof-artifacts@1") {
      errors.push("0G Storage proof artifact bundle has wrong schema");
    }
    for (const type of ["submission-review-receipt", "share-card-metadata", "agent-reasoning-transcript"]) {
      if (!proofArtifactStorage.artifactTypes?.includes(type)) {
        errors.push(`0G Storage proof artifact bundle missing ${type}`);
      }
    }
    if (proofArtifactStorage.reachable !== true) {
      errors.push("0G Storage proof artifact bundle is not reachable");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(proofArtifactStorage.rootHash ?? "")) {
      errors.push("0G Storage proof artifact bundle has invalid root hash");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(proofArtifactStorage.txHash ?? "")) {
      errors.push("0G Storage proof artifact bundle has invalid tx hash");
    }
    if (!/^sha256:[a-fA-F0-9]{64}$/.test(proofArtifactStorage.payloadSha256 ?? "")) {
      errors.push("0G Storage proof artifact bundle has invalid payload hash");
    }
    for (const [key, value] of Object.entries(proofArtifactStorage.verified ?? {})) {
      if (value !== true) errors.push(`0G Storage proof artifact bundle did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json")) {
  const daCandidate = readJson("evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json");
  if (daCandidate) {
    const routerWagerProof = readJson("evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json");
    const routerWagerRoomId = routerWagerProof?.roomId;
    const routerWagerStorageSource = routerWagerRoomId ? `evidence/live-proofs/0g-storage-room-${routerWagerRoomId}.json` : null;
    const routerWagerChainSource = routerWagerRoomId ? `evidence/live-proofs/chain-actual-match-${routerWagerRoomId}.json` : null;
    if (daCandidate.mode !== "0g-da-batch-candidate") {
      errors.push("0G DA batch candidate has wrong mode");
    }
    if (daCandidate.status !== "not-published" || daCandidate.daMode !== "candidate-not-published") {
      errors.push("0G DA batch candidate must not claim live DA publication");
    }
    if (daCandidate.schema !== "0g-arcade-da-batch@1") {
      errors.push("0G DA batch candidate has wrong schema");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(daCandidate.batchHash ?? "")) {
      errors.push("0G DA batch candidate has invalid batch hash");
    }
    if (!/^sha256:[a-fA-F0-9]{64}$/.test(daCandidate.payloadSha256 ?? "")) {
      errors.push("0G DA batch candidate has invalid payload hash");
    }
    if (daCandidate.payload?.matches?.length !== 7) {
      errors.push("0G DA batch candidate must include the seven live committed match payloads");
    }
    if (daCandidate.payload?.gamePacks?.length !== games.length) {
      errors.push("0G DA batch candidate must include all four game-pack storage roots");
    }
    for (const requiredSource of [
      "evidence/live-proofs/0g-storage-room-gr-zqvy.json",
      "evidence/live-proofs/0g-storage-room-h2a-wager-mqr1xs1b.json",
      "evidence/live-proofs/0g-storage-room-router-compute-mqrwdmmf.json",
      routerWagerStorageSource,
      "evidence/live-proofs/0g-storage-room-mgr-fleet-duel-mqrxg2lh.json",
      "evidence/live-proofs/0g-storage-room-mgr-tile-race-mqrxg2lh.json",
      "evidence/live-proofs/0g-storage-room-mgr-world-cup-draft-mqrxg2lh.json",
      "evidence/live-proofs/chain-actual-match-gr-zqvy.json",
      "evidence/live-proofs/chain-actual-match-h2a-wager-mqr1xs1b.json",
      "evidence/live-proofs/chain-actual-match-router-compute-mqrwdmmf.json",
      routerWagerChainSource,
      "evidence/live-proofs/chain-actual-match-mgr-fleet-duel-mqrxg2lh.json",
      "evidence/live-proofs/chain-actual-match-mgr-tile-race-mqrxg2lh.json",
      "evidence/live-proofs/chain-actual-match-mgr-world-cup-draft-mqrxg2lh.json",
      "evidence/live-proofs/0g-storage-proof-artifacts-2026-06-24.json",
    ].filter(Boolean)) {
      if (!daCandidate.sourceEvidence?.includes(requiredSource)) {
        errors.push(`0G DA batch candidate missing source ${requiredSource}`);
      }
    }
    for (const [key, value] of Object.entries(daCandidate.verified ?? {})) {
      if (value !== true) errors.push(`0G DA batch candidate did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/0g-da-readiness-2026-06-24.json")) {
  const daReadiness = readJson("evidence/live-proofs/0g-da-readiness-2026-06-24.json");
  if (daReadiness) {
    if (daReadiness.mode !== "0g-da-readiness" || daReadiness.schema !== "0g-arcade-da-readiness@1") {
      errors.push("0G DA readiness evidence has wrong mode or schema");
    }
    if (!["blocked", "endpoint-configured-unpublished"].includes(daReadiness.status)) {
      errors.push("0G DA readiness evidence has invalid status");
    }
    if (daReadiness.verified?.officialDocsRequireDaClientNode !== true) {
      errors.push("0G DA readiness must cite the DA Client node requirement");
    }
    if (daReadiness.verified?.candidateExists !== true || daReadiness.verified?.candidateDoesNotClaimPublication !== true) {
      errors.push("0G DA readiness must verify the candidate-only DA artifact");
    }
    if (!daReadiness.requiredProjectConfig?.includes("ZEROG_DA_DISPERSER_GRPC")) {
      errors.push("0G DA readiness must list the Disperser gRPC endpoint requirement");
    }
    if (daReadiness.verified?.daPublisherHarnessPresent !== true) {
      errors.push("0G DA readiness must verify the DA publisher harness exists");
    }
    if (daReadiness.status === "blocked" && daReadiness.projectSecretFile?.missingNames?.length < 1) {
      errors.push("blocked 0G DA readiness must record missing project-local DA config");
    }
  }
}

if (existsSync("evidence/live-proofs/0g-da-publication-2026-06-24.json")) {
  const daPublication = readJson("evidence/live-proofs/0g-da-publication-2026-06-24.json");
  if (daPublication) {
    if (daPublication.mode !== "0g-da-publication-attempt" || daPublication.schema !== "0g-arcade-da-publication@1") {
      errors.push("0G DA publication evidence has wrong mode or schema");
    }
    if (!daPublication.officialApi?.proto || daPublication.officialApi?.submitMethod !== "DisperseBlob") {
      errors.push("0G DA publication evidence must use the Disperser API");
    }
    if (daPublication.officialApi?.clientTool !== "node-http2") {
      errors.push("0G DA publication evidence must use the self-contained Node HTTP/2 client");
    }
    if (daPublication.verified?.candidateExists !== true || daPublication.verified?.candidateHashMatches !== true) {
      errors.push("0G DA publication evidence must verify the candidate payload hash");
    }
    if (daPublication.status === "blocked") {
      if (!["missing-project-da-config", "disperser-request-failed", "missing-da-candidate"].includes(daPublication.blocker)) {
        errors.push("blocked 0G DA publication evidence has invalid blocker");
      }
      if (daPublication.blocker === "missing-project-da-config" && !daPublication.projectSecretFile?.missingNames?.includes("ZEROG_DA_DISPERSER_GRPC")) {
        errors.push("blocked 0G DA publication evidence must record missing Disperser config");
      }
    } else if (["confirmed", "finalized"].includes(daPublication.status)) {
      if (daPublication.daMode !== "live-0g-da") errors.push("confirmed DA publication must claim live-0g-da mode");
      if (!/^0x[a-fA-F0-9]+$/.test(daPublication.request?.id ?? "")) errors.push("confirmed DA publication needs request id");
      if (!/^0x[a-fA-F0-9]{64}$/.test(daPublication.blob?.storageRoot ?? "")) errors.push("confirmed DA publication needs blob storage root");
      if (daPublication.verified?.terminalConfirmed !== true) errors.push("confirmed DA publication must verify terminal confirmation");
    }
  }
}

if (existsSync("evidence/live-proofs/0g-da-publisher-harness-2026-06-24.json")) {
  const daHarness = readJson("evidence/live-proofs/0g-da-publisher-harness-2026-06-24.json");
  if (daHarness) {
    if (daHarness.mode !== "0g-da-publisher-harness" || daHarness.schema !== "0g-arcade-da-publisher-harness@1") {
      errors.push("0G DA publisher harness evidence has wrong mode or schema");
    }
    if (daHarness.status !== "passed") {
      errors.push("0G DA publisher harness must pass");
    }
    if (daHarness.publisher?.clientTool !== "node-http2") {
      errors.push("0G DA publisher harness must exercise the self-contained Node HTTP/2 client");
    }
    for (const [key, value] of Object.entries(daHarness.verified ?? {})) {
      if (value !== true) errors.push(`0G DA publisher harness did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/0g-compute-broker-diagnostic-2026-06-24.json")) {
  const computeBroker = readJson("evidence/live-proofs/0g-compute-broker-diagnostic-2026-06-24.json");
  if (computeBroker) {
    if (computeBroker.mode !== "direct-0g-compute-broker") {
      errors.push("0G Compute broker diagnostic has wrong mode");
    }
    if (computeBroker.sdk?.installed !== true || computeBroker.sdk?.package !== "@0gfoundation/0g-compute-ts-sdk") {
      errors.push("0G Compute broker diagnostic must prove the direct broker SDK is installed");
    }
    if (computeBroker.wallet?.configured !== true || !/^0x[a-fA-F0-9]{40}$/.test(computeBroker.wallet?.address ?? "")) {
      errors.push("0G Compute broker diagnostic must prove a project wallet is configured");
    }
    if (computeBroker.checks?.brokerInitialized !== true) {
      errors.push("0G Compute broker diagnostic must initialize the broker");
    }
    if (computeBroker.checks?.servicesListed !== true || computeBroker.broker?.serviceCount < 1) {
      errors.push("0G Compute broker diagnostic must list direct Compute providers");
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(computeBroker.broker?.preferredService?.provider ?? "")) {
      errors.push("0G Compute broker diagnostic must identify a preferred provider");
    }
    if (computeBroker.status === "ready") {
      if (computeBroker.checks?.ledgerReadable !== true) {
        errors.push("ready 0G Compute broker diagnostic must prove ledger readability");
      }
    } else if (computeBroker.status === "blocked") {
      if (computeBroker.wallet?.canFundMinimumLedger !== false) {
        errors.push("blocked 0G Compute broker diagnostic must explain the current ledger funding limit");
      }
      if (!String(computeBroker.reason ?? "").includes("3 0G ledger minimum")) {
        errors.push("blocked 0G Compute broker diagnostic must cite the ledger minimum blocker");
      }
    } else {
      errors.push("0G Compute broker diagnostic has unknown status");
    }
  }
}

if (existsSync("evidence/live-proofs/direct-broker-agent-move-2026-06-24.json")) {
  const directMove = readJson("evidence/live-proofs/direct-broker-agent-move-2026-06-24.json");
  if (directMove) {
    if (directMove.mode !== "direct-broker-agent-move") {
      errors.push("direct broker agent-move proof has wrong mode");
    }
    if (directMove.verified?.brokerInitialized !== true || directMove.verified?.servicesListed !== true) {
      errors.push("direct broker agent-move proof must initialize broker and list providers");
    }
    if (directMove.status === "passed") {
      const requiredChecks = [
        "ledgerReady",
        "liveComputeResponse",
        "legalMove",
        "appAcceptedComputedMove",
        "matchFinishedAndIndexed",
      ];
      for (const key of requiredChecks) {
        if (directMove.verified?.[key] !== true) {
          errors.push(`passed direct broker agent-move proof did not verify ${key}`);
        }
      }
      if (directMove.compute?.move?.column === undefined) {
        errors.push("passed direct broker agent-move proof must include the selected legal move");
      }
      if (
        directMove.app?.agentMove?.status !== 200 ||
        directMove.app?.agentMove?.computeMode !== "0g-compute" ||
        directMove.app?.proof?.computeMode !== "0g-compute" ||
        directMove.app?.completion?.finalStatus !== "finished" ||
        directMove.app?.proof?.roomStatus !== "finished"
      ) {
        errors.push("passed direct broker agent-move proof must include app move acceptance, completion, and indexed compute mode");
      }
    } else if (directMove.status === "blocked") {
      if (directMove.autofundEnabled !== false) {
        errors.push("blocked direct broker agent-move proof should be a non-autofund proof");
      }
      if (!String(directMove.reason ?? "").match(/ledger|fund|autofund|Compute/i)) {
        errors.push("blocked direct broker agent-move proof must state the live Compute blocker");
      }
    } else {
      errors.push("direct broker agent-move proof has unknown status");
    }
  }
}

if (existsSync("evidence/live-proofs/direct-broker-live-pipeline-2026-06-24.json")) {
  const pipeline = readJson("evidence/live-proofs/direct-broker-live-pipeline-2026-06-24.json");
  if (pipeline) {
    if (pipeline.mode !== "direct-broker-live-pipeline") {
      errors.push("direct broker live pipeline proof has wrong mode");
    }
    if (pipeline.verified?.diagnosticsRan !== true) {
      errors.push("direct broker live pipeline proof must run diagnostics");
    }
    if (pipeline.status === "passed") {
      for (const key of ["directBrokerMatchPassed", "storageUploaded", "chainCommitted"]) {
        if (pipeline.verified?.[key] !== true) {
          errors.push(`passed direct broker live pipeline did not verify ${key}`);
        }
      }
      if (!pipeline.evidence?.storage || !pipeline.evidence?.chain || !pipeline.roomId) {
        errors.push("passed direct broker live pipeline must include room/storage/chain evidence");
      }
    } else if (pipeline.status === "blocked") {
      if (pipeline.autofundEnabled !== false) {
        errors.push("blocked direct broker live pipeline should be a non-autofund proof");
      }
      if (!String(pipeline.reason ?? "").match(/ledger|fund|autofund|Compute/i)) {
        errors.push("blocked direct broker live pipeline must state the live Compute blocker");
      }
      if (pipeline.verified?.storageUploaded === true || pipeline.verified?.chainCommitted === true) {
        errors.push("blocked direct broker live pipeline must not claim storage or chain completion");
      }
    } else {
      errors.push("direct broker live pipeline proof has unknown status");
    }
  }
}

if (existsSync("evidence/live-proofs/router-compute-agent-match-2026-06-24.json")) {
  const routerCompute = readJson("evidence/live-proofs/router-compute-agent-match-2026-06-24.json");
  if (routerCompute) {
    if (routerCompute.mode !== "router-compute-agent-match" || routerCompute.status !== "passed") {
      errors.push("router Compute agent match evidence did not pass");
    }
    const requiredChecks = [
      "agentRegistered",
      "roomStarted",
      "routerMoveAccepted",
      "routerMoveWasLiveCompute",
      "matchFinished",
      "proofIndexedCompute",
    ];
    for (const key of requiredChecks) {
      if (routerCompute.verified?.[key] !== true) {
        errors.push(`router Compute agent match did not verify ${key}`);
      }
    }
    if (routerCompute.agentMove?.computeMode !== "0g-compute" || routerCompute.agentMove?.fallbackReason != null) {
      errors.push("router Compute agent match must include a non-fallback 0g-compute agent move");
    }
    if (routerCompute.completion?.computeMode !== "0g-compute" || routerCompute.completion?.computeProofCount < 1) {
      errors.push("router Compute agent match must finish with persisted 0g-compute proof metadata");
    }
  }
}

if (existsSync("evidence/live-proofs/0g-storage-room-router-compute-mqrwdmmf.json")) {
  const routerStorage = readJson("evidence/live-proofs/0g-storage-room-router-compute-mqrwdmmf.json");
  if (routerStorage) {
    if (routerStorage.mode !== "live-0g-storage-room-replay" || routerStorage.reachable !== true) {
      errors.push("router Compute room Storage proof must be a reachable live 0G Storage replay");
    }
    if (routerStorage.computeMode !== "0g-compute" || routerStorage.computeProofCount < 1) {
      errors.push("router Compute room Storage proof must include compute proof metadata");
    }
    if (!/^0x[a-fA-F0-9]{64}$/.test(routerStorage.rootHash ?? "")) {
      errors.push("router Compute room Storage proof has invalid root hash");
    }
  }
}

if (existsSync("evidence/live-proofs/chain-actual-match-router-compute-mqrwdmmf.json")) {
  const routerChain = readJson("evidence/live-proofs/chain-actual-match-router-compute-mqrwdmmf.json");
  if (routerChain) {
    if (routerChain.mode !== "live-0g-galileo-actual-match-result" || routerChain.status !== "passed") {
      errors.push("router Compute chain commit evidence did not pass");
    }
    if (routerChain.committed?.wagered !== false || routerChain.committed?.computeMode !== "0g-compute") {
      errors.push("router Compute chain commit must record a free match with computeMode=0g-compute");
    }
    for (const [key, value] of Object.entries(routerChain.verified ?? {})) {
      if (value !== true) errors.push(`router Compute chain commit did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/external-compute-proof-api-2026-06-24.json")) {
  const externalProof = readJson("evidence/live-proofs/external-compute-proof-api-2026-06-24.json");
  if (externalProof) {
    if (externalProof.mode !== "local-external-compute-proof-api" || externalProof.status !== "passed") {
      errors.push("external compute proof API evidence did not pass");
    }
    const requiredChecks = [
      "agentRegistered",
      "roomStarted",
      "humanMoveAccepted",
      "agentMoveAccepted",
      "roomMarkedCompute",
      "computeProofPersisted",
      "proofIndexedCompute",
      "humanProofRejected",
    ];
    for (const key of requiredChecks) {
      if (externalProof.verified?.[key] !== true) {
        errors.push(`external compute proof API evidence did not verify ${key}`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/explorer-da-batch-candidate-2026-06-24.json")) {
  const daExplorer = readJson("evidence/live-proofs/explorer-da-batch-candidate-2026-06-24.json");
  if (daExplorer) {
    if (daExplorer.mode !== "browser-explorer-da-batch-candidate" || daExplorer.status !== "passed") {
      errors.push("Explorer DA batch candidate browser proof did not pass");
    }
    for (const [key, value] of Object.entries(daExplorer.assertions ?? {})) {
      if (value !== true) errors.push(`Explorer DA batch candidate proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.json")) {
  const hostedPrivy = readJson("evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.json");
  if (hostedPrivy) {
    if (hostedPrivy.mode !== "hosted-privy-origin-check" || hostedPrivy.status !== "blocked") {
      errors.push("hosted Privy origin evidence must record the current blocked production-auth state");
    }
    for (const key of ["hostedRouteLoads", "loginButtonPresent", "privyBlockedByOriginOrCsp", "hostedBundleAppearsStale", "notAuthenticated"]) {
      if (hostedPrivy.assertions?.[key] !== true) {
        errors.push(`hosted Privy origin blocker evidence did not verify ${key}`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/d1-proof-leaderboard-api-2026-06-23.json")) {
  const d1Proof = readJson("evidence/live-proofs/d1-proof-leaderboard-api-2026-06-23.json");
  if (d1Proof) {
    if (d1Proof.mode !== "local-d1-proof-leaderboard-api") {
      errors.push("D1 proof/leaderboard evidence has wrong mode");
    }
    for (const [key, value] of Object.entries(d1Proof.verified ?? {})) {
      if (value !== true) errors.push(`D1 proof/leaderboard evidence did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/agent-registry-room-api-2026-06-23.json")) {
  const agentProof = readJson("evidence/live-proofs/agent-registry-room-api-2026-06-23.json");
  if (agentProof) {
    if (agentProof.mode !== "local-agent-registry-room-api") {
      errors.push("agent registry room evidence has wrong mode");
    }
    if (agentProof.computeMode !== "deterministic-fallback") {
      errors.push("agent room proof must disclose deterministic fallback compute");
    }
    for (const [key, value] of Object.entries(agentProof.verified ?? {})) {
      if (value !== true) errors.push(`agent registry room evidence did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/agent-compute-router-bound-api-2026-06-24.json")) {
  const routerBoundProof = readJson("evidence/live-proofs/agent-compute-router-bound-api-2026-06-24.json");
  if (routerBoundProof) {
    if (routerBoundProof.mode !== "local-agent-compute-router-bound-api" || routerBoundProof.status !== "passed") {
      errors.push("agent compute router-bound proof did not pass");
    }
    if (routerBoundProof.workerEnv?.routerKeyBound !== true) {
      errors.push("agent compute router-bound proof does not show router key binding");
    }
    if (routerBoundProof.result?.computeMode !== "deterministic-fallback") {
      errors.push("agent compute router-bound proof must disclose deterministic fallback compute");
    }
    if (routerBoundProof.result?.fallbackReason !== "Insufficient balance") {
      errors.push("agent compute router-bound proof must show the router balance blocker");
    }
  }
}

if (existsSync("evidence/live-proofs/wager-negative-api-2026-06-24.json")) {
  const negativeProof = readJson("evidence/live-proofs/wager-negative-api-2026-06-24.json");
  if (negativeProof) {
    if (negativeProof.mode !== "local-wager-negative-api" || negativeProof.status !== "passed") {
      errors.push("wager negative API proof did not pass");
    }
    const requiredLabels = [
      "unfunded wager start",
      "non-host cancel",
      "join cancelled room",
      "start cancelled room",
      "wrong turn",
      "illegal column",
      "duplicate move after finish",
    ];
    for (const label of requiredLabels) {
      if (!negativeProof.failures?.some((item) => item.label === label)) {
        errors.push(`wager negative API proof missing ${label}`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/wager-start-gate-api-2026-06-24.json")) {
  const startGateProof = readJson("evidence/live-proofs/wager-start-gate-api-2026-06-24.json");
  if (startGateProof) {
    if (startGateProof.mode !== "local-wager-start-gate-api" || startGateProof.status !== "passed") {
      errors.push("wager start gate API proof did not pass");
    }
    const requiredChecks = [
      "roomCreated",
      "roomReady",
      "unfundedStartRejected",
      "unfundedMoveRejected",
      "roomDidNotAutoStart",
    ];
    for (const key of requiredChecks) {
      if (startGateProof.verified?.[key] !== true) {
        errors.push(`wager start gate proof did not verify ${key}`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/wager-leaderboard-api-2026-06-24.json")) {
  const wagerLeaderboardProof = readJson("evidence/live-proofs/wager-leaderboard-api-2026-06-24.json");
  if (wagerLeaderboardProof) {
    if (wagerLeaderboardProof.mode !== "local-wager-leaderboard-api" || wagerLeaderboardProof.status !== "passed") {
      errors.push("wager leaderboard API proof did not pass");
    }
    const requiredChecks = [
      "roomCreated",
      "roomJoined",
      "fundedTwice",
      "roomStartedAfterFunding",
      "matchFinished",
      "settlementMined",
      "globalIncludesWinner",
      "gameIncludesWinner",
      "wagerModeIncludesWinner",
      "wagerGameModeIncludesWinner",
      "freeModeDoesNotIncludeWagerWinner",
      "loserIndexedInWagerMode",
    ];
    for (const key of requiredChecks) {
      if (wagerLeaderboardProof.verified?.[key] !== true) {
        errors.push(`wager leaderboard proof did not verify ${key}`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/agent-wager-policy-api-2026-06-24.json")) {
  const policyProof = readJson("evidence/live-proofs/agent-wager-policy-api-2026-06-24.json");
  if (policyProof) {
    if (policyProof.mode !== "local-agent-wager-policy-api" || policyProof.status !== "passed") {
      errors.push("agent wager policy API proof did not pass");
    }
    const requiredCases = [
      "unregistered",
      "pending agent",
      "free disabled agent",
      "free qualified agent",
      "unsupported game agent",
      "wager disabled agent",
      "wager cap below room",
      "wager cap equal room",
    ];
    for (const label of requiredCases) {
      if (!policyProof.cases?.some((item) => item.label === label && item.ok === true)) {
        errors.push(`agent wager policy proof missing ${label}`);
      }
    }
    for (const [key, value] of Object.entries(policyProof.verified ?? {})) {
      if (value !== true) errors.push(`agent wager policy proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/agent-avatar-api-2026-06-24.json")) {
  const avatarProof = readJson("evidence/live-proofs/agent-avatar-api-2026-06-24.json");
  if (avatarProof) {
    if (avatarProof.mode !== "local-agent-avatar-api" || avatarProof.status !== "passed") {
      errors.push("agent avatar API proof did not pass");
    }
    for (const [key, value] of Object.entries(avatarProof.verified ?? {})) {
      if (value !== true) errors.push(`agent avatar API proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/agent-wager-match-api-2026-06-24.json")) {
  const agentWagerProof = readJson("evidence/live-proofs/agent-wager-match-api-2026-06-24.json");
  if (agentWagerProof) {
    if (agentWagerProof.mode !== "local-agent-wager-match-api" || agentWagerProof.status !== "passed") {
      errors.push("agent wager match API proof did not pass");
    }
    const requiredChecks = [
      "agentRegistered",
      "agentListedForWager",
      "roomCreated",
      "agentJoined",
      "fundedTwice",
      "roomStartedAfterFunding",
      "agentMovedThreeTimes",
      "agentMovesUseFallbackWhileComputeBlocked",
      "matchFinishedWithHumanWinner",
      "settlementMined",
      "proofIndexed",
      "proofDisclosesFallbackCompute",
      "globalIncludesHumanWinner",
      "wagerIncludesHumanWinner",
      "gameWagerIncludesHumanWinner",
      "wagerIncludesAgentLoss",
      "freeModeDoesNotIncludeWagerWinner",
    ];
    for (const key of requiredChecks) {
      if (agentWagerProof.verified?.[key] !== true) {
        errors.push(`agent wager match proof did not verify ${key}`);
      }
    }
    if (!agentWagerProof.transactions?.settlement?.transactionHash || agentWagerProof.transactions?.settlement?.status !== "0x1") {
      errors.push("agent wager match proof does not include a successful settlement tx");
    }
  }
}

if (existsSync("evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json")) {
  const routerWagerProof = readJson("evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json");
  if (routerWagerProof) {
    if (routerWagerProof.mode !== "local-agent-wager-match-api" || routerWagerProof.status !== "passed") {
      errors.push("Router Compute agent wager match API proof did not pass");
    }
    if (
      !/^h2a-router-wager-[a-z0-9]+$/.test(routerWagerProof.roomId ?? "") ||
      routerWagerProof.expectedComputeMode !== "0g-compute" ||
      routerWagerProof.wagerWei !== "100000000000000"
    ) {
      errors.push("Router Compute agent wager match API proof has wrong room prefix, wager, or expected Compute mode");
    }
    const requiredChecks = [
      "agentRegistered",
      "agentListedForWager",
      "roomCreated",
      "agentJoined",
      "fundedTwice",
      "roomStartedAfterFunding",
      "agentMovedAtLeastOnce",
      "agentMovesUseExpectedCompute",
      "agentMovesUseRouterCompute",
      "matchFinishedWithWinner",
      "winnerIsKnownParticipant",
      "loserIsKnownParticipant",
      "settlementMined",
      "proofIndexed",
      "proofDisclosesExpectedCompute",
      "proofDisclosesRouterCompute",
      "globalIncludesWinner",
      "wagerIncludesWinner",
      "gameWagerIncludesWinner",
      "wagerIncludesLoserLoss",
      "humanAndAgentIndexedInWagerMode",
      "freeModeDoesNotIncludeWagerWinner",
    ];
    for (const key of requiredChecks) {
      if (routerWagerProof.verified?.[key] !== true) {
        errors.push(`Router Compute agent wager match proof did not verify ${key}`);
      }
    }
    if (
      !routerWagerProof.human?.id ||
      !routerWagerProof.agent?.id ||
      ![routerWagerProof.human.id, routerWagerProof.agent.id].includes(routerWagerProof.winnerId) ||
      ![routerWagerProof.human.id, routerWagerProof.agent.id].includes(routerWagerProof.loserId) ||
      routerWagerProof.winnerId === routerWagerProof.loserId
    ) {
      errors.push("Router Compute agent wager match proof must record a distinct human/agent winner and loser");
    }
    if (!routerWagerProof.transactions?.settlement?.transactionHash || routerWagerProof.transactions?.settlement?.status !== "0x1") {
      errors.push("Router Compute agent wager match proof does not include a successful settlement tx");
    }
    const agentMoves = routerWagerProof.api?.moveResults?.filter((move) => move.kind === "agent") ?? [];
    if (agentMoves.length < 1 || !agentMoves.every((move) => move.agentMove?.computeMode === "0g-compute" && move.agentMove?.fallbackReason === null)) {
      errors.push("Router Compute agent wager match proof must include non-fallback 0g-compute agent moves");
    }

    const currentStoragePath = `evidence/live-proofs/0g-storage-room-${routerWagerProof.roomId}.json`;
    const currentChainPath = `evidence/live-proofs/chain-actual-match-${routerWagerProof.roomId}.json`;
    const currentStorage = existsSync(currentStoragePath) ? readJson(currentStoragePath) : null;
    const currentChain = existsSync(currentChainPath) ? readJson(currentChainPath) : null;
    if (!currentStorage) {
      errors.push(`Router Compute agent wager match proof missing current Storage carry-through ${currentStoragePath}`);
    } else if (
      currentStorage.mode !== "live-0g-storage-room-replay" ||
      currentStorage.roomId !== routerWagerProof.roomId ||
      currentStorage.reachable !== true ||
      currentStorage.computeMode !== "0g-compute" ||
      currentStorage.wagerWei !== "100000000000000"
    ) {
      errors.push("Router Compute agent wager current Storage proof has wrong mode, room, reachability, wager, or Compute mode");
    }
    if (!currentChain) {
      errors.push(`Router Compute agent wager match proof missing current Chain carry-through ${currentChainPath}`);
    } else {
      if (
        currentChain.mode !== "live-0g-galileo-actual-match-result" ||
        currentChain.status !== "passed" ||
        currentChain.chainId !== 16602 ||
        currentChain.roomId !== routerWagerProof.roomId
      ) {
        errors.push("Router Compute agent wager current Chain proof did not pass for the current room on Galileo");
      }
      if (
        currentStorage &&
        (currentChain.committed?.storageRoot !== currentStorage.rootHash ||
          currentChain.committed?.wagered !== true ||
          currentChain.committed?.computeMode !== "0g-compute")
      ) {
        errors.push("Router Compute agent wager current Chain proof must commit the current Storage root as a wagered 0g-compute match");
      }
      if (currentChain.transactions?.createMatch?.status !== "0x1" || currentChain.transactions?.commitResult?.status !== "0x1") {
        errors.push("Router Compute agent wager current Chain proof does not include successful create/commit txs");
      }
      for (const [key, value] of Object.entries(currentChain.verified ?? {})) {
        if (value !== true) errors.push(`Router Compute agent wager current Chain proof did not verify ${key}`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/agent-skill-package-2026-06-24.json")) {
  const skillProof = readJson("evidence/live-proofs/agent-skill-package-2026-06-24.json");
  if (skillProof) {
    if (skillProof.mode !== "local-agent-skill-package" || skillProof.status !== "passed") {
      errors.push("agent skill package proof did not pass");
    }
    const requiredChecks = [
      "projectScoped",
      "skillLinksEverySubfile",
      "apiDocumentsRuntimeEndpoints",
      "registrationDocumentsQualification",
      "wagersDocumentSafety",
      "examplesIncludeFreeAndWager",
      "game:grid-four",
      "game:fleet-duel",
      "game:tile-race",
      "game:world-cup-draft",
    ];
    for (const key of requiredChecks) {
      if (skillProof.checks?.[key] !== true) {
        errors.push(`agent skill package proof did not verify ${key}`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/multigame-room-api-2026-06-24.json")) {
  const multigameProof = readJson("evidence/live-proofs/multigame-room-api-2026-06-24.json");
  if (multigameProof) {
    if (multigameProof.mode !== "local-multigame-room-api" || multigameProof.status !== "passed") {
      errors.push("multigame room API proof did not pass");
    }
    const expectedGames = ["fleet-duel", "tile-race", "world-cup-draft"];
    for (const game of expectedGames) {
      if (!multigameProof.games?.includes(game)) {
        errors.push(`multigame room API proof missing ${game}`);
      }
      const humanRoom = multigameProof.humanRooms?.find((room) => room.gameId === game);
      if (
        !humanRoom ||
        humanRoom.final?.status !== "finished" ||
        humanRoom.moves <= 0 ||
        humanRoom.proof?.status !== 200 ||
        humanRoom.proof?.gameId !== game
      ) {
        errors.push(`multigame room API proof did not finish/index human ${game}`);
      }
      const agentRoom = multigameProof.agentRooms?.find((room) => room.gameId === game);
      if (
        !agentRoom ||
        agentRoom.registered?.status !== 201 ||
        agentRoom.final?.status !== "finished" ||
        agentRoom.moves <= 0 ||
        !agentRoom.agentMoves?.length ||
        agentRoom.proof?.status !== 200 ||
        agentRoom.proof?.gameId !== game
      ) {
        errors.push(`multigame room API proof did not finish/index agent ${game}`);
      }
    }
    const requiredChecks = [
      "humanRoomsFinished",
      "agentRoomsFinished",
      "agentRoomsRegistered",
      "agentMovesComputeModeDisclosed",
      "agentProofsDiscloseComputeMode",
      "allProofsIndexed",
    ];
    for (const key of requiredChecks) {
      if (multigameProof.verified?.[key] !== true) {
        errors.push(`multigame room API proof did not verify ${key}`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/multigame-router-compute-api-2026-06-24.json")) {
  const multigameRouterProof = readJson("evidence/live-proofs/multigame-router-compute-api-2026-06-24.json");
  if (multigameRouterProof) {
    if (multigameRouterProof.mode !== "multigame-router-compute-api" || multigameRouterProof.status !== "passed") {
      errors.push("multigame Router Compute proof did not pass");
    }
    const expectedGames = ["fleet-duel", "tile-race", "world-cup-draft"];
    for (const game of expectedGames) {
      const room = multigameRouterProof.rooms?.find((item) => item.gameId === game);
      if (!room) {
        errors.push(`multigame Router Compute proof missing ${game}`);
        continue;
      }
      if (
        room.registered?.status !== 201 ||
        room.created?.status !== 200 ||
        room.joined?.status !== 200 ||
        room.started?.status !== 200 ||
        room.final?.status !== "finished"
      ) {
        errors.push(`multigame Router Compute proof did not complete ${game}`);
      }
      if (
        room.routerAgentMove?.status !== 200 ||
        room.routerAgentMove?.computeMode !== "0g-compute" ||
        room.routerAgentMove?.fallbackReason !== null ||
        !room.routerAgentMove?.move
      ) {
        errors.push(`multigame Router Compute proof did not record a live Router move for ${game}`);
      }
      if (room.final?.computeMode !== "0g-compute" || room.final?.computeProofCount < 1) {
        errors.push(`multigame Router Compute proof did not persist Compute metadata for ${game}`);
      }
      if (
        room.proof?.status !== 200 ||
        room.proof?.gameId !== game ||
        room.proof?.matchId !== room.matchId ||
        room.proof?.computeMode !== "0g-compute"
      ) {
        errors.push(`multigame Router Compute proof did not index proof compute mode for ${game}`);
      }
      const storageFile = `evidence/live-proofs/0g-storage-room-${room.roomId}.json`;
      const chainFile = `evidence/live-proofs/chain-actual-match-${room.roomId}.json`;
      if (!existsSync(storageFile) || !existsSync(chainFile)) {
        errors.push(`multigame Router Compute proof missing Storage/Chain carry-through for ${game}`);
        continue;
      }
      const storageProof = readJson(storageFile);
      const chainProof = readJson(chainFile);
      if (
        storageProof?.mode !== "live-0g-storage-room-replay" ||
        storageProof.roomId !== room.roomId ||
        storageProof.gameId !== game ||
        storageProof.reachable !== true ||
        storageProof.computeMode !== "0g-compute" ||
        storageProof.computeProofCount < 1
      ) {
        errors.push(`multigame Router Compute Storage proof is incomplete for ${game}`);
      }
      if (
        chainProof?.mode !== "live-0g-galileo-actual-match-result" ||
        chainProof.status !== "passed" ||
        chainProof.roomId !== room.roomId ||
        chainProof.chainId !== 16602 ||
        chainProof.committed?.storageRoot !== storageProof?.rootHash ||
        chainProof.committed?.computeMode !== "0g-compute" ||
        chainProof.committed?.wagered !== false ||
        chainProof.transactions?.createMatch?.status !== "0x1" ||
        chainProof.transactions?.commitResult?.status !== "0x1"
      ) {
        errors.push(`multigame Router Compute Chain proof is incomplete for ${game}`);
      }
    }
    for (const [key, value] of Object.entries(multigameRouterProof.verified ?? {})) {
      if (value !== true) errors.push(`multigame Router Compute proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/human-automatch-api-2026-06-24.json")) {
  const autoMatchProof = readJson("evidence/live-proofs/human-automatch-api-2026-06-24.json");
  if (autoMatchProof) {
    if (autoMatchProof.mode !== "local-human-automatch-api" || autoMatchProof.status !== "passed") {
      errors.push("human auto-match API proof did not pass");
    }
    const requiredChecks = [
      "freeFirstWaits",
      "freeSecondPairsSameRoom",
      "freeMatchAutoStarts",
      "freeQueueClearsAfterPair",
      "wagerFirstWaits",
      "wagerSecondPairsSameRoom",
      "wagerMatchRequiresFundingBeforeStart",
    ];
    for (const key of requiredChecks) {
      if (autoMatchProof.verified?.[key] !== true) {
        errors.push(`human auto-match proof did not verify ${key}`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/human-automatch-ui-2026-06-24.json")) {
  const autoMatchUiProof = readJson("evidence/live-proofs/human-automatch-ui-2026-06-24.json");
  if (autoMatchUiProof) {
    if (autoMatchUiProof.mode !== "local-human-automatch-browser-ui" || autoMatchUiProof.status !== "passed") {
      errors.push("human auto-match browser UI proof did not pass");
    }
    if (!existsSync(autoMatchUiProof.screenshot ?? "")) {
      errors.push("human auto-match browser UI proof screenshot is missing");
    }
    for (const [key, value] of Object.entries(autoMatchUiProof.verified ?? {})) {
      if (value !== true) errors.push(`human auto-match browser UI proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/home-product-flow-2026-06-24.json")) {
  const homeProof = readJson("evidence/live-proofs/home-product-flow-2026-06-24.json");
  if (homeProof) {
    if (homeProof.mode !== "local-home-product-flow-browser-ui" || homeProof.status !== "passed") {
      errors.push("home product-flow browser proof did not pass");
    }
    if (!existsSync(homeProof.screenshot ?? "")) {
      errors.push("home product-flow browser proof screenshot is missing");
    }
    for (const [key, value] of Object.entries(homeProof.verified ?? {})) {
      if (value !== true) errors.push(`home product-flow browser proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/home-start-actions-2026-06-24.json")) {
  const homeStartProof = readJson("evidence/live-proofs/home-start-actions-2026-06-24.json");
  if (homeStartProof) {
    if (homeStartProof.mode !== "local-home-start-actions-browser-ui" || homeStartProof.status !== "passed") {
      errors.push("home start-actions browser proof did not pass");
    }
    for (const screenshot of Object.values(homeStartProof.screenshots ?? {})) {
      if (!existsSync(screenshot)) errors.push(`home start-actions browser proof screenshot is missing: ${screenshot}`);
    }
    for (const [key, value] of Object.entries(homeStartProof.verified ?? {})) {
      if (value !== true) errors.push(`home start-actions browser proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/game-detail-start-actions-2026-06-24.json")) {
  const gameDetailStartProof = readJson("evidence/live-proofs/game-detail-start-actions-2026-06-24.json");
  if (gameDetailStartProof) {
    if (gameDetailStartProof.mode !== "local-game-detail-start-actions-browser-ui" || gameDetailStartProof.status !== "passed") {
      errors.push("game detail start-actions browser proof did not pass");
    }
    const expectedGames = ["grid-four", "fleet-duel", "tile-race", "world-cup-draft"];
    for (const game of expectedGames) {
      if (!gameDetailStartProof.games?.includes(game)) {
        errors.push(`game detail start-actions proof missing ${game}`);
      }
      const route = gameDetailStartProof.routes?.find((item) => item.gameId === game);
      if (!route) {
        errors.push(`game detail start-actions proof missing route for ${game}`);
        continue;
      }
      if (!route.route?.endsWith(`/games/${game}`) || !route.humanUrl?.includes("/room/") || !route.agentUrl?.includes("/match/")) {
        errors.push(`game detail start-actions proof has incomplete route data for ${game}`);
      }
      for (const screenshot of Object.values(route.screenshots ?? {})) {
        if (!existsSync(screenshot)) errors.push(`game detail start-actions proof screenshot is missing for ${game}: ${screenshot}`);
      }
      for (const [key, value] of Object.entries(route.verified ?? {})) {
        if (value !== true) errors.push(`game detail start-actions proof ${game} did not verify ${key}`);
      }
    }
    for (const [key, value] of Object.entries(gameDetailStartProof.verified ?? {})) {
      if (value !== true) errors.push(`game detail start-actions proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/all-game-h2h-browser-2026-06-24.json")) {
  const allGameH2hProof = readJson("evidence/live-proofs/all-game-h2h-browser-2026-06-24.json");
  if (allGameH2hProof) {
    if (allGameH2hProof.mode !== "local-all-game-h2h-browser-ui" || allGameH2hProof.status !== "passed") {
      errors.push("all-game H2H browser proof did not pass");
    }
    const expectedGames = ["grid-four", "fleet-duel", "tile-race", "world-cup-draft"];
    for (const game of expectedGames) {
      if (!allGameH2hProof.games?.includes(game)) {
        errors.push(`all-game H2H browser proof missing ${game}`);
      }
      const room = allGameH2hProof.rooms?.find((item) => item.gameId === game);
      if (!room) {
        errors.push(`all-game H2H browser proof missing room for ${game}`);
        continue;
      }
      if (!room.roomId || room.matchId !== `match-${room.roomId}`) {
        errors.push(`all-game H2H browser proof has incomplete room data for ${game}`);
      }
      if (!Array.isArray(room.clickedMoves) || room.clickedMoves.length < 1) {
        errors.push(`all-game H2H browser proof has no clicked browser moves for ${game}`);
      }
      if (room.final?.status !== "finished" || !/^0x/.test(room.final?.replayHash ?? "") || !/^0x/.test(room.final?.resultHash ?? "")) {
        errors.push(`all-game H2H browser proof did not finish with replay/result hashes for ${game}`);
      }
      if (room.proof?.status !== 200 || room.proof?.matchId !== `match-${room.roomId}` || room.proof?.gameId !== game) {
        errors.push(`all-game H2H browser proof did not index proof for ${game}`);
      }
      for (const screenshot of Object.values(room.screenshots ?? {})) {
        if (!existsSync(screenshot)) errors.push(`all-game H2H browser proof screenshot is missing for ${game}: ${screenshot}`);
      }
      for (const [key, value] of Object.entries(room.verified ?? {})) {
        if (value !== true) errors.push(`all-game H2H browser proof ${game} did not verify ${key}`);
      }
    }
    for (const [key, value] of Object.entries(allGameH2hProof.verified ?? {})) {
      if (value !== true) errors.push(`all-game H2H browser proof did not verify ${key}`);
    }
  }
}

for (const [file, expectedMode] of [
  ["evidence/live-proofs/e2e-local-gate-2026-06-24.json", "e2e-local-gate"],
  ["evidence/live-proofs/e2e-live-0g-gate-2026-06-24.json", "e2e-live-0g-gate"],
]) {
  if (existsSync(file)) {
    const e2eGate = readJson(file);
    if (e2eGate) {
      if (e2eGate.mode !== expectedMode || e2eGate.status !== "passed") {
        errors.push(`${expectedMode} did not pass`);
      }
      if (!Array.isArray(e2eGate.checks) || e2eGate.checks.length < 1) {
        errors.push(`${expectedMode} must record checked evidence`);
      }
      for (const check of e2eGate.checks ?? []) {
        if (check.passed !== true) {
          errors.push(`${expectedMode} check failed: ${check.label ?? check.file ?? "unknown"}`);
        }
      }
    }
  }
}

if (existsSync("evidence/live-proofs/browser-proof-surfaces-2026-06-24.json")) {
  const browserProof = readJson("evidence/live-proofs/browser-proof-surfaces-2026-06-24.json");
  if (browserProof) {
    if (browserProof.mode !== "local-browser-proof-surfaces" || browserProof.status !== "passed") {
      errors.push("browser proof surfaces evidence did not pass");
    }
    const expectedRoutes = ["gameDetail", "leaderboard", "explorer", "proof"];
    for (const route of expectedRoutes) {
      const routeProof = browserProof.routes?.[route];
      if (!routeProof) {
        errors.push(`browser proof surfaces missing ${route}`);
        continue;
      }
      if (!existsSync(routeProof.screenshot ?? "")) {
        errors.push(`browser proof surfaces missing screenshot for ${route}`);
      }
      for (const [key, value] of Object.entries(routeProof.verified ?? {})) {
        if (value !== true) errors.push(`browser proof ${route} did not verify ${key}`);
      }
    }
  }
}

if (existsSync("evidence/live-proofs/explorer-all-game-pack-storage-2026-06-24.json")) {
  const explorerStorageProof = readJson("evidence/live-proofs/explorer-all-game-pack-storage-2026-06-24.json");
  if (explorerStorageProof) {
    if (explorerStorageProof.mode !== "local-explorer-all-game-pack-storage-browser-ui" || explorerStorageProof.status !== "passed") {
      errors.push("Explorer all-game game-pack storage browser proof did not pass");
    }
    for (const game of games) {
      if (!explorerStorageProof.games?.includes(game)) {
        errors.push(`Explorer all-game game-pack storage proof missing ${game}`);
      }
    }
    if (explorerStorageProof.reachableCount < games.length) {
      errors.push("Explorer all-game game-pack storage proof did not render all reachable storage rows");
    }
    if (!existsSync(explorerStorageProof.screenshot ?? "")) {
      errors.push("Explorer all-game game-pack storage proof screenshot is missing");
    }
    for (const [key, value] of Object.entries(explorerStorageProof.verified ?? {})) {
      if (value !== true) errors.push(`Explorer all-game game-pack storage proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/explorer-proof-artifact-storage-2026-06-24.json")) {
  const explorerArtifactProof = readJson("evidence/live-proofs/explorer-proof-artifact-storage-2026-06-24.json");
  if (explorerArtifactProof) {
    if (explorerArtifactProof.mode !== "local-explorer-proof-artifact-storage-browser-ui" || explorerArtifactProof.status !== "passed") {
      errors.push("Explorer proof artifact storage browser proof did not pass");
    }
    for (const text of ["proof artifact storage", "0g-arcade-proof-artifacts@1", "submission-review-receipt", "share-card-metadata", "agent-reasoning-transcript"]) {
      if (!explorerArtifactProof.requiredText?.includes(text)) {
        errors.push(`Explorer proof artifact storage proof missing required text ${text}`);
      }
    }
    if (!existsSync(explorerArtifactProof.screenshot ?? "")) {
      errors.push("Explorer proof artifact storage proof screenshot is missing");
    }
    for (const [key, value] of Object.entries(explorerArtifactProof.verified ?? {})) {
      if (value !== true) errors.push(`Explorer proof artifact storage proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/agent-picker-all-games-2026-06-24.json")) {
  const agentPickerProof = readJson("evidence/live-proofs/agent-picker-all-games-2026-06-24.json");
  if (agentPickerProof) {
    if (agentPickerProof.mode !== "local-all-game-agent-picker-browser-ui" || agentPickerProof.status !== "passed") {
      errors.push("all-game agent picker browser proof did not pass");
    }
    const expectedGames = ["grid-four", "fleet-duel", "tile-race", "world-cup-draft"];
    for (const game of expectedGames) {
      if (!agentPickerProof.games?.includes(game)) {
        errors.push(`all-game agent picker proof missing ${game}`);
      }
      const route = agentPickerProof.routes?.find((item) => item.gameId === game);
      if (!route) {
        errors.push(`all-game agent picker proof missing route for ${game}`);
        continue;
      }
      if (!route.agentId || !route.displayName || !route.url?.endsWith(`/games/${game}`)) {
        errors.push(`all-game agent picker proof has incomplete route data for ${game}`);
      }
      if (!existsSync(route.screenshot ?? "")) {
        errors.push(`all-game agent picker proof screenshot is missing for ${game}`);
      }
      for (const [key, value] of Object.entries(route.verified ?? {})) {
        if (value !== true) errors.push(`all-game agent picker proof ${game} did not verify ${key}`);
      }
    }
    for (const [key, value] of Object.entries(agentPickerProof.verified ?? {})) {
      if (value !== true) errors.push(`all-game agent picker proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/non-grid-room-ui-2026-06-24.json")) {
  const nonGridRoomUiProof = readJson("evidence/live-proofs/non-grid-room-ui-2026-06-24.json");
  if (nonGridRoomUiProof) {
    if (nonGridRoomUiProof.mode !== "local-non-grid-room-browser-ui" || nonGridRoomUiProof.status !== "passed") {
      errors.push("non-Grid room browser UI proof did not pass");
    }
    const expectedGames = ["fleet-duel", "tile-race", "world-cup-draft"];
    for (const game of expectedGames) {
      if (!nonGridRoomUiProof.games?.includes(game)) {
        errors.push(`non-Grid room browser UI proof missing ${game}`);
      }
      const room = nonGridRoomUiProof.rooms?.find((item) => item.gameId === game);
      if (!room) {
        errors.push(`non-Grid room browser UI proof missing room for ${game}`);
        continue;
      }
      if (!room.url?.includes(`game=${game}`) || !room.matchId || !room.roomId) {
        errors.push(`non-Grid room browser UI proof has incomplete route data for ${game}`);
      }
      if (!existsSync(room.screenshot ?? "")) {
        errors.push(`non-Grid room browser UI proof screenshot is missing for ${game}`);
      }
      for (const [key, value] of Object.entries(room.verified ?? {})) {
        if (value !== true) errors.push(`non-Grid room browser UI proof ${game} did not verify ${key}`);
      }
    }
    for (const [key, value] of Object.entries(nonGridRoomUiProof.verified ?? {})) {
      if (value !== true) errors.push(`non-Grid room browser UI proof did not verify ${key}`);
    }
  }
}

if (existsSync("evidence/live-proofs/game-submission-workflow-2026-06-24.json")) {
  const submissionWorkflowProof = readJson("evidence/live-proofs/game-submission-workflow-2026-06-24.json");
  if (submissionWorkflowProof) {
    if (submissionWorkflowProof.mode !== "local-game-submission-workflow" || submissionWorkflowProof.status !== "passed") {
      errors.push("game submission workflow proof did not pass");
    }
    const expectedGames = ["grid-four", "fleet-duel", "tile-race", "world-cup-draft"];
    const requiredChecks = [
      "submitPageIsPullRequestOnly",
      "maintainerApprovalLanguage",
      "docsExplainPrWorkflow",
      "prTemplateChecklist",
      "ciRunsOnPullRequest",
      "ciValidatesGamePacks",
      "toolingScriptsPresent",
      "allGamePacksHaveRequiredFiles",
      "allManifestHashesMatch",
      "coverLogoAssetsRequiredAndPresent",
      "bannedPatternsAbsent",
      "noInAppUploadLanguage",
    ];
    for (const game of expectedGames) {
      const pack = submissionWorkflowProof.gamePacks?.find((item) => item.id === game);
      if (!pack) {
        errors.push(`game submission workflow proof missing ${game}`);
        continue;
      }
      if (pack.files?.cover !== true || pack.files?.logo !== true) {
        errors.push(`game submission workflow proof missing cover/logo for ${game}`);
      }
      if (!Object.values(pack.hashes ?? {}).every(Boolean)) {
        errors.push(`game submission workflow proof has hash mismatch for ${game}`);
      }
    }
    for (const key of requiredChecks) {
      if (submissionWorkflowProof.verified?.[key] !== true) {
        errors.push(`game submission workflow proof did not verify ${key}`);
      }
    }
  }
}

if (existsSync("docs/EVIDENCE_REPORT.md")) {
  const evidence = readFileSync("docs/EVIDENCE_REPORT.md", "utf8");
  const screenshots = [
    ...findMediaFiles("screenshots"),
    ...findMediaFiles("evidence"),
    ...findMediaFiles("docs/screenshots"),
    ...findMediaFiles("public/screenshots"),
  ];
  if (screenshots.length < 18 && !evidence.includes("still pending")) {
    errors.push("visual QA appears under-proven, but docs/EVIDENCE_REPORT.md does not say screenshots are still pending");
  }
  if (evidence.includes("Responsive screenshot evidence")) {
    validateVisualManifest("evidence/screenshots/2026-06-23-responsive/manifest.json");
    validateVisualManifest("evidence/screenshots/2026-06-23-responsive/viewport/manifest.json");
  }
  if (/0G Storage:\s*(live|deployed|uploaded)|0G Storage upload/i.test(evidence)) {
    const storageProof = existsSync("evidence/live-proofs/0g-storage-room-gr-zqvy.json")
      ? readJson("evidence/live-proofs/0g-storage-room-gr-zqvy.json")
      : null;
    if (storageProof?.mode !== "live-0g-storage-room-replay" || storageProof?.reachable !== true) {
      errors.push("evidence report appears to claim live 0G Storage without reachable room replay evidence");
    }
  }
  if (/Chain:\s*(live|deployed|Galileo)/i.test(evidence)) {
    const liveProofPath = "evidence/live-proofs/chain-check-latest.json";
    const liveProof = existsSync(liveProofPath) ? readJson(liveProofPath) : null;
    if (liveProof?.mode !== "live-0g-galileo-chain-smoke" || liveProof?.chainId !== 16602) {
      errors.push("evidence report appears to claim live 0G Chain without evidence/live-proofs/chain-check-latest.json");
    }
  }
}

if (errors.length) {
  console.error(`completion audit failed:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("completion audit OK: required evidence exists, including responsive screenshot manifests");
}
