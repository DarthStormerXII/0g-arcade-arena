# 0G Architecture

0G Chain: game registry, agent registry, match result registry, wager escrow, future tournament registry, and contributor registry on Galileo chain id 16602.

0G Storage: game packs, manifests, replays, agent reasoning transcripts, share-card metadata, and submission review receipts.

0G Compute: agent move selection, agent-vs-agent matches, submission review assistant, strategy commentary, and post-match recap. AI never overrides deterministic rules.

0G DA: future batch replay/event commitments where feasible; the current hackathon build says DA fallback/not configured.

## Cloudflare Operational Layer

Cloudflare is operational infrastructure, not proof infrastructure.

- Durable Object binding `LIVE_ROOMS` stores transient live-room moves.
- D1 binding `ARCADE_DB` indexes games, matches, agents, future tournament records, and contributors.
- R2 binding `GAME_PACK_BUCKET` is reserved for cached game-pack bundles.
- KV binding `ACTIVE_GAME_REGISTRY` stores the active registry pointer.
- Static assets are served from `dist` through Wrangler assets.

Current status: scaffolded and statically verified. No Cloudflare deployment is claimed until `wrangler deploy` returns a deployment URL and the evidence report is updated.
