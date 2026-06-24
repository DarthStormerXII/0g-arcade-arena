import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { connect } from "node:http2";
import { dirname, isAbsolute, join } from "node:path";

const root = process.cwd();
const secretFile = "/Users/gabrielantonyxaviour/.codex/secrets/0g-arcade-arena/0g-live.env";
const candidateFile = "evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json";
const outFile = process.env.ZEROG_DA_PUBLICATION_OUTFILE ?? "evidence/live-proofs/0g-da-publication-2026-06-24.json";
const protoFile = "scripts/protos/0g-da-disperser.proto";

function loadProjectEnv() {
  if (!existsSync(secretFile)) return [];
  const loaded = [];
  for (const rawLine of readFileSync(secretFile, "utf8").split(/\r?\n/)) {
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

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function parseTarget(value) {
  const normalized = value.includes("://") ? value : `grpc://${value}`;
  const url = new URL(normalized);
  const port = url.port || (url.protocol === "https:" || url.protocol === "grpcs:" ? 443 : 51001);
  const plaintext = url.protocol !== "https:" && url.protocol !== "grpcs:";
  return {
    target: `${url.hostname}:${port}`,
    origin: `${plaintext ? "http" : "https"}://${url.hostname}:${port}`,
    plaintext,
  };
}

function encodeVarint(value) {
  let remaining = BigInt(value);
  const bytes = [];
  while (remaining >= 0x80n) {
    bytes.push(Number((remaining & 0x7fn) | 0x80n));
    remaining >>= 7n;
  }
  bytes.push(Number(remaining));
  return Buffer.from(bytes);
}

function decodeVarint(buffer, offset) {
  let result = 0n;
  let shift = 0n;
  let cursor = offset;
  while (cursor < buffer.length) {
    const byte = buffer[cursor];
    result |= BigInt(byte & 0x7f) << shift;
    cursor += 1;
    if ((byte & 0x80) === 0) {
      return { value: Number(result), offset: cursor };
    }
    shift += 7n;
  }
  throw new Error("truncated protobuf varint");
}

function encodeField(fieldNumber, wireType, value) {
  return Buffer.concat([encodeVarint((fieldNumber << 3) | wireType), value]);
}

function encodeBytesField(fieldNumber, value) {
  return encodeField(fieldNumber, 2, Buffer.concat([encodeVarint(value.length), value]));
}

function encodeDisperseBlobRequest(data) {
  return encodeBytesField(1, data);
}

function encodeBlobStatusRequest(requestId) {
  return encodeBytesField(1, requestId);
}

function decodeFields(buffer) {
  const fields = new Map();
  let offset = 0;
  while (offset < buffer.length) {
    const key = decodeVarint(buffer, offset);
    offset = key.offset;
    const fieldNumber = key.value >> 3;
    const wireType = key.value & 0x7;
    let value;
    if (wireType === 0) {
      const decoded = decodeVarint(buffer, offset);
      value = decoded.value;
      offset = decoded.offset;
    } else if (wireType === 2) {
      const length = decodeVarint(buffer, offset);
      offset = length.offset;
      value = buffer.subarray(offset, offset + length.value);
      offset += length.value;
    } else {
      throw new Error(`unsupported protobuf wire type ${wireType}`);
    }
    if (!fields.has(fieldNumber)) fields.set(fieldNumber, []);
    fields.get(fieldNumber).push(value);
  }
  return fields;
}

function decodeDisperseBlobReply(buffer) {
  const fields = decodeFields(buffer);
  return {
    result: fields.get(1)?.[0] ?? 0,
    requestId: fields.get(2)?.[0] ?? null,
  };
}

function decodeBlobStatusReply(buffer) {
  const fields = decodeFields(buffer);
  const info = fields.get(2)?.[0] ? decodeFields(fields.get(2)[0]) : null;
  const header = info?.get(1)?.[0] ? decodeFields(info.get(1)[0]) : null;
  return {
    status: fields.get(1)?.[0] ?? 0,
    blobHeader: header
      ? {
          storageRoot: header.get(1)?.[0] ?? null,
          epoch: header.get(2)?.[0] ?? null,
          quorumId: header.get(3)?.[0] ?? null,
        }
      : null,
  };
}

function encodeGrpcFrame(message) {
  const header = Buffer.alloc(5);
  header.writeUInt8(0, 0);
  header.writeUInt32BE(message.length, 1);
  return Buffer.concat([header, message]);
}

function decodeGrpcFrames(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 5 <= buffer.length) {
    const compressed = buffer.readUInt8(offset);
    if (compressed !== 0) throw new Error("compressed gRPC responses are not supported");
    const length = buffer.readUInt32BE(offset + 1);
    offset += 5;
    messages.push(buffer.subarray(offset, offset + length));
    offset += length;
  }
  return messages;
}

async function grpcUnary(endpoint, path, message, decoder, timeoutMs) {
  const client = connect(endpoint.origin);
  let timeout;
  try {
    return await new Promise((resolve, reject) => {
      const chunks = [];
      let responseHeaders = null;
      let responseTrailers = {};
      const request = client.request({
        ":method": "POST",
        ":path": path,
        "content-type": "application/grpc",
        te: "trailers",
      });
      timeout = setTimeout(() => {
        request.close();
        reject(new Error(`gRPC request timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      request.on("response", (headers) => {
        responseHeaders = headers;
      });
      request.on("trailers", (trailers) => {
        responseTrailers = trailers;
      });
      request.on("data", (chunk) => chunks.push(chunk));
      request.on("error", reject);
      request.on("end", () => {
        const httpStatus = Number(responseHeaders?.[":status"] ?? 0);
        const grpcStatus = responseTrailers["grpc-status"] ?? responseHeaders?.["grpc-status"] ?? "0";
        if (httpStatus !== 200) {
          reject(new Error(`gRPC HTTP status ${httpStatus}`));
          return;
        }
        if (String(grpcStatus) !== "0") {
          reject(new Error(`gRPC status ${grpcStatus}: ${responseTrailers["grpc-message"] ?? ""}`.trim()));
          return;
        }
        const frames = decodeGrpcFrames(Buffer.concat(chunks));
        if (frames.length < 1) {
          reject(new Error("gRPC response had no message frames"));
          return;
        }
        resolve(decoder(frames[0]));
      });
      request.end(encodeGrpcFrame(message));
    });
  } finally {
    clearTimeout(timeout);
    client.destroy();
  }
}

function statusText(value) {
  const names = {
    0: "UNKNOWN",
    1: "PROCESSING",
    2: "CONFIRMED",
    3: "FAILED",
    4: "FINALIZED",
    5: "INSUFFICIENT_SIGNATURES",
  };
  return names[value] ?? String(value ?? "UNKNOWN").toUpperCase();
}

function bufferToHex(value) {
  if (!value) return null;
  return `0x${Buffer.from(value).toString("hex")}`;
}

function writeEvidence(evidence) {
  const outputPath = isAbsolute(outFile) ? outFile : join(root, outFile);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`${outFile}: ${evidence.status}`);
}

const loadedEnvNames = loadProjectEnv();
const missingProjectConfig = ["ZEROG_DA_DISPERSER_GRPC", "ZEROG_DA_ENTRANCE_CONTRACT"].filter((key) => !process.env[key]);
const candidate = existsSync(join(root, candidateFile)) ? readJson(candidateFile) : null;
const canonicalPayload = candidate?.payload ? JSON.stringify(canonicalize(candidate.payload)) : null;
const payloadSha256 = canonicalPayload ? sha256(canonicalPayload) : null;

const baseEvidence = {
  mode: "0g-da-publication-attempt",
  checkedAt: new Date().toISOString(),
  schema: "0g-arcade-da-publication@1",
  sourceCandidate: candidateFile,
  projectSecretFile: {
    path: "~/.codex/secrets/0g-arcade-arena/0g-live.env",
    present: existsSync(secretFile),
    loadedNames: loadedEnvNames,
    missingNames: missingProjectConfig,
  },
  officialApi: {
    proto: protoFile,
    submitMethod: "DisperseBlob",
    statusMethod: "GetBlobStatus",
    clientTool: "node-http2",
  },
  candidate: candidate
    ? {
        batchHash: candidate.batchHash,
        payloadSha256: candidate.payloadSha256,
        localPayloadSha256: payloadSha256,
        matchCount: candidate.payload?.matches?.length ?? 0,
        gamePackCount: candidate.payload?.gamePacks?.length ?? 0,
      }
    : null,
};

if (!candidate || !canonicalPayload) {
  writeEvidence({
    ...baseEvidence,
    status: "blocked",
    daMode: "not-published",
    blocker: "missing-da-candidate",
    verified: { candidateExists: false },
  });
  process.exit(0);
}

if (payloadSha256 !== candidate.payloadSha256) {
  throw new Error(`DA candidate payload hash mismatch: expected ${candidate.payloadSha256}, got ${payloadSha256}`);
}

if (missingProjectConfig.length > 0) {
  writeEvidence({
    ...baseEvidence,
    status: "blocked",
    daMode: "not-published",
    blocker: "missing-project-da-config",
    verified: {
      candidateExists: true,
      candidateHashMatches: true,
      notSubmittedWithoutDisperser: true,
    },
  });
  process.exit(0);
}

const endpoint = parseTarget(process.env.ZEROG_DA_DISPERSER_GRPC);
const data = Buffer.from(canonicalPayload, "utf8");
const submitTimeoutMs = Number(process.env.ZEROG_DA_SUBMIT_TIMEOUT_MS ?? 60000);
const pollRounds = Number(process.env.ZEROG_DA_POLL_ROUNDS ?? 60);
const pollIntervalMs = Number(process.env.ZEROG_DA_POLL_INTERVAL_MS ?? 3000);
const statusHistory = [];

try {
  const submit = await grpcUnary(
    endpoint,
    "/disperser.Disperser/DisperseBlob",
    encodeDisperseBlobRequest(data),
    decodeDisperseBlobReply,
    submitTimeoutMs,
  );
  const requestId = submit.requestId;
  let latestStatus = statusText(submit.result);
  let latestBlobHeader = null;
  statusHistory.push({ round: 0, status: latestStatus });

  for (let round = 1; round <= pollRounds; round += 1) {
    if (["CONFIRMED", "FINALIZED", "FAILED", "INSUFFICIENT_SIGNATURES"].includes(latestStatus)) break;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    const status = await grpcUnary(
      endpoint,
      "/disperser.Disperser/GetBlobStatus",
      encodeBlobStatusRequest(requestId),
      decodeBlobStatusReply,
      submitTimeoutMs,
    );
    latestStatus = statusText(status.status);
    latestBlobHeader = status.blobHeader ?? null;
    statusHistory.push({ round, status: latestStatus });
  }

  const live = latestStatus === "CONFIRMED" || latestStatus === "FINALIZED";
  writeEvidence({
    ...baseEvidence,
    status: latestStatus.toLowerCase().replaceAll("_", "-"),
    daMode: live ? "live-0g-da" : "publication-attempt-unconfirmed",
    disperser: {
      endpoint: "configured",
      target: endpoint.target,
      plaintext: endpoint.plaintext,
      daEntranceContract: process.env.ZEROG_DA_ENTRANCE_CONTRACT,
    },
    request: {
      id: bufferToHex(requestId),
      initialStatus: statusText(submit.result),
      payloadBytes: data.byteLength,
    },
    blob: latestBlobHeader
      ? {
          storageRoot: bufferToHex(latestBlobHeader.storageRoot),
          epoch: latestBlobHeader.epoch ?? null,
          quorumId: latestBlobHeader.quorumId ?? null,
        }
      : null,
    statusHistory,
    verified: {
      candidateExists: true,
      candidateHashMatches: true,
      requestAccepted: Boolean(requestId),
      nodeHttp2GrpcClientUsed: true,
      terminalConfirmed: live,
    },
  });
} catch (error) {
  writeEvidence({
    ...baseEvidence,
    status: "blocked",
    daMode: "not-published",
    blocker: "disperser-request-failed",
    disperser: {
      endpoint: "configured",
      target: endpoint.target,
      plaintext: endpoint.plaintext,
      daEntranceContract: process.env.ZEROG_DA_ENTRANCE_CONTRACT,
    },
    error: {
      message: error.message,
    },
    verified: {
      candidateExists: true,
      candidateHashMatches: true,
      requestAccepted: false,
    },
  });
}
