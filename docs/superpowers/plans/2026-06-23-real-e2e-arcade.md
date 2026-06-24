# Real E2E Arcade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert 0G Arcade Arena from a route-complete/fallback prototype into a localhost-first 1v1 game platform where human-vs-human and human-vs-agent free/wager matches are proven end to end with real 0G Chain, 0G Storage, and 0G Compute on Galileo testnet.

**Architecture:** Implement the real runtime in vertical slices. First establish a project-local live 0G readiness layer, then replace static/local match behavior with a Durable Object room/match API, then wire chain/storage/compute proofs into matches, then add browser E2E proof for two Privy users and one qualified 0G agent. Tournaments are out of active scope.

**Tech Stack:** Vite + React + TypeScript, Cloudflare Worker + Durable Objects + D1/KV/R2, Solidity/Foundry, 0G Galileo RPC, 0G Storage SDK, 0G testnet Compute Router model `qwen2.5-omni`, Privy test accounts, Playwright/Chromium browser automation.

---

## File Structure

- `~/.codex/secrets/0g-arcade-arena/0g-live.env`: untracked local-only live 0G env copied from ScribeZero and normalized for Arcade.
- `scripts/verify-live-0g.mjs`: redacted readiness verifier for 0G Chain, Compute, Storage config, operator wallet, and known Privy wallets.
- `scripts/fund-test-wallet.mjs`: tiny transfer helper from operator wallet to Privy browser wallets.
- `worker/index.ts`: Worker API for rooms, matches, agent registry, leaderboard reads, and SPA fallback.
- `worker/game-runtime.ts`: pure server-side game adapter runner usable by Durable Objects.
- `worker/agents.ts`: server-side agent registry and live 0G Compute move selection.
- `worker/proofs.ts`: 0G Storage replay upload and 0G Chain result/wager commit helpers.
- `cloudflare/schema.sql`: D1 tables for agents, matches, moves, leaderboards, and game registry mirrors.
- `src/lib/api.ts`: browser client for Worker APIs.
- `src/pages/GameDetailPage.tsx`: start-flow UI wired to real APIs.
- `src/components/PlayableMatch.tsx`: reads/writes real room state instead of only local state.
- `docs/AGENT_PLAY_SKILL.md`: agent-facing high-level instructions.
- `docs/agent-skill/`: subfiles for API, registration, each game, free/wager match flows, and error handling.
- `tests/e2e/`: browser tests for human-vs-human, human-vs-agent, wager, proof, explorer, and leaderboard.

---

### Task 1: Live 0G Readiness Gate

**Files:**
- Create: `scripts/verify-live-0g.mjs`
- Create: `~/.codex/secrets/0g-arcade-arena/0g-live.env`
- Modify: `AGENTS.md`
- Modify: `.Codex/state/CURRENT_SPEC.md`

- [ ] **Step 1: Copy ScribeZero env into an Arcade-only secret file**

Run:
```bash
mkdir -p ~/.codex/secrets/0g-arcade-arena
node --input-type=module scripts/internal-copy-scribezero-env.mjs
chmod 600 ~/.codex/secrets/0g-arcade-arena/0g-live.env
```

Expected:
```text
created ~/.codex/secrets/0g-arcade-arena/0g-live.env with redacted summary
```

The file must contain these keys and must never be committed:
```bash
ZEROG_PRIVATE_KEY=<copied from scribezero>
ZEROG_ROUTER_API_KEY=<copied from scribezero>
ZEROG_RPC=https://evmrpc-testnet.0g.ai
ZEROG_INDEXER=https://indexer-storage-testnet-turbo.0g.ai
ZEROG_COMPUTE_ROUTER=https://router-api-testnet.integratenetwork.work/v1
ZEROG_COMPUTE_MODEL=qwen2.5-omni
ZEROG_STORAGE_MODE=live
```

- [ ] **Step 2: Write a readiness verifier**

`node scripts/verify-live-0g.mjs` must:
- load only `~/.codex/secrets/0g-arcade-arena/0g-live.env`;
- verify `ZEROG_PRIVATE_KEY` shape without printing it;
- verify the derived operator address and balance;
- call 0G Router `/models`;
- run a tiny `qwen2.5-omni` testnet Router chat request and confirm `ZG-Res-Key` or trace provider exists;
- verify `glm-5.2` status separately and mark it unavailable if provider selection fails;
- check known Privy wallets:
  - `0x23761115c5f38ca51f0d425d00DE6E34029239EC`
  - the second Privy wallet once discovered by login;
- emit JSON under `evidence/live-proofs/0g-readiness-latest.json`.

- [ ] **Step 3: Run the readiness verifier**

Run:
```bash
node scripts/verify-live-0g.mjs
```

Expected:
```text
0G readiness: chain live, storage config present, compute probe reaches the router but may return `insufficient_balance` until the router account is funded.
```

- [ ] **Step 4: Record project-level secret usage**

Update `AGENTS.md` with:
```markdown
- Live 0G env for this project is local-only at `~/.codex/secrets/0g-arcade-arena/0g-live.env`.
- Load with `set -a; source ~/.codex/secrets/0g-arcade-arena/0g-live.env; set +a`.
- Use `ZEROG_COMPUTE_MODEL=qwen2.5-omni` on the 0G testnet Router; do not reuse mainnet Router defaults for this project.
```

- [ ] **Step 5: Verify no secrets leaked**

Run:
```bash
rg -n "ZEROG_PRIVATE_KEY=0x[a-fA-F0-9]{64}|ZEROG_ROUTER_API_KEY=sk-[A-Za-z0-9]" . --glob '!node_modules/**' --glob '!dist/**' --glob '!out/**' --glob '!cache/**'
```

Expected:
```text
no matches
```

---

### Task 2: Scope and Data Model Cleanup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/pages/ArenaPages.tsx`
- Modify: `cloudflare/schema.sql`
- Modify: `docs/SUBMISSION.md`
- Modify: `docs/GAME_SUBMISSION.md`
- Modify: `.Codex/state/CURRENT_SPEC.md`

- [ ] Remove tournament routes from active nav/product path while keeping contracts/docs as inactive future work.
- [ ] Convert `/submit-game` copy from fake UI upload to PR-based submission instructions.
- [ ] Add D1 tables:
  - `agents`
  - `matches`
  - `moves`
  - `leaderboard_entries`
  - `match_proofs`
- [ ] Add test data migration smoke through `wrangler d1 execute --local`.

---

### Task 3: Real Room and Match Runtime

**Files:**
- Create: `worker/game-runtime.ts`
- Modify: `worker/index.ts`
- Modify: `src/lib/api.ts`
- Modify: `src/pages/GameDetailPage.tsx`
- Modify: `src/components/PlayableMatch.tsx`

- [ ] Implement API endpoints:
  - `POST /api/rooms`
  - `GET /api/rooms/:roomId`
  - `POST /api/rooms/:roomId/join`
  - `POST /api/rooms/:roomId/move`
  - `POST /api/rooms/:roomId/start`
  - `POST /api/matchmaking/enqueue`
- [ ] Durable Object must store game id, seed, players, current state, move log, wager mode, and terminal result.
- [ ] Validate moves using the game adapter before appending.
- [ ] Enforce turn order and reject duplicate/illegal moves.
- [ ] Browser UI must read room state from API and poll/refresh until real-time transport is added.

---

### Task 4: Human-vs-Human Free and Wager E2E

**Files:**
- Create: `tests/e2e/human-vs-human.spec.ts`
- Create: `scripts/fund-test-wallet.mjs`
- Modify: `worker/proofs.ts`
- Modify: `contracts/test/ArcadeRegistries.t.sol`

- [ ] Discover second Privy wallet address from `test-2632@privy.io`.
- [ ] Fund both Privy wallets with a tiny amount from operator wallet.
- [ ] Test room-code human-vs-human free Grid Four match with two browser contexts.
- [ ] Test room-code human-vs-human wager Grid Four match with `0.0001 0G`.
- [ ] Verify result page, proof page, explorer entry, and leaderboard update.

---

### Task 5: Qualified Agent Registry

**Files:**
- Create: `worker/agents.ts`
- Create: `docs/agent-skill/README.md`
- Create: `docs/agent-skill/api.md`
- Create: `docs/agent-skill/registration.md`
- Create: `docs/agent-skill/free-match.md`
- Create: `docs/agent-skill/wager-match.md`
- Create: `docs/agent-skill/games/grid-four.md`
- Create: `docs/agent-skill/games/fleet-duel.md`
- Create: `docs/agent-skill/games/tile-race.md`
- Create: `docs/agent-skill/games/world-cup-draft.md`
- Modify: `src/pages/GameDetailPage.tsx`
- Modify: `src/pages/ArenaPages.tsx`

- [ ] Add API endpoints:
  - `POST /api/agents/register`
  - `GET /api/agents?gameId=:gameId&wager=:mode`
  - `POST /api/agents/:agentId/qualify`
  - `POST /api/rooms/:roomId/agent-move`
- [ ] Agents start as pending and appear in play UI only when qualified.
- [ ] Agent skill docs must be enough for Hermes/OpenClaw-style agents to register and play.

---

### Task 6: Human-vs-Agent With Live 0G Compute

**Files:**
- Modify: `worker/agents.ts`
- Modify: `worker/index.ts`
- Create: `tests/e2e/human-vs-agent.spec.ts`

- [ ] Use `qwen2.5-omni` on the 0G testnet Router with structured JSON response format.
- [ ] Prompt includes game rules, current player view, legal moves, and required JSON schema.
- [ ] Server rejects malformed JSON, illegal moves, and timeouts.
- [ ] Test human-vs-agent free match.
- [ ] Test human-vs-agent `0.0001 0G` wager match.
- [ ] Store compute provider/chat/signature metadata in match proof.

---

### Task 7: 0G Storage and Chain Proofs

**Files:**
- Create: `worker/proofs.ts`
- Modify: `worker/index.ts`
- Modify: `src/components/ProofTable.tsx`
- Modify: `src/pages/ExplorerPage.tsx`

- [ ] Upload completed replay JSON to 0G Storage.
- [ ] Verify storage root/reachability.
- [ ] Commit match result and replay/storage root to Galileo contracts.
- [ ] Settle wager winner for wager matches.
- [ ] Proof page shows real storage root, tx hash, compute proof, and settlement status.

---

### Task 8: Leaderboards

**Files:**
- Modify: `cloudflare/schema.sql`
- Modify: `worker/index.ts`
- Modify: `src/pages/ArenaPages.tsx`

- [ ] Track global leaderboard.
- [ ] Track per-game leaderboard.
- [ ] Track free leaderboard.
- [ ] Track wager leaderboard.
- [ ] Include humans and agents.
- [ ] Verify updates after every completed E2E match.

---

### Task 9: Full Local E2E Gate

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/global.setup.ts`
- Create: `tests/e2e/proof-explorer.spec.ts`
- Modify: `package.json`
- Modify: `scripts/submission-check.mjs`

- [x] Add `pnpm e2e:local`.
- [x] Add `pnpm e2e:live-0g`.
- [ ] E2E must cover:
  - auth account A
  - auth account B
  - human free
  - human wager
  - agent free
  - agent wager
  - result/proof
  - leaderboard
  - explorer
- [x] Completion requires `pnpm e2e:live-0g` to pass on localhost.

---

### Task 10: Completion Audit

**Files:**
- Modify: `docs/COMPLETION_AUDIT.md`
- Modify: `docs/EVIDENCE_REPORT.md`
- Modify: `scripts/audit-check.mjs`

- [ ] Extend audit to require real 0G readiness evidence.
- [ ] Require at least one human-vs-human free proof.
- [ ] Require at least one human-vs-human wager proof.
- [ ] Require at least one human-vs-agent free proof.
- [ ] Require at least one human-vs-agent wager proof.
- [ ] Require 0G Storage root and Galileo tx for each completed match type.
- [ ] Require leaderboard verification.

---

## Self-Review

- Scope coverage: The plan covers real 0G credentials, human-vs-human, human-vs-agent, free/wager, agent registration/skill docs, PR-based game submission, leaderboards, explorer/proof, and localhost-first E2E.
- Intentional exclusions: Tournaments are removed from active scope per user instruction.
- Known high-risk dependency: use the verified 0G testnet Router model `qwen2.5-omni`; do not assume mainnet Router models are available for this Galileo testnet app.
- No placeholders: Each task names concrete files, endpoints, commands, and expected evidence.
