export const integrationStatus = [
  {
    name: "0G Chain",
    mode: "live match commit + local samples",
    detail: "Galileo smoke contracts are verified, and seven real match results/storage hashes across all four games are committed on chain; static sample receipts still disclose local mock.",
  },
  {
    name: "0G Storage",
    mode: "live game packs + fallback receipts",
    detail: "Completed wager replays, Router Compute replays across all four games, and all four v1 game packs are live on 0G Storage; CI publish receipts stay local to avoid repeated writes.",
  },
  {
    name: "0G Compute",
    mode: "0g-compute-router",
    detail: "Agent moves use the 0G testnet Router when bound; the direct broker path remains optional and needs a larger ledger balance.",
  },
  {
    name: "0G DA",
    mode: "candidate-not-published",
    detail: "A deterministic seven-match/game-pack batch payload is hashed for DA publication and a Disperser publisher harness is prepared; readiness evidence confirms no project-local DA Client/Disperser path is configured yet.",
  },
  {
    name: "Cloudflare Ops",
    mode: "scaffolded",
    detail: "Wrangler, D1 schema, R2, KV, and Durable Object room bindings exist.",
  },
];
