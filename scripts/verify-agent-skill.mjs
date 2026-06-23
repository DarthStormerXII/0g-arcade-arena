import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const skillDir = path.join(root, "docs/agent-skills/0g-arcade-player");
const outFile = path.join(root, "evidence/live-proofs/agent-skill-package-2026-06-24.json");
const games = ["grid-four", "fleet-duel", "tile-race", "world-cup-draft"];
const requiredFiles = [
  "SKILL.md",
  "api.md",
  "registration.md",
  "wagers.md",
  "examples.md",
  ...games.map((game) => `${game}.md`),
];
const requiredApiTerms = [
  "POST /api/agents",
  "GET /api/agents?gameId=grid-four&wagerWei=0",
  "POST /api/rooms",
  "POST /api/rooms/:roomId/join",
  "POST /api/rooms/:roomId/start",
  "GET /api/rooms/:roomId",
  "POST /api/rooms/:roomId/move",
  "POST /api/rooms/:roomId/agent-move",
];
const moveTerms = {
  "grid-four": ['"column"'],
  "fleet-duel": ['"x"', '"y"'],
  "tile-race": ['"direction"', '"up"', '"down"', '"left"', '"right"'],
  "world-cup-draft": ['"pickId"'],
};

const errors = [];
const checks = {};

function readRelative(file) {
  const filePath = path.join(skillDir, file);
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    errors.push(`missing docs/agent-skills/0g-arcade-player/${file}`);
    return "";
  }
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(path.join(root, file), "utf8"));
  } catch (error) {
    errors.push(`invalid ${file}: ${error.message}`);
    return null;
  }
}

for (const file of requiredFiles) {
  const content = readRelative(file);
  checks[`file:${file}`] = content.length > 0;
}

const skill = readRelative("SKILL.md");
checks.projectScoped = /project-level/i.test(skill) && /Do not copy credentials/i.test(skill);
if (!checks.projectScoped) errors.push("SKILL.md must state that the skill is project-level and must not copy credentials");

for (const file of requiredFiles.filter((file) => file !== "SKILL.md")) {
  if (!skill.includes(file)) {
    errors.push(`SKILL.md does not link ${file}`);
  }
}
checks.skillLinksEverySubfile = requiredFiles.filter((file) => file !== "SKILL.md").every((file) => skill.includes(file));

const api = readRelative("api.md");
for (const term of requiredApiTerms) {
  if (!api.includes(term)) errors.push(`api.md missing ${term}`);
}
checks.apiDocumentsRuntimeEndpoints = requiredApiTerms.every((term) => api.includes(term));

const registration = readRelative("registration.md");
const registrationTerms = ["agentId", "ownerWallet", "supportedGames", "maxWagerWei", "qualified", "POST /api/agents"];
for (const term of registrationTerms) {
  if (!registration.includes(term)) errors.push(`registration.md missing ${term}`);
}
checks.registrationDocumentsQualification = registrationTerms.every((term) => registration.includes(term));

const wagers = readRelative("wagers.md");
const wagerTerms = ["maxWagerPerMatch", "maxWagerWei", "ArcadeWagerEscrow.escrowed", "settleWinner"];
for (const term of wagerTerms) {
  if (!wagers.includes(term)) errors.push(`wagers.md missing ${term}`);
}
checks.wagersDocumentSafety = wagerTerms.every((term) => wagers.includes(term));

const examples = readRelative("examples.md");
checks.examplesIncludeFreeAndWager = /Free Grid Four Move/i.test(examples) && /Wager Rejection/i.test(examples);
if (!checks.examplesIncludeFreeAndWager) errors.push("examples.md must include free move and wager rejection examples");

for (const game of games) {
  const manifest = readJson(`games/${game}/manifest.json`);
  const guide = readRelative(`${game}.md`);
  if (manifest?.id !== game) errors.push(`${game} manifest id mismatch`);
  if (manifest?.supportsHumanVsAgent !== true || manifest?.supportsAgentVsAgent !== true) {
    errors.push(`${game} must support human-vs-agent and agent-vs-agent in the manifest`);
  }
  if (!guide.includes("## Objective")) errors.push(`${game}.md missing Objective section`);
  if (!guide.includes("## Legal Move")) errors.push(`${game}.md missing Legal Move section`);
  if (!guide.includes("## State")) errors.push(`${game}.md missing State section`);
  if (!guide.includes("## Strategy")) errors.push(`${game}.md missing Strategy section`);
  if (!guide.includes("## Forbidden Output")) errors.push(`${game}.md missing Forbidden Output section`);
  if (!guide.includes("## Valid Output")) errors.push(`${game}.md missing Valid Output section`);
  for (const term of moveTerms[game]) {
    if (!guide.includes(term)) errors.push(`${game}.md missing move schema term ${term}`);
  }
  checks[`game:${game}`] =
    manifest?.id === game &&
    manifest?.supportsHumanVsAgent === true &&
    manifest?.supportsAgentVsAgent === true &&
    ["## Objective", "## Legal Move", "## State", "## Strategy", "## Forbidden Output", "## Valid Output"].every((section) =>
      guide.includes(section),
    ) &&
    moveTerms[game].every((term) => guide.includes(term));
}

mkdirSync(path.dirname(outFile), { recursive: true });
const evidence = {
  mode: "local-agent-skill-package",
  status: errors.length ? "failed" : "passed",
  generatedAt: new Date().toISOString(),
  skillDir: "docs/agent-skills/0g-arcade-player",
  games,
  requiredFiles,
  checks,
  errors,
};
writeFileSync(outFile, `${JSON.stringify(evidence, null, 2)}\n`);

if (errors.length) {
  console.error(`agent skill package check failed:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`agent skill package OK: ${requiredFiles.length} files cover ${games.length} games`);
  console.log(`wrote ${outFile}`);
}
