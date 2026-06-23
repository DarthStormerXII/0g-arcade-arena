import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const games = readdirSync("games", { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const outDir = join("public", "proofs");

function sha(value) {
  const input = typeof value === "string" ? value : JSON.stringify(value);
  return `0x${createHash("sha256").update(input).digest("hex")}`;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

mkdirSync(outDir, { recursive: true });

for (const game of games) {
  const dir = join("games", game);
  const manifest = readJson(join(dir, "manifest.json"));
  const replay = readJson(join(dir, "fixtures", "demo-replay.json"));
  const matchId = `match-${game}-receipt`;
  const replayHash = sha(replay);
  const proof = {
    matchId,
    gameId: game,
    generatedAt: new Date().toISOString(),
    manifestHash: sha(manifest),
    rulesHash: manifest.rulesHash,
    replayHash,
    resultHash: sha(replay.result ?? null),
    storageUri: `/proofs/${matchId}-replay.json`,
    chainTx: "local-mock:no-contract-deployment",
    daCommitment: "DA fallback/not configured",
    computeMode: "deterministic-fallback",
    storageMode: "local-fallback",
    chainMode: "local-mock",
    daMode: "not-configured",
    files: {
      manifest: `games/${game}/manifest.json`,
      rules: `games/${game}/rules.ts`,
      agent: `games/${game}/agent.md`,
      replay: `games/${game}/fixtures/demo-replay.json`,
    },
  };

  writeFileSync(join(outDir, `${matchId}-replay.json`), `${JSON.stringify(replay, null, 2)}\n`);
  writeFileSync(join(outDir, `${matchId}-proof.json`), `${JSON.stringify(proof, null, 2)}\n`);
  console.log(`${game}: exported ${matchId}-proof.json`);
}

const expected = games.flatMap((game) => [
  join(outDir, `match-${game}-receipt-proof.json`),
  join(outDir, `match-${game}-receipt-replay.json`),
]);
const missing = expected.filter((path) => !existsSync(path));
if (missing.length) {
  console.error(`missing proof artifacts:\n- ${missing.join("\n- ")}`);
  process.exitCode = 1;
}
