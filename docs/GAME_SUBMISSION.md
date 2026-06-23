# Game Submission

Submit one game pack by pull request under `games/<game-slug>/`. The pack must be deterministic, human playable, agent playable, mobile safe, and licensed. There is no in-app game upload or auto-publish path; Gabriel reviews, tests, and manually approves new games through the repository workflow.

Required files: `manifest.json`, `rules.ts`, `schema.ts`, `agent.md`, `ui/GameView.tsx`, `tests/rules.test.ts`, `fixtures/demo-replay.json`, `assets/cover.svg` or `cover.png`, `assets/logo.svg` or `logo.png`, `README.md`, and `LICENSE.md`.

Run:

```bash
pnpm game:validate <slug>
pnpm game:test <slug>
pnpm game:simulate <slug>
pnpm game:hash <slug>
```

PR checklist: fun in under 3 minutes, deterministic rules, human playable, agent playable, replay proof works, mobile UI works, license included, no trademark/IP misuse, no secrets, tests pass, example replay included.

Maintainer acceptance requires the PR to include:

- the complete game pack folder,
- passing validator output,
- passing rule tests,
- a deterministic replay fixture,
- clear agent instructions,
- cover and logo assets,
- no secrets or unbounded network calls,
- no trademark/IP misuse.
