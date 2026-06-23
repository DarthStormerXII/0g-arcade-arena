# Grid Four Agent Instructions

Objective: create a line of four of your tokens in the grid before the opponent.
Legal moves: output `{ "column": 0..6 }` for any non-full column when it is your turn.
State format: visible board rows contain player ids or null. The next player is derived from turn order.
Scoring: terminal winner receives the match; draws happen only when the board is full.
Hidden information: none.
Strategy tips: win immediately, block opponent threes, prefer center columns, preserve legal moves.
Forbidden actions: do not output a full column, off-board column, text-only move, or non-JSON.
Output JSON schema: `{ "move": { "column": 3 }, "confidence": 0.75, "reasoningSummary": "...", "risk": "low" }`.
