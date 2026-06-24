import { createConnection } from "node:net";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const secretFile = "/Users/gabrielantonyxaviour/.codex/secrets/0g-arcade-arena/0g-live.env";
const candidateFile = "evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json";
const outFile = "evidence/live-proofs/0g-da-readiness-2026-06-24.json";

const requiredEnv = [
  "ZEROG_DA_DISPERSER_GRPC",
  "ZEROG_DA_ENCODER_GRPC",
  "ZEROG_DA_RETRIEVER_GRPC",
  "ZEROG_DA_ENTRANCE_CONTRACT",
];

function loadProjectEnv(file) {
  if (!existsSync(file)) return [];
  const loaded = [];
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const key = line.slice(0, line.indexOf("="));
    let value = line.slice(line.indexOf("=") + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
    loaded.push(key);
  }
  return loaded.sort();
}

function readJson(file) {
  return JSON.parse(readFileSync(join(root, file), "utf8"));
}

function readEnvNames(file) {
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.slice(0, line.indexOf("=")))
    .sort();
}

function hasDependency(name) {
  const pkg = readJson("package.json");
  return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name]);
}

function parseEndpoint(value) {
  if (!value) return null;
  const normalized = value.includes("://") ? value : `grpc://${value}`;
  try {
    const url = new URL(normalized);
    return {
      host: url.hostname,
      port: Number(url.port || (url.protocol === "https:" ? 443 : 51001)),
    };
  } catch {
    return null;
  }
}

async function probeTcp(endpoint) {
  if (!endpoint) {
    return { configured: false, reachable: false, error: "missing endpoint" };
  }
  return await new Promise((resolve) => {
    const socket = createConnection(endpoint);
    const done = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(3000);
    socket.once("connect", () => done({ configured: true, reachable: true }));
    socket.once("timeout", () => done({ configured: true, reachable: false, error: "timeout" }));
    socket.once("error", (error) => done({ configured: true, reachable: false, error: error.code ?? error.message }));
  });
}

const loadedEnvNames = loadProjectEnv(secretFile);
const envNames = Array.from(new Set([...readEnvNames(secretFile), ...loadedEnvNames])).sort();
const missingEnv = requiredEnv.filter((name) => !envNames.includes(name) && !process.env[name]);
const disperserEndpoint = parseEndpoint(process.env.ZEROG_DA_DISPERSER_GRPC);
const disperserProbe = await probeTcp(disperserEndpoint);
const candidate = existsSync(join(root, candidateFile)) ? readJson(candidateFile) : null;

const evidence = {
  mode: "0g-da-readiness",
  status: missingEnv.length === 0 && disperserProbe.reachable ? "endpoint-configured-unpublished" : "blocked",
  checkedAt: new Date().toISOString(),
  schema: "0g-arcade-da-readiness@1",
  officialDocs: {
    integrationUrl: "https://docs.0g.ai/developer-hub/building-on-0g/da-integration",
    repoUrl: "https://github.com/0gfoundation/0g-da-client",
    finding:
      "Official 0G DA integration requires running a DA Client node, Encoder, and Retriever; blob submission goes through the DA Client gRPC Disperser API.",
    disperserApi: ["DisperseBlob", "GetBlobStatus", "RetrieveBlob"],
  },
  requiredProjectConfig: requiredEnv,
  projectSecretFile: {
    path: "~/.codex/secrets/0g-arcade-arena/0g-live.env",
    present: existsSync(secretFile),
    configuredNames: envNames,
    missingNames: missingEnv,
  },
  localTooling: {
    storageSdkInstalled: hasDependency("@0gfoundation/0g-storage-ts-sdk"),
    computeSdkInstalled: hasDependency("@0gfoundation/0g-compute-ts-sdk"),
    daJavascriptSdkInstalled: hasDependency("@0gfoundation/0g-da-ts-sdk") || hasDependency("@0glabs/0g-da-client"),
    externalGrpcClientRequired: false,
    nodeHttp2GrpcClientBuiltIn: true,
    daPublisherScriptPresent: existsSync(join(root, "scripts/publish-da-batch-0g.mjs")),
  },
  disperserProbe: {
    endpoint: process.env.ZEROG_DA_DISPERSER_GRPC ? "configured" : "not-configured",
    host: disperserEndpoint?.host ?? null,
    port: disperserEndpoint?.port ?? null,
    ...disperserProbe,
  },
  candidate: candidate
    ? {
        file: candidateFile,
        status: candidate.status,
        daMode: candidate.daMode,
        batchHash: candidate.batchHash,
        payloadSha256: candidate.payloadSha256,
        matchCount: candidate.payload?.matches?.length ?? 0,
        gamePackCount: candidate.payload?.gamePacks?.length ?? 0,
      }
    : null,
  verified: {
    officialDocsRequireDaClientNode: true,
    candidateExists: Boolean(candidate),
    candidateDoesNotClaimPublication: candidate?.status === "not-published" && candidate?.daMode === "candidate-not-published",
    noProjectDaEndpointConfigured: missingEnv.includes("ZEROG_DA_DISPERSER_GRPC"),
    daPublisherHarnessPresent: existsSync(join(root, "scripts/publish-da-batch-0g.mjs")),
  },
  nextToPublishLive: [
    "Run or obtain access to a 0G DA Client node with Encoder and Retriever configured for Galileo.",
    "Add only project-local untracked env vars for the DA Disperser, Encoder, Retriever, and DAEntrance contract.",
    "Submit the existing candidate payload to DisperseBlob, poll GetBlobStatus until CONFIRMED or FINALIZED, then write a separate live DA publication receipt.",
  ],
};

mkdirSync(dirname(join(root, outFile)), { recursive: true });
writeFileSync(join(root, outFile), `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${outFile}: ${evidence.status}`);
