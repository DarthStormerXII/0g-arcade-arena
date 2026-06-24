# 0G Arcade Arena Demo Video Plan

Current rendered scaffold: 66.048 seconds at `public/demo.mp4`.
Final footage cut target: 88-98 seconds after replacing the placeholder segment with real app recordings.
Audience: first-round judges.
Video style: pitch-led arcade trailer with focused recordings of the live product. Do not use one continuous screen recording.
Final public URL: `https://0g-arcade-arena.pages.dev/demo.mp4`.

## Storyboard

| Time | Screen | Voiceover |
| --- | --- | --- |
| 00:00-00:07 | Logo, animated arcade grid, `/pitch` hero. | "Agent games should not be one-off demos. They should be playable arenas." |
| 00:07-00:20 | Grid of games, agents, proof badges. | "0G Arcade Arena is an open arcade where humans and AI agents can play multiple games under one proof standard." |
| 00:20-00:44 | Demo clip 01: browse games, open a game, start human or agent match. | "Judges can pick a game pack, start a room, and see the same arena support human matches, agent matches, and wager-gated play." |
| 00:44-01:04 | Demo clip 02: live match to result and proof page. | "After the match, the result is tied to replay data, receipts, and 0G readiness evidence so the outcome is not trapped inside the UI." |
| 01:04-01:23 | Demo clip 03: submit-game/developer flow and explorer. | "The bigger idea is reuse. Builders can submit new games and agents into the same format, so Arcade Arena becomes infrastructure for agent gameplay." |
| 01:23-01:34 | Closing title with live URL and three proof tags. | "0G Arcade Arena is the game lobby for ownable agents: multiplayer, extensible, and verifiable." |

## Screen Recordings To Capture

Record at 1920x1080, browser zoom 100 percent, cursor visible, no browser bookmarks bar.

1. `arcade-clip-01-browse-start-match.mp4`
   - URL: `https://0g-arcade-arena.pages.dev/games`
   - Action: browse the game list, open one game detail page, start an agent or human match.
   - Duration needed in edit: 22-25 seconds.
   - Important framing: show that more than one game exists.

2. `arcade-clip-02-match-result-proof.mp4`
   - URL: live room/match/result flow.
   - Action: show the match screen, finish or open a completed match, then move to result/proof.
   - Duration needed in edit: 18-22 seconds.
   - Important framing: pause on proof and receipt labels.

3. `arcade-clip-03-submit-and-explorer.mp4`
   - URL: `https://0g-arcade-arena.pages.dev/submit-game`, then `/explorer`
   - Action: show the game submission form or workflow, then switch to explorer/proof evidence.
   - Duration needed in edit: 16-20 seconds.

4. `arcade-clip-04-pitch-proof.mp4`
   - URL: `https://0g-arcade-arena.pages.dev/pitch`
   - Action: slow scroll from hero to "What judges can verify".
   - Duration needed in edit: 8-10 seconds.

## Voice Recording For Gabriel

Record one clean file named `arcade-gabriel-voice.wav`.
Pace: high-energy but precise, 145-155 words per minute.

Full script:

"Agent games should not be one-off demos. They should be playable arenas.

0G Arcade Arena is an open arcade where humans and AI agents can play multiple games under one proof standard.

Judges can pick a game pack, start a room, and see the same arena support human matches, agent matches, and wager-gated play.

After the match, the result is tied to replay data, receipts, and 0G readiness evidence so the outcome is not trapped inside the UI.

The bigger idea is reuse. Builders can submit new games and agents into the same format, so Arcade Arena becomes infrastructure for agent gameplay.

0G Arcade Arena is the game lobby for ownable agents: multiplayer, extensible, and verifiable."

## Remotion Assembly Notes

Composition: `ArcadeArenaDemo`, 1280x720, 30 fps, 66.048 seconds.
Source file: `video/remotion-demo.tsx`.
Render command: `pnpm --package=@remotion/cli --package=remotion dlx remotion render video/remotion-demo.tsx ArcadeArenaDemo public/demo.mp4 --overwrite --codec=h264 --crf=26 --timeout=120000`.

Assets:
- `public/video/raw/arcade-clip-01-browse-start-match.mp4`
- `public/video/raw/arcade-clip-02-match-result-proof.mp4`
- `public/video/raw/arcade-clip-03-submit-and-explorer.mp4`
- `public/video/raw/arcade-clip-04-pitch-proof.mp4`
- `public/audio/arcade-gabriel-voice.wav`

Use the live app palette: black, neon green, proof yellow, and hard-edged arcade panels. Motion can be punchier than the other projects, but proof text must stay readable for judges.
