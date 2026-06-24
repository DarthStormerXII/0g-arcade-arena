import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const baseUrl = process.env.ARCADE_LOCAL_URL ?? "http://localhost:3021";
const runId = Date.now().toString(36);
const evidencePath = "evidence/live-proofs/game-detail-start-actions-2026-06-24.json";
const ownerWallet = "0x000000000000000000000000000000000000A11c";
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

async function registerAgent(game) {
  const agentId = `detail-start-${game.id}-${runId}`;
  const displayName = `Detail Start ${game.name} ${runId.toUpperCase()}`;
  const registration = await request("/api/agents", {
    method: "POST",
    body: JSON.stringify({
      agentId,
      ownerWallet,
      displayName,
      supportedGames: [game.id],
      bankrollPolicy: "testnet only; game detail start proof",
      status: "qualified",
      freeEnabled: true,
      wagerEnabled: false,
      maxWagerWei: "0",
      endpointUrl: null,
    }),
  });
  return { agentId, displayName, registration };
}

async function waitForGameDetailReady(page, game, displayName = null) {
  await page.waitForFunction(
    ({ gameName, agentName }) => {
      const text = document.body.innerText;
      const lowerText = text.toLowerCase();
      const images = [...document.querySelectorAll("img")];
      const renderedImages = images.filter((image) => {
        const box = image.getBoundingClientRect();
        return image.complete && box.width >= 40 && box.height >= 40;
      });
      return (
        lowerText.includes(gameName.toLowerCase()) &&
        /Choose how you want to play/i.test(text) &&
        /Play with 0G agent/i.test(text) &&
        /Play with humans/i.test(text) &&
        (!agentName || lowerText.includes(agentName.toLowerCase())) &&
        renderedImages.length >= 2
      );
    },
    { gameName: game.name, agentName: displayName },
    { timeout: 20000 },
  );
}

async function waitForHumanRoom(page, game) {
  await page.waitForFunction(
    ({ gameId, prefix }) => {
      const text = document.body.innerText;
      return (
        new RegExp(`Room ${prefix}-[A-Z0-9]{4}`, "i").test(text) &&
        text.includes(`Game: ${gameId}`) &&
        /Wager: Free match/i.test(text) &&
        /Players: Guest [A-Z0-9]{6}/i.test(text) &&
        /Start match/i.test(text) &&
        !/Room not loaded/i.test(text) &&
        !/Waiting for room state/i.test(text)
      );
    },
    { gameId: game.id, prefix: game.prefix },
    { timeout: 20000 },
  );
}

async function waitForAgentMatch(page, game) {
  await page.waitForFunction(
    (gameId) => {
      const text = document.body.innerText;
      const lowerText = text.toLowerCase();
      return (
        lowerText.includes(`active match: ${gameId}`) &&
        /Shared room match/i.test(text) &&
        lowerText.includes(`game: ${gameId}`) &&
        /Opponent: (agent|0G agent)/i.test(text) &&
        !/Loading room/i.test(text)
      );
    },
    game.id,
    { timeout: 25000 },
  );
}

mkdirSync(dirname(evidencePath), { recursive: true });
const agentRecords = [];
for (const game of games) {
  agentRecords.push({ game, ...(await registerAgent(game)) });
}

const playwright = await loadPlaywright();
const { chromium } = playwright;
const browser = await chromium.launch({ headless: true });
const routeResults = [];

try {
  for (const record of agentRecords) {
    const { game, displayName, registration } = record;
    const route = `/games/${game.id}`;
    const humanScreenshot = `evidence/live-proofs/game-detail-start-${game.id}-human-room-2026-06-24.png`;
    const agentScreenshot = `evidence/live-proofs/game-detail-start-${game.id}-agent-match-2026-06-24.png`;

    console.log(`checking ${game.id}: detail -> human room`);
    const humanPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await humanPage.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForGameDetailReady(humanPage, game, displayName);
    const detailText = await humanPage.locator("body").innerText();
    const detailImagesRendered = await humanPage.locator("img").evaluateAll(
      (images) =>
        images.filter((image) => {
          const box = image.getBoundingClientRect();
          return image.complete && box.width >= 40 && box.height >= 40;
        }).length >= 2,
    );

    await humanPage.getByRole("button", { name: /play with humans/i }).click();
    await humanPage.getByRole("button", { name: /room code/i }).click();
    const roomCode = (await humanPage.locator(`text=/${game.prefix}-[A-Z0-9]{4}/`).first().textContent()) ?? "";
    await humanPage.getByRole("button", { name: /^create room$/i }).click();
    await humanPage.waitForURL(/\/room\//, { timeout: 15000 });
    await waitForHumanRoom(humanPage, game);
    const humanUrl = humanPage.url();
    const humanText = await humanPage.locator("body").innerText();
    await humanPage.screenshot({ path: humanScreenshot, fullPage: true });
    await humanPage.close();

    console.log(`checking ${game.id}: detail -> agent match`);
    const agentPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await agentPage.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForGameDetailReady(agentPage, game);
    await agentPage.getByRole("button", { name: new RegExp(displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).click();
    await agentPage.getByRole("button", { name: /play selected 0g agent/i }).click();
    await agentPage.waitForURL(/\/match\//, { timeout: 20000 });
    await waitForAgentMatch(agentPage, game);
    const agentUrl = agentPage.url();
    const agentText = await agentPage.locator("body").innerText();
    await agentPage.screenshot({ path: agentScreenshot, fullPage: true });
    await agentPage.close();

    const verified = {
      agentRegistered: registration.status === 201,
      detailRouteLoaded: detailText.toLowerCase().includes(game.name.toLowerCase()),
      coverAndLogoRendered: detailImagesRendered,
      humanRoomCodeCreated: new RegExp(`^${game.prefix}-[A-Z0-9]{4}$`, "i").test(roomCode) && /\/room\//.test(humanUrl),
      humanRoomScreenLoaded:
        humanText.includes(`Game: ${game.id}`) &&
        /Free match/i.test(humanText) &&
        /Start match/i.test(humanText) &&
        !/Room not loaded|Waiting for room state/i.test(humanText),
      agentSelected: new RegExp(displayName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(detailText),
      agentMatchStarted:
        /\/match\//.test(agentUrl) &&
        agentText.toLowerCase().includes(`active match: ${game.id}`) &&
        agentText.toLowerCase().includes(`game: ${game.id}`) &&
        /Opponent: (agent|0G agent)/i.test(agentText),
    };

    routeResults.push({
      gameId: game.id,
      gameName: game.name,
      agentId: record.agentId,
      displayName,
      registrationStatus: registration.status,
      route: `${baseUrl}${route}`,
      roomCode,
      humanUrl,
      agentUrl,
      screenshots: {
        humanRoom: resolve(humanScreenshot),
        agentMatch: resolve(agentScreenshot),
      },
      observed: {
        detailTextPreview: detailText.slice(0, 1000),
        humanTextPreview: humanText.slice(0, 1000),
        agentTextPreview: agentText.slice(0, 1000),
      },
      verified,
    });
  }
} finally {
  await browser.close();
}

const verified = {
  allGamesCovered: games.every((game) => routeResults.some((result) => result.gameId === game.id)),
  allAgentsRegistered: routeResults.every((result) => result.verified.agentRegistered),
  allDetailRoutesLoaded: routeResults.every((result) => result.verified.detailRouteLoaded),
  allHumanRoomsCreated: routeResults.every((result) => result.verified.humanRoomCodeCreated && result.verified.humanRoomScreenLoaded),
  allAgentMatchesStarted: routeResults.every((result) => result.verified.agentSelected && result.verified.agentMatchStarted),
  allScreenshotsPresent: routeResults.every(
    (result) => existsSync(result.screenshots.humanRoom) && existsSync(result.screenshots.agentMatch),
  ),
};

const evidence = {
  mode: "local-game-detail-start-actions-browser-ui",
  status:
    routeResults.length === games.length &&
    Object.values(verified).every(Boolean) &&
    routeResults.every((result) => Object.values(result.verified).every(Boolean))
      ? "passed"
      : "failed",
  checkedAt: new Date().toISOString(),
  url: baseUrl,
  games: games.map((game) => game.id),
  routes: routeResults,
  verified,
  conclusion:
    "Every game detail page renders cover/logo art, registers and selects a fresh qualified free-play agent, creates a free human room-code room, and starts a free selected-agent match through the visible UI controls.",
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (evidence.status !== "passed") {
  console.error(`${evidencePath}: ${evidence.status}`);
  process.exit(1);
}

console.log(`${evidencePath}: ${evidence.status}`);
