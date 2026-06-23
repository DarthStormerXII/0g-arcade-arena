export type LiveProof = {
  matchId: string;
  gameId: string;
  mode: string;
  roomId: string | null;
  opponentMode: string;
  wagerWei: string;
  status: string;
  players: string[];
  winnerId: string | null;
  replayHash: string | null;
  resultHash: string | null;
  storageUri: string | null;
  storageRoot: string | null;
  storageTx?: string | null;
  chainTx: string | null;
  settlementTx: string | null;
  computeMode: string;
  storageMode: string;
  chainMode: string;
  daMode: string;
  createdAt: string;
};

export type LeaderboardEntry = {
  scope: string;
  gameId: string | null;
  mode: string;
  participantId: string;
  participantKind: string;
  displayName: string;
  wins: number;
  losses: number;
  draws: number;
  wagerWins: number;
  score: number;
  updatedAt: string;
};

export type LiveGamePackProof = {
  gameId: string;
  rootHash: string;
  txHash: string;
  fileCount: number;
  payloadSha256: string;
  reachable: boolean;
  uploadedAt: string;
};

export const liveGamePackProofs: LiveGamePackProof[] = [
  {
    gameId: "grid-four",
    rootHash: "0x81a3504d17ba2fd003069e1c8f62a2b47d20d84618703750e59962e1a2f47e54",
    txHash: "0x296d52cdfb06a881d2fb7afbe3c6fc81c48559de6e044b751da91977b5c700bc",
    fileCount: 11,
    payloadSha256: "sha256:93227d2b67cbf38fddb2bab19b99f839dcca178f9b02f63d4777bd530666d7c7",
    reachable: true,
    uploadedAt: "2026-06-23T17:24:32.079Z",
  },
];

export const liveStorageProofs: LiveProof[] = [
  {
    matchId: "match-gr-zqvy",
    gameId: "grid-four",
    mode: "wager",
    roomId: "gr-zqvy",
    opponentMode: "human",
    wagerWei: "100000000000000",
    status: "finished",
    players: [
      "0x23761115c5f38ca51f0d425d00de6e34029239ec",
      "0xd5f264ee35815af73510150302cc52fe686e5f81",
    ],
    winnerId: "0x23761115c5f38ca51f0d425d00de6e34029239ec",
    replayHash: "0x7328a9b94e946521d1cd52222de09ccd3f2bc6f2f5ebc31f2b401e00ba30d1fe",
    resultHash: "0xaf09796f99d45a3039299f75e9e16becc1688c4388180d8f2d1f9da9b2026384",
    storageUri: "0g://storage/0xe22ca7771560aca78982bcc16d00c01683f28ffb9e8f18c7aaa01a2a9221c8c7",
    storageRoot: "0xe22ca7771560aca78982bcc16d00c01683f28ffb9e8f18c7aaa01a2a9221c8c7",
    storageTx: "0xc94541253faea6fe444ca4543aec8c553f1b909c84edfc3ee587957d54a5251d",
    chainTx: "0xe415c99906bb498d64e7ad147680a27d007993bea9f2ef7bb7c1432fa48738d3",
    settlementTx: "0xe34b656a4541a38d18ea6943cb5c9c8a1d250a6990c14446a276701bbf664969",
    computeMode: "deterministic-fallback",
    storageMode: "0g-storage",
    chainMode: "0g-galileo",
    daMode: "not-configured",
    createdAt: "2026-06-23T16:41:58.966Z",
  },
];

export async function fetchLiveProofs() {
  const response = await fetch("/api/proofs");
  if (!response.ok) return liveStorageProofs;
  const payload = (await response.json()) as { ok?: boolean; proofs?: LiveProof[] };
  const proofs = payload.ok && payload.proofs ? payload.proofs : [];
  return mergeProofs(proofs);
}

export async function fetchLiveProof(matchId: string) {
  const staticProof = liveStorageProofs.find((proof) => proof.matchId === matchId);
  const response = await fetch(`/api/proofs/${encodeURIComponent(matchId)}`);
  if (!response.ok) return staticProof ?? null;
  const payload = (await response.json()) as { ok?: boolean; proof?: LiveProof };
  return payload.ok && payload.proof ? mergeProofs([payload.proof]).find((proof) => proof.matchId === matchId) ?? null : staticProof ?? null;
}

export async function fetchLeaderboard(input: { scope: string; mode: string; gameId?: string }) {
  const params = new URLSearchParams({ scope: input.scope, mode: input.mode });
  if (input.gameId) params.set("gameId", input.gameId);
  const response = await fetch(`/api/leaderboard?${params}`);
  if (!response.ok) return [];
  const payload = (await response.json()) as { ok?: boolean; entries?: LeaderboardEntry[] };
  return payload.ok && payload.entries ? payload.entries : [];
}

function mergeProofs(proofs: LiveProof[]) {
  const byId = new Map<string, LiveProof>();
  for (const proof of [...proofs, ...liveStorageProofs]) {
    const existing = byId.get(proof.matchId);
    byId.set(proof.matchId, { ...existing, ...proof });
  }
  return [...byId.values()];
}
