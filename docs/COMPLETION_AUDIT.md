# Completion Audit

Date: 2026-06-23 Asia/Jakarta

This matrix records the current submission boundary for 0G Arcade Arena. It is paired with `pnpm audit:check`, which verifies the evidence files that can be checked without browser automation.

## Proven By Local Evidence

| Requirement | Status | Evidence |
| --- | --- | --- |
| Four v1 games only | Proven | `games/grid-four`, `games/fleet-duel`, `games/tile-race`, `games/world-cup-draft` |
| Active tournament scope removed | Proven | Active app routes omit `/tournaments`; v1 manifests set `supportsTournaments: false`; `pnpm audit:check` enforces the 1v1 hackathon scope |
| Game Pack required files | Proven | `pnpm game:validate` and each game folder, including cover and logo assets |
| Concrete manifest hashes | Proven | `manifest.json` hash fields plus `pnpm game:validate` |
| Game Pack tooling | Proven | `scripts/game-tool.mjs`, `pnpm game:create`, `validate`, `test`, `simulate`, `agent-test`, `pack`, `publish`, `hash` |
| Contributor submission UI | Proven | `/submit-game`, `src/lib/submission-checks.ts`, `.github/PULL_REQUEST_TEMPLATE/game-submission.md` |
| PR-based game submission workflow | Proven | `pnpm game:submission-workflow-check`, `evidence/live-proofs/game-submission-workflow-2026-06-24.json`; verifies pull-request-only submit UI, maintainer approval language, docs, PR template, Game Pack CI, tooling scripts, cover/logo assets, manifest hash matches, and no banned pack patterns |
| Agent play standard | Proven | `docs/AGENT_PLAY_STANDARD.md`, `games/*/agent.md`, `docs/agent-skills/0g-arcade-player/SKILL.md`, `pnpm agent:skill-check`, `evidence/live-proofs/agent-skill-package-2026-06-24.json`; the project-level external skill covers registration, runtime APIs, all four v1 games, examples, and wager safety |
| Human and fallback-agent play | Proven | `src/components/PlayableMatch.tsx`, route smoke in `pnpm submission:check` |
| Agent registry and qualified-agent room flow | Proven locally | `worker/index.ts`, `/api/agents`, `/api/rooms/:roomId/agent-move`, `evidence/live-proofs/agent-registry-room-api-2026-06-23.json`, `evidence/live-proofs/agent-compute-fallback-api-2026-06-24.json`, `evidence/live-proofs/agent-compute-router-bound-api-2026-06-24.json` |
| All-game qualified-agent picker UI | Proven locally | `evidence/live-proofs/agent-picker-all-games-2026-06-24.json`; Grid Four, Fleet Duel, Tile Race, and World Cup Draft game detail pages each render a seeded qualified agent, the agent/human mode controls, and `Play selected 0G agent` |
| Agent bankroll and wager join policy | Proven locally | `worker/index.ts`, `pnpm agent:wager-policy-check`, `evidence/live-proofs/agent-wager-policy-api-2026-06-24.json`; direct room joins reject unregistered, pending, unsupported, mode-disabled, and over-cap agents |
| Human-vs-agent tiny wager match | Proven on Galileo with fallback Compute | `pnpm agent:wager-match-check`, `evidence/live-proofs/agent-wager-match-api-2026-06-24.json`; registered qualified agent joined a wager room, both escrow sides funded `0.0001 0G`, the room started after escrow, three `/agent-move` calls disclosed deterministic fallback due router `Insufficient balance`, the human winner settled on Galileo, and global/wager/game-wager leaderboards updated |
| Agent Compute output validation | Proven by unit tests | `worker/agent-move-output.ts`, `worker/agent-move-output.test.ts`, `worker/agent-move-choice.test.ts`; malformed JSON and illegal mocked Compute moves fall back to deterministic legal moves |
| Human-vs-human local room API/UI | Proven locally | `worker/game-runtime.ts`, `worker/index.ts`, `worker/game-runtime.test.ts`, `evidence/live-proofs/h2h-grid-four-local-api-2026-06-23.json`, `evidence/live-proofs/h2h-grid-four-ui-smoke-2026-06-23.json` |
| Non-Grid room APIs | Proven locally | `pnpm room:multigame-check`, `evidence/live-proofs/multigame-room-api-2026-06-24.json`; Fleet Duel, Tile Race, and World Cup Draft each create, join, start, finish, index proofs, and complete human-vs-agent rooms with disclosed fallback agent moves |
| Non-Grid room browser UI | Proven locally | `evidence/live-proofs/non-grid-room-ui-2026-06-24.json`; real Fleet Duel, Tile Race, and World Cup Draft rooms render the shared room shell, route game header, room/game ids, current player, and game-specific legal move controls on `http://localhost:3021` |
| Human auto-match queue | Proven locally | `/api/matchmaking/human`, `pnpm human:automatch-check`, `evidence/live-proofs/human-automatch-api-2026-06-24.json`, `evidence/live-proofs/human-automatch-ui-2026-06-24.json`; free rooms auto-start after pairing, wager rooms stop at ready until escrow funding, and the rendered CTA reaches an active shared-room match |
| Browser proof surfaces | Proven locally | `evidence/live-proofs/browser-proof-surfaces-2026-06-24.json`; screenshots prove the Grid Four qualified-agent picker, leaderboard sections, Explorer contracts/proofs, and proof receipt panels render on `http://localhost:3021` |
| Two authenticated Privy H2H free match | Proven locally | `evidence/live-proofs/two-privy-h2h-grid-four-2026-06-23.json` |
| Tiny wager H2H browser flow | Proven on Galileo | `evidence/live-proofs/h2h-grid-four-wager-browser-full-2026-06-23.json`; both wallets funded, escrow-gated start passed, all moves were browser-clicked, and winner settled |
| Wager negative cases | Proven locally | `evidence/live-proofs/wager-negative-api-2026-06-24.json`, `evidence/live-proofs/wager-start-gate-api-2026-06-24.json`, `contracts/test/ArcadeRegistries.t.sol`; unfunded start, unfunded pre-start move bypass, cancel permissions, cancelled-room join/start, wrong turn, illegal move, duplicate move after finish, zero-value wager, and double-settle rejection |
| Replay, proof, and share flow | Proven | `src/lib/match-records.ts`, `src/lib/proofs.ts`, `src/lib/share-card.ts`, `/result/:matchId`, `/proof/:matchId` |
| D1 proof and leaderboard indexing | Proven locally | `/api/proofs`, `/api/leaderboard`, `evidence/live-proofs/d1-proof-leaderboard-api-2026-06-23.json`, `evidence/live-proofs/wager-leaderboard-api-2026-06-24.json`; global, per-game, free, wager, and game-wager mode rows are proven |
| Static proof artifacts | Proven | `public/proofs/*-proof.json` and `public/proofs/*-replay.json` |
| 0G Chain contract surface | Proven locally | `contracts/src/*.sol`, `forge test` |
| 0G Chain live smoke | Proven on Galileo | `evidence/live-proofs/chain-check-latest.json`, `pnpm chain:live-check`, live chain panel in `/explorer` and `/proof/match-grid-four-agent-free-smoke` |
| 0G Chain actual match result commit | Proven on Galileo | `pnpm chain:commit-actual-match gr-zqvy`, `evidence/live-proofs/chain-actual-match-gr-zqvy.json`; committed result hash, replay payload hash, and 0G Storage URI for the completed browser wager room |
| 0G Chain/Storage H2A wager commit | Proven on Galileo | `pnpm 0g:upload-room-replay h2a-wager-mqr1xs1b`, `pnpm chain:commit-actual-match h2a-wager-mqr1xs1b`, `evidence/live-proofs/0g-storage-room-h2a-wager-mqr1xs1b.json`, `evidence/live-proofs/chain-actual-match-h2a-wager-mqr1xs1b.json`; committed the completed human-vs-agent wager room's reachable 0G Storage replay root to the live MatchRegistry |
| 0G Storage live game-pack uploads | Proven for all four v1 games | `pnpm 0g:upload-game-pack <game>`, `evidence/live-proofs/0g-storage-game-pack-grid-four.json`, `evidence/live-proofs/0g-storage-game-pack-fleet-duel.json`, `evidence/live-proofs/0g-storage-game-pack-tile-race.json`, `evidence/live-proofs/0g-storage-game-pack-world-cup-draft.json` |
| 0G Storage proof artifacts | Proven | `pnpm 0g:upload-proof-artifacts`, `evidence/live-proofs/0g-storage-proof-artifacts-2026-06-24.json`; reachable bundle includes submission review receipt, share-card metadata, and non-sensitive fallback agent move transcript |
| 0G DA batch candidate | Proven as unpublished candidate | `pnpm 0g:da-candidate`, `evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json`, `evidence/live-proofs/explorer-da-batch-candidate-2026-06-24.json`; deterministic batch hash covers the two live wager match storage roots/chain commits, all four game-pack roots, and the proof-artifact bundle without claiming live DA publication |
| 0G live readiness | Proven for Chain and Storage endpoint; Compute blocked by Router network/balance mismatch | `evidence/live-proofs/0g-readiness-latest.json`, `pnpm 0g:readiness` currently shows Galileo/testnet storage with configured mainnet Router `insufficient_balance` and documented testnet Router `invalid_api_key` |
| Responsive visual screenshots | Proven | `evidence/screenshots/2026-06-23-responsive/manifest.json`, `evidence/screenshots/2026-06-23-responsive/viewport/manifest.json`; refreshed after live chain panel addition. Focused in-app Browser proof is also saved under `evidence/live-proofs/browser-proof-*-2026-06-24.png` |
| Cloudflare operational deployment | Proven live | `https://0g-arcade-arena.gabrielaxy.workers.dev`, Worker version `f0281444-1bf0-4f4f-9361-650946b8202e`, `wrangler.jsonc`, `worker/index.ts`, `cloudflare/schema.sql` |
| Hosted production Privy attempt | Blocked with repeatable evidence | `pnpm hosted:privy-check`, `evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.json`; the hosted route loads and exposes Login, but Privy blocks the iframe/API for this origin and the hosted bundle still serves older tournament-path copy |
| PR and contributor workflow | Proven | `.github/workflows/game-pack-ci.yml`, docs under `docs/`, `evidence/live-proofs/game-submission-workflow-2026-06-24.json` |
| Aggregate non-browser gate | Proven | `CI=true pnpm submission:check`, including `pnpm audit:check` after pack/publish receipts regenerate |

## Truthfully Fallback Or Not Configured

| 0G Area | Current status | Evidence |
| --- | --- | --- |
| 0G Chain | Live Galileo smoke verified and shown in app; one actual completed match is committed on chain; static sample proof receipts still disclose local mock | `evidence/live-proofs/chain-check-latest.json`, `evidence/live-proofs/chain-actual-match-gr-zqvy.json`, proof JSON `chainMode`, Browser screenshots |
| 0G Storage | Live room replay upload proven for H2H and H2A wager matches, live game-pack uploads for all four v1 games, and live proof-artifact bundle for review/share/transcript metadata; default CI publish receipts still local fallback to avoid repeated storage writes | `evidence/live-proofs/0g-storage-room-gr-zqvy.json`, `evidence/live-proofs/0g-storage-room-h2a-wager-mqr1xs1b.json`, `evidence/live-proofs/0g-storage-game-pack-*.json`, `evidence/live-proofs/0g-storage-proof-artifacts-2026-06-24.json`, `evidence/live-proofs/0g-readiness-latest.json`, `dist/publish-receipts/*.publish.json` |
| 0G Compute | Latest readiness rerun returned compute unavailable; local Wrangler now has project-only router credentials bound, and `/agent-move` reaches the configured Router but falls back after `Insufficient balance`; the testnet Router rejects the same key | `evidence/live-proofs/0g-readiness-latest.json`, `evidence/live-proofs/agent-registry-room-api-2026-06-23.json`, `evidence/live-proofs/agent-compute-router-bound-api-2026-06-24.json`, proof JSON `computeMode` |
| 0G DA | Candidate payload/hash generated, live DA publication not configured | `evidence/live-proofs/0g-da-batch-candidate-2026-06-24.json`, proof JSON `daMode`, proof pages |
| Cloudflare | Deployed to Workers with D1/KV/R2/DO bindings | `docs/EVIDENCE_REPORT.md`, hosted route/API smoke |

## Still Blocked

| Requirement | Blocker | Evidence |
| --- | --- | --- |
| Production Privy auth on Workers URL | Current hosted attempt is blocked: Privy origin/CSP does not include the Workers URL, and the Workers deployment is stale relative to localhost | `evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.json`, `docs/EVIDENCE_REPORT.md` |
| 0G Compute/DA proof infrastructure | Agent move selection is wired to attempt 0G Compute, and local Worker secret binding is proven; live proof needs Router balance funding or a valid testnet Router key/endpoint. DA candidate generation is implemented, but live DA publication is not configured | `docs/REAL_E2E_GAP_MAP.md` |

## Completion Boundary

The repository is not yet fully end-to-end for the new real-testing target. It now has proven human auto-match API behavior, a local two-authenticated-Privy-browser Grid Four H2H free match, a full two-browser tiny-wager Grid Four match with real Galileo funding/settlement, local shared-room API completion for Fleet Duel, Tile Race, and World Cup Draft in human and fallback-agent modes, browser-rendered shared-room controls for all three non-Grid games, all-game qualified-agent picker UI, live 0G Storage upload for completed wager replays and all four v1 game packs, a live Galileo result commit for the completed wager room, an unpublished deterministic DA batch candidate, D1 proof/leaderboard indexing including separated wager tables, qualified-agent room flow with direct server-side wager policy enforcement, router-bound Compute-attempt/fallback proof metadata, and targeted wager negative coverage. The next required steps are live 0G Compute agent moves after router funding and production-origin Privy proof.
