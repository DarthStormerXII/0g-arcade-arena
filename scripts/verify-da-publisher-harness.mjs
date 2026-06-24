import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http2";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const root = process.cwd();
const outFile = "evidence/live-proofs/0g-da-publisher-harness-2026-06-24.json";
const tempPublication = join(tmpdir(), `0g-arcade-da-publication-harness-${Date.now()}.json`);
const requestId = Buffer.from("arcade-da-harness-request");
const storageRoot = Buffer.from("a".repeat(64), "hex");

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
    if ((byte & 0x80) === 0) return { value: Number(result), offset: cursor };
    shift += 7n;
  }
  throw new Error("truncated protobuf varint");
}

function encodeField(fieldNumber, wireType, value) {
  return Buffer.concat([encodeVarint((fieldNumber << 3) | wireType), value]);
}

function encodeVarintField(fieldNumber, value) {
  return encodeField(fieldNumber, 0, encodeVarint(value));
}

function encodeBytesField(fieldNumber, value) {
  return encodeField(fieldNumber, 2, Buffer.concat([encodeVarint(value.length), value]));
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
      throw new Error(`unsupported wire type ${wireType}`);
    }
    if (!fields.has(fieldNumber)) fields.set(fieldNumber, []);
    fields.get(fieldNumber).push(value);
  }
  return fields;
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
    if (compressed !== 0) throw new Error("compressed gRPC frame unsupported in harness");
    const length = buffer.readUInt32BE(offset + 1);
    offset += 5;
    messages.push(buffer.subarray(offset, offset + length));
    offset += length;
  }
  return messages;
}

function respond(stream, message) {
  stream.respond({
    ":status": 200,
    "content-type": "application/grpc",
    "grpc-status": "0",
  });
  stream.end(encodeGrpcFrame(message));
}

function makeServer() {
  let observedPayloadSha256 = null;
  let streamCalls = 0;
  let disperseCalls = 0;
  let statusCalls = 0;
  const sessions = new Set();
  const server = createServer();
  server.on("session", (session) => {
    sessions.add(session);
    session.on("close", () => sessions.delete(session));
  });
  server.on("stream", (stream, headers) => {
    const chunks = [];
    let handled = false;
    streamCalls += 1;
    const tryHandle = () => {
      if (handled) return;
      const body = Buffer.concat(chunks);
      if (body.length < 5) return;
      const messageLength = body.readUInt32BE(1);
      if (body.length < 5 + messageLength) return;
      handled = true;
      const path = headers[":path"];
      const frame = decodeGrpcFrames(body)[0] ?? Buffer.alloc(0);
      if (path === "/disperser.Disperser/DisperseBlob") {
        const fields = decodeFields(frame);
        const payload = fields.get(1)?.[0] ?? Buffer.alloc(0);
        observedPayloadSha256 = `sha256:${createHash("sha256").update(payload).digest("hex")}`;
        disperseCalls += 1;
        respond(stream, Buffer.concat([encodeVarintField(1, 1), encodeBytesField(2, requestId)]));
        return;
      }
      if (path === "/disperser.Disperser/GetBlobStatus") {
        const fields = decodeFields(frame);
        const receivedRequestId = fields.get(1)?.[0];
        statusCalls += 1;
        if (!receivedRequestId || !Buffer.from(receivedRequestId).equals(requestId)) {
          stream.respond({ ":status": 200, "content-type": "application/grpc", "grpc-status": "3", "grpc-message": "bad request id" });
          stream.end();
          return;
        }
        const blobHeader = Buffer.concat([
          encodeBytesField(1, storageRoot),
          encodeVarintField(2, 7),
          encodeVarintField(3, 1),
        ]);
        const info = encodeBytesField(1, blobHeader);
        respond(stream, Buffer.concat([encodeVarintField(1, 2), encodeBytesField(2, info)]));
        return;
      }
      stream.respond({ ":status": 404, "content-type": "application/grpc", "grpc-status": "12", "grpc-message": "unknown path" });
      stream.end();
    };
    stream.on("data", (chunk) => {
      chunks.push(chunk);
      tryHandle();
    });
    stream.on("end", () => {
      tryHandle();
    });
  });
  return {
    server,
    closeSessions() {
      for (const session of sessions) session.destroy();
    },
    get observed() {
      return { observedPayloadSha256, streamCalls, disperseCalls, statusCalls };
    },
  };
}

function runPublisher(port) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/publish-da-batch-0g.mjs"], {
      cwd: root,
      env: {
        ...process.env,
        ZEROG_DA_DISPERSER_GRPC: `grpc://127.0.0.1:${port}`,
        ZEROG_DA_ENTRANCE_CONTRACT: "0xE75A073dA5bb7b0eC622170Fd268f35E675a957B",
        ZEROG_DA_POLL_INTERVAL_MS: "1",
        ZEROG_DA_POLL_ROUNDS: "3",
        ZEROG_DA_SUBMIT_TIMEOUT_MS: "5000",
        ZEROG_DA_PUBLICATION_OUTFILE: tempPublication,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("publisher timed out after 15000ms"));
    }, 15000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr || stdout || `publisher exited ${code}`));
      }
    });
  });
}

const harness = makeServer();
await new Promise((resolve) => harness.server.listen(0, "127.0.0.1", resolve));
const port = harness.server.address().port;

try {
  await runPublisher(port);

  const publication = JSON.parse(readFileSync(tempPublication, "utf8"));
  const observed = harness.observed;
  const evidence = {
    mode: "0g-da-publisher-harness",
    status: "passed",
    checkedAt: new Date().toISOString(),
    schema: "0g-arcade-da-publisher-harness@1",
    publisher: {
      script: "scripts/publish-da-batch-0g.mjs",
      clientTool: publication.officialApi?.clientTool,
      tempPublicationFile: tempPublication,
    },
    fakeDisperser: {
      endpoint: `grpc://127.0.0.1:${port}`,
      streamCalls: observed.streamCalls,
      disperseCalls: observed.disperseCalls,
      statusCalls: observed.statusCalls,
      observedPayloadSha256: observed.observedPayloadSha256,
    },
    publication: {
      status: publication.status,
      daMode: publication.daMode,
      requestId: publication.request?.id,
      storageRoot: publication.blob?.storageRoot,
      epoch: publication.blob?.epoch,
      quorumId: publication.blob?.quorumId,
      candidatePayloadSha256: publication.candidate?.payloadSha256,
    },
    verified: {
      usedNodeHttp2Client: publication.officialApi?.clientTool === "node-http2",
      candidateHashMatches: publication.verified?.candidateHashMatches === true,
      requestAccepted: publication.verified?.requestAccepted === true,
      terminalConfirmed: publication.verified?.terminalConfirmed === true,
      statusConfirmed: publication.status === "confirmed",
      daModeLive: publication.daMode === "live-0g-da",
      storageRootDecoded: publication.blob?.storageRoot === `0x${storageRoot.toString("hex")}`,
      fakeDisperserReceivedCandidatePayload: observed.observedPayloadSha256 === publication.candidate?.payloadSha256,
    },
  };

  for (const [key, value] of Object.entries(evidence.verified)) {
    if (value !== true) {
      evidence.status = "failed";
      evidence.failure = `${key} was not true`;
      break;
    }
  }

  mkdirSync(dirname(join(root, outFile)), { recursive: true });
  writeFileSync(join(root, outFile), `${JSON.stringify(evidence, null, 2)}\n`);
  if (evidence.status !== "passed") {
    throw new Error(evidence.failure);
  }
  console.log(`${outFile}: passed`);
} finally {
  harness.closeSessions();
  await new Promise((resolve) => harness.server.close(resolve));
}
