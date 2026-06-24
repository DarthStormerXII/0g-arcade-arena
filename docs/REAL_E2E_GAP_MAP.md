# Real E2E Gap Map

Date: 2026-06-23

This file tracks the current implementation against the real localhost-first end-to-end target:
human-vs-human free/wager, human-vs-agent free/wager, real 0G Chain, real 0G Storage, real
0G Compute, proof/explorer evidence, and leaderboard updates.

## Verified Now

| Area | Evidence | Status |
| --- | --- | --- |
| 0G Chain readiness | `pnpm 0g:readiness`, `evidence/live-proofs/0g-readiness-latest.json` | Chain ID `16602` verified |
| 0G Compute readiness | `pnpm 0g:readiness`, `evidence/live-proofs/0g-readiness-latest.json` | Live on the 0G testnet Router: chain/storage target Galileo testnet, router host is `router-api-testnet.integratenetwork.work`, model `qwen2.5-omni`, and the chat probe succeeds |
| Direct 0G Compute broker discovery | `pnpm 0g:compute-broker-diagnostic`, `evidence/live-proofs/0g-compute-broker-diagnostic-2026-06-24.json` | SDK installed, Galileo broker initializes, two providers are listed, preferred provider metadata resolves, and the only current direct-broker blocker is that the project wallet balance is below the `3` 0G ledger minimum |
| Guarded direct broker agent-move harness | `pnpm 0g:direct-broker-agent-move`, `evidence/live-proofs/direct-broker-agent-move-2026-06-24.json` | Non-autofund run initializes broker/provider discovery and stops before ledger mutation; after funding, `OG_COMPUTE_BROKER_AUTOFUND=1` will create/read the ledger, request a legal Grid Four move from the provider, submit it through the room API, complete the room, and verify the proof index records `computeMode=0g-compute` |
| Direct broker live pipeline | `pnpm 0g:direct-broker-live-pipeline`, `evidence/live-proofs/direct-broker-live-pipeline-2026-06-24.json` | Safe non-autofund run executes the diagnostic and guarded match verifier, then skips Storage/Chain because the ledger is not ready; after funding, `OG_COMPUTE_BROKER_AUTOFUND=1 pnpm 0g:direct-broker-live-pipeline` will run broker Compute, upload the completed replay to 0G Storage, and commit the free match result to Galileo |
| Broker-backed replay upload/chain commit path | `scripts/upload-room-replay-0g.mjs`, `scripts/commit-live-match-result.mjs` | Replay uploads now include compute proof metadata, and chain commits can use direct-broker free-match evidence with `wagered=false` instead of assuming every actual match commit is a wager |
| Router-backed Compute match | `pnpm 0g:router-compute-agent-match`, `evidence/live-proofs/router-compute-agent-match-2026-06-24.json` | Free Grid Four human-vs-agent room `router-compute-mqrwdmmf` used 0G testnet Router provider `0xa48f01287233509FD694a22Bf840225062E67836` for a legal agent move, finished the room, and indexed `computeMode=0g-compute` |
| Router-backed replay upload and chain commit | `evidence/live-proofs/0g-storage-room-router-compute-mqrwdmmf.json`, `evidence/live-proofs/chain-actual-match-router-compute-mqrwdmmf.json` | The live Compute room replay is reachable on 0G Storage root `0xa27dceac2040f491db0993daa24e3823b247e7b666c1e1e7877f6031faa9e3de` and committed to Galileo `ArcadeMatchRegistry` on-chain match ID `4` with `computeMode=0g-compute` |
| Router-backed H2A wager replay upload and chain commit | `evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json`, `evidence/live-proofs/0g-storage-room-h2a-router-wager-mqs1kt45.json`, `evidence/live-proofs/chain-actual-match-h2a-router-wager-mqs1kt45.json` | The live Router Compute tiny-wager room replay is reachable on 0G Storage root `0x7aeac238a3e6493e61c9c8bce13988bd9885dbb59954036c8c14943b31daf5a8` and committed to Galileo `ArcadeMatchRegistry` on-chain match ID `9` with `wagered=true` and `computeMode=0g-compute` |
| Non-Grid Router replay upload and chain commit | `evidence/live-proofs/0g-storage-room-mgr-fleet-duel-mqrxg2lh.json`, `evidence/live-proofs/chain-actual-match-mgr-fleet-duel-mqrxg2lh.json`, Tile Race and World Cup Draft sibling evidence | Fleet Duel, Tile Race, and World Cup Draft live Router Compute replays are reachable on 0G Storage and committed to Galileo `ArcadeMatchRegistry` on-chain match IDs `6`, `7`, and `8` with `computeMode=0g-compute` |
| 0G Storage readiness | `pnpm 0g:readiness` | Credentials and indexer endpoint verified |
| Local H2H Grid Four API | `evidence/live-proofs/h2h-grid-four-local-api-2026-06-23.json` | Durable Object room create/join/start/move/result verified on `http://localhost:3021` |
| Local non-Grid room APIs | `evidence/live-proofs/multigame-room-api-2026-06-24.json` | Fleet Duel, Tile Race, and World Cup Draft each finish human-vs-human and human-vs-agent rooms through `/api/rooms`, `/move`, `/agent-move`, `/api/proofs`, and D1 indexing |
| Non-Grid live Router Compute | `evidence/live-proofs/multigame-router-compute-api-2026-06-24.json` | Fleet Duel, Tile Race, and World Cup Draft each receive one non-fallback 0G Router-selected legal agent move, finish the room, and index `computeMode=0g-compute` |
| All-game H2H browser lifecycle | `pnpm h2h:all-game-browser-check`, `evidence/live-proofs/all-game-h2h-browser-2026-06-24.json` | Grid Four, Fleet Duel, Tile Race, and World Cup Draft each create, join, start, browser-click legal moves to terminal state, index proof records, and save host/guest screenshots from two isolated browser contexts |
| Full localhost E2E command | `pnpm e2e:local`, `evidence/live-proofs/e2e-local-gate-2026-06-24.json` | Reruns product/start/all-game-H2H/automatch/multigame/agent/submission proof lane on localhost |
| Full live 0G E2E command | `pnpm e2e:live-0g`, `evidence/live-proofs/e2e-live-0g-gate-2026-06-24.json` | Refreshes 0G readiness and verifies authenticated H2H, H2H wager, H2A free/wager Router Compute, Storage/Chain carry-through, leaderboards, Explorer/proof surfaces, and DA candidate truth boundary without spending unless explicitly requested |
| Local non-Grid room UI | `evidence/live-proofs/non-grid-room-ui-2026-06-24.json` | Real Fleet Duel, Tile Race, and World Cup Draft rooms render route game headers, shared-room state, current player, and game-specific legal move controls in the browser |
| Local H2H Grid Four UI smoke | `evidence/live-proofs/h2h-grid-four-ui-smoke-2026-06-23.json` | Match page reads the room API and applies a browser move to Durable Object state |
| Two-Privy-user H2H Grid Four | `evidence/live-proofs/two-privy-h2h-grid-four-2026-06-23.json` | Both test accounts logged in, created/joined/started, alternated moves, and finished a free match |
| Two-Privy-user tiny wager H2H | `evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json` | Both Privy wallets funded `0.0001 0G`, Worker start was escrow-gated, all moves were browser-clicked, and winner settlement mined on Galileo |
| 0G Storage room replay upload | `evidence/live-proofs/0g-storage-room-gr-zqvy.json` | Completed wager replay uploaded to 0G Storage; root is reachable |
| 0G Storage game-pack uploads | `evidence/live-proofs/0g-storage-game-pack-*.json` | All four v1 game packs are uploaded to 0G Storage with reachable roots |
| 0G Storage proof artifact bundle | `evidence/live-proofs/0g-storage-proof-artifacts-2026-06-24.json` | Submission review receipt, share-card metadata, and non-sensitive agent reasoning transcript are bundled in one reachable 0G Storage payload |
| 0G DA batch candidate | `evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json` | Deterministic unpublished batch hash covers seven live committed match replay roots, all four game-pack roots, and proof-artifact bundle |
| 0G DA readiness | `evidence/live-proofs/0g-da-readiness-2026-06-24.json` | Blocked with explicit evidence: no project-local DA Client/Disperser/Encoder/Retriever config is present, and the current artifact remains candidate-only |
| 0G DA publication harness | `evidence/live-proofs/0g-da-publication-2026-06-24.json` | Prepared and blocked before submission: canonical candidate hash verifies, self-contained Node HTTP/2 gRPC client and Disperser proto are present, and the current missing config is `ZEROG_DA_DISPERSER_GRPC` plus `ZEROG_DA_ENTRANCE_CONTRACT` |
| Actual match chain result commit | `evidence/live-proofs/chain-actual-match-gr-zqvy.json` | Completed browser wager room `gr-zqvy` committed result hash, replay payload hash, and 0G Storage URI to live Galileo `ArcadeMatchRegistry` match ID `2` |
| D1 proof/leaderboard APIs | `evidence/live-proofs/d1-proof-leaderboard-api-2026-06-23.json`, `evidence/live-proofs/wager-leaderboard-api-2026-06-24.json` | Completed free room wrote `/api/proofs` and global/game/free leaderboard rows; tiny escrow-backed wager room wrote global/game/wager/game-wager rows |
| Qualified agent room API | `evidence/live-proofs/agent-registry-room-api-2026-06-23.json` | D1 registered qualified Grid Four agent joined a room, moved through `/agent-move`, and indexed leaderboard rows |
| Agent wager join policy | `evidence/live-proofs/agent-wager-policy-api-2026-06-24.json` | Direct room joins enforce registration, qualified status, supported game, free/wager enablement, and max wager cap |
| All-game agent picker UI | `evidence/live-proofs/agent-picker-all-games-2026-06-24.json` | Grid Four, Fleet Duel, Tile Race, and World Cup Draft each render a qualified agent and selected-agent CTA in the browser |
| Product-first home flow | `pnpm home:product-flow-check`, `evidence/live-proofs/home-product-flow-2026-06-24.json` | Home now presents the featured game and live match setup controls directly, verifies human room-code, testnet wager, and agent controls in the browser, and keeps 0G contracts/proofs/storage/compute details in `/explorer` instead of the first-screen CTA area |
| Home CTA start actions | `pnpm home:start-actions-check`, `evidence/live-proofs/home-start-actions-2026-06-24.json` | Browser proof clicks the home human room-code CTA into a live Worker-backed `/room/:code`, clicks the selected-agent free CTA into an active `/match/:matchId`, then verifies tiny-wager human and selected-agent flows stop on escrow room screens before match start |
| All-game detail start actions | `pnpm game-detail:start-actions-check`, `evidence/live-proofs/game-detail-start-actions-2026-06-24.json` | Browser proof opens Grid Four, Fleet Duel, Tile Race, and World Cup Draft detail pages, verifies cover/logo art, creates a live free human room-code room, then starts a free selected-agent match for the same game |
| PR-based game submission workflow | `evidence/live-proofs/game-submission-workflow-2026-06-24.json` | `/submit-game` is pull-request-only, docs/template/workflow/tooling are present, every v1 pack has cover/logo assets and matching hashes, and no game pack contains banned secret/network/RCE patterns |
| Router-bound agent Compute | `evidence/live-proofs/router-compute-agent-match-2026-06-24.json` | Local Wrangler loaded project-only testnet Router env, `/agent-move` reached 0G Router, selected a legal move, and persisted `computeMode=0g-compute` |
| Sarvam fallback when Router fails | `pnpm agent:sarvam-fallback-check`, `evidence/live-proofs/sarvam-fallback-agent-move-2026-06-25.json` | Forced local Router network failure proves `/agent-move` keeps the room alive with `computeMode=sarvam-fallback`, provider `sarvam`, and exact primary 0G error disclosure in the persisted compute proof |
| External direct-broker proof ingestion | `evidence/live-proofs/external-compute-proof-api-2026-06-24.json` | Local API accepts direct-broker-shaped `0g-compute` metadata only on agent moves, persists it into the room/proof index, and rejects human-supplied Compute proof |
| Malformed Compute output defense | `worker/agent-move-output.test.ts`, `worker/agent-move-choice.test.ts` | Fenced/embedded JSON is parsed, confidence is clamped, missing JSON/invalid JSON shapes are rejected, and malformed/illegal mocked Compute moves fall back to legal deterministic moves |
| Wager negative API and contract tests | `evidence/live-proofs/wager-negative-api-2026-06-24.json`, `forge test` | Unfunded start, room cancel, wrong turn, illegal move, duplicate move after finish, zero wager, and double-settle rejection are proven |
| Existing route/build gate | `pnpm audit:check`, `pnpm test`, `pnpm typecheck` | Passing |
| Static proof artifacts | `public/proofs/match-*-receipt-*.json` | Generated fallback receipts |
| Contract unit tests | `pnpm test:contracts` / `forge test` | Existing tests cover registry/wager basics |

## Product Scope Decisions

| Decision | Current State | Required Work |
| --- | --- | --- |
| Tournaments out of active hackathon scope | Active routes removed; v1 manifests now set `supportsTournaments: false`; contracts/schema retain future capability only | Keep audit enforcing 1v1 scope |
| Game submission by PR, not UI upload | `/submit-game` now presents PR workflow, validator commands, and maintainer approval language | Proven by `evidence/live-proofs/game-submission-workflow-2026-06-24.json`; keep audit enforcing PR-only workflow |
| Agent play uses qualified agent selection | Game detail fetches API-qualified agents for the selected game/wager mode, renders a picker, and starts the room with the selected qualified agent; browser proof covers all four game pages; API proof now includes a live Router Compute agent move | Re-prove on hosted production after deployment/auth is fixed |
| Human play supports auto-match and room code | Worker supports room-code lifecycle and `/api/matchmaking/human` pairs compatible human players by game/wager; browser proof verifies the auto-match CTA reaches an active shared-room match | Re-prove on production origin after Privy allowed origin is configured and the Workers bundle is redeployed |

## Proven For Human-vs-Human Free

| Requirement | Current State | Evidence Needed |
| --- | --- | --- |
| Two authenticated browser users | Proven on localhost | Wallets: `0x23761115c5f38ca51f0d425d00DE6E34029239EC`, `0xD5F264Ee35815Af73510150302cc52FE686E5f81` |
| Real room creation | Proven from account A browser UI | `POST /api/rooms` via create room UI |
| Real joining by code | Proven from account B browser UI | `POST /api/rooms/:roomId/join` via room UI |
| Legal turn enforcement | Proven on local Worker API | Browser UI disables non-current moves; API rejects wrong-player moves |
| Shared state | Proven through two authenticated browser contexts and Durable Object state | Polling UI observed final state; evidence screenshots saved |
| Terminal result | Proven with replay/result hash | Room `gr-9rzz`, replay hash `0xd7e80012`, result hash `0xe7bf6f52` |
| Auto-match queue | Implemented through `/api/matchmaking/human`; second compatible free player starts the match automatically | `evidence/live-proofs/human-automatch-api-2026-06-24.json` |
| All four v1 games from browser UI | Proven locally with two isolated guest browser contexts | `evidence/live-proofs/all-game-h2h-browser-2026-06-24.json`; per-game host/guest screenshots under `evidence/live-proofs/all-game-h2h-*-finished-2026-06-24.png` |

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
| Agent PFP/avatar contract | Proven locally | `evidence/live-proofs/agent-avatar-api-2026-06-24.json` proves explicit `avatarUrl` persistence and generated SVG fallback PFPs through registration, profile fetch, and qualified listing |
| Qualified agent list | Game detail fetches API-qualified agents for selected game/wager mode | Browser proof verifies qualified-agent picker and selected-agent CTA for all four games in `evidence/live-proofs/agent-picker-all-games-2026-06-24.json` |
| Agent skill package | Project-level skill package now covers platform API, registration, all four v1 games, examples, and wager safety | `docs/agent-skills/0g-arcade-player/*`, `pnpm agent:skill-check`, `evidence/live-proofs/agent-skill-package-2026-06-24.json` |
| Human-vs-agent wager | Proven with live 0G testnet Router Compute | `evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json` proves qualified agent registration/listing, tiny escrow funding, non-fallback `0g-compute` `/agent-move` calls, proof indexing, live Galileo settlement, and wager leaderboard rows for the actual winner/loser pair; `0g-storage-room-h2a-router-wager-mqs1kt45.json` and `chain-actual-match-h2a-router-wager-mqs1kt45.json` prove its replay root and result were committed to 0G Storage/Chain. Historical fallback wager evidence remains in `agent-wager-match-api-2026-06-24.json` |
| Live 0G Compute move | Proven locally through 0G testnet Router for Grid Four free/wager and all non-Grid v1 games | `evidence/live-proofs/router-compute-agent-match-2026-06-24.json` proves a legal free Grid Four Router-selected agent move; `evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json` proves three non-fallback Grid Four wager Router-selected moves; `evidence/live-proofs/multigame-router-compute-api-2026-06-24.json` proves one non-fallback Router-selected legal move each for Fleet Duel, Tile Race, and World Cup Draft |
| Illegal/malformed output defense | Unit-tested for malformed JSON and illegal mocked Compute moves | Timeout/network fallback remains covered by catch-all fallback behavior; live timeout evidence can be added separately if needed |
| Agent wager limits | Server-enforced in Worker join path | `pnpm agent:wager-policy-check` proves rejections for unregistered, pending, unsupported, mode-disabled, and over-cap agents, plus allowed free and capped-wager joins |

## Completed For Non-Grid Games

| Requirement | Current State | Evidence Needed |
| --- | --- | --- |
| Fleet Duel room API | Proven locally for human and agent rooms | `evidence/live-proofs/multigame-room-api-2026-06-24.json`; agent proofs disclose `deterministic-fallback` or live `0g-compute` |
| Fleet Duel room UI | Proven locally in browser | `evidence/live-proofs/non-grid-room-ui-2026-06-24.json` and `non-grid-room-ui-fleet-duel-2026-06-24.png` |
| Tile Race room API | Proven locally for human and agent rooms | `evidence/live-proofs/multigame-room-api-2026-06-24.json`; agent proofs disclose `deterministic-fallback` or live `0g-compute` |
| Tile Race room UI | Proven locally in browser | `evidence/live-proofs/non-grid-room-ui-2026-06-24.json` and `non-grid-room-ui-tile-race-2026-06-24.png` |
| World Cup Draft room API | Proven locally for human and agent rooms | `evidence/live-proofs/multigame-room-api-2026-06-24.json`; agent proofs disclose `deterministic-fallback` or live `0g-compute` |
| World Cup Draft room UI | Proven locally in browser | `evidence/live-proofs/non-grid-room-ui-2026-06-24.json` and `non-grid-room-ui-world-cup-draft-2026-06-24.png` |
| Agent fallback disclosure and live Compute | Both proven | Historical non-Grid fallback-agent rooms still disclose `computeMode: deterministic-fallback`; `evidence/live-proofs/multigame-router-compute-api-2026-06-24.json` now proves the same game-generic prompt/validation path accepts live Router-selected legal moves for Fleet Duel, Tile Race, and World Cup Draft |

## Missing For 0G Storage and Proofs

| Requirement | Current State | Evidence Needed |
| --- | --- | --- |
| Match replay upload | Proven for browser-only H2H wager, H2A fallback wager, free/wager Grid Four Router Compute, and all three non-Grid Router Compute matches | Room `gr-zqvy` uploaded to 0G Storage root `0xe22ca7771560aca78982bcc16d00c01683f28ffb9e8f18c7aaa01a2a9221c8c7`; H2A Router wager room `h2a-router-wager-mqs1kt45` uploaded to root `0x7aeac238a3e6493e61c9c8bce13988bd9885dbb59954036c8c14943b31daf5a8`; Fleet Duel, Tile Race, and World Cup Draft Router rooms uploaded to roots `0xfdc8cef344cf0b929509163ab641e17dd2c76c43a724e458cf97eea57cdba786`, `0xdbc1eeba3cfc798823209a80d0b456a07de974a91be60e906baf552fcc1153ba`, and `0x7399a314f84b1f9f5d516d9c6f13417b4bfc76c0d37ad64d319c50d82ef7c72a` |
| Game pack upload | Proven for all four v1 games | Grid Four root `0x81a3504d17ba2fd003069e1c8f62a2b47d20d84618703750e59962e1a2f47e54`; Fleet Duel root `0x64764074cf9142a25147673e160f020dd1ce0d245445ae730d986b106d0289c0`; Tile Race root `0x3edfece3b2e45e10636fb00a4aa8d52b0480648b1c988b8f63c9eabeab4d41d2`; World Cup Draft root `0x5f4709463db77e8f5133a0dec94d306261a836e5984f25e0021e2c2d7b852220`; all evidence files report `reachable: true` |
| Submission review/share-card/agent transcript storage | Proven as a consolidated 0G Storage artifact | Root `0x5e6b327f1ad200fd79ecd12aa1471ed7488d7a8da0b906a08aa9a1e41937da51` stores the PR-only submission review receipt, `gr-zqvy` share-card metadata, and H2A fallback agent move transcript; evidence reports `reachable: true` |
| Storage root verification | Proven for room replay upload | `evidence/live-proofs/0g-storage-room-gr-zqvy.json` has `reachable: true` |
| Chain result commit | Proven for browser-only H2H wager, H2A fallback wager, free/wager Grid Four Router Compute, and all three non-Grid Router Compute matches | `chain-actual-match-gr-zqvy.json` records on-chain match ID `2`; `chain-actual-match-h2a-wager-mqr1xs1b.json` records on-chain match ID `3`; `chain-actual-match-router-compute-mqrwdmmf.json` records on-chain match ID `4`; `chain-actual-match-h2a-router-wager-mqs1kt45.json` records on-chain match ID `9`; non-Grid Router rooms record on-chain match IDs `6`, `7`, and `8` |
| DA batch payload | Proven as unpublished candidate with publisher harness | Batch hash `0x7662efb303bb52394dc4e690c3361b2fc9a316e7aa3eba4613ad86c1d19223e9` is generated by `pnpm 0g:da-candidate`; `pnpm 0g:da-publish` is ready to submit it to a configured Disperser, but live DA publication remains not configured |
| Proof page | Shows local fallback receipts plus live proof panel for indexed/static 0G Storage and actual chain commit proofs | Replace remaining fallback fields only as each additional match type is uploaded/committed |
| Explorer | Shows live smoke, static receipts, D1 proofs, 0G Storage replay root, and the actual `gr-zqvy` chain commit tx | Browser proof verifies the Explorer contracts, storage/compute labels, and live match proof panels |

## Proven For Leaderboards

| Requirement | Current State | Evidence Needed |
| --- | --- | --- |
| Global leaderboard | Proven locally | Free and tiny-wager completed rooms update the global table |
| Per-game leaderboard | Proven locally | Grid Four free and wager completions update the per-game table |
| Free leaderboard | Proven locally | Completed free H2H and H2A matches update the free table |
| Wager leaderboard | Proven locally | `evidence/live-proofs/wager-leaderboard-api-2026-06-24.json` proves wager and game-wager tables are separated from free mode |
| Human + agent wager entries | Proven locally with live Router Compute | `evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json` proves the human winner appears in global/wager/game-wager boards, the selected agent appears as a wager loss, and free-mode boards exclude the wager winner |

## Next Implementation Order

1. Redeploy the refreshed Worker bundle and re-run hosted Privy auth after the Workers origin is accepted. Live localhost Router Compute, Storage replay upload, and Galileo result commit are now proven.
2. Add production-origin Privy auth proof after the Workers URL is accepted by Privy and the hosted bundle is redeployed; rerun `pnpm hosted:privy-check`, current blocker evidence is `evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.json`.
3. Configure a real 0G DA client path if the hackathon reviewers require live DA publication instead of the current deterministic candidate hash; `pnpm 0g:da-readiness` lists the exact project-local env names and endpoint checks needed.

## Completed During Current Execution

- Arcade-only live 0G env copied from ScribeZero into `~/.codex/secrets/0g-arcade-arena/0g-live.env`.
- Redacted readiness verifier added as `pnpm 0g:readiness`.
- `evidence/live-proofs/0g-readiness-latest.json` proves Galileo chain readiness, 0G Storage endpoint/config readiness, and live 0G testnet Router Compute readiness.
- Direct Compute broker diagnostic added as `pnpm 0g:compute-broker-diagnostic`; `evidence/live-proofs/0g-compute-broker-diagnostic-2026-06-24.json` proves broker/provider discovery and records the current `3` 0G ledger minimum blocker.
- Guarded direct broker agent-move verifier added as `pnpm 0g:direct-broker-agent-move`; current non-autofund evidence proves provider discovery and stops before ledger mutation, while the funded command path is ready to create the broker ledger, submit a provider-selected legal move through the app API, complete the room, and verify indexed `computeMode=0g-compute`.
- Direct broker live pipeline added as `pnpm 0g:direct-broker-live-pipeline`; current non-autofund evidence proves the orchestrator runs the diagnostic and guarded match verifier, then truthfully skips replay upload and chain commit while the broker ledger is not ready.
- Router Compute match proof added as `pnpm 0g:router-compute-agent-match`; `evidence/live-proofs/router-compute-agent-match-2026-06-24.json` proves a live Router-selected agent move and finished room, `0g-storage-room-router-compute-mqrwdmmf.json` proves its replay upload, and `chain-actual-match-router-compute-mqrwdmmf.json` proves the result commit on Galileo.
- Broker-backed replay upload and chain commit path is prepared: room replay uploads carry compute proof metadata, and `chain:commit-actual-match` can commit direct-broker free-match evidence with `wagered=false`.
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
- All four v1 game packs are uploaded to 0G Storage with reachable roots: Grid Four `0x81a3504d17ba2fd003069e1c8f62a2b47d20d84618703750e59962e1a2f47e54`, Fleet Duel `0x64764074cf9142a25147673e160f020dd1ce0d245445ae730d986b106d0289c0`, Tile Race `0x3edfece3b2e45e10636fb00a4aa8d52b0480648b1c988b8f63c9eabeab4d41d2`, and World Cup Draft `0x5f4709463db77e8f5133a0dec94d306261a836e5984f25e0021e2c2d7b852220`; evidence lives in `evidence/live-proofs/0g-storage-game-pack-*.json`.
- A consolidated proof-artifact payload is uploaded to 0G Storage root `0x5e6b327f1ad200fd79ecd12aa1471ed7488d7a8da0b906a08aa9a1e41937da51`; it includes submission review receipt, share-card metadata, and non-sensitive H2A fallback agent transcript evidence.
- Human-vs-agent tiny wager match is now live-proven with Router Compute by `evidence/live-proofs/agent-wager-router-compute-match-2026-06-24.json`: both escrow sides funded, three `/agent-move` calls returned non-fallback `0g-compute`, the finished room was indexed in proofs/leaderboards, and settlement mined on Galileo.
- H2A Router wager replay `h2a-router-wager-mqs1kt45` was uploaded to 0G Storage root `0x7aeac238a3e6493e61c9c8bce13988bd9885dbb59954036c8c14943b31daf5a8` and committed to live Galileo MatchRegistry on-chain match ID `9`.
- Fleet Duel, Tile Race, and World Cup Draft live Router Compute proof added as `pnpm agent:multigame-router-compute-check`; evidence `evidence/live-proofs/multigame-router-compute-api-2026-06-24.json` proves one non-fallback Router-selected legal move per non-Grid game and indexed `computeMode=0g-compute`.
- Fleet Duel, Tile Race, and World Cup Draft Router Compute replays were uploaded to 0G Storage and committed to live Galileo MatchRegistry on-chain match IDs `6`, `7`, and `8`.
- `pnpm 0g:da-candidate` writes an unpublished deterministic DA batch candidate at `evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json`, with batch hash `0x7662efb303bb52394dc4e690c3361b2fc9a316e7aa3eba4613ad86c1d19223e9`.
- `pnpm 0g:da-readiness` writes `evidence/live-proofs/0g-da-readiness-2026-06-24.json`, proving that live DA publication is blocked by missing project-local DA Client/Disperser/Encoder/Retriever config rather than by the batch payload itself.
- `pnpm 0g:da-publish` writes `evidence/live-proofs/0g-da-publication-2026-06-24.json`; current evidence verifies the canonical candidate hash and records the exact missing Disperser/DAEntrance config before any attempted submission.
- D1 proof and leaderboard indexing is proven by `evidence/live-proofs/d1-proof-leaderboard-api-2026-06-23.json`; wager-mode separation is proven by `evidence/live-proofs/wager-leaderboard-api-2026-06-24.json`.
- Qualified agent registration, listing, server-side fallback move, proof indexing, and agent leaderboard entry are proven by `evidence/live-proofs/agent-registry-room-api-2026-06-23.json`.
- Direct agent room joins now enforce registration, qualified status, supported game, free/wager enablement, and max wager cap; evidence is `evidence/live-proofs/agent-wager-policy-api-2026-06-24.json`.
- Agent PFP support is API-proven by `evidence/live-proofs/agent-avatar-api-2026-06-24.json`: explicit avatar URLs persist through registration/profile/listing and omitted avatars receive generated SVG data-URI profile images.
- Historical fallback human-vs-agent tiny wager evidence remains in `evidence/live-proofs/agent-wager-match-api-2026-06-24.json`: both escrow sides funded, `/agent-move` executed three turns with fallback `Insufficient balance` metadata, the finished room was indexed in proofs/leaderboards, and settlement mined on Galileo.
- Historical H2A fallback wager replay `h2a-wager-mqr1xs1b` was uploaded to 0G Storage root `0x3df0db7d73b6a2833281daa275a55dc925ebf3c3fd6b6f092e68d6260bb93b17` and committed to live Galileo MatchRegistry on-chain match ID `3`.
- The project-level external agent skill package now includes registration, API, all four v1 game guides, wager policy, and examples; `pnpm agent:skill-check` writes `evidence/live-proofs/agent-skill-package-2026-06-24.json`.
- Human auto-match is implemented through `/api/matchmaking/human`; evidence `evidence/live-proofs/human-automatch-api-2026-06-24.json` proves free players pair into the same room and auto-start, while tiny-wager players pair into a ready room that still requires escrow funding before start.
- Fleet Duel, Tile Race, and World Cup Draft now run through the same Worker/Durable Object room APIs as Grid Four. `evidence/live-proofs/multigame-room-api-2026-06-24.json` proves human-vs-human and human-vs-agent completion plus proof indexing for all three games, with agent compute mode disclosed per move/proof.
- In-app Browser proof for real Fleet Duel, Tile Race, and World Cup Draft rooms is saved in `evidence/live-proofs/non-grid-room-ui-2026-06-24.json` with per-game screenshots; it proves the shared-room page renders each non-Grid game id and legal move controls from room state.
- All-game two-browser human-vs-human proof is saved in `evidence/live-proofs/all-game-h2h-browser-2026-06-24.json` with host/guest terminal screenshots for Grid Four, Fleet Duel, Tile Race, and World Cup Draft; it proves each game can be created, joined, started, played to completion through visible browser controls, and proof-indexed from isolated browser contexts.
- In-app Browser proof for all four game detail agent pickers is saved in `evidence/live-proofs/agent-picker-all-games-2026-06-24.json`; it proves seeded qualified agents and selected-agent CTAs render for Grid Four, Fleet Duel, Tile Race, and World Cup Draft.
- In-app Browser proof for all four game detail start actions is saved in `evidence/live-proofs/game-detail-start-actions-2026-06-24.json`; it proves each detail page creates a live free human room and starts a free selected-agent match for the same game, with per-game human-room and agent-match screenshots.
- PR-based game submission is proven by `evidence/live-proofs/game-submission-workflow-2026-06-24.json`; it verifies the submit page, docs, PR template, GitHub Actions workflow, game tooling scripts, cover/logo assets, manifest hashes, and banned-pattern guard for every v1 game pack.
- In-app Browser proof for Grid Four qualified-agent selection, leaderboard sections, Explorer panels, and proof receipt panels is saved in `evidence/live-proofs/browser-proof-surfaces-2026-06-24.json` with four route screenshots.
- Browser proof for the product-first home route is saved in `evidence/live-proofs/home-product-flow-2026-06-24.json` with screenshot `home-product-flow-2026-06-24.png`; it verifies featured game hero, requested nav, human room-code controls, testnet wager control, agent control, and absence of contract/DA technical copy on the home CTA surface.
- Browser proof for home CTA start actions is saved in `evidence/live-proofs/home-start-actions-2026-06-24.json` with screenshots `home-start-human-room-2026-06-24.png`, `home-start-agent-match-2026-06-24.png`, `home-start-human-wager-room-2026-06-24.png`, and `home-start-agent-wager-room-2026-06-24.png`; it verifies free human rooms, free selected-agent matches, and tiny-wager escrow rooms can be started from `/`.
- 0G Compute move parsing is extracted and unit-tested. Malformed JSON, invalid JSON shapes, illegal mocked Compute moves, and confidence clamping now fall back or normalize before deterministic rules apply.
- Wager negative cases are proven by `evidence/live-proofs/wager-negative-api-2026-06-24.json` and Foundry's zero-wager/double-settle tests.
- The wager escrow gate now also covers the pre-start `/move` path; `evidence/live-proofs/wager-start-gate-api-2026-06-24.json` proves an unfunded wager room stays `ready` and cannot auto-start through a move request.
- Local Wrangler now binds project-only 0G testnet Router env through ignored `.dev.vars`; `/agent-move` can use the Router and record `computeMode=0g-compute`.
- Sarvam fallback is live-proven by `evidence/live-proofs/sarvam-fallback-agent-move-2026-06-25.json`; the verifier temporarily forced the local Router endpoint to fail, `/agent-move` returned `computeMode=sarvam-fallback`, and the room proof retained the exact primary 0G error for judge-visible disclosure.
- External direct-broker proof ingestion is proven by `evidence/live-proofs/external-compute-proof-api-2026-06-24.json`; the Worker records `computeMode=0g-compute` for agent moves with valid external proof metadata and rejects the same proof on human moves.
- Hosted production Privy auth attempt is now evidence-backed and repeatable through `pnpm hosted:privy-check`: `evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.json` shows the Workers route loads and Login is present, but Privy blocks the hosted origin and the deployed bundle is stale relative to localhost.
