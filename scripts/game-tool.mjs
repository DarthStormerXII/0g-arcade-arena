import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const gamesDir = join(root, "games");
const required = [
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
const hashFieldFiles = {
  moveSchemaHash: "schema.ts",
  rulesHash: "rules.ts",
  uiHash: "ui/GameView.tsx",
  agentPromptHash: "agent.md",
  replaySchemaHash: "fixtures/demo-replay.json",
};

function sha(path) {
  return `0x${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

function gamePath(slug) {
  return join(gamesDir, slug);
}

function listGames() {
  return readdirSync(gamesDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

function validate(slug) {
  const dir = gamePath(slug);
  const errors = [];
  for (const file of required) {
    if (!existsSync(join(dir, file))) errors.push(`missing ${file}`);
  }
  if (!existsSync(join(dir, "assets", "cover.svg")) && !existsSync(join(dir, "assets", "cover.png"))) {
    errors.push("missing assets/cover.svg or assets/cover.png");
  }
  if (!existsSync(join(dir, "assets", "logo.svg")) && !existsSync(join(dir, "assets", "logo.png"))) {
    errors.push("missing assets/logo.svg or assets/logo.png");
  }
  const manifestPath = join(dir, "manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const field of manifestFields) {
      if (!(field in manifest)) errors.push(`manifest missing ${field}`);
    }
    for (const [field, file] of Object.entries(hashFieldFiles)) {
      const value = manifest[field];
      if (typeof value !== "string" || !/^0x[0-9a-f]{64}$/.test(value)) {
        errors.push(`manifest ${field} must be a concrete sha256 hex hash`);
      } else if (existsSync(join(dir, file)) && value !== sha(join(dir, file))) {
        errors.push(`manifest ${field} does not match ${file}`);
      }
    }
    if (manifest.id !== slug) errors.push(`manifest id ${manifest.id} does not match ${slug}`);
    if (!existsSync(join(dir, "LICENSE.md"))) errors.push("license is absent");
    if (/GPL/i.test(readFileSync(join(dir, "LICENSE.md"), "utf8"))) {
      errors.push("GPL license requires explicit isolation and documentation");
    }
  }
  const packText = required.filter((file) => existsSync(join(dir, file))).map((file) => readFileSync(join(dir, file), "utf8")).join("\n");
  if (/process\.env|PRIVATE_KEY|SECRET|eval\(|new Function|fetch\(/.test(packText)) {
    errors.push("game pack contains a secret, remote call, or remote-code-execution pattern");
  }
  return errors;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: root });
  process.exitCode = result.status ?? 1;
}

function scaffold(slug) {
  const dir = gamePath(slug);
  if (existsSync(dir)) throw new Error(`${slug} already exists`);
  for (const folder of ["ui", "tests", "fixtures", "assets"]) {
    mkdirSync(join(dir, folder), { recursive: true });
  }
  const title = slug.split("-").map((part) => `${part[0].toUpperCase()}${part.slice(1)}`).join(" ");
  const manifest = {
    id: slug,
    name: title,
    version: "0.1.0",
    author: "Contributor",
    license: "MIT",
    minPlayers: 1,
    maxPlayers: 2,
    supportsSolo: true,
    supportsHumanVsHuman: true,
    supportsHumanVsAgent: true,
    supportsAgentVsAgent: true,
    supportsWagers: false,
    supportsTournaments: false,
    gameType: "draft",
    turnType: "sequential",
    hiddenInformation: false,
    randomness: "seeded",
    seedRequired: true,
    averageDuration: "3 minutes",
    moveSchemaHash: "",
    rulesHash: "",
    uiHash: "",
    agentPromptHash: "",
    replaySchemaHash: "",
  };
  writeFileSync(join(dir, "rules.ts"), "export const manifest = {};\n");
  writeFileSync(join(dir, "schema.ts"), "import { z } from \"zod\";\nexport const moveSchema = z.object({});\n");
  writeFileSync(join(dir, "agent.md"), `# ${title} Agent Instructions\n\nDefine objective, legal moves, state format, scoring, hidden information rules, strategy tips, forbidden actions, and output JSON schema.\n`);
  writeFileSync(join(dir, "ui", "GameView.tsx"), "export function GameView() { return <div>Game view pending</div>; }\n");
  writeFileSync(join(dir, "tests", "rules.test.ts"), "import { describe, it } from \"vitest\";\ndescribe(\"rules\", () => { it(\"adds deterministic tests\", () => {}); });\n");
  writeFileSync(join(dir, "fixtures", "demo-replay.json"), "{\"moves\":[],\"result\":null}\n");
  writeFileSync(join(dir, "assets", "cover.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#080b0e"/><text x="44" y="300" fill="#f8fffb" font-family="Arial" font-size="52" font-weight="800">${title}</text></svg>\n`);
  writeFileSync(join(dir, "assets", "logo.svg"), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160"><rect width="160" height="160" rx="28" fill="#080b0e"/><text x="80" y="96" text-anchor="middle" fill="#46ff9f" font-family="Arial" font-size="48" font-weight="800">${title.slice(0, 2).toUpperCase()}</text></svg>\n`);
  writeFileSync(join(dir, "README.md"), `# ${title}\n\nDescribe the game and proof model.\n`);
  writeFileSync(join(dir, "LICENSE.md"), "MIT License. Copyright 2026 contributor.\n");
  for (const [field, file] of Object.entries(hashFieldFiles)) {
    manifest[field] = sha(join(dir, file));
  }
  writeFileSync(join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

const [command, slug] = process.argv.slice(2);
const target = slug || "grid-four";

if (command === "validate") {
  const slugs = slug ? [slug] : listGames();
  let failed = false;
  for (const game of slugs) {
    const errors = validate(game);
    if (errors.length) {
      failed = true;
      console.error(`${game}: FAIL\n- ${errors.join("\n- ")}`);
    } else {
      console.log(`${game}: OK`);
    }
  }
  process.exitCode = failed ? 1 : 0;
} else if (command === "test" || command === "agent-test") {
  run("pnpm", ["vitest", "run", `games/${target}/tests/rules.test.ts`]);
} else if (command === "simulate") {
  run("pnpm", ["vitest", "run", `games/${target}/tests/rules.test.ts`]);
} else if (command === "hash") {
  const dir = gamePath(target);
  for (const file of ["manifest.json", "rules.ts", "agent.md", "fixtures/demo-replay.json"]) {
    console.log(`${file}: ${sha(join(dir, file))}`);
  }
} else if (command === "pack") {
  const out = join(root, "dist", "game-packs");
  mkdirSync(out, { recursive: true });
  const receipt = {
    game: target,
    manifestHash: sha(join(gamePath(target), "manifest.json")),
    rulesHash: sha(join(gamePath(target), "rules.ts")),
    agentPromptHash: sha(join(gamePath(target), "agent.md")),
    replayHash: sha(join(gamePath(target), "fixtures", "demo-replay.json")),
    createdAt: new Date().toISOString(),
  };
  writeFileSync(join(out, `${target}.receipt.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`packed ${target} receipt into ${out}`);
} else if (command === "publish") {
  const out = join(root, "dist", "publish-receipts");
  mkdirSync(out, { recursive: true });
  const receipt = {
    game: target,
    mode: "local-fallback",
    storageUri: `local://game-packs/${target}`,
    reason: "0G Storage credentials not configured",
    createdAt: new Date().toISOString(),
  };
  writeFileSync(join(out, `${target}.publish.json`), `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(`${target}: 0G Storage credentials not configured; fallback receipt written to ${out}`);
} else if (command === "create") {
  scaffold(target);
  console.log(`created game scaffold at games/${target}`);
} else {
  console.error("usage: pnpm game:<create|validate|test|simulate|agent-test|pack|publish|hash> [slug]");
  process.exitCode = 1;
}
