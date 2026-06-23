export const integrationStatus = [
  {
    name: "0G Chain",
    mode: "live match commit + local samples",
    detail: "Galileo smoke contracts are verified, and room gr-zqvy's real result/storage hashes are committed on chain; static sample receipts still disclose local mock.",
  },
  {
    name: "0G Storage",
    mode: "live samples + fallback receipts",
    detail: "One completed replay and the Grid Four game pack are live on 0G Storage; CI publish receipts stay local to avoid repeated writes.",
  },
  {
    name: "0G Compute",
    mode: "deterministic-fallback",
    detail: "Agent moves attempt the 0G Router when bound, but the current router returns insufficient balance.",
  },
  {
    name: "0G DA",
    mode: "not-configured",
    detail: "Tournament replay batches show a DA fallback label.",
  },
  {
    name: "Cloudflare Ops",
    mode: "scaffolded",
    detail: "Wrangler, D1 schema, R2, KV, and Durable Object room bindings exist.",
  },
];
