# Truth Audit

- 0G Chain deployment: live Galileo smoke deployment and registry writes are claimed only when `evidence/live-proofs/chain-check-latest.json` exists for chain ID `16602`. The completed browser wager room `gr-zqvy` may claim live match-result commitment only when `evidence/live-proofs/chain-actual-match-gr-zqvy.json` passes. Static sample proof receipts still show `local-mock`.
- 0G Storage upload: not claimed until credentials and upload receipt are verified.
- 0G Compute execution: deterministic fallback is labeled until credentials are configured.
- 0G DA publication: shown as fallback/not configured until a DA commitment is verified.
- Mainnet wagering: out of scope; demo is testnet-only with compliance disclaimers.
- Cloudflare deployment: hosted Workers deployment is verified at `https://0g-arcade-arena.gabrielaxy.workers.dev` with D1, KV, R2, Durable Object, and static asset bindings.
- Privy production login: not claimed on the Workers URL. `evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.json` proves the current hosted attempt is blocked by Privy origin/CSP handling and the deployed bundle is stale. Localhost Privy login is verified on `http://localhost:3021/`.
