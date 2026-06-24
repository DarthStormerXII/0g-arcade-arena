import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { liveDaBatchCandidate, liveGamePackProofs, liveProofArtifactStorage } from "./live-proof-api";

const games = ["grid-four", "fleet-duel", "tile-race", "world-cup-draft"];

function readEvidence(gameId: string) {
  return JSON.parse(readFileSync(`evidence/live-proofs/0g-storage-game-pack-${gameId}.json`, "utf8")) as {
    gameId: string;
    rootHash: string;
    txHash: string;
    payloadSha256: string;
    fileCount: number;
    reachable: boolean;
  };
}

describe("live game-pack storage proofs", () => {
  it("exposes every v1 game-pack root shown in Explorer", () => {
    expect(liveGamePackProofs.map((proof) => proof.gameId).sort()).toEqual([...games].sort());

    for (const gameId of games) {
      const proof = liveGamePackProofs.find((item) => item.gameId === gameId);
      const evidence = readEvidence(gameId);

      expect(proof).toMatchObject({
        gameId: evidence.gameId,
        rootHash: evidence.rootHash,
        txHash: evidence.txHash,
        payloadSha256: evidence.payloadSha256,
        fileCount: evidence.fileCount,
        reachable: true,
      });
      expect(evidence.reachable).toBe(true);
    }
  });

  it("exposes the live proof artifact bundle shown in Explorer", () => {
    const evidence = JSON.parse(
      readFileSync("evidence/live-proofs/0g-storage-proof-artifacts-2026-06-24.json", "utf8"),
    ) as {
      schema: string;
      rootHash: string;
      txHash: string;
      payloadSha256: string;
      reachable: boolean;
      artifactTypes: string[];
      verified: Record<string, boolean>;
    };

    expect(liveProofArtifactStorage).toMatchObject({
      schema: evidence.schema,
      rootHash: evidence.rootHash,
      txHash: evidence.txHash,
      payloadSha256: evidence.payloadSha256,
      reachable: true,
      artifactTypes: evidence.artifactTypes,
    });
    expect(Object.values(evidence.verified).every(Boolean)).toBe(true);
  });

  it("exposes the deterministic DA batch candidate without claiming publication", () => {
    const evidence = JSON.parse(
      readFileSync("evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json", "utf8"),
    ) as {
      schema: string;
      status: string;
      daMode: string;
      batchHash: string;
      payloadSha256: string;
      checkedAt: string;
      sourceEvidence: string[];
      payload: { matches: unknown[]; gamePacks: unknown[] };
      verified: Record<string, boolean>;
    };

    expect(liveDaBatchCandidate).toMatchObject({
      schema: evidence.schema,
      status: "not-published",
      daMode: "candidate-not-published",
      batchHash: evidence.batchHash,
      payloadSha256: evidence.payloadSha256,
      matchCount: evidence.payload.matches.length,
      gamePackCount: evidence.payload.gamePacks.length,
      sourceEvidenceCount: evidence.sourceEvidence.length,
      checkedAt: evidence.checkedAt,
    });
    expect(Object.values(evidence.verified).every(Boolean)).toBe(true);
  });
});
