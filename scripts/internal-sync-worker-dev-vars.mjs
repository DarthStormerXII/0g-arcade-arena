import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sourceFile =
  process.env.OG_ARCADE_LIVE_ENV ||
  "/Users/gabrielantonyxaviour/.codex/secrets/0g-arcade-arena/0g-live.env";
const targetFile = resolve(process.cwd(), ".dev.vars");

const required = ["ZEROG_ROUTER_API_KEY", "ZEROG_COMPUTE_ROUTER", "ZEROG_COMPUTE_MODEL"];

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
  ZEROG_ROUTER_API_KEY: source.ZEROG_ROUTER_API_KEY,
  ZEROG_COMPUTE_ROUTER: source.ZEROG_COMPUTE_ROUTER,
  ZEROG_COMPUTE_MODEL: source.ZEROG_COMPUTE_MODEL || "qwen2.5-omni",
};

for (const key of ["SARVAM_API_KEY", "SARVAM_BASE_URL", "SARVAM_CHAT_MODEL", "SARVAM_CHAT_MAX_TOKENS"]) {
  if (source[key]) output[key] = source[key];
}

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
        Object.entries(output).map(([key, value]) => [key, { present: Boolean(value), length: value.length }]),
      ),
    },
    null,
    2,
  ),
);
