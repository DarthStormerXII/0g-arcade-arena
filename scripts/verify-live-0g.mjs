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
const routerTimeoutMs = Number(process.env.ZEROG_ROUTER_PROBE_TIMEOUT_MS ?? 20000);
const computeProbeRetries = Number(process.env.ZEROG_COMPUTE_PROBE_RETRIES ?? 1);
const computeProbeRetryDelayMs = Number(process.env.ZEROG_COMPUTE_PROBE_RETRY_DELAY_MS ?? 15000);
const runExtraComputeProbes = process.env.ZEROG_READINESS_EXTRA_COMPUTE_PROBES === "1";
const runDiagnosticChatProbes = process.env.ZEROG_ROUTER_DIAGNOSTIC_CHAT === "1";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function rateLimitHeaders(headers) {
  if (!headers?.get) {
    return {
      retryAfter: null,
      limit: null,
      remaining: null,
      reset: null,
    };
  }
  return {
    retryAfter: headers.get("retry-after"),
    limit: headers.get("x-ratelimit-limit") ?? headers.get("x-rate-limit-limit"),
    remaining: headers.get("x-ratelimit-remaining") ?? headers.get("x-rate-limit-remaining"),
    reset: headers.get("x-ratelimit-reset") ?? headers.get("x-rate-limit-reset"),
  };
}

function fetchErrorResponse(error, started) {
  const message = error?.cause?.message ?? error?.message ?? String(error);
  const code = error?.cause?.code ?? error?.code ?? "fetch_failed";
  return {
    ok: false,
    status: 0,
    elapsedMs: Date.now() - started,
    text: async () => `${code}: ${message}`,
    json: async () => null,
  };
}

async function fetchWithTimeout(url, options = {}, timeoutMs = routerTimeoutMs) {
  const started = Date.now();
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    return fetchErrorResponse(error, started);
  }
}

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
  const response = await fetchWithTimeout(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  }, 15000);
  if (!response.ok) throw new Error(`${method}: ${await response.text()}`);
  const json = await response.json();
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result;
}

async function safeRpc(rpcUrl, method, params = []) {
  const started = Date.now();
  try {
    return { ok: true, result: await rpc(rpcUrl, method, params), elapsedMs: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      result: null,
      elapsedMs: Date.now() - started,
      error: error?.message ?? String(error),
    };
  }
}

function ether(hexWei) {
  const wei = BigInt(hexWei);
  const whole = wei / 10n ** 18n;
  const fraction = String((wei % 10n ** 18n) / 10n ** 12n).padStart(6, "0");
  return `${whole}.${fraction}`;
}

async function computeProbe(env, model) {
  const router = env.ZEROG_COMPUTE_ROUTER || routerNetworkEndpoints.testnet;
  const started = Date.now();
  const attempts = [];
  for (let attempt = 0; attempt <= computeProbeRetries; attempt += 1) {
    if (attempt > 0) await sleep(computeProbeRetryDelayMs);
    const attemptStarted = Date.now();
    const response = await fetchWithTimeout(`${router}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.ZEROG_ROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Return only OK." }],
        temperature: 0,
        max_tokens: 10,
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
    const result = {
      ok: response.ok,
      status: response.status,
      elapsedMs: Date.now() - started,
      attemptElapsedMs: Date.now() - attemptStarted,
      rateLimit: rateLimitHeaders(response.headers),
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
    attempts.push({
      status: result.status,
      ok: result.ok,
      elapsedMs: result.attemptElapsedMs,
      rateLimit: result.rateLimit,
      errorCode: result.errorCode,
      errorMessage: result.errorMessage,
    });
    if (response.ok || result.errorCode !== "rate_limit_exceeded" || attempt === computeProbeRetries) {
      return { ...result, attempts };
    }
  }
  throw new Error("unreachable compute probe state");
}

async function probeRouterEndpoint(env, router, options = {}) {
  const modelsStarted = Date.now();
  const modelsResponse = await fetchWithTimeout(`${router}/models`, {
    headers: { Authorization: `Bearer ${env.ZEROG_ROUTER_API_KEY}` },
  });
  const modelsJson = await modelsResponse.json().catch(() => null);
  if (!options.chat) {
    return {
      routerHost: new URL(router).host,
      modelsStatus: modelsResponse.status,
      modelsElapsedMs: Date.now() - modelsStarted,
      modelsCount: Array.isArray(modelsJson?.data) ? modelsJson.data.length : null,
      chatSkipped: true,
      chatStatus: null,
      chatElapsedMs: null,
      errorCode: null,
      errorMessage: null,
    };
  }
  const chatStarted = Date.now();
  const chatResponse = await fetchWithTimeout(`${router}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.ZEROG_ROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.ZEROG_COMPUTE_MODEL,
      messages: [{ role: "user", content: "Return only OK." }],
      temperature: 0,
      max_tokens: 10,
      verify_tee: true,
      chat_template_kwargs: { enable_thinking: false },
    }),
  });
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
const chainIdProbe = await safeRpc(env.ZEROG_RPC, "eth_chainId");
const chainId = chainIdProbe.ok ? Number(BigInt(chainIdProbe.result)) : null;
const operatorBalanceProbe = await safeRpc(env.ZEROG_RPC, "eth_getBalance", [operatorAddress, "latest"]);
const operatorBalance = operatorBalanceProbe.ok ? ether(operatorBalanceProbe.result) : null;
const walletBalances = {};
for (const wallet of knownWallets) {
  const balanceProbe = await safeRpc(env.ZEROG_RPC, "eth_getBalance", [wallet, "latest"]);
  walletBalances[wallet] = balanceProbe.ok ? ether(balanceProbe.result) : null;
}

const modelsResponse = await fetchWithTimeout(`${env.ZEROG_COMPUTE_ROUTER}/models`, {
  headers: { Authorization: `Bearer ${env.ZEROG_ROUTER_API_KEY}` },
});
const modelsJson = await modelsResponse.json().catch(() => null);
const modelIds = Array.isArray(modelsJson?.data) ? modelsJson.data.map((model) => model.id) : [];
const configuredModel = env.ZEROG_COMPUTE_MODEL;
const configuredModelProbe = await computeProbe(env, configuredModel);
const glm52Probe =
  configuredModel === "glm-5.2" || !runExtraComputeProbes ? null : await computeProbe(env, "glm-5.2");
const mainnetRouterProbe = await probeRouterEndpoint(env, routerNetworkEndpoints.mainnet, {
  chat: runDiagnosticChatProbes,
});
const testnetRouterProbe = await probeRouterEndpoint(env, routerNetworkEndpoints.testnet, {
  chat: runDiagnosticChatProbes,
});
const storageProbe = await fetch(env.ZEROG_INDEXER, { method: "GET", signal: AbortSignal.timeout(10000) }).catch((error) => ({
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
    chainIdProbe,
    operatorBalanceProbe,
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
    extraComputeProbesEnabled: runExtraComputeProbes,
    diagnosticChatProbesEnabled: runDiagnosticChatProbes,
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
        configuredModelProbe.ok
          ? "The project is configured for the 0G testnet Router and the configured model completed a chat probe."
          : configuredModelProbe.errorCode === "rate_limit_exceeded"
          ? "The project is configured for the 0G testnet Router, but the configured key is currently rate-limited for chat completions."
          : mainnetRouterProbe.errorCode === "insufficient_balance" && testnetRouterProbe.errorCode === "invalid_api_key"
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
