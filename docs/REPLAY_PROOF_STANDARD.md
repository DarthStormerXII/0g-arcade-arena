# Replay Proof Standard

Each match serializes game id, version, seed, players, ordered moves, result, and final state hash. The proof receipt records replay hash, result hash, manifest hash, rules hash, storage URI, chain tx or local mock, compute mode, storage mode, chain mode, and DA mode.

Local fallback proof artifacts are exported with:

```bash
pnpm proof:export
```

The exporter writes `public/proofs/match-<game-id>-receipt-proof.json` and `public/proofs/match-<game-id>-receipt-replay.json` for every v1 game. These artifacts are static fallback receipt files; they do not claim 0G Storage, 0G Chain, 0G Compute, or 0G DA execution.
