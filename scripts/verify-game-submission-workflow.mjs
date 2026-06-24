import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

const games = ["grid-four", "fleet-duel", "tile-race", "world-cup-draft"];
const root = process.cwd();
const evidencePath = "evidence/live-proofs/game-submission-workflow-2026-06-24.json";
const requiredPackFiles = [
  "manifest.json",
  "rules.ts",
  "schema.ts",
  "agent.md",
  "ui/GameView.tsx",
  "tests/rules.test.ts",
  "fixtures/demo-replay.json",
  "README.md",
  "LICENSE.md",
];
const requiredHashFiles = {
  moveSchemaHash: "schema.ts",
  rulesHash: "rules.ts",
  uiHash: "ui/GameView.tsx",
  agentPromptHash: "agent.md",
  replaySchemaHash: "fixtures/demo-replay.json",
};
const requiredPackageScripts = [
  "game:create",
  "game:validate",
  "game:test",
  "game:simulate",
  "game:agent-test",
  "game:pack",
  "game:publish",
  "game:hash",
];
const requiredChecklist = [
  "Game is fun in under 3 minutes",
  "Deterministic rules",
  "Human playable",
  "Agent playable",
  "Replay proof works",
  "Mobile UI works",
  "License included",
  "No trademark/IP misuse",
  "No secrets",
  "Tests pass",
  "Example replay included",
];
const bannedPackPattern = /process\.env|PRIVATE_KEY|SECRET|eval\(|new Function|fetch\(/;
const inAppUploadControlPattern = /type=["']file["']|new FormData|<form|onSubmit|multipart\/form-data/i;
const errors = [];

function read(file) {
  return readFileSync(path.join(root, file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function requireFile(file) {
  if (!existsSync(path.join(root, file))) errors.push(`missing ${file}`);
}

function sha(file) {
  return `0x${createHash("sha256").update(readFileSync(path.join(root, file))).digest("hex")}`;
}

function requireText(file, terms) {
  const text = read(file);
  for (const term of terms) {
    if (!text.includes(term)) errors.push(`${file} missing ${term}`);
  }
  return text;
}

function hasAsset(dir, base) {
  return existsSync(path.join(root, dir, "assets", `${base}.svg`)) || existsSync(path.join(root, dir, "assets", `${base}.png`));
}

function walkTextFiles(dir) {
  const fullDir = path.join(root, dir);
  const files = [];
  for (const item of readdirSync(fullDir)) {
    const file = path.join(fullDir, item);
    const stats = statSync(file);
    if (stats.isDirectory()) {
      files.push(...walkTextFiles(path.relative(root, file)));
    } else if (/\.(json|ts|tsx|md|svg)$/i.test(file)) {
      files.push(path.relative(root, file));
    }
  }
  return files;
}

for (const file of [
  "src/pages/ArenaPages.tsx",
  "docs/GAME_SUBMISSION.md",
  ".github/PULL_REQUEST_TEMPLATE/game-submission.md",
  ".github/workflows/game-pack-ci.yml",
  "scripts/game-tool.mjs",
  "package.json",
]) {
  requireFile(file);
}

const submitSource = requireText("src/pages/ArenaPages.tsx", [
  "Submit Game Pack",
  "Pull request only",
  "Gabriel manually reviews, tests, and approves accepted games",
  "Required pack files",
  "Validation commands",
]);
if (inAppUploadControlPattern.test(submitSource)) {
  errors.push("submit-game page must stay pull-request-only and not expose in-app upload controls");
}

const docs = requireText("docs/GAME_SUBMISSION.md", [
  "Submit one game pack by pull request",
  "There is no in-app game upload or auto-publish path",
  "Gabriel reviews, tests, and manually approves",
  "pnpm game:validate <slug>",
  "pnpm game:test <slug>",
  "cover.svg",
  "logo.svg",
]);

const prTemplate = requireText(".github/PULL_REQUEST_TEMPLATE/game-submission.md", [
  "## Game Pack Submission",
  "Game slug:",
  "Manifest hash:",
  "Rules hash:",
  "Replay hash:",
]);
for (const item of requiredChecklist) {
  if (!prTemplate.includes(item)) errors.push(`PR template missing checklist item: ${item}`);
}

const workflow = requireText(".github/workflows/game-pack-ci.yml", [
  "pull_request:",
  '"games/**"',
  "pnpm game:validate",
  "pnpm test",
]);

const packageJson = readJson("package.json");
for (const script of requiredPackageScripts) {
  if (!packageJson.scripts?.[script]) errors.push(`package.json missing ${script}`);
}

const gamePacks = games.map((game) => {
  const dir = `games/${game}`;
  for (const file of requiredPackFiles) requireFile(`${dir}/${file}`);
  if (!hasAsset(dir, "cover")) errors.push(`${game} missing cover asset`);
  if (!hasAsset(dir, "logo")) errors.push(`${game} missing logo asset`);

  const manifest = readJson(`${dir}/manifest.json`);
  const hashMatches = {};
  for (const [field, file] of Object.entries(requiredHashFiles)) {
    const expected = sha(`${dir}/${file}`);
    hashMatches[field] = manifest[field] === expected;
    if (!hashMatches[field]) errors.push(`${game} manifest ${field} does not match ${file}`);
  }

  const textFiles = walkTextFiles(dir);
  for (const file of textFiles) {
    if (bannedPackPattern.test(read(file))) errors.push(`${file} contains a banned submission pattern`);
  }

  return {
    id: game,
    name: manifest.name,
    supportsHumanVsHuman: manifest.supportsHumanVsHuman,
    supportsHumanVsAgent: manifest.supportsHumanVsAgent,
    supportsWagers: manifest.supportsWagers,
    supportsTournaments: manifest.supportsTournaments,
    files: {
      required: requiredPackFiles.length,
      cover: hasAsset(dir, "cover"),
      logo: hasAsset(dir, "logo"),
    },
    hashes: hashMatches,
  };
});

const allGamePacksHaveRequiredFiles = games.every((game) => {
  const dir = `games/${game}`;
  return requiredPackFiles.every((file) => existsSync(path.join(root, dir, file))) && hasAsset(dir, "cover") && hasAsset(dir, "logo");
});
const allManifestHashesMatch = gamePacks.every((game) => Object.values(game.hashes).every(Boolean));

const evidence = {
  mode: "local-game-submission-workflow",
  status: errors.length ? "failed" : "passed",
  checkedAt: new Date().toISOString(),
  routes: {
    submitGameSource: "src/pages/ArenaPages.tsx",
    pullRequestOnly: submitSource.includes("Pull request only"),
    maintainerApprovalLanguage: submitSource.includes("Gabriel manually reviews, tests, and approves accepted games"),
  },
  repository: {
    docs: "docs/GAME_SUBMISSION.md",
    prTemplate: ".github/PULL_REQUEST_TEMPLATE/game-submission.md",
    workflow: ".github/workflows/game-pack-ci.yml",
    tooling: "scripts/game-tool.mjs",
    packageScripts: requiredPackageScripts,
    workflowTriggersPullRequest: workflow.includes("pull_request:"),
    workflowValidatesGamePacks: workflow.includes('"games/**"') && workflow.includes("pnpm game:validate") && workflow.includes("pnpm test"),
    docsPullRequestOnly: docs.includes("There is no in-app game upload or auto-publish path"),
  },
  gamePacks,
  verified: {
    submitPageIsPullRequestOnly: submitSource.includes("Pull request only") && !inAppUploadControlPattern.test(submitSource),
    maintainerApprovalLanguage: submitSource.includes("Gabriel manually reviews, tests, and approves accepted games"),
    docsExplainPrWorkflow: docs.includes("Submit one game pack by pull request") && docs.includes("There is no in-app game upload or auto-publish path"),
    prTemplateChecklist: requiredChecklist.every((item) => prTemplate.includes(item)),
    ciRunsOnPullRequest: workflow.includes("pull_request:"),
    ciValidatesGamePacks: workflow.includes('"games/**"') && workflow.includes("pnpm game:validate") && workflow.includes("pnpm test"),
    toolingScriptsPresent: requiredPackageScripts.every((script) => Boolean(packageJson.scripts?.[script])),
    allGamePacksHaveRequiredFiles,
    allManifestHashesMatch,
    coverLogoAssetsRequiredAndPresent: gamePacks.every((game) => game.files.cover && game.files.logo),
    bannedPatternsAbsent: errors.every((error) => !error.includes("banned submission pattern")),
    noInAppUploadLanguage: docs.includes("There is no in-app game upload or auto-publish path"),
  },
  errors,
};

mkdirSync(path.dirname(path.join(root, evidencePath)), { recursive: true });
writeFileSync(path.join(root, evidencePath), `${JSON.stringify(evidence, null, 2)}\n`);

if (errors.length) {
  console.error(`game submission workflow proof failed:\n- ${errors.join("\n- ")}`);
  process.exit(1);
}

console.log(`game submission workflow proof OK: ${evidencePath}`);
