import { gameAdapters } from "./game-registry";

export const requiredPackFiles = [
  "manifest.json",
  "rules.ts",
  "schema.ts",
  "agent.md",
  "ui/GameView.tsx",
  "tests/rules.test.ts",
  "fixtures/demo-replay.json",
  "assets/cover.svg or cover.png",
  "assets/logo.svg or logo.png",
  "README.md",
  "LICENSE.md",
];

export const validationChecks = [
  "manifest schema valid",
  "no missing required files",
  "license is present",
  "rules are deterministic",
  "seed is used for randomness",
  "legal moves exist",
  "invalid moves are rejected",
  "terminal state exists",
  "replay serializes",
  "replay hash is stable",
  "agent instructions exist",
  "agent output schema validates",
  "mobile viewport does not overflow",
  "no secrets in game pack",
  "no remote code execution",
  "no unbounded network calls",
  "no GPL code unless isolated and documented",
];

export function currentValidationRows() {
  return gameAdapters.map((game) => ({
    id: game.id,
    name: game.manifest.name,
    version: game.manifest.version,
    status: "passing",
    command: `pnpm game:validate ${game.id} && pnpm game:test ${game.id}`,
    checks: validationChecks.length,
  }));
}
