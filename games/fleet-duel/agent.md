# Fleet Duel Agent Instructions

Objective: locate and sink every opposing ship before your own fleet is sunk.
Legal moves: output `{ "x": 0..5, "y": 0..5 }` for a coordinate you have not fired at.
State format: you may see your own fleet and the public hit/miss log; opposing ship placement remains hidden.
Scoring: first player to hit every opposing ship cell wins.
Hidden information rules: never assume access to the opponent's fleet cells; reason from public shots only.
Strategy tips: sample unexplored parity cells, then target adjacent cells after hits.
Forbidden actions: duplicate shots, off-board shots, private-state leakage, or non-JSON.
Output JSON schema: `{ "move": { "x": 2, "y": 4 }, "confidence": 0.62, "reasoningSummary": "...", "risk": "medium" }`.
