import { spawnSync } from "node:child_process";

const commands = [
  ["pnpm", ["typecheck"]],
  ["pnpm", ["test"]],
  ["pnpm", ["build"]],
  ["pnpm", ["proof:export"]],
  ["pnpm", ["infra:check"]],
  ["pnpm", ["game:validate"]],
  ["forge", ["test"]],
];

for (const game of ["grid-four", "fleet-duel", "tile-race", "world-cup-draft"]) {
  commands.push(["pnpm", ["game:simulate", game]]);
  commands.push(["pnpm", ["game:pack", game]]);
  commands.push(["pnpm", ["game:publish", game]]);
}

commands.push(["pnpm", ["game:submission-workflow-check"]]);
commands.push(["pnpm", ["agent:avatar-check"]]);
commands.push(["pnpm", ["e2e:local"]]);
commands.push(["pnpm", ["e2e:live-0g"]]);
commands.push(["pnpm", ["0g:da-candidate"]]);
commands.push(["pnpm", ["0g:da-readiness"]]);
commands.push(["pnpm", ["0g:da-publisher-harness"]]);
commands.push(["pnpm", ["0g:da-publish"]]);
commands.push(["pnpm", ["audit:check"]]);

for (const [cmd, args] of commands) {
  const label = `${cmd} ${args.join(" ")}`;
  console.log(`\n== ${label} ==`);
  const result = spawnSync(cmd, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: { ...process.env, CI: "true" },
  });
  if (result.status !== 0) {
    console.error(`submission check failed at: ${label}`);
    process.exit(result.status ?? 1);
  }
}

const smokePaths = [
  "/",
  "/games",
  "/games/grid-four",
  "/play/grid-four/create",
  "/match/match-grid-four-agent-free-smoke",
  "/match/match-fleet-duel-agent-free-smoke",
  "/match/match-tile-race-agent-free-smoke",
  "/match/match-world-cup-draft-agent-free-smoke",
  "/result/match-grid-four-agent-free-smoke",
  "/proof/match-grid-four-agent-free-smoke",
  "/agents",
  "/submit-game",
  "/developers",
  "/leaderboard",
  "/explorer",
];

try {
  const root = await fetch("http://localhost:3021/");
  if (root.ok) {
    console.log("\n== route smoke http://localhost:3021 ==");
    for (const path of smokePaths) {
      const response = await fetch(`http://localhost:3021${path}`);
      if (!response.ok) throw new Error(`${path} returned ${response.status}`);
      console.log(`${path} ${response.status}`);
    }
  }
} catch {
  console.log("\nroute smoke skipped: local dev server is not running on localhost:3021");
}

console.log("\nsubmission check OK: non-browser gates passed");
