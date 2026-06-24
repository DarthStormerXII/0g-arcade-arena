import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ethers } from "ethers";

const envFile =
  process.env.OG_ARCADE_LIVE_ENV ||
  "/Users/gabrielantonyxaviour/.codex/secrets/0g-arcade-arena/0g-live.env";
const outFile = join(process.cwd(), "evidence/live-proofs/0g-compute-broker-diagnostic-2026-06-24.json");
const minimumLedgerOg = Number(process.env.OG_COMPUTE_BROKER_MIN_LEDGER_OG || 3);
const timeoutMs = Number(process.env.OG_COMPUTE_BROKER_TIMEOUT_MS || 15_000);

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

function safeMessage(error, privateKey) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(privateKey, "[redacted-private-key]").slice(0, 500);
}

function stringifyBigNumberish(value) {
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(stringifyBigNumberish);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => typeof item !== "function")
        .map(([key, item]) => [key, stringifyBigNumberish(item)]),
    );
  }
  return value;
}

function providerAddress(service) {
  return String(
    service.provider ??
      service.providerAddress ??
      service.address ??
      service.serviceProvider ??
      service.provider_address ??
      "",
  );
}

function sanitizeService(service) {
  return {
    provider: providerAddress(service),
    serviceType: String(service.serviceType ?? service.type ?? service.name ?? "unknown"),
    model: String(service.model ?? service.modelName ?? service.serviceName ?? ""),
    verifiability: String(service.verifiability ?? service.verificationType ?? ""),
  };
}

async function withTimeout(label, task) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function readSdkVersion() {
  try {
    const packageJson = JSON.parse(readFileSync("node_modules/@0gfoundation/0g-compute-ts-sdk/package.json", "utf8"));
    return packageJson.version ?? "unknown";
  } catch {
    return null;
  }
}

mkdirSync(dirname(outFile), { recursive: true });
if (!existsSync(envFile)) {
  writeFileSync(
    outFile,
    `${JSON.stringify({ mode: "direct-0g-compute-broker", status: "blocked", reason: `missing env file ${envFile}` }, null, 2)}\n`,
  );
  process.exit(0);
}

const env = parseEnv(envFile);
const privateKey = env.ZEROG_PRIVATE_KEY ?? "";
const rpcUrl = env.ZEROG_RPC || "https://evmrpc-testnet.0g.ai";
const sdkVersion = readSdkVersion();
const artifact = {
  mode: "direct-0g-compute-broker",
  status: "blocked",
  generatedAt: new Date().toISOString(),
  sdk: {
    package: "@0gfoundation/0g-compute-ts-sdk",
    installed: Boolean(sdkVersion),
    version: sdkVersion,
  },
  network: { rpcUrl, chain: "galileo-testnet" },
  minimumLedgerOg,
  wallet: {
    configured: Boolean(privateKey),
    address: null,
    nativeBalanceOg: null,
    canFundMinimumLedger: false,
  },
  broker: {
    initialized: false,
    servicesListed: false,
    serviceCount: 0,
    preferredService: null,
    sampleServices: [],
    metadata: null,
    error: null,
  },
  ledger: {
    readable: false,
    exists: false,
    raw: null,
    error: null,
  },
  checks: {
    sdkInstalled: Boolean(sdkVersion),
    walletConfigured: Boolean(privateKey),
    walletCanFundMinimumLedger: false,
    brokerInitialized: false,
    servicesListed: false,
    ledgerReadable: false,
  },
  reason: "",
};

if (!sdkVersion) {
  artifact.reason = "Direct 0G Compute broker SDK is not installed.";
  writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`${outFile}: ${artifact.status}`);
  process.exit(0);
}

if (!privateKey) {
  artifact.reason = "Missing ZEROG_PRIVATE_KEY; direct 0G Compute broker requires a funded 0G wallet.";
  writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
  console.log(`${outFile}: ${artifact.status}`);
  process.exit(0);
}

const provider = new ethers.JsonRpcProvider(rpcUrl);
const wallet = new ethers.Wallet(privateKey, provider);
const balanceWei = await withTimeout("wallet balance", provider.getBalance(wallet.address));
const balanceOg = Number(ethers.formatEther(balanceWei));
artifact.wallet = {
  configured: true,
  address: wallet.address,
  nativeBalanceOg: ethers.formatEther(balanceWei),
  canFundMinimumLedger: balanceOg >= minimumLedgerOg,
};
artifact.checks.walletCanFundMinimumLedger = artifact.wallet.canFundMinimumLedger;

try {
  const { createZGComputeNetworkBroker } = await import("@0gfoundation/0g-compute-ts-sdk");
  const broker = await withTimeout("broker initialization", createZGComputeNetworkBroker(wallet));
  artifact.broker.initialized = true;
  artifact.checks.brokerInitialized = true;

  try {
    const services = await withTimeout("broker service listing", broker.inference.listService());
    const serviceList = Array.isArray(services) ? services : [];
    const sanitizedServices = serviceList.map(sanitizeService).filter((service) => service.provider);
    const preferredService =
      sanitizedServices.find((service) => /tee|teeml|tee-?tls/i.test(service.verifiability)) ??
      sanitizedServices[0] ??
      null;
    artifact.broker.servicesListed = true;
    artifact.broker.serviceCount = sanitizedServices.length;
    artifact.broker.preferredService = preferredService;
    artifact.broker.sampleServices = sanitizedServices.slice(0, 5);
    artifact.checks.servicesListed = true;

    if (preferredService?.provider) {
      try {
        const metadata = await withTimeout(
          "broker service metadata",
          broker.inference.getServiceMetadata(preferredService.provider),
        );
        artifact.broker.metadata = stringifyBigNumberish({
          endpoint: metadata.endpoint,
          model: metadata.model,
        });
      } catch (error) {
        artifact.broker.metadata = { error: safeMessage(error, privateKey) };
      }
    }
  } catch (error) {
    artifact.broker.error = safeMessage(error, privateKey);
  }

  try {
    const ledger = await withTimeout("broker ledger read", broker.ledger.getLedger());
    artifact.ledger.readable = true;
    artifact.ledger.exists = true;
    artifact.ledger.raw = stringifyBigNumberish(ledger);
    artifact.checks.ledgerReadable = true;
  } catch (error) {
    artifact.ledger.error = safeMessage(error, privateKey);
  }
} catch (error) {
  artifact.broker.error = safeMessage(error, privateKey);
}

if (artifact.checks.servicesListed && artifact.checks.ledgerReadable) {
  artifact.status = "ready";
  artifact.reason =
    "Direct 0G Compute broker is discoverable and the wallet ledger is readable; run an inference proof only when a provider account has spendable funds.";
} else if (artifact.checks.servicesListed && !artifact.wallet.canFundMinimumLedger) {
  artifact.reason =
    `Direct 0G Compute providers are discoverable, but wallet balance is below the ${minimumLedgerOg} 0G ledger minimum for broker funding.`;
} else if (artifact.checks.brokerInitialized) {
  artifact.reason = "Direct 0G Compute broker initialized, but provider discovery or ledger read is blocked.";
} else {
  artifact.reason = "Direct 0G Compute broker could not initialize. See broker error for the exact SDK/RPC blocker.";
}

writeFileSync(outFile, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`${outFile}: ${artifact.status}`);
