import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = process.cwd();
const baseUrl = process.env.ARCADE_LOCAL_URL ?? "http://localhost:3021";
const evidencePath = "evidence/live-proofs/home-product-flow-2026-06-24.json";
const screenshotPath = "evidence/live-proofs/home-product-flow-2026-06-24.png";
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

async function visibleText(page, text) {
  return (await page.getByText(text, { exact: false }).first().isVisible().catch(() => false)) === true;
}

function includesAll(haystack, needles) {
  const normalized = haystack.toLowerCase();
  return Object.fromEntries(needles.map((needle) => [needle, normalized.includes(needle.toLowerCase())]));
}

mkdirSync(dirname(evidencePath), { recursive: true });

const playwright = await loadPlaywright();
const { chromium } = playwright;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

await page.goto(baseUrl, { waitUntil: "networkidle", timeout: 30000 });

const initialText = await page.locator("body").innerText();
const navChecks = includesAll(initialText, ["Games", "Agents", "Submit", "Leaderboard", "Explorer"]);
const heroChecks = includesAll(initialText, [
  "Featured game",
  "Grid Four",
  "Choose how you want to play",
  "Play with 0G agent",
  "Play with humans",
  "Free match",
  "Testnet wager",
  "All Games",
  "Submit Game",
]);

await page.getByRole("button", { name: /play with humans/i }).click();
await page.getByRole("button", { name: /room code/i }).click();
const roomCodeText = await page.locator("body").innerText();
const humanRoomChecks = includesAll(roomCodeText, ["Your room code", "Create room", "Join with room code", "Join room"]);
const generatedRoomCode = await page.locator("text=/GR-[A-Z0-9]{4}/").first().textContent().catch(() => "");

await page.getByRole("button", { name: /testnet wager/i }).click();
const wagerInput = page.locator('input[inputmode="decimal"]').first();
const wagerEnabled = (await wagerInput.isEnabled().catch(() => false)) === true;
const wagerAmount = await wagerInput.inputValue().catch(() => "");

await page.getByRole("button", { name: /play with 0g agent/i }).click();
const agentText = await page.locator("body").innerText();
const agentChecks = includesAll(agentText, ["Qualified agents", "Play selected 0G agent"]);

const forbiddenHomeTechnicalTerms = [
  "ArcadeMatchRegistry",
  "ArcadeWagerEscrow",
  "DA batch candidate",
  "Proof artifact root",
  "Disperser",
];
const forbiddenTermChecks = Object.fromEntries(
  forbiddenHomeTechnicalTerms.map((term) => [term, !initialText.toLowerCase().includes(term.toLowerCase())]),
);

await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

const verified = {
  nav: Object.values(navChecks).every(Boolean),
  featuredHero: Object.values(heroChecks).every(Boolean),
  humanRoomCodeFlow: Object.values(humanRoomChecks).every(Boolean) && /^GR-[A-Z0-9]{4}$/.test(generatedRoomCode ?? ""),
  wagerControl: wagerEnabled && wagerAmount === "0.0001",
  agentControl: Object.values(agentChecks).every(Boolean),
  technicalDetailsMovedOutOfHome: Object.values(forbiddenTermChecks).every(Boolean),
};

const evidence = {
  mode: "local-home-product-flow-browser-ui",
  status: Object.values(verified).every(Boolean) ? "passed" : "failed",
  checkedAt: new Date().toISOString(),
  url: baseUrl,
  screenshot: resolve(screenshotPath),
  verified,
  observed: {
    navChecks,
    heroChecks,
    humanRoomChecks,
    generatedRoomCode,
    wagerEnabled,
    wagerAmount,
    agentChecks,
    forbiddenTermChecks,
    initialTextPreview: initialText.slice(0, 1200),
  },
  conclusion:
    "The localhost home route renders as a product-first featured game surface with match setup controls, while technical 0G proof/contract details remain off the home CTA surface.",
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);

if (evidence.status !== "passed") {
  console.error(`${evidencePath}: ${evidence.status}`);
  process.exit(1);
}

console.log(`${evidencePath}: ${evidence.status}`);
