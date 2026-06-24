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
  computeProof?: unknown;
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

export type LiveProofArtifactStorage = {
  schema: string;
  rootHash: string;
  txHash: string;
  payloadSha256: string;
  reachable: boolean;
  artifactTypes: string[];
  uploadedAt: string;
};

export type LiveDaBatchCandidate = {
  schema: string;
  status: string;
  daMode: string;
  batchHash: string;
  payloadSha256: string;
  matchCount: number;
  gamePackCount: number;
  sourceEvidenceCount: number;
  checkedAt: string;
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
  {
    gameId: "fleet-duel",
    rootHash: "0x64764074cf9142a25147673e160f020dd1ce0d245445ae730d986b106d0289c0",
    txHash: "0x6e4e738fe95ce5f5bb646c71999bbaadf74665868e81a8c5aecf01d67b52934b",
    fileCount: 11,
    payloadSha256: "sha256:a204377c25c49c9cd239ea315a1c4bf291858b1fa0f40b9dec09e2750317672c",
    reachable: true,
    uploadedAt: "2026-06-24T07:26:28.950Z",
  },
  {
    gameId: "tile-race",
    rootHash: "0x3edfece3b2e45e10636fb00a4aa8d52b0480648b1c988b8f63c9eabeab4d41d2",
    txHash: "0xf8c0488e22306d2ff040ceff031fbfc2f16ec273a9fe2669e0054e2b69ec4acb",
    fileCount: 11,
    payloadSha256: "sha256:d35b986dfb981ebf3037208bfc75297b4899612247d08f1b87cd516c8c9530a2",
    reachable: true,
    uploadedAt: "2026-06-24T07:27:19.040Z",
  },
  {
    gameId: "world-cup-draft",
    rootHash: "0x5f4709463db77e8f5133a0dec94d306261a836e5984f25e0021e2c2d7b852220",
    txHash: "0xe58eaf98e76f8249be115bc8d628db79146d658e041c9bb9b0576d17e8d3ede3",
    fileCount: 11,
    payloadSha256: "sha256:3da6ef2a7a623c4579982fda019cbb37e42175f0fc9990f782681d128939993e",
    reachable: true,
    uploadedAt: "2026-06-24T07:27:37.177Z",
  },
];

export const liveProofArtifactStorage: LiveProofArtifactStorage = {
  schema: "0g-arcade-proof-artifacts@1",
  rootHash: "0x5e6b327f1ad200fd79ecd12aa1471ed7488d7a8da0b906a08aa9a1e41937da51",
  txHash: "0x5c13d3266baa7a2ab9ac3455862279765ec7bd140ea2cf83ffa54525ee6d18b7",
  payloadSha256: "sha256:32fa366708c1dc396a472e25665987ca73c5bac279c999ce04670080837cac51",
  reachable: true,
  artifactTypes: ["submission-review-receipt", "share-card-metadata", "agent-reasoning-transcript"],
  uploadedAt: "2026-06-24T07:40:41.828Z",
};

export const liveDaBatchCandidate: LiveDaBatchCandidate = {
  schema: "0g-arcade-da-batch@1",
  status: "not-published",
  daMode: "candidate-not-published",
  batchHash: "0x7662efb303bb52394dc4e690c3361b2fc9a316e7aa3eba4613ad86c1d19223e9",
  payloadSha256: "sha256:7662efb303bb52394dc4e690c3361b2fc9a316e7aa3eba4613ad86c1d19223e9",
  matchCount: 7,
  gamePackCount: 4,
  sourceEvidenceCount: 19,
  checkedAt: "2026-06-24T07:48:30.335Z",
};

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
  {
    matchId: "match-router-compute-mqrwdmmf",
    gameId: "grid-four",
    mode: "free",
    roomId: "router-compute-mqrwdmmf",
    opponentMode: "agent",
    wagerWei: "0",
    status: "finished",
    players: ["human-router-mqrwdmmf", "agent-router-compute-mqrwdmmf"],
    winnerId: "human-router-mqrwdmmf",
    replayHash: "0xb3803544",
    resultHash: "0xacdc37d4",
    storageUri: "0g://storage/0xa27dceac2040f491db0993daa24e3823b247e7b666c1e1e7877f6031faa9e3de",
    storageRoot: "0xa27dceac2040f491db0993daa24e3823b247e7b666c1e1e7877f6031faa9e3de",
    storageTx: "0xd7cd16fe55a128aaa1421dacb49e5c37e991abdf9b582728dd28d664785b9b35",
    chainTx: "0x0c7dabcef133a6a1e0ef215b178e72285f6b3a4d7dde0ed25275fd8b8c353dee",
    settlementTx: null,
    computeMode: "0g-compute",
    storageMode: "0g-storage",
    chainMode: "0g-galileo",
    daMode: "candidate-not-published",
    createdAt: "2026-06-24T09:55:21.159Z",
  },
  {
    matchId: "match-h2a-router-wager-mqs1kt45",
    gameId: "grid-four",
    mode: "wager",
    roomId: "h2a-router-wager-mqs1kt45",
    opponentMode: "agent",
    wagerWei: "100000000000000",
    status: "finished",
    players: ["h2a-human-mqs1kt45", "agent-wager-warden-mqs1kt45"],
    winnerId: "h2a-human-mqs1kt45",
    replayHash: "0xb8e9bf38",
    resultHash: "0x93d5b20b",
    storageUri: "0g://storage/0x7aeac238a3e6493e61c9c8bce13988bd9885dbb59954036c8c14943b31daf5a8",
    storageRoot: "0x7aeac238a3e6493e61c9c8bce13988bd9885dbb59954036c8c14943b31daf5a8",
    storageTx: "0xd99d840e18358fb903c702c64a52c77cfe242d3f759e33d88f8b784465fc269a",
    chainTx: "0x213d718dd8addf75b27f5fea3f5ba75e115c538ebc9a8f09b3165ff498004447",
    settlementTx: "0x8c96abf86a7f4fac55e8e201574487be66e7eb7f3b711e2063886543931e1de0",
    computeMode: "0g-compute",
    storageMode: "0g-storage",
    chainMode: "0g-galileo",
    daMode: "candidate-not-published",
    createdAt: "2026-06-24T12:22:53.522Z",
  },
  {
    matchId: "match-mgr-fleet-duel-mqrxg2lh",
    gameId: "fleet-duel",
    mode: "free",
    roomId: "mgr-fleet-duel-mqrxg2lh",
    opponentMode: "agent",
    wagerWei: "0",
    status: "finished",
    players: ["human-fleet-duel-mqrxg2lh", "router-agent-fleet-duel-mqrxg2lh"],
    winnerId: null,
    replayHash: "0x018d4db1",
    resultHash: "0x9e13a3ab",
    storageUri: "0g://storage/0xfdc8cef344cf0b929509163ab641e17dd2c76c43a724e458cf97eea57cdba786",
    storageRoot: "0xfdc8cef344cf0b929509163ab641e17dd2c76c43a724e458cf97eea57cdba786",
    storageTx: "0xe320c48c39e1e00c84abeab7c61ed1386ede3cc93a33f2c0c46ecc38bc913dbf",
    chainTx: "0xf9deaffcf2421fcfb5c2ed99d8c541e31b74a369d16d8f05a3f25da4f542c275",
    settlementTx: null,
    computeMode: "0g-compute",
    storageMode: "0g-storage",
    chainMode: "0g-galileo",
    daMode: "candidate-not-published",
    createdAt: "2026-06-24T10:25:22.622Z",
  },
  {
    matchId: "match-mgr-tile-race-mqrxg2lh",
    gameId: "tile-race",
    mode: "free",
    roomId: "mgr-tile-race-mqrxg2lh",
    opponentMode: "agent",
    wagerWei: "0",
    status: "finished",
    players: ["human-tile-race-mqrxg2lh", "router-agent-tile-race-mqrxg2lh"],
    winnerId: null,
    replayHash: "0x6cf20ed4",
    resultHash: "0x9f53f1ec",
    storageUri: "0g://storage/0xdbc1eeba3cfc798823209a80d0b456a07de974a91be60e906baf552fcc1153ba",
    storageRoot: "0xdbc1eeba3cfc798823209a80d0b456a07de974a91be60e906baf552fcc1153ba",
    storageTx: "0x5ea78612a1e8228b5f3a3cec7d9a03759fe82ed1c3b948c3b63db1df627f635e",
    chainTx: "0x8e72857c760325db82f8fd97b9de758ec7f4b7f0b21b844b0bb17905942cd0e6",
    settlementTx: null,
    computeMode: "0g-compute",
    storageMode: "0g-storage",
    chainMode: "0g-galileo",
    daMode: "candidate-not-published",
    createdAt: "2026-06-24T10:25:22.622Z",
  },
  {
    matchId: "match-mgr-world-cup-draft-mqrxg2lh",
    gameId: "world-cup-draft",
    mode: "free",
    roomId: "mgr-world-cup-draft-mqrxg2lh",
    opponentMode: "agent",
    wagerWei: "0",
    status: "finished",
    players: ["human-world-cup-draft-mqrxg2lh", "router-agent-world-cup-draft-mqrxg2lh"],
    winnerId: null,
    replayHash: "0xfcb33529",
    resultHash: "0x5a466525",
    storageUri: "0g://storage/0x7399a314f84b1f9f5d516d9c6f13417b4bfc76c0d37ad64d319c50d82ef7c72a",
    storageRoot: "0x7399a314f84b1f9f5d516d9c6f13417b4bfc76c0d37ad64d319c50d82ef7c72a",
    storageTx: "0x546cd06d893a3b113b824e00fc5d0b6319dec4c605f17dd06d19ada2375b901c",
    chainTx: "0x8478389106f164f1dcfaec64272030b105c71f7c2e9dd6f11629797aa771e642",
    settlementTx: null,
    computeMode: "0g-compute",
    storageMode: "0g-storage",
    chainMode: "0g-galileo",
    daMode: "candidate-not-published",
    createdAt: "2026-06-24T10:25:22.622Z",
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
