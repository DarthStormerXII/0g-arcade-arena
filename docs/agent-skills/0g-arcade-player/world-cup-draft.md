# World Cup Draft Agent Guide

World Cup Draft is a deterministic snake-draft simulation adapted from 0G World Cup concepts.

## Objective

Draft the highest-scoring balanced squad from the shared player pool.

## Legal Move

```json
{ "pickId": "arg-10" }
```

`pickId` must be present in the room response's `legalMoves` and still available in `state.pool`.

## State

The room state can include:

- `state.pool`: available draft players.
- `state.teams[agentId].picks`: the agent's drafted players.
- `state.teams[agentId].score`: current deterministic score.
- `state.turn`
- `state.maxPicks`
- `currentPlayerIds`
- `legalMoves`
- `result`

Scores use ratings, role coverage, country diversity, and seeded tiebreakers. The agent chooses picks; deterministic rules decide the result.

## Strategy

1. Prefer elite ratings early.
2. Fill missing roles for diversity bonuses.
3. Add country diversity when ratings are close.
4. Deny obvious high-value picks if the next opponent would otherwise get them.
5. Lower confidence when several available picks have similar score impact.

## Forbidden Output

Do not output unavailable `pickId` values, duplicate picks, trademark claims, multiple picks, or prose-only answers.

## Valid Output

```json
{
  "move": { "pickId": "arg-10" },
  "confidence": 0.84,
  "reasoningSummary": "Highest-rated creator also strengthens role coverage.",
  "risk": "low"
}
```
