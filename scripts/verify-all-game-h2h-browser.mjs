import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const baseUrl = process.env.ARCADE_LOCAL_URL ?? "http://localhost:3021";
const runId = Date.now().toString(36);
const evidencePath = "evidence/live-proofs/all-game-h2h-browser-2026-06-24.json";
const games = [
  { id: "grid-four", name: "Grid Four", prefix: "GR" },
  { id: "fleet-duel", name: "Fleet Duel", prefix: "FL" },
  { id: "tile-race", name: "Tile Race", prefix: "TI" },
  { id: "world-cup-draft", name: "World Cup Draft", prefix: "WO" },
];
const candidatePlaywrightModules = [
  process.env.PLAYWRIGHT_MODULE,
  join(root, "node_modules/playwright/index.js"),
  "/Users/gabrielantonyxaviour/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js",
].filter(Boolean);

async function loadPlaywright() {
  for (const modulePath of candidatePlaywrightModules) {
    if (!modulePath || !existsSync(modulePath)) continue;
    const mod = await import(modulePath);
    return mod.default ?? mod;
  }
  throw new Error("Playwright is not available. Set PLAYWRIGHT_MODULE to a playwright/index.js path.");
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: response.status, body };
}

async function waitForGameDetailReady(page, game) {
  await page.waitForFunction(
    (gameName) => {
      const text = document.body.innerText;
      return (
        text.toLowerCase().includes(gameName.toLowerCase()) &&
        /Choose how you want to play/i.test(text) &&
        /Play with humans/i.test(text)
      );
    },
    game.name,
    { timeout: 20000 },
  );
}

async function getGuestPlayer(page) {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("arcade_guest_player_v1");
    return raw ? JSON.parse(raw) : null;
  });
}

async function getRoom(roomId) {
  const response = await request(`/api/rooms/${encodeURIComponent(roomId)}`);
  if (response.status !== 200 || !response.body?.room) {
    throw new Error(`Could not load room ${roomId}: ${response.status}`);
  }
  return response.body.room;
}

async function waitForRoom(roomId, predicate, timeoutMs = 20000) {
  const started = Date.now();
  let latest = null;
  while (Date.now() - started < timeoutMs) {
    latest = await getRoom(roomId);
    if (predicate(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  throw new Error(`Timed out waiting for room ${roomId}. Latest: ${JSON.stringify(latest)}`);
}

async function waitForMatchPage(page, gameId, roomId) {
  await page.waitForURL(/\/match\//, { timeout: 15000 });
  await page.waitForFunction(
    ({ gameId: expectedGameId, roomId: expectedRoomId }) => {
      const text = document.body.innerText.toLowerCase();
      return (
        text.includes(`active match: ${expectedGameId}`) &&
        text.includes(`room: ${expectedRoomId}`) &&
        text.includes(`game: ${expectedGameId}`) &&
        !text.includes("loading room")
      );
    },
    { gameId, roomId },
    { timeout: 20000 },
  );
}

async function waitForTurn(page, playerId) {
  await page.waitForFunction(
    (expectedPlayerId) => document.body.innerText.includes(`Current player: ${expectedPlayerId}`),
    playerId,
    { timeout: 15000 },
  );
}

function moveLabel(move) {
  if (!move || typeof move !== "object") return "Play move";
  if ("direction" in move) return String(move.direction);
  if ("x" in move && "y" in move) return `Fire ${String(move.x)},${String(move.y)}`;
  if ("pickId" in move) return `Draft ${String(move.pickId)}`;
  if ("column" in move) return `Column ${Number(move.column) + 1}`;
  return JSON.stringify(move);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function clickMove(page, move) {
  if (move && typeof move === "object" && "column" in move) {
    const column = Number(move.column) + 1;
    await page.getByRole("button", { name: new RegExp(`Drop in column ${column},`, "i") }).first().click({ timeout: 15000 });
    return `Drop in column ${column}`;
  }
  const label = moveLabel(move);
  await page.getByRole("button", { name: new RegExp(`^${escapeRegex(label)}$`, "i") }).click({ timeout: 15000 });
  return label;
}

async function playGame(browser, game) {
  console.log(`checking ${game.id}: two-browser H2H lifecycle`);
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  const hostScreenshot = `evidence/live-proofs/all-game-h2h-${game.id}-host-finished-2026-06-24.png`;
  const guestScreenshot = `evidence/live-proofs/all-game-h2h-${game.id}-guest-finished-2026-06-24.png`;

  try {
    await hostPage.goto(`${baseUrl}/games/${game.id}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForGameDetailReady(hostPage, game);
    const hostGuest = await getGuestPlayer(hostPage);
    await hostPage.getByRole("button", { name: /play with humans/i }).click();
    await hostPage.getByRole("button", { name: /room code/i }).click();
    const roomCode = (await hostPage.locator(`text=/${game.prefix}-[A-Z0-9]{4}/`).first().textContent()) ?? "";
    await hostPage.getByRole("button", { name: /^create room$/i }).click();
    await hostPage.waitForURL(/\/room\//, { timeout: 15000 });
    const roomId = new URL(hostPage.url()).pathname.split("/").filter(Boolean).at(-1) ?? roomCode.toLowerCase();
    await waitForRoom(roomId, (room) => room.status === "waiting" && room.players.length === 1 && room.gameId === game.id);

    await guestPage.goto(`${baseUrl}/room/${roomId}?game=${game.id}&opponent=human&wager=free`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    const guestGuest = await getGuestPlayer(guestPage);
    await guestPage.waitForFunction(
      () => /Join as current wallet/i.test(document.body.innerText) && !/Room not loaded/i.test(document.body.innerText),
      undefined,
      { timeout: 20000 },
    );
    await guestPage.getByRole("button", { name: /join as current wallet/i }).click();
    const readyRoom = await waitForRoom(
      roomId,
      (room) => room.status === "ready" && room.players.length === 2 && room.players[0].id !== room.players[1].id,
      20000,
    );
    await hostPage.getByRole("button", { name: /^start match$/i }).click();
    const activeRoom = await waitForRoom(roomId, (room) => room.status === "active" && room.currentPlayerIds.length > 0, 20000);
    await waitForMatchPage(hostPage, game.id, roomId);
    await waitForMatchPage(guestPage, game.id, roomId);

    const hostId = readyRoom.players[0].id;
    const guestId = readyRoom.players[1].id;
    const pageByPlayer = new Map([
      [hostId, hostPage],
      [guestId, guestPage],
    ]);
    const clickedMoves = [];
    let latest = activeRoom;
    for (let index = 0; index < 120 && latest.status !== "finished"; index += 1) {
      const currentPlayerId = latest.currentPlayerIds?.[0];
      const move = latest.legalMoves?.[0];
      const playerPage = pageByPlayer.get(currentPlayerId);
      if (!currentPlayerId || !move || !playerPage) break;
      await waitForTurn(playerPage, currentPlayerId);
      const previousMoveCount = latest.replay?.moves?.length ?? 0;
      const label = await clickMove(playerPage, move);
      latest = await waitForRoom(
        roomId,
        (room) => room.status === "finished" || (room.replay?.moves?.length ?? 0) > previousMoveCount,
        20000,
      );
      clickedMoves.push({
        playerId: currentPlayerId,
        label,
        statusAfterMove: latest.status,
        turnAfterMove: latest.score?.turn ?? null,
      });
    }

    await waitForRoom(roomId, (room) => room.status === "finished" && Boolean(room.replayHash) && Boolean(room.resultHash), 20000);
    latest = await getRoom(roomId);
    const proof = await request(`/api/proofs/match-${encodeURIComponent(roomId)}`);
    await waitForMatchPage(hostPage, game.id, roomId);
    await waitForMatchPage(guestPage, game.id, roomId);
    await hostPage.screenshot({ path: hostScreenshot, fullPage: true });
    await guestPage.screenshot({ path: guestScreenshot, fullPage: true });

    const verified = {
      guestIdentitiesDistinct:
        typeof hostGuest?.id === "string" && typeof guestGuest?.id === "string" && hostGuest.id !== guestGuest.id,
      roomCreatedFromUi: /^\/room\//.test(new URL(hostPage.url()).pathname) || /\/match\//.test(hostPage.url()),
      guestJoinedFromUi: readyRoom.players.length === 2 && readyRoom.players[0].id !== readyRoom.players[1].id,
      matchStartedFromUi: activeRoom.status === "active" && activeRoom.matchId === `match-${roomId}`,
      browserMovesClicked: clickedMoves.length > 0,
      matchFinished: latest.status === "finished" && latest.result !== null,
      replayAndResultHashesPresent: /^0x/.test(latest.replayHash ?? "") && /^0x/.test(latest.resultHash ?? ""),
      proofIndexed: proof.status === 200 && proof.body?.proof?.matchId === `match-${roomId}` && proof.body?.proof?.gameId === game.id,
      screenshotsPresent: existsSync(hostScreenshot) && existsSync(guestScreenshot),
    };

    return {
      gameId: game.id,
      roomId,
      matchId: `match-${roomId}`,
      roomCode,
      hostGuest,
      guestGuest,
      players: latest.players,
      clickedMoves,
      final: {
        status: latest.status,
        replayHash: latest.replayHash,
        resultHash: latest.resultHash,
        winnerIds: latest.result?.winnerIds ?? [],
        reason: latest.result?.reason ?? null,
      },
      proof: {
        status: proof.status,
        matchId: proof.body?.proof?.matchId ?? null,
        gameId: proof.body?.proof?.gameId ?? null,
      },
      screenshots: {
        hostFinished: resolve(hostScreenshot),
        guestFinished: resolve(guestScreenshot),
      },
      verified,
    };
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
}

mkdirSync(dirname(evidencePath), { recursive: true });
const playwright = await loadPlaywright();
const { chromium } = playwright;
const browser = await chromium.launch({ headless: true });
const rooms = [];

try {
  for (const game of games) {
    rooms.push(await playGame(browser, game));
  }
} finally {
  await browser.close();
}

const verified = {
  allGamesCovered: games.every((game) => rooms.some((room) => room.gameId === game.id)),
  allGuestIdentitiesDistinct: rooms.every((room) => room.verified.guestIdentitiesDistinct),
  allRoomsCreatedJoinedStartedFromUi: rooms.every(
    (room) => room.verified.roomCreatedFromUi && room.verified.guestJoinedFromUi && room.verified.matchStartedFromUi,
  ),
  allMatchesFinishedByBrowserMoves: rooms.every((room) => room.verified.browserMovesClicked && room.verified.matchFinished),
  allProofsIndexed: rooms.every((room) => room.verified.proofIndexed),
  allScreenshotsPresent: rooms.every((room) => room.verified.screenshotsPresent),
};

const evidence = {
  mode: "local-all-game-h2h-browser-ui",
  status:
    rooms.length === games.length &&
    Object.values(verified).every(Boolean) &&
    rooms.every((room) => Object.values(room.verified).every(Boolean))
      ? "passed"
      : "failed",
  checkedAt: new Date().toISOString(),
  url: baseUrl,
  games: games.map((game) => game.id),
  rooms,
  verified,
  conclusion:
    "Every game can be created, joined, started, played to completion, and proof-indexed from two independent guest browser contexts using visible human-vs-human UI controls.",
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (evidence.status !== "passed") {
  console.error(`${evidencePath}: ${evidence.status}`);
  process.exit(1);
}

console.log(`${evidencePath}: ${evidence.status}`);
