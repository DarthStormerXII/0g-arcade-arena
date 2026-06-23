# Real E2E Gap Map

Date: 2026-06-23

This file tracks the current implementation against the real localhost-first end-to-end target:
human-vs-human free/wager, human-vs-agent free/wager, real 0G Chain, real 0G Storage, real
0G Compute, proof/explorer evidence, and leaderboard updates.

## Verified Now

| Area | Evidence | Status |
| --- | --- | --- |
| 0G Chain readiness | `pnpm 0g:readiness`, `evidence/live-proofs/0g-readiness-latest.json` | Chain ID `16602` verified |
| 0G Compute readiness | `pnpm 0g:readiness` | Previously verified for `glm-5.1`; latest readiness run returned compute unavailable with router `insufficient_balance` while chain/storage remained reachable |
| 0G Storage readiness | `pnpm 0g:readiness` | Credentials and indexer endpoint verified |
| Local H2H Grid Four API | `evidence/live-proofs/h2h-grid-four-local-api-2026-06-23.json` | Durable Object room create/join/start/move/result verified on `http://localhost:3021` |
| Local non-Grid room APIs | `evidence/live-proofs/multigame-room-api-2026-06-24.json` | Fleet Duel, Tile Race, and World Cup Draft each finish human-vs-human and human-vs-agent rooms through `/api/rooms`, `/move`, `/agent-move`, `/api/proofs`, and D1 indexing |
| Local H2H Grid Four UI smoke | `evidence/live-proofs/h2h-grid-four-ui-smoke-2026-06-23.json` | Match page reads the room API and applies a browser move to Durable Object state |
| Two-Privy-user H2H Grid Four | `evidence/live-proofs/two-privy-h2h-grid-four-2026-06-23.json` | Both test accounts logged in, created/joined/started, alternated moves, and finished a free match |
| Two-Privy-user tiny wager H2H | `evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json` | Both Privy wallets funded `0.0001 0G`, Worker start was escrow-gated, all moves were browser-clicked, and winner settlement mined on Galileo |
| 0G Storage room replay upload | `evidence/live-proofs/0g-storage-room-gr-zqvy.json` | Completed wager replay uploaded to 0G Storage; root is reachable |
| 0G Storage game-pack upload | `evidence/live-proofs/0g-storage-game-pack-grid-four.json` | Grid Four game pack uploaded to 0G Storage; root is reachable |
| Actual match chain result commit | `evidence/live-proofs/chain-actual-match-gr-zqvy.json` | Completed browser wager room `gr-zqvy` committed result hash, replay payload hash, and 0G Storage URI to live Galileo `ArcadeMatchRegistry` match ID `2` |
| D1 proof/leaderboard APIs | `evidence/live-proofs/d1-proof-leaderboard-api-2026-06-23.json`, `evidence/live-proofs/wager-leaderboard-api-2026-06-24.json` | Completed free room wrote `/api/proofs` and global/game/free leaderboard rows; tiny escrow-backed wager room wrote global/game/wager/game-wager rows |
| Qualified agent room API | `evidence/live-proofs/agent-registry-room-api-2026-06-23.json` | D1 registered qualified Grid Four agent joined a room, moved through `/agent-move`, and indexed leaderboard rows |
| Agent wager join policy | `evidence/live-proofs/agent-wager-policy-api-2026-06-24.json` | Direct room joins enforce registration, qualified status, supported game, free/wager enablement, and max wager cap |
| Router-bound agent Compute attempt | `evidence/live-proofs/agent-compute-router-bound-api-2026-06-24.json` | Local Wrangler loaded project-only router env, `/agent-move` reached 0G Router, and fallback persisted the real `Insufficient balance` blocker |
| Malformed Compute output defense | `worker/agent-move-output.test.ts`, `worker/agent-move-choice.test.ts` | Fenced/embedded JSON is parsed, confidence is clamped, missing JSON/non-integer columns are rejected, and malformed/illegal mocked Compute moves fall back to legal deterministic moves |
| Wager negative API and contract tests | `evidence/live-proofs/wager-negative-api-2026-06-24.json`, `forge test` | Unfunded start, room cancel, wrong turn, illegal move, duplicate move after finish, zero wager, and double-settle rejection are proven |
| Existing route/build gate | `pnpm audit:check`, `pnpm test`, `pnpm typecheck` | Passing |
| Static proof artifacts | `public/proofs/match-*-receipt-*.json` | Generated fallback receipts |
| Contract unit tests | `pnpm test:contracts` / `forge test` | Existing tests cover registry/wager basics |

## Product Scope Decisions

| Decision | Current State | Required Work |
| --- | --- | --- |
| Tournaments out of active hackathon scope | Active routes removed; v1 manifests now set `supportsTournaments: false`; contracts/schema retain future capability only | Keep audit enforcing 1v1 scope |
| Game submission by PR, not UI upload | `/submit-game` now presents PR workflow, validator commands, and maintainer approval language | Add real PR/E2E documentation evidence to final audit |
| Agent play uses qualified agent selection | Game page has a direct `Find 0G agent match` CTA | Add qualified agent list and choose-agent flow |
| Human play supports auto-match and room code | Worker supports room-code lifecycle and `/api/matchmaking/human` pairs compatible human players by game/wager | Browser visual pass for the auto-match CTA remains separate from API evidence |

## Missing For Human-vs-Human Free

| Requirement | Current State | Evidence Needed |
| --- | --- | --- |
| Two authenticated browser users | Proven on localhost | Wallets: `0x23761115c5f38ca51f0d425d00DE6E34029239EC`, `0xD5F264Ee35815Af73510150302cc52FE686E5f81` |
| Real room creation | Proven from account A browser UI | `POST /api/rooms` via create room UI |
| Real joining by code | Proven from account B browser UI | `POST /api/rooms/:roomId/join` via room UI |
| Legal turn enforcement | Proven on local Worker API | Browser UI disables non-current moves; API rejects wrong-player moves |
| Shared state | Proven through two authenticated browser contexts and Durable Object state | Polling UI observed final state; evidence screenshots saved |
| Terminal result | Proven with replay/result hash | Room `gr-9rzz`, replay hash `0xd7e80012`, result hash `0xe7bf6f52` |
| Auto-match queue | Implemented through `/api/matchmaking/human`; second compatible free player starts the match automatically | `evidence/live-proofs/human-automatch-api-2026-06-24.json` |

## Missing For Human-vs-Human Wager

| Requirement | Current State | Evidence Needed |
| --- | --- | --- |
| Tiny wager amount | UI carries `wager=0.0001` style query only | Contract escrow created with around `0.0001 0G` |
| Both users funded | Proven on Galileo | Fund txs `0x3a55b331738e9670c662d5641247e95a824554a7c35c7215b5a31b990b0de0a5` and `0x3d6096c90e185117568f5c5e5392a708068b241285ec2adc12969442095b01cd` |
| Escrow funding/join | Proven with browser-wallet funding and Worker start gate | `eth_call escrowed(matchId)` reached `200000000000000` wei before start; unfunded start now returns 409 |
| Settlement | Proven on Galileo by winning Privy wallet | Settlement tx `0xe34b656a4541a38d18ea6943cb5c9c8a1d250a6990c14446a276701bbf664969`; escrow returned to `0` |
| Failure handling | Proven for current v1 controls | Unfunded start, unfunded pre-start move bypass, pre-start cancel, wrong-turn, illegal move, duplicate move after finish, zero-value wager, and double-settle rejection are covered |
| Completely browser-only move loop | Proven after rebuilt server and no-reload polling strategy | Room `gr-zqvy` completed all seven moves through two authenticated browser contexts |

## Missing For Human-vs-Agent Free/Wager

| Requirement | Current State | Evidence Needed |
| --- | --- | --- |
| Agent registry | D1-backed `/api/agents` implemented | Evidence proves registration, qualified listing, per-wager filtering, and server-side direct-join enforcement |
| Qualified agent list | Game detail fetches API-qualified agents for selected game/wager mode | Browser proof now verifies the Grid Four qualified-agent picker and selected-agent CTA in `evidence/live-proofs/browser-proof-surfaces-2026-06-24.json` |
| Agent skill package | Project-level skill package now covers platform API, registration, all four v1 games, examples, and wager safety | `docs/agent-skills/0g-arcade-player/*`, `pnpm agent:skill-check`, `evidence/live-proofs/agent-skill-package-2026-06-24.json` |
| Human-vs-agent wager | Proven with deterministic fallback Compute while router balance is blocked | `evidence/live-proofs/agent-wager-match-api-2026-06-24.json` proves qualified agent registration/listing, tiny escrow funding, `/agent-move`, fallback disclosure, proof indexing, live Galileo settlement, and wager leaderboard rows; `0g-storage-room-h2a-wager-mqr1xs1b.json` and `chain-actual-match-h2a-wager-mqr1xs1b.json` prove its replay root and result were committed to 0G Storage/Chain |
| Live 0G Compute move | Worker `/api/rooms/:roomId/agent-move` now attempts 0G Router when `ZEROG_ROUTER_API_KEY` is bound, validates returned JSON against legal moves, and stores proof metadata; local binding and router-balance failure are proven | Fund router and rerun human-vs-agent free/wager matches with `computeMode=0g-compute` |
| Illegal/malformed output defense | Unit-tested for malformed JSON and illegal mocked Compute moves | Timeout/network fallback remains covered by catch-all fallback behavior; live timeout evidence can be added after router funding |
| Agent wager limits | Server-enforced in Worker join path | `pnpm agent:wager-policy-check` proves rejections for unregistered, pending, unsupported, mode-disabled, and over-cap agents, plus allowed free and capped-wager joins |

## Completed For Non-Grid Games

| Requirement | Current State | Evidence Needed |
| --- | --- | --- |
| Fleet Duel room API | Proven locally for human and fallback-agent rooms | `evidence/live-proofs/multigame-room-api-2026-06-24.json` |
| Tile Race room API | Proven locally for human and fallback-agent rooms | `evidence/live-proofs/multigame-room-api-2026-06-24.json` |
| World Cup Draft room API | Proven locally for human and fallback-agent rooms | `evidence/live-proofs/multigame-room-api-2026-06-24.json` |
| Agent fallback disclosure | Proven for non-Grid agent rooms | The proof checks every `/agent-move` result returns `computeMode: deterministic-fallback`; live 0G Compute prompts remain Grid Four-only until router funding and per-game prompts are expanded |

## Missing For 0G Storage and Proofs

| Requirement | Current State | Evidence Needed |
| --- | --- | --- |
| Match replay upload | Proven for browser-only H2H wager and H2A wager matches | Room `gr-zqvy` uploaded to 0G Storage root `0xe22ca7771560aca78982bcc16d00c01683f28ffb9e8f18c7aaa01a2a9221c8c7`; H2A room `h2a-wager-mqr1xs1b` uploaded to root `0x3df0db7d73b6a2833281daa275a55dc925ebf3c3fd6b6f092e68d6260bb93b17` |
| Game pack upload | Proven for Grid Four only | Grid Four uploaded to root `0x81a3504d17ba2fd003069e1c8f62a2b47d20d84618703750e59962e1a2f47e54`; upload remaining packs only if needed to conserve testnet funds |
| Storage root verification | Proven for room replay upload | `evidence/live-proofs/0g-storage-room-gr-zqvy.json` has `reachable: true` |
| Chain result commit | Proven for browser-only H2H wager and H2A wager matches | `chain-actual-match-gr-zqvy.json` records on-chain match ID `2`; `chain-actual-match-h2a-wager-mqr1xs1b.json` records on-chain match ID `3`, create tx `0x5d99c30d044d85bfe52a73bb00a7e840b49d880a75b84ec992c683cf5e86b015`, and commit tx `0xfae0aca97afb3338e60daafc854666bd1801b952782192c657971eed31a3da2e` |
| Proof page | Shows local fallback receipts plus live proof panel for indexed/static 0G Storage and actual chain commit proofs | Replace remaining fallback fields only as each additional match type is uploaded/committed |
| Explorer | Shows live smoke, static receipts, D1 proofs, 0G Storage replay root, and the actual `gr-zqvy` chain commit tx | Browser proof verifies the Explorer contracts, storage/compute labels, and live match proof panels |

## Missing For Leaderboards

| Requirement | Current State | Evidence Needed |
| --- | --- | --- |
| Global leaderboard | Proven locally | Free and tiny-wager completed rooms update the global table |
| Per-game leaderboard | Proven locally | Grid Four free and wager completions update the per-game table |
| Free leaderboard | Proven locally | Completed free H2H and H2A matches update the free table |
| Wager leaderboard | Proven locally | `evidence/live-proofs/wager-leaderboard-api-2026-06-24.json` proves wager and game-wager tables are separated from free mode |
| Human + agent entries | Proven locally for fallback H2A | Privy wager users and selected agent should be re-proven after live Compute/wager agent runs |

## Next Implementation Order

1. Fund/fix the 0G Router balance and re-run `/agent-move` until proof rows show `computeMode=0g-compute`.
2. Add production-origin Privy auth proof when the hosted URL is configured.

## Completed During Current Execution

- Arcade-only live 0G env copied from ScribeZero into `~/.codex/secrets/0g-arcade-arena/0g-live.env`.
- Redacted readiness verifier added as `pnpm 0g:readiness`.
- `evidence/live-proofs/0g-readiness-latest.json` proves Galileo chain readiness and storage endpoint/config readiness; the latest Compute probe reaches the router but returns `insufficient_balance`.
- `scripts/audit-check.mjs` now requires live 0G readiness evidence.
- `/submit-game` now presents PR-based game submission instead of in-app upload/publish controls.
- Tournament routes are removed from active app scope and v1 game packs now declare `supportsTournaments: false`; contracts/schema keep future tournament capability only.
- `cloudflare/schema.sql` now includes agent qualification fields, match state fields, moves, match proofs, and leaderboard entries.
- Worker/Durable Object room runtime now creates, joins, starts, validates, and completes real Grid Four H2H rooms.
- `CI=true pnpm test` passes with 7 test files / 8 tests, including the room runtime.
- `CI=true pnpm typecheck`, `CI=true pnpm build`, and `pnpm exec wrangler deploy --dry-run --outdir /tmp/0g-arcade-worker-dry-run` pass.
- `http://localhost:3021` local Worker API completed a tiny-wager H2H Grid Four match and wrote `evidence/live-proofs/h2h-grid-four-local-api-2026-06-23.json`.
- Headless Chrome opened the rebuilt match UI, clicked a Grid Four column, and verified Durable Object state advanced to the other player; evidence in `evidence/live-proofs/h2h-grid-four-ui-smoke-2026-06-23.json`.
- Two authenticated Privy browser contexts completed a full Grid Four H2H free match; evidence in `evidence/live-proofs/two-privy-h2h-grid-four-2026-06-23.json`.
- Tiny-wager H2H now has full browser-only real Galileo proof: both Privy wallets funded `0.0001 0G`, the Worker rejected unfunded starts, all seven moves were clicked in two browser contexts, the match result finished with replay hash `0x589c7a3b`, and the winner settled escrow in tx `0xe34b656a4541a38d18ea6943cb5c9c8a1d250a6990c14446a276701bbf664969`. Evidence is `evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json`.
- Completed wager replay `gr-zqvy` uploaded to 0G Storage with reachable root `0xe22ca7771560aca78982bcc16d00c01683f28ffb9e8f18c7aaa01a2a9221c8c7` and tx `0xc94541253faea6fe444ca4543aec8c553f1b909c84edfc3ee587957d54a5251d`; evidence is `evidence/live-proofs/0g-storage-room-gr-zqvy.json`.
- Completed wager room `gr-zqvy` committed to the live Galileo `ArcadeMatchRegistry` at on-chain match ID `2`; create tx `0xa596e5fe185dbb1d2dcd5acedce2b861fcce416b5c4723ad76128d8116611701`, commit tx `0xe415c99906bb498d64e7ad147680a27d007993bea9f2ef7bb7c1432fa48738d3`, evidence `evidence/live-proofs/chain-actual-match-gr-zqvy.json`.
- Grid Four game pack uploaded to 0G Storage with reachable root `0x81a3504d17ba2fd003069e1c8f62a2b47d20d84618703750e59962e1a2f47e54` and tx `0x296d52cdfb06a881d2fb7afbe3c6fc81c48559de6e044b751da91977b5c700bc`; evidence is `evidence/live-proofs/0g-storage-game-pack-grid-four.json`.
- D1 proof and leaderboard indexing is proven by `evidence/live-proofs/d1-proof-leaderboard-api-2026-06-23.json`; wager-mode separation is proven by `evidence/live-proofs/wager-leaderboard-api-2026-06-24.json`.
- Qualified agent registration, listing, server-side fallback move, proof indexing, and agent leaderboard entry are proven by `evidence/live-proofs/agent-registry-room-api-2026-06-23.json`.
- Direct agent room joins now enforce registration, qualified status, supported game, free/wager enablement, and max wager cap; evidence is `evidence/live-proofs/agent-wager-policy-api-2026-06-24.json`.
- Human-vs-agent tiny wager match is proven by `evidence/live-proofs/agent-wager-match-api-2026-06-24.json`: both escrow sides funded, `/agent-move` executed three turns with fallback `Insufficient balance` metadata, the finished room was indexed in proofs/leaderboards, and settlement mined on Galileo.
- H2A wager replay `h2a-wager-mqr1xs1b` was uploaded to 0G Storage root `0x3df0db7d73b6a2833281daa275a55dc925ebf3c3fd6b6f092e68d6260bb93b17` and committed to live Galileo MatchRegistry on-chain match ID `3`.
- The project-level external agent skill package now includes registration, API, all four v1 game guides, wager policy, and examples; `pnpm agent:skill-check` writes `evidence/live-proofs/agent-skill-package-2026-06-24.json`.
- Human auto-match is implemented through `/api/matchmaking/human`; evidence `evidence/live-proofs/human-automatch-api-2026-06-24.json` proves free players pair into the same room and auto-start, while tiny-wager players pair into a ready room that still requires escrow funding before start.
- Fleet Duel, Tile Race, and World Cup Draft now run through the same Worker/Durable Object room APIs as Grid Four. `evidence/live-proofs/multigame-room-api-2026-06-24.json` proves human-vs-human and human-vs-agent fallback completion plus proof indexing for all three games.
- In-app Browser proof for Grid Four qualified-agent selection, leaderboard sections, Explorer panels, and proof receipt panels is saved in `evidence/live-proofs/browser-proof-surfaces-2026-06-24.json` with four route screenshots.
- 0G Compute move parsing is extracted and unit-tested. Malformed JSON, non-integer columns, illegal mocked Compute moves, and confidence clamping now fall back or normalize before deterministic rules apply.
- Wager negative cases are proven by `evidence/live-proofs/wager-negative-api-2026-06-24.json` and Foundry's zero-wager/double-settle tests.
- The wager escrow gate now also covers the pre-start `/move` path; `evidence/live-proofs/wager-start-gate-api-2026-06-24.json` proves an unfunded wager room stays `ready` and cannot auto-start through a move request.
- Local Wrangler now binds project-only 0G router env through ignored `.dev.vars`; `/agent-move` reaches the router and records the real `Insufficient balance` blocker in `evidence/live-proofs/agent-compute-router-bound-api-2026-06-24.json`.
