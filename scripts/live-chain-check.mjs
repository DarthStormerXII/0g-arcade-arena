import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const rpcUrl = process.env.OG_ARCADE_RPC_URL || "https://evmrpc-testnet.0g.ai";
const privateKey = process.env.OG_ARCADE_OPERATOR_PRIVATE_KEY;
const operator = process.env.OG_ARCADE_OPERATOR_ADDRESS;
const privyWallet = process.env.OG_ARCADE_PRIVY_WALLET || "0x23761115c5f38ca51f0d425d00DE6E34029239EC";
const explorer = "https://chainscan-galileo.0g.ai";
const evmVersion = "paris";
const txFeeArgs = [
  "--gas-price",
  process.env.OG_ARCADE_GAS_PRICE || "3gwei",
  "--priority-gas-price",
  process.env.OG_ARCADE_PRIORITY_GAS_PRICE || "2gwei",
];

if (!privateKey || !operator) {
  console.error("missing OG_ARCADE_OPERATOR_PRIVATE_KEY or OG_ARCADE_OPERATOR_ADDRESS");
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 16,
    ...options,
  });
  if (result.status !== 0) {
    const message = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args[0] || ""} failed\n${message}`);
  }
  return result.stdout.trim();
}

function cast(args) {
  return run("cast", [...args, "--rpc-url", rpcUrl]);
}

function codeSize(address) {
  const code = cast(["code", address]);
  return code.length > 2 ? code.length : 0;
}

function expectedCreateAddress(nonce) {
  const output = run("cast", ["compute-address", operator, "--nonce", String(nonce)]);
  const address = output.match(/0x[a-fA-F0-9]{40}/)?.[0];
  if (!address) throw new Error(`could not compute create address for nonce ${nonce}`);
  return address;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function numberFromHex(value) {
  if (value == null) return null;
  return Number(typeof value === "string" && value.startsWith("0x") ? BigInt(value) : value);
}

function txHashFrom(output) {
  const hash = output.match(/0x[a-fA-F0-9]{64}/)?.[0];
  if (!hash) throw new Error(`could not parse transaction hash from output: ${output}`);
  return hash;
}

function receiptFor(txHash) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = spawnSync("cast", ["receipt", txHash, "--rpc-url", rpcUrl, "--json", "--async"], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 4,
    });
    if (result.status === 0 && result.stdout.trim()) {
      return JSON.parse(result.stdout);
    }
    sleep(2000);
  }
  throw new Error(`receipt not found for ${txHash}`);
}

function send(address, signature, args = [], extra = []) {
  const txHash = txHashFrom(run("cast", [
    "send",
    address,
    signature,
    ...args,
    "--rpc-url",
    rpcUrl,
    "--private-key",
    privateKey,
    "--async",
    ...txFeeArgs,
    ...extra,
  ]));
  const receipt = receiptFor(txHash);
  return {
    txHash,
    blockNumber: numberFromHex(receipt.blockNumber),
    gasUsed: numberFromHex(receipt.gasUsed),
    status: receipt.status,
  };
}

function deploy(contract) {
  const nonce = Number(cast(["nonce", operator]));
  const expectedAddress = expectedCreateAddress(nonce);
  const bytecode = run("forge", ["inspect", `contracts/src/${contract}.sol:${contract}`, "bytecode"]);
  try {
    const txHash = txHashFrom(run("cast", [
      "send",
      "--rpc-url",
      rpcUrl,
      "--private-key",
      privateKey,
      "--async",
      ...txFeeArgs,
      "--create",
      bytecode,
    ]));
    const receipt = receiptFor(txHash);
    if (!receipt.contractAddress || receipt.status !== "0x1") {
      throw new Error(`deployment failed for ${contract}: ${JSON.stringify(receipt)}`);
    }
    return {
      address: receipt.contractAddress,
      txHash,
      blockNumber: numberFromHex(receipt.blockNumber),
      gasUsed: numberFromHex(receipt.gasUsed),
    };
  } catch (error) {
    for (let attempt = 0; attempt < 6; attempt += 1) {
      sleep(2000);
      if (codeSize(expectedAddress) > 0) {
        return {
          address: expectedAddress,
          txHash: null,
          blockNumber: null,
          gasUsed: null,
          note: `RPC did not return a usable receipt, but code is present at nonce ${nonce}: ${String(error.message).split("\n")[0]}`,
        };
      }
    }
    throw error;
  }
}

function bytes32Text(value) {
  const bytes = Buffer.from(value);
  if (bytes.length > 32) throw new Error(`bytes32 text too long: ${value}`);
  return `0x${Buffer.concat([bytes, Buffer.alloc(32 - bytes.length)]).toString("hex")}`;
}

function shaFile(path) {
  return `0x${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}

const chainId = cast(["chain-id"]);
if (chainId !== "16602") throw new Error(`expected chain id 16602, got ${chainId}`);
run("forge", ["build", "--force"]);

const contracts = [
  "ArcadeGameRegistry",
  "ArcadeMatchRegistry",
  "ArcadeWagerEscrow",
  "ArcadeTournamentRegistry",
  "ArcadeAgentRegistry",
  "ArcadeContributorRegistry",
];

const deployments = {};
for (const contract of contracts) {
  console.error(`deploying ${contract}`);
  deployments[contract] = deploy(contract);
  sleep(1500);
}

const gameId = bytes32Text("grid-four");
const versionHash = shaFile(join(root, "games/grid-four/manifest.json"));
const manifestHash = versionHash;
const rulesHash = shaFile(join(root, "games/grid-four/rules.ts"));
const replayHash = shaFile(join(root, "games/grid-four/fixtures/demo-replay.json"));
const resultHash = shaFile(join(root, "public/proofs/match-grid-four-receipt-proof.json"));
const storageUri = "local://game-packs/grid-four";
const tournamentId = bytes32Text("smoke-tournament");
const agentId = bytes32Text("grid-agent");
const contributorGameId = gameId;

console.error("writing registry smoke transactions");
const transactions = {
  registerGameVersion: send(
    deployments.ArcadeGameRegistry.address,
    "registerGameVersion(bytes32,bytes32,bytes32,bytes32,string)",
    [gameId, versionHash, manifestHash, rulesHash, storageUri],
  ),
  createMatch: send(deployments.ArcadeMatchRegistry.address, "createMatch(bytes32,bool)", [gameId, "false"]),
  commitResult: send(
    deployments.ArcadeMatchRegistry.address,
    "commitResult(uint256,bytes32,bytes32,string)",
    ["1", resultHash, replayHash, storageUri],
  ),
  createWager: send(deployments.ArcadeWagerEscrow.address, "createWager(uint256)", ["1"], ["--value", "0.001ether"]),
  settleWinner: send(deployments.ArcadeWagerEscrow.address, "settleWinner(uint256,address)", ["1", operator]),
  recordTournamentResult: send(
    deployments.ArcadeTournamentRegistry.address,
    "recordTournamentResult(bytes32,bytes32)",
    [tournamentId, replayHash],
  ),
  registerAgent: send(deployments.ArcadeAgentRegistry.address, "registerAgent(bytes32,string)", [
    agentId,
    "local://agents/grid-four-fallback-agent",
  ]),
  updateRating: send(deployments.ArcadeAgentRegistry.address, "updateRating(bytes32,uint256)", [agentId, "1216"]),
  recordContributorCredit: send(
    deployments.ArcadeContributorRegistry.address,
    "recordContributorCredit(address,bytes32)",
    [operator, contributorGameId],
  ),
};

const balances = {
  operator: cast(["balance", operator, "--ether"]),
  privyWallet: cast(["balance", privyWallet, "--ether"]),
};

const proof = {
  mode: "live-0g-galileo-chain-smoke",
  verifiedAt: new Date().toISOString(),
  chainId: Number(chainId),
  rpcUrl,
  explorer,
  evmVersion,
  operator,
  privyWallet,
  balances,
  deployments,
  transactions,
  claims: {
    chain: "Live Galileo deployment and registry writes verified for smoke contracts.",
    storage: "Not uploaded to 0G Storage by this script; storageUri is a local fallback URI.",
    compute: "Not executed on 0G Compute by this script; deterministic fallback agents remain labeled.",
    da: "Not published to 0G DA by this script.",
  },
};

const outDir = join(root, "evidence", "live-proofs");
mkdirSync(outDir, { recursive: true });
const fileName = `chain-check-${proof.verifiedAt.replace(/[:.]/g, "-")}.json`;
writeFileSync(join(outDir, fileName), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(join(outDir, "chain-check-latest.json"), `${JSON.stringify(proof, null, 2)}\n`);

console.log(JSON.stringify({ file: `evidence/live-proofs/${fileName}`, latest: "evidence/live-proofs/chain-check-latest.json", proof }, null, 2));
