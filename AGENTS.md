# AGENTS.md

## Project
0G Arcade Arena is the final 0G Zero Cup submission: an open arcade protocol, contributor platform, and agent competition arena.

## Installed CLIs
- `pnpm` - app dependencies and scripts.
- `vite` - local dev server and production build via package scripts.
- `vitest` - unit and game adapter tests via `pnpm test`.
- `forge` - Solidity contract tests.
- `cast` - EVM wallet, RPC, and contract interaction helper.
- `wrangler` - Cloudflare Worker/Pages/D1/R2/KV operations.
- `gh`, `vercel`, `supabase`, `flyctl`, `stripe`, `docker` - available external service CLIs.
- `rg`, `jq`, `psql`, `sqlite3` - local search/data inspection helpers.

## Project scripts
- `pnpm dev` - start local Vite dev server on 127.0.0.1.
- `pnpm build` - TypeScript check plus Vite production build.
- `pnpm preview` - serve the built app locally.
- `pnpm typecheck` - TypeScript without emitting.
- `pnpm test` - run Vitest suites for game adapters and app libraries.
- `pnpm game:create <slug>` - scaffold a new Game Pack.
- `pnpm game:validate <slug>` - validate a game pack manifest and required files.
- `pnpm game:test <slug>` - run a game pack's rule tests.
- `pnpm game:simulate <slug>` - run a deterministic local game simulation.
- `pnpm game:agent-test <slug>` - validate structured fallback agent output.
- `pnpm game:pack <slug>` - build a local game pack receipt.
- `pnpm game:publish <slug>` - write a local fallback publish receipt unless 0G Storage is configured.
- `pnpm game:hash <slug>` - print manifest/rules/agent/replay hashes.
- `pnpm proof:export` - export static proof/replay JSON artifacts.
- `pnpm infra:check` - verify Cloudflare/0G fallback scaffold files.
- `pnpm 0g:copy-scribezero-env` - copy verified ScribeZero 0G creds into this project's local-only secret file without printing values.
- `pnpm 0g:sync-worker-dev-vars` - write ignored `.dev.vars` from the project-local live env so Wrangler local dev can attempt 0G Compute without printing values.
- `pnpm 0g:readiness` - verify this project's live 0G Chain/Compute/Storage readiness and write redacted evidence.
- `pnpm chain:live-check` - deploy and write a live Galileo chain smoke proof using the external operator wallet env.
- `pnpm chain:commit-actual-match [room-id]` - commit a completed room's real result/storage hashes to the deployed Galileo `ArcadeMatchRegistry`; use sparingly because it sends live transactions.
- `pnpm 0g:upload-game-pack <slug>` - upload one game pack payload to 0G Storage and write live evidence; use sparingly to avoid wasting testnet funds.
- `pnpm agent:skill-check` - verify the project-level external agent skill package covers registration, platform APIs, all four v1 games, examples, and wager safety.
- `pnpm agent:wager-match-check` - fund a tiny Grid Four human-vs-agent wager room with the operator wallet, finish it through `/move` and `/agent-move`, settle escrow, and prove wager leaderboard/proof rows.
- `pnpm agent:wager-policy-check` - prove local API enforcement for qualified agents, free/wager enablement, max wager caps, and direct room joins.
- `pnpm human:automatch-check` - prove local human auto-match queue behavior for free and tiny-wager Grid Four rooms.
- `pnpm room:multigame-check` - prove Fleet Duel, Tile Race, and World Cup Draft real room APIs for human-vs-human and human-vs-agent fallback flows.
- `pnpm wager:start-gate-check` - prove unfunded wager rooms cannot start through either `/start` or pre-start `/move`.
- `pnpm leaderboard:wager-check` - fund a tiny local wager room with the operator wallet, finish it through the API, settle escrow, and prove wager leaderboard rows.
- `pnpm audit:check` - verify non-browser completion evidence and truthful fallback labels.
- `pnpm submission:check` - aggregate non-browser gate: typecheck, tests, build, proof export, infra/audit, game pack checks, Foundry tests, and route smoke when a dev server is running.
- `pnpm test:contracts` - run `forge test`.

## Project Wallets
- External operator wallet for 0G Galileo contract/storage/compute testing: `0x9BD46195661F61a323c3c8C82132dCDE72a3bcbC`.
- The operator private key is stored outside the repo at `~/.codex/secrets/0g-arcade-arena/operator-wallet.env` with `0600` permissions. Load it only for testnet commands with `set -a; source ~/.codex/secrets/0g-arcade-arena/operator-wallet.env; set +a`.
- Live 0G Compute/Storage env for this project is local-only at `~/.codex/secrets/0g-arcade-arena/0g-live.env`, copied from ScribeZero with `pnpm 0g:copy-scribezero-env`.
- Load live 0G env with `set -a; source ~/.codex/secrets/0g-arcade-arena/0g-live.env; set +a`.
- Local Wrangler Compute testing uses ignored `.dev.vars`, generated with `pnpm 0g:sync-worker-dev-vars` from the same project-only secret file.
- Use `ZEROG_COMPUTE_MODEL=glm-5.1`; `glm-5.2` is not assumed available until `pnpm 0g:readiness` proves it.
- Use the external operator wallet for contract deployment, registry writes, storage/compute setup, and funding browser wallets. Do not use the Privy browser wallet as the primary deployment/operator key.
- Privy browser test wallet from `test-1032@privy.io`: `0x23761115c5f38ca51f0d425d00DE6E34029239EC`. Use this for browser-based user flows after funding it from the operator wallet.

## Preferred shell patterns
- Use `--store-dir .pnpm-store` with pnpm in this project if the global pnpm store reports ENOENT/reflink errors.
- Keep 0G integrations honest: fallback labels are product requirements, not TODO clutter.
- Start the app for Privy browser testing with `pnpm exec vite --host localhost --port 3021 --strictPort`; the Privy Testing app allows `http://localhost:3021/`.
- Start the Worker runtime for API/room testing with `pnpm 0g:sync-worker-dev-vars` first, then `pnpm exec wrangler dev --port 3021 --local`.
- Before real 0G writes, load the operator wallet env from `~/.codex/secrets/0g-arcade-arena/operator-wallet.env`; never echo the private key.
- Use `CI=true pnpm chain:live-check` for repeatable Galileo chain smoke proof. It writes `evidence/live-proofs/chain-check-latest.json` and does not claim 0G Storage, Compute, or DA.

## Things to avoid
- Do not use the Connect Four or Battleship trademarks in product UI.
- Do not add more than the four v1 games before the current submission is complete.
- Do not claim 0G deployment, storage upload, DA publication, or compute execution unless verified in the current run.
- Do not commit private keys, `.env.local`, 0G credentials, Privy app secrets, or operator-wallet files.
- Do not expose the Privy app secret to Vite/client code; only `VITE_PRIVY_APP_ID` is client-safe.
