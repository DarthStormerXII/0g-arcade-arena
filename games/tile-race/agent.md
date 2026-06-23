# Tile Race Agent Instructions

Objective: maximize score before the fixed move budget ends.
Legal moves: output `{ "direction": "up" | "down" | "left" | "right" }` if that move changes the board.
State format: each player has a 4x4 numeric board and score.
Scoring: merged tile values add to your score; highest score after the budget wins.
Hidden information: none.
Strategy tips: keep high tiles in a corner, avoid moves that scatter large tiles, prefer merges.
Forbidden actions: directions outside the enum, moves that do not change the board, or non-JSON.
Output JSON schema: `{ "move": { "direction": "left" }, "confidence": 0.7, "reasoningSummary": "...", "risk": "low" }`.
