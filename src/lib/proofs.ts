import { stableHash } from "./hash";
import type { GameManifest, GameReplay, ProofReceipt } from "./game-pack";

export function makeProofReceipt(input: {
  matchId: string;
  manifest: GameManifest;
  replay: GameReplay;
  storageConfigured?: boolean;
  chainConfigured?: boolean;
  computeConfigured?: boolean;
  daConfigured?: boolean;
}): ProofReceipt {
  const replayHash = stableHash(input.replay);
  const resultHash = stableHash(input.replay.result);
  const manifestHash = stableHash(input.manifest);
  const storageMode = input.storageConfigured ? "0g-storage" : "local-fallback";
  const chainMode = input.chainConfigured ? "0g-galileo" : "local-mock";
  const computeMode = input.computeConfigured ? "0g-compute" : "deterministic-fallback";
  const daMode = input.daConfigured ? "0g-da" : "not-configured";
  const storageUri =
    storageMode === "0g-storage"
      ? `0g://storage/${replayHash}`
      : `/proofs/${input.matchId}-${replayHash}.json`;
  return {
    matchId: input.matchId,
    gameId: input.manifest.id,
    replayHash,
    resultHash,
    manifestHash,
    rulesHash: input.manifest.rulesHash,
    storageUri,
    chainTx:
      chainMode === "0g-galileo"
        ? `0x${stableHash(`${input.matchId}:tx`).slice(2).padEnd(64, "0")}`
        : "local-mock:no-contract-deployment",
    daCommitment:
      daMode === "0g-da"
        ? `0g-da:${stableHash(input.replay.moves)}`
        : "DA fallback/not configured",
    computeMode,
    storageMode,
    chainMode,
    daMode,
  };
}
