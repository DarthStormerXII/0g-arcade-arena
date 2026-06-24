# Truth Audit

- 0G Chain deployment: live Galileo smoke deployment and registry writes are claimed only when `evidence/live-proofs/chain-check-latest.json` exists for chain ID `16602`. The completed browser wager room `gr-zqvy` may claim live match-result commitment only when `evidence/live-proofs/chain-actual-match-gr-zqvy.json` passes. Static sample proof receipts still show `local-mock`.
- 0G Storage upload: claimed only for receipts with reachable 0G Storage roots and upload tx evidence; CI game-pack publish receipts remain local fallback to avoid repeated writes.
- 0G Compute execution: live testnet Router execution is claimed only for receipts with `computeMode=0g-compute` and provider/request metadata; deterministic fallback remains labeled for static smoke routes and unconfigured environments.
- 0G DA publication: shown as fallback/not configured until a DA commitment is verified; the current repo has a DA candidate hash and publication harness, but no live Disperser receipt.
- Mainnet wagering: out of scope; demo is testnet-only with compliance disclaimers.
- Cloudflare deployment: hosted Workers deployment is verified at `https://0g-arcade-arena.gabrielaxy.workers.dev` with D1, KV, R2, Durable Object, and static asset bindings.
- Privy production login: not claimed on the Workers URL. `evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.json` proves the current hosted attempt is blocked by Privy origin/CSP handling and the deployed bundle is stale. Localhost Privy login is verified on `http://localhost:3021/`.
