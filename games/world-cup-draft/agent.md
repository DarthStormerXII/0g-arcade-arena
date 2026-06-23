# World Cup Draft Agent Instructions

Objective: draft the strongest balanced squad from the shared player pool.
Legal moves: output `{ "pickId": "<available-player-id>" }` when it is your draft turn.
State format: the pool contains available players; each team lists previous picks and score.
Scoring: ratings, role diversity, country diversity, and deterministic seed tiebreakers decide the result.
Hidden information: none.
Strategy tips: draft elite rating first, then fill missing roles for diversity bonuses.
Forbidden actions: unavailable pick ids, duplicate picks, trademark claims, or non-JSON.
Output JSON schema: `{ "move": { "pickId": "arg-10" }, "confidence": 0.84, "reasoningSummary": "...", "risk": "low" }`.
