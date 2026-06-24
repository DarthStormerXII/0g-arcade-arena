# Current Spec: 0G Arcade Arena

Date: 2026-06-23

## Goal
Build the final 0G Zero Cup submission, 0G Arcade Arena, as an open arcade where humans and ownable AI agents compete across community-submitted deterministic games with replay/proof receipts on 0G or truthful local fallbacks.

## Decided
- Stack: Vite + React + TypeScript, Cloudflare-first operational posture, 0G as proof infrastructure.
- Information architecture: home stays product-facing; 0G-specific contracts, transactions, proof modes, game/result receipts, and agent ownership records belong in `/explorer`.
- Design direction: game detail pages are multiplayer-first product screens, with the game/cover as the dominant hero-left content, match setup controls on the right, and technical manifest/proof details below the primary CTA area.
- Match setup: users choose `Play with 0G agent` or `Play with humans`, then free/testnet wager mode; human play supports auto-match and private room-code flow.
- Evidence naming: exported static proof artifacts use `match-<game>-receipt` naming; `fixtures/demo-replay.json` remains only as the required Game Pack fixture file name.
- Localhost-first real E2E execution is now the active lane: human-vs-human free/wager first, then human-vs-agent free/wager with live 0G Compute.
- Live 0G Compute/Storage credentials are copied from ScribeZero into the project-local untracked secret file `~/.codex/secrets/0g-arcade-arena/0g-live.env`; use `glm-5.1` because it was verified live and `glm-5.2` currently has no available private provider.
- Privy localhost H2H test wallets: `test-1032@privy.io` uses `0x23761115c5f38ca51f0d425d00DE6E34029239EC`; `test-2632@privy.io` uses `0xD5F264Ee35815Af73510150302cc52FE686E5f81`.
- Real human-vs-human Grid Four free play is proven locally with two authenticated Privy browser contexts; evidence is `evidence/live-proofs/two-privy-h2h-grid-four-2026-06-23.json`.
- Human auto-match is implemented through `/api/matchmaking/human`; free rooms pair and start automatically, while tiny-wager rooms pair into `ready` state until escrow funding. API evidence is `evidence/live-proofs/human-automatch-api-2026-06-24.json`; browser evidence is `evidence/live-proofs/human-automatch-ui-2026-06-24.json` and `evidence/live-proofs/human-automatch-ui-2026-06-24.png`.
- Tiny-wager H2H is proven on 0G Galileo in `evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json`: both Privy wallets funded, escrow-gated start passed, all seven moves were browser-clicked, and the winner settled escrow.
- Tournaments are out of active hackathon scope; active tournament routes are removed, v1 game packs set `supportsTournaments: false`, and the app retains only 1v1 games, agents, PR-based game submission, leaderboard, and explorer.
- Game submission is repository-first and PR-only, not an in-app upload flow. `evidence/live-proofs/game-submission-workflow-2026-06-24.json` proves the submit page, docs, PR template, Game Pack CI, tooling scripts, cover/logo assets, manifest hashes, and banned-pattern guard for every v1 pack.
- V1 games: Grid Four, Fleet Duel, Tile Race, World Cup Draft only.
- 0G Chain has a verified Galileo smoke proof on chain ID 16602 using the project operator wallet; the app and docs must show the deployed registries and transaction evidence truthfully.
- The completed browser wager room `gr-zqvy` is committed to the live Galileo `ArcadeMatchRegistry` at on-chain match ID `2`; evidence is `evidence/live-proofs/chain-actual-match-gr-zqvy.json`.
- 0G Storage readiness is verified and the completed wager room `gr-zqvy` replay is uploaded to reachable 0G Storage root `0xe22ca7771560aca78982bcc16d00c01683f28ffb9e8f18c7aaa01a2a9221c8c7`. 0G Compute was previously verified with `glm-5.1`, but the latest readiness rerun returned `insufficient_balance`, so live agent moves require router funding/reverification before claiming success.
- All four v1 game-pack uploads to 0G Storage are live-proven and reachable: Grid Four root `0x81a3504d17ba2fd003069e1c8f62a2b47d20d84618703750e59962e1a2f47e54`, Fleet Duel root `0x64764074cf9142a25147673e160f020dd1ce0d245445ae730d986b106d0289c0`, Tile Race root `0x3edfece3b2e45e10636fb00a4aa8d52b0480648b1c988b8f63c9eabeab4d41d2`, and World Cup Draft root `0x5f4709463db77e8f5133a0dec94d306261a836e5984f25e0021e2c2d7b852220`; default CI publish remains local fallback to avoid repeated storage writes.
- 0G Storage proof artifacts are live-proven at root `0x5e6b327f1ad200fd79ecd12aa1471ed7488d7a8da0b906a08aa9a1e41937da51`; the payload stores submission review receipt, share-card metadata, and non-sensitive fallback agent move transcript evidence.
- 0G DA is not live-published, but `pnpm 0g:da-candidate` now generates a deterministic unpublished batch candidate at `evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json`; batch hash `0x629572d9de53a9dd79dfbc68cb566f4dcf1c7f3c7b4a5a7c2ffaf2a10e3cf218` covers the two live wager match storage roots/chain commits, all four game-pack roots, and the proof-artifact bundle.
- D1 proof/leaderboard indexing is proven locally for completed rooms through `/api/proofs` and `/api/leaderboard`, including separated free/wager/game-wager mode tables.
- Fleet Duel, Tile Race, and World Cup Draft now run through the same Worker/Durable Object room runtime as Grid Four; `evidence/live-proofs/multigame-room-api-2026-06-24.json` proves human-vs-human and human-vs-agent fallback completion plus proof indexing for all three games.
- Non-Grid room UI is browser-proven for Fleet Duel, Tile Race, and World Cup Draft: `evidence/live-proofs/non-grid-room-ui-2026-06-24.json` plus per-game screenshots verify route game headers, shared room state, current player, and game-specific legal controls render from live Durable Object rooms.
- Qualified-agent picker UI is browser-proven for all four game detail pages: `evidence/live-proofs/agent-picker-all-games-2026-06-24.json` verifies seeded qualified agents and `Play selected 0G agent` render for Grid Four, Fleet Duel, Tile Race, and World Cup Draft.
- Qualified agent registration and human-vs-agent free room play are proven locally. `/api/rooms/:roomId/agent-move` now builds game-generic 0G Compute prompts with legal moves/player view, validates returned JSON moves through the active game adapter, and persists fallback proof metadata; live 0G Compute remains blocked by router `insufficient_balance`.
- Direct agent room joins now enforce D1 registration, qualified status, supported game, free/wager enablement, and max wager cap; proof is `evidence/live-proofs/agent-wager-policy-api-2026-06-24.json`.
- 0G Compute agent output parsing is unit-tested: valid JSON is accepted, malformed or invalid JSON shapes are rejected, confidence is clamped, and illegal mocked Compute moves fall back to deterministic legal moves.
- Wager negative cases are proven locally and in Foundry: unfunded start, unfunded pre-start move bypass, pre-start cancel, wrong-turn, illegal move, duplicate move after finish, zero-value wager, and double-settle rejection.
- Production target: Cloudflare Workers static assets plus Worker API at `https://0g-arcade-arena.gabrielaxy.workers.dev`, with D1/KV/R2/Durable Object bindings.

## Open
- Proof/explorer UI ingests D1 proof rows and the live 0G Storage replay root; future match uploads should move from static evidence constants to automatic per-match uploads.
- Real human-vs-agent 0G Compute move selection is wired but not yet live-proven in Arcade; Worker secret binding is proven locally, and router funding is needed before claiming `computeMode=0g-compute`.
- Live 0G DA publication remains unconfigured; the current DA deliverable is a deterministic candidate payload/hash only.
- Production Privy auth on the Workers URL may require adding `https://0g-arcade-arena.gabrielaxy.workers.dev` as an allowed origin in the Privy Testing app; localhost auth is verified.

## Out Of Scope
- Mainnet real-money wagering.
- Full secure Agentic ID re-encryption claims.
- More than four games in v1.
- Tournaments for the current hackathon build.

## Done When
- App routes, game packs, validators, contracts, tests, build, simulations, proof/share flows, and visual QA evidence satisfy the pasted brief.
