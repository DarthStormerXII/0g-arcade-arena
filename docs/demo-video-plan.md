# 0G Arcade Arena 4-Minute Demo Video Plan

Target duration: 4:00.
Audience: first-round judges.
Video style: arcade trailer plus proof-backed product walkthrough.
Final public URL: `https://0g-arcade-arena.pages.dev/demo.mp4`.

## Timing

| Time | Scene | Visual direction | Audio file |
| --- | --- | --- | --- |
| 00:00-00:18 | Hook | Neon arcade grid, agent avatars, game cards pulsing into an arena. | `public/audio/final/arcade-01-hook.mp3` |
| 00:18-00:45 | Problem | One-off agent demos breaking into reusable arena modules. | `public/audio/final/arcade-02-problem.mp3` |
| 00:45-01:10 | Product thesis | Browse, play, prove, submit loop. | `public/audio/final/arcade-03-product-loop.mp3` |
| 01:10-01:55 | Footage 01 | Insert `public/video/final/arcade-01-games-start-room.mp4`. | `public/audio/final/arcade-04-demo-games.mp3` |
| 01:55-02:38 | Footage 02 | Insert `public/video/final/arcade-02-agents-match-result.mp4`. | `public/audio/final/arcade-05-demo-match.mp3` |
| 02:38-03:16 | Proof | Insert `public/video/final/arcade-03-submit-explorer-proof.mp4`. | `public/audio/final/arcade-06-proof.mp3` |
| 03:16-03:42 | Why it wins | Judge checklist: multiple games, agent support, builder submission, proof receipts. | `public/audio/final/arcade-07-judge-case.mp3` |
| 03:42-04:00 | Close | URL, arcade cabinet, proof badges, final title. | `public/audio/final/arcade-08-close.mp3` |

## ElevenLabs Script Chunks

Record each chunk as its own MP3. Keep the filenames exactly as listed above.

### 01 Hook

Agent games should not be one-off demos. They should be playable arenas.

Right now, many AI game demos show one agent, one screen, and one hardcoded scenario. They are interesting for a minute, but they do not become a place people return to. 0G Arcade Arena starts from a different idea: if agents are going to compete, humans need a lobby, builders need a format, and judges need proof that the match actually happened.

That is what Arcade Arena is built to become.

### 02 Problem

The problem is not that agent games are impossible. The problem is that they are fragmented.

Each builder creates a separate game, separate agent logic, separate result format, and separate proof story. That makes every demo feel isolated. Players cannot move between games easily. Agents cannot build reputation across matches. Judges cannot compare outcomes under one standard.

For agent gaming to feel real, it needs shared infrastructure: game packs, rooms, match receipts, replay data, and proof explorers.

### 03 Product Loop

0G Arcade Arena turns that into a simple product loop: browse games, start a room, let humans or agents play, then inspect the proof.

The arena is designed for multiple games, not one showcase. It supports game discovery, agent surfaces, result views, submission flow, and an explorer for evidence. That means the product can grow as more builders add games and more agents enter the arena.

The experience starts like an arcade, but the architecture points toward a reusable agent-game network.

### 04 Demo Games

Here is the live game discovery flow.

The user lands on a grid of available games, browses different formats, opens a game detail page, and starts moving toward a room. This is important because the product immediately communicates that Arcade Arena is not a single game. It is a container for many games.

For judges, this is the first proof of extensibility. The arena can support different mechanics while keeping a consistent interface for starting, playing, and proving matches.

The game layer is the invitation. The proof layer is what makes it credible.

### 05 Demo Match

Next, the demo moves into agents, matches, and results.

Arcade Arena is built for humans and AI agents to share the same game space. The agent surfaces show who can participate. The match and result screens show how the arena can move from selection into outcome. And the leaderboard gives the product a reason to keep going after one match.

This matters because agent competition needs repeatability. If a match cannot leave a result trail, it is just a moment. If it can leave a receipt, replay, and ranking, it starts becoming a real arena.

### 06 Proof

The proof and submission flow is where 0G Arcade Arena becomes infrastructure.

A builder can submit a game pack. A match can produce replay data. The explorer can show receipts and evidence. Instead of hiding the outcome inside the UI, the product exposes the artifacts that judges and future players can inspect.

0G fits because agent games need durable game packs, replay records, and verification around results. Storage and proof turn the arcade from a website into a shared layer for agent gameplay.

### 07 Judge Case

For judges, Arcade Arena is strong because it is both fun and expandable.

It has a visible user experience: games, rooms, agents, matches, and leaderboards. It has a builder path through game submission. And it has a proof path through receipts, replay artifacts, and explorer surfaces.

That combination matters. A single game can win attention, but a reusable arena can become a platform. Arcade Arena gives 0G a place where agents can compete in public and where the community can understand the result.

### 08 Close

0G Arcade Arena is the game lobby for ownable agents: multiplayer, extensible, and verifiable.

Humans get games they can play. Builders get a format they can submit into. Agents get an arena where results can matter beyond one screen.

Live demo: 0g-arcade-arena.pages.dev.

## Footage To Record

Record at 1920x1080, browser zoom 100 percent, cursor visible, no bookmarks bar, no audio.

1. `arcade-01-games-start-room.mp4`
   - URL sequence: `https://0g-arcade-arena.pages.dev/games`, game detail route, start room/action.
   - Length to record: 60-75 seconds.
   - Show: multiple game cards, one game detail, start/play CTA.
   - Important: show that this is multi-game, not one isolated demo.

2. `arcade-02-agents-match-result.mp4`
   - URL sequence: `/agents`, live/completed match route, `/leaderboard`.
   - Length to record: 55-70 seconds.
   - Show: agent list/detail, match/result surface, leaderboard.
   - Important: pause on result/receipt labels if visible.

3. `arcade-03-submit-explorer-proof.mp4`
   - URL sequence: `/submit-game`, `/explorer`, `/pitch`.
   - Length to record: 40-50 seconds.
   - Show: submission form/workflow, explorer/proof evidence, pitch proof section.
   - Important: scroll slowly through explorer so judges can read proof claims.

## Remotion Assembly Notes

Use sharper pacing than the other videos: punchy transitions, arcade panels, game-card wipes, and neon proof labels. Footage should occupy roughly 1:30-1:50. Keep proof sections readable; do not over-animate receipts or evidence text.
