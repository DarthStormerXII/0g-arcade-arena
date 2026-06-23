import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "wrangler.jsonc",
  "cloudflare/schema.sql",
  "worker/index.ts",
  "docs/0G_ARCHITECTURE.md",
  "docs/TRUTH_AUDIT.md",
];

const requiredBindings = [
  "ARCADE_DB",
  "ACTIVE_GAME_REGISTRY",
  "GAME_PACK_BUCKET",
  "LIVE_ROOMS",
  "OG_GALILEO_CHAIN_ID",
];

const requiredTables = ["games", "matches", "agents", "tournaments", "contributors"];
const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) errors.push(`missing ${file}`);
}

if (existsSync("wrangler.jsonc")) {
  const wrangler = readFileSync("wrangler.jsonc", "utf8");
  for (const binding of requiredBindings) {
    if (!wrangler.includes(binding)) errors.push(`wrangler missing ${binding}`);
  }
  if (!wrangler.includes("\"16602\"")) errors.push("wrangler missing 0G Galileo chain id 16602");
}

if (existsSync("cloudflare/schema.sql")) {
  const schema = readFileSync("cloudflare/schema.sql", "utf8");
  for (const table of requiredTables) {
    if (!schema.includes(` ${table} `) && !schema.includes(` ${table} (`)) {
      errors.push(`schema missing ${table}`);
    }
  }
}

if (errors.length) {
  console.error(`infra check failed:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("infra check OK: Wrangler bindings, D1 schema, worker, and truth docs are present");
}
