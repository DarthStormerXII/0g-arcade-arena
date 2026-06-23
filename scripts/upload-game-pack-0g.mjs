import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { ethers } from "ethers";
import { Indexer, MemData } from "@0gfoundation/0g-storage-ts-sdk";

const envFile =
  process.env.OG_ARCADE_LIVE_ENV ||
  "/Users/gabrielantonyxaviour/.codex/secrets/0g-arcade-arena/0g-live.env";
const slug = process.argv[2] || "grid-four";
const root = process.cwd();
const gameDir = join(root, "games", slug);

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

function walk(dir) {
  const files = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, item.name);
    if (item.isDirectory()) files.push(...walk(file));
    if (item.isFile()) files.push(file);
  }
  return files;
}

async function storageReachable(indexerUrl, rootHash) {
  const url = `${indexerUrl}/file?root=${rootHash}`;
  const head = await fetch(url, { method: "HEAD" }).catch(() => null);
  if (head && [200, 206, 308].includes(head.status)) return true;
  const get = await fetch(url, { method: "GET" }).catch(() => null);
  return Boolean(get && [200, 206, 308].includes(get.status));
}

if (!existsSync(envFile)) {
  console.error(`missing live env file: ${envFile}`);
  process.exit(1);
}
if (!existsSync(gameDir)) {
  console.error(`missing game pack: ${gameDir}`);
  process.exit(1);
}

const env = parseEnv(envFile);
for (const key of ["ZEROG_PRIVATE_KEY", "ZEROG_RPC", "ZEROG_INDEXER"]) {
  if (!env[key]) {
    console.error(`missing ${key} in ${envFile}`);
    process.exit(1);
  }
}

const files = walk(gameDir)
  .map((file) => {
    const bytes = readFileSync(file);
    return {
      path: relative(gameDir, file),
      encoding: "base64",
      sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
      content: bytes.toString("base64"),
    };
  })
  .sort((a, b) => a.path.localeCompare(b.path));

const manifest = JSON.parse(readFileSync(join(gameDir, "manifest.json"), "utf8"));
const uploadPayload = {
  schema: "0g-arcade-game-pack@1",
  uploadedAt: new Date().toISOString(),
  gameId: slug,
  manifest,
  files,
};
const bytes = new TextEncoder().encode(JSON.stringify(uploadPayload));
const data = new MemData(bytes);
const [tree, treeErr] = await data.merkleTree();
if (treeErr !== null) throw new Error(`merkle: ${treeErr}`);
const computedRoot = tree?.rootHash() ?? "";

const provider = new ethers.JsonRpcProvider(env.ZEROG_RPC);
const signer = new ethers.Wallet(env.ZEROG_PRIVATE_KEY, provider);
const indexer = new Indexer(env.ZEROG_INDEXER);
const [tx, uploadErr] = await indexer.upload(data, env.ZEROG_RPC, signer);
if (uploadErr !== null) throw new Error(`upload: ${uploadErr}`);

const rootHash = tx?.rootHash ?? computedRoot;
const txHash = tx?.txHash ?? "";
const reachable = await storageReachable(env.ZEROG_INDEXER, rootHash);
const evidence = {
  checkedAt: new Date().toISOString(),
  mode: "live-0g-storage-game-pack",
  gameId: slug,
  fileCount: files.length,
  payloadSha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  manifestHash: `0x${createHash("sha256").update(JSON.stringify(manifest)).digest("hex")}`,
  rootHash,
  txHash,
  reachable,
  indexerUrl: env.ZEROG_INDEXER,
  uploader: signer.address,
};

const outFile = join(root, "evidence/live-proofs", `0g-storage-game-pack-${slug}.json`);
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, evidenceFile: outFile, rootHash, txHash, reachable }, null, 2));
