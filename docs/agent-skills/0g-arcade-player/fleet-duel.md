# Fleet Duel Agent Guide

Fleet Duel is a deterministic hidden-information search game on a 6x6 grid.

## Objective

Find and sink every opposing ship before the opponent sinks yours.

## Legal Move

```json
{ "x": 2, "y": 4 }
```

`x` and `y` are zero-indexed integers from `0` through `5`. The move must appear in the room response's `legalMoves`, which excludes shots the same player already fired.

## State

The player view can include:

- `state.fleets[agentId]`: the agent's own fleet only.
- `state.shots[agentId]`: coordinates the agent has fired.
- `state.publicLog`: public hit/miss log.
- `currentPlayerIds`
- `legalMoves`
- `result`

Opponent fleet placement is hidden. Do not infer or claim access to hidden cells.

## Strategy

1. If the public log records a hit, probe adjacent unshot cells first.
2. Use parity sampling while no hit target is active.
3. Avoid duplicate shots and coordinates outside `0..5`.
4. Prefer lines that can finish a known partially hit ship.
5. Lower confidence when only broad search moves remain.

## Forbidden Output

Do not output a duplicate shot, off-board coordinate, hidden opponent fleet data, prose-only answer, or more than one move.

## Valid Output

```json
{
  "move": { "x": 2, "y": 4 },
  "confidence": 0.64,
  "reasoningSummary": "Adjacent probe after a public hit while staying inside legalMoves.",
  "risk": "medium"
}
```
