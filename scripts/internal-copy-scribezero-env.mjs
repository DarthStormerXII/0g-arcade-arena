import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const sourceFile =
  process.env.SCRIBEZERO_ENV_FILE ||
  "/Users/gabrielantonyxaviour/Documents/hackathons/0g-zero-cup/scribezero/.env.local";
const targetFile =
  process.env.OG_ARCADE_LIVE_ENV ||
  "/Users/gabrielantonyxaviour/.codex/secrets/0g-arcade-arena/0g-live.env";

const required = [
  "ZEROG_PRIVATE_KEY",
  "ZEROG_ROUTER_API_KEY",
  "ZEROG_RPC",
  "ZEROG_INDEXER",
  "ZEROG_COMPUTE_ROUTER",
];

function parseEnv(file) {
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1).replace(/^['"]|['"]$/g, "");
    env[key] = value;
  }
  return env;
}

if (!existsSync(sourceFile)) {
  console.error(`missing source env: ${sourceFile}`);
  process.exit(1);
}

const source = parseEnv(sourceFile);
const missing = required.filter((key) => !source[key]);
if (missing.length) {
  console.error(`source env missing required keys: ${missing.join(", ")}`);
  process.exit(1);
}

const output = {
  ZEROG_PRIVATE_KEY: source.ZEROG_PRIVATE_KEY,
  ZEROG_ROUTER_API_KEY: source.ZEROG_ROUTER_API_KEY,
  ZEROG_RPC: source.ZEROG_RPC || "https://evmrpc-testnet.0g.ai",
  ZEROG_INDEXER: source.ZEROG_INDEXER || "https://indexer-storage-testnet-turbo.0g.ai",
  ZEROG_COMPUTE_ROUTER: source.ZEROG_COMPUTE_ROUTER || "https://router-api-testnet.integratenetwork.work/v1",
  ZEROG_COMPUTE_MODEL: source.ZEROG_COMPUTE_MODEL || "qwen2.5-omni",
  ZEROG_STORAGE_MODE: "live",
};

mkdirSync(dirname(targetFile), { recursive: true });
writeFileSync(
  targetFile,
  `${Object.entries(output)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")}\n`,
  { mode: 0o600 },
);
chmodSync(targetFile, 0o600);

console.log(
  JSON.stringify(
    {
      targetFile,
      keys: Object.fromEntries(
        Object.entries(output).map(([key, value]) => [
          key,
          { present: Boolean(value), length: String(value).length },
        ]),
      ),
    },
    null,
    2,
  ),
);
