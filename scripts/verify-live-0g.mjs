import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";

const envFile =
  process.env.OG_ARCADE_LIVE_ENV ||
  "/Users/gabrielantonyxaviour/.codex/secrets/0g-arcade-arena/0g-live.env";
const outFile = join(process.cwd(), "evidence/live-proofs/0g-readiness-latest.json");
const knownWallets = [
  "0x23761115c5f38ca51f0d425d00DE6E34029239EC",
  process.env.OG_ARCADE_PRIVY_WALLET_2,
].filter(Boolean);
const routerNetworkEndpoints = {
  mainnet: "https://router-api.0g.ai/v1",
  testnet: "https://router-api-testnet.integratenetwork.work/v1",
};

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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 8,
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

async function rpc(rpcUrl, method, params = []) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await response.json();
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result;
}

function ether(hexWei) {
  const wei = BigInt(hexWei);
  const whole = wei / 10n ** 18n;
  const fraction = String((wei % 10n ** 18n) / 10n ** 12n).padStart(6, "0");
  return `${whole}.${fraction}`;
}

async function computeProbe(env, model) {
  const router = env.ZEROG_COMPUTE_ROUTER || "https://router-api.0g.ai/v1";
  const started = Date.now();
  const response = await fetch(`${router}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.ZEROG_ROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Return only OK." }],
      temperature: 0,
      max_tokens: 4,
      verify_tee: true,
      chat_template_kwargs: { enable_thinking: false },
    }),
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep raw preview for error handling below
  }
  return {
    ok: response.ok,
    status: response.status,
    elapsedMs: Date.now() - started,
    responseKeyPresent: Boolean(response.headers.get("ZG-Res-Key")),
    responseSignaturePresent: Boolean(response.headers.get("ZG-Res-Signature")),
    traceProviderPresent: Boolean(json?.x_0g_trace?.provider),
    traceRequestIdPresent: Boolean(json?.x_0g_trace?.request_id),
    teeVerifiedField:
      typeof json?.x_0g_trace?.tee_verified === "boolean" ? json.x_0g_trace.tee_verified : null,
    contentHash: json?.choices?.[0]?.message?.content
      ? `sha256:${createHash("sha256").update(json.choices[0].message.content).digest("hex")}`
      : null,
    errorCode: response.ok ? null : json?.error?.code,
    errorMessage: response.ok ? null : json?.error?.message ?? text.slice(0, 160),
  };
}

async function probeRouterEndpoint(env, router) {
  const modelsStarted = Date.now();
  const modelsResponse = await fetch(`${router}/models`, {
    headers: { Authorization: `Bearer ${env.ZEROG_ROUTER_API_KEY}` },
  }).catch((error) => ({
    ok: false,
    status: 0,
    text: async () => error.message,
    json: async () => null,
  }));
  const modelsJson = await modelsResponse.json().catch(() => null);
  const chatStarted = Date.now();
  const chatResponse = await fetch(`${router}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.ZEROG_ROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.ZEROG_COMPUTE_MODEL,
      messages: [{ role: "user", content: "Return only OK." }],
      temperature: 0,
      max_tokens: 4,
      verify_tee: true,
      chat_template_kwargs: { enable_thinking: false },
    }),
  }).catch((error) => ({
    ok: false,
    status: 0,
    text: async () => error.message,
  }));
  const text = await chatResponse.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    // keep raw preview below
  }
  return {
    routerHost: new URL(router).host,
    modelsStatus: modelsResponse.status,
    modelsElapsedMs: Date.now() - modelsStarted,
    modelsCount: Array.isArray(modelsJson?.data) ? modelsJson.data.length : null,
    chatStatus: chatResponse.status,
    chatElapsedMs: Date.now() - chatStarted,
    errorCode: chatResponse.ok ? null : json?.error?.code,
    errorMessage: chatResponse.ok ? null : json?.error?.message ?? text.slice(0, 160),
  };
}

if (!existsSync(envFile)) {
  console.error(`missing live env file: ${envFile}`);
  process.exit(1);
}

const env = parseEnv(envFile);
const required = [
  "ZEROG_PRIVATE_KEY",
  "ZEROG_ROUTER_API_KEY",
  "ZEROG_RPC",
  "ZEROG_INDEXER",
  "ZEROG_COMPUTE_ROUTER",
  "ZEROG_COMPUTE_MODEL",
];
const missing = required.filter((key) => !env[key]);
if (missing.length) {
  console.error(`live env missing required keys: ${missing.join(", ")}`);
  process.exit(1);
}
if (!/^0x[a-fA-F0-9]{64}$/.test(env.ZEROG_PRIVATE_KEY)) {
  console.error("ZEROG_PRIVATE_KEY is not a 32-byte hex private key");
  process.exit(1);
}
if (!env.ZEROG_ROUTER_API_KEY.startsWith("sk-")) {
  console.error("ZEROG_ROUTER_API_KEY is not an sk-prefixed router key");
  process.exit(1);
}

const operatorAddress = run("cast", ["wallet", "address", "--private-key", env.ZEROG_PRIVATE_KEY]);
const chainIdHex = await rpc(env.ZEROG_RPC, "eth_chainId");
const chainId = Number(BigInt(chainIdHex));
const operatorBalance = ether(await rpc(env.ZEROG_RPC, "eth_getBalance", [operatorAddress, "latest"]));
const walletBalances = {};
for (const wallet of knownWallets) {
  walletBalances[wallet] = ether(await rpc(env.ZEROG_RPC, "eth_getBalance", [wallet, "latest"]));
}

const modelsResponse = await fetch(`${env.ZEROG_COMPUTE_ROUTER}/models`, {
  headers: { Authorization: `Bearer ${env.ZEROG_ROUTER_API_KEY}` },
});
const modelsJson = await modelsResponse.json().catch(() => null);
const modelIds = Array.isArray(modelsJson?.data) ? modelsJson.data.map((model) => model.id) : [];
const configuredModel = env.ZEROG_COMPUTE_MODEL;
const configuredModelProbe = await computeProbe(env, configuredModel);
const glm52Probe = configuredModel === "glm-5.2" ? configuredModelProbe : await computeProbe(env, "glm-5.2");
const mainnetRouterProbe = await probeRouterEndpoint(env, routerNetworkEndpoints.mainnet);
const testnetRouterProbe = await probeRouterEndpoint(env, routerNetworkEndpoints.testnet);
const storageProbe = await fetch(env.ZEROG_INDEXER, { method: "GET" }).catch((error) => ({
  ok: false,
  status: 0,
  statusText: error.message,
}));

const evidence = {
  checkedAt: new Date().toISOString(),
  envFile,
  chain: {
    rpcUrl: env.ZEROG_RPC,
    chainId,
    ok: chainId === 16602,
  },
  operator: {
    address: operatorAddress,
    balance0g: operatorBalance,
    privateKeyPresent: true,
  },
  privyWallets: walletBalances,
  compute: {
    routerHost: new URL(env.ZEROG_COMPUTE_ROUTER).host,
    modelsStatus: modelsResponse.status,
    modelsCount: modelIds.length,
    configuredModel,
    configuredModelProbe,
    glm52Probe,
    networkDiagnostic: {
      configuredRouterHost: new URL(env.ZEROG_COMPUTE_ROUTER).host,
      expectedTestnetRouterHost: new URL(routerNetworkEndpoints.testnet).host,
      chainNetwork: chainId === 16602 ? "galileo-testnet" : "unknown",
      storageNetwork: env.ZEROG_INDEXER.includes("testnet") ? "testnet" : "unknown",
      configuredRouterLooksMainnet:
        new URL(env.ZEROG_COMPUTE_ROUTER).host === new URL(routerNetworkEndpoints.mainnet).host,
      mainnetRouterProbe,
      testnetRouterProbe,
      conclusion:
        mainnetRouterProbe.errorCode === "insufficient_balance" && testnetRouterProbe.errorCode === "invalid_api_key"
          ? "The project has a mainnet Router API key or mainnet Router balance issue while the rest of the app targets Galileo testnet. Fund the Router balance for the configured mainnet key, or replace it with a valid testnet Router key and endpoint."
          : "Router diagnostics did not match the known mainnet-balance/testnet-key mismatch pattern; inspect the probe status codes.",
    },
  },
  storage: {
    indexerHost: new URL(env.ZEROG_INDEXER).host,
    endpointReachable: Boolean(storageProbe.status),
    status: storageProbe.status,
  },
  ready: {
    chain: chainId === 16602,
    compute: configuredModelProbe.ok,
    storageConfig: Boolean(env.ZEROG_INDEXER && env.ZEROG_STORAGE_MODE === "live"),
    storageEndpoint: Boolean(storageProbe.status),
  },
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, `${JSON.stringify(evidence, null, 2)}\n`);

if (!evidence.ready.chain || !evidence.ready.compute || !evidence.ready.storageConfig) {
  console.error(JSON.stringify({ ok: false, evidenceFile: outFile, ready: evidence.ready }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, evidenceFile: outFile, ready: evidence.ready }, null, 2));
