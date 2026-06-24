import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const baseUrl = process.env.ARCADE_LOCAL_URL ?? "http://localhost:3021";
const runId = Date.now().toString(36);
const evidencePath = "evidence/live-proofs/home-start-actions-2026-06-24.json";
const humanScreenshotPath = "evidence/live-proofs/home-start-human-room-2026-06-24.png";
const agentScreenshotPath = "evidence/live-proofs/home-start-agent-match-2026-06-24.png";
const humanWagerScreenshotPath = "evidence/live-proofs/home-start-human-wager-room-2026-06-24.png";
const agentWagerScreenshotPath = "evidence/live-proofs/home-start-agent-wager-room-2026-06-24.png";
const freeAgentId = `home-start-agent-${runId}`;
const freeAgentName = `Home Start Agent ${runId.toUpperCase()}`;
const wagerAgentId = `home-wager-agent-${runId}`;
const wagerAgentName = `Home Wager Agent ${runId.toUpperCase()}`;
const ownerWallet = "0x000000000000000000000000000000000000A11c";
const tinyWagerWei = "100000000000000";
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

async function registerAgent({ agentId, displayName, wagerEnabled, maxWagerWei }) {
  return request("/api/agents", {
    method: "POST",
    body: JSON.stringify({
      agentId,
      ownerWallet,
      displayName,
      supportedGames: ["grid-four"],
      bankrollPolicy: "testnet only; home start proof",
      status: "qualified",
      freeEnabled: true,
      wagerEnabled,
      maxWagerWei,
      endpointUrl: null,
    }),
  });
}

async function waitForBody(page, pattern) {
  await page.waitForFunction(
    (source) => new RegExp(source, "i").test(document.body.innerText),
    pattern.source,
    { timeout: 15000 },
  );
}

async function waitForRenderedRoom(page) {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        /Room GR-[A-Z0-9]{4}/i.test(text) &&
        /Wager: Free match/i.test(text) &&
        /Players:/i.test(text) &&
        !/Room not loaded/i.test(text) &&
        !/Waiting for room state/i.test(text)
      );
    },
    undefined,
    { timeout: 20000 },
  );
}

async function waitForRenderedWagerRoom(page, expectedPlayerPattern) {
  await page.waitForFunction(
    (playerSource) => {
      const text = document.body.innerText;
      const playerPattern = new RegExp(playerSource, "i");
      return (
        /Room GR-[A-Z0-9]{4}/i.test(text) &&
        /Wager: 0\.0001 testnet 0G/i.test(text) &&
        /Wager escrow/i.test(text) &&
        /Each player funds 0\.0001 testnet 0G before start/i.test(text) &&
        playerPattern.test(text) &&
        !/Room not loaded/i.test(text) &&
        !/Waiting for room state/i.test(text)
      );
    },
    expectedPlayerPattern.source,
    { timeout: 20000 },
  );
}

async function waitForRenderedAgentMatch(page) {
  await page.waitForFunction(
    () => {
      const text = document.body.innerText;
      return (
        /Active Match: grid-four/i.test(text) &&
        /Shared room match/i.test(text) &&
        /Game: grid-four/i.test(text) &&
        /Opponent: agent/i.test(text) &&
        !/Loading room/i.test(text)
      );
    },
    undefined,
    { timeout: 20000 },
  );
}

mkdirSync(dirname(evidencePath), { recursive: true });
const freeAgentRegistration = await registerAgent({
  agentId: freeAgentId,
  displayName: freeAgentName,
  wagerEnabled: false,
  maxWagerWei: "0",
});
const wagerAgentRegistration = await registerAgent({
  agentId: wagerAgentId,
  displayName: wagerAgentName,
  wagerEnabled: true,
  maxWagerWei: tinyWagerWei,
});

const playwright = await loadPlaywright();
const { chromium } = playwright;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
await waitForBody(page, /choose how you want to play/);

await page.getByRole("button", { name: /play with humans/i }).click();
await page.getByRole("button", { name: /room code/i }).click();
const roomCode = (await page.locator("text=/GR-[A-Z0-9]{4}/").first().textContent()) ?? "";
await page.getByRole("button", { name: /^create room$/i }).click();
await page.waitForURL(/\/room\//, { timeout: 15000 });
await waitForRenderedRoom(page);
const humanUrl = page.url();
const humanText = await page.locator("body").innerText();
await page.screenshot({ path: humanScreenshotPath, fullPage: true });

await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
await waitForBody(page, /choose how you want to play/);
await page.getByRole("button", { name: new RegExp(freeAgentName, "i") }).click();
await page.getByRole("button", { name: /play selected 0g agent/i }).click();
await page.waitForURL(/\/match\//, { timeout: 20000 });
await waitForRenderedAgentMatch(page);
const agentUrl = page.url();
const agentText = await page.locator("body").innerText();
await page.screenshot({ path: agentScreenshotPath, fullPage: true });

await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
await waitForBody(page, /choose how you want to play/);
await page.getByRole("button", { name: /play with humans/i }).click();
await page.getByRole("button", { name: /testnet wager/i }).click();
await page.getByRole("button", { name: /room code/i }).click();
const wagerHumanRoomCode = (await page.locator("text=/GR-[A-Z0-9]{4}/").first().textContent()) ?? "";
await page.getByRole("button", { name: /^create room$/i }).click();
await page.waitForURL(/\/room\//, { timeout: 15000 });
await waitForRenderedWagerRoom(page, /Players: Guest [A-Z0-9]{6}/);
const humanWagerUrl = page.url();
const humanWagerText = await page.locator("body").innerText();
await page.screenshot({ path: humanWagerScreenshotPath, fullPage: true });

await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
await waitForBody(page, /choose how you want to play/);
await page.getByRole("button", { name: /testnet wager/i }).click();
await page.getByRole("button", { name: new RegExp(wagerAgentName, "i") }).click();
await page.getByRole("button", { name: /play selected 0g agent/i }).click();
await page.waitForURL(/\/room\//, { timeout: 15000 });
await waitForRenderedWagerRoom(page, new RegExp(`Players: Guest [A-Z0-9]{6}, ${wagerAgentName}`, "i"));
const agentWagerUrl = page.url();
const agentWagerText = await page.locator("body").innerText();
await page.screenshot({ path: agentWagerScreenshotPath, fullPage: true });
await browser.close();

const verified = {
  agentRegistered: freeAgentRegistration.status === 201 && wagerAgentRegistration.status === 201,
  humanRoomCodeCreated: /^GR-[A-Z0-9]{4}$/.test(roomCode) && /\/room\//.test(humanUrl),
  humanRoomScreenLoaded:
    /Room/i.test(humanText) &&
    /Free match/i.test(humanText) &&
    /Start match/i.test(humanText) &&
    !/Room not loaded|Waiting for room state/i.test(humanText),
  agentSelectedFromHome: agentText.includes("Game: grid-four") || agentUrl.includes("game=grid-four"),
  agentMatchStarted: /\/match\//.test(agentUrl) && /Active Match/i.test(agentText) && /Opponent: agent/i.test(agentText),
  humanWagerRoomCreated:
    /^GR-[A-Z0-9]{4}$/.test(wagerHumanRoomCode) &&
    /\/room\//.test(humanWagerUrl) &&
    /Wager: 0\.0001 testnet 0G/i.test(humanWagerText),
  humanWagerStopsBeforeStart:
    /WAITING/i.test(humanWagerText) &&
    /Wager escrow/i.test(humanWagerText) &&
    /Fund wager from wallet/i.test(humanWagerText) &&
    !/Active Match/i.test(humanWagerText),
  agentWagerRoomCreated:
    /\/room\//.test(agentWagerUrl) &&
    /READY/i.test(agentWagerText) &&
    /Wager: 0\.0001 testnet 0G/i.test(agentWagerText) &&
    new RegExp(wagerAgentName, "i").test(agentWagerText),
  agentWagerStopsBeforeStart:
    /Wager escrow/i.test(agentWagerText) &&
    /Each player funds 0\.0001 testnet 0G before start/i.test(agentWagerText) &&
    !/Active Match/i.test(agentWagerText),
};

const evidence = {
  mode: "local-home-start-actions-browser-ui",
  status: Object.values(verified).every(Boolean) ? "passed" : "failed",
  checkedAt: new Date().toISOString(),
  url: baseUrl,
  registeredAgent: {
    freeAgentId,
    freeAgentName,
    freeAgentStatus: freeAgentRegistration.status,
    wagerAgentId,
    wagerAgentName,
    wagerAgentStatus: wagerAgentRegistration.status,
  },
  screenshots: {
    humanRoom: resolve(humanScreenshotPath),
    agentMatch: resolve(agentScreenshotPath),
    humanWagerRoom: resolve(humanWagerScreenshotPath),
    agentWagerRoom: resolve(agentWagerScreenshotPath),
  },
  observed: {
    roomCode,
    humanUrl,
    agentUrl,
    wagerHumanRoomCode,
    humanWagerUrl,
    agentWagerUrl,
    humanTextPreview: humanText.slice(0, 1000),
    agentTextPreview: agentText.slice(0, 1000),
    humanWagerTextPreview: humanWagerText.slice(0, 1000),
    agentWagerTextPreview: agentWagerText.slice(0, 1000),
  },
  verified,
  conclusion:
    "The localhost home route can start free human rooms, free selected-agent matches, tiny-wager human rooms, and tiny-wager selected-agent rooms through the visible match setup controls. Wager rooms stop at the escrow room screen before match start.",
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (evidence.status !== "passed") {
  console.error(`${evidencePath}: ${evidence.status}`);
  process.exit(1);
}

console.log(`${evidencePath}: ${evidence.status}`);
