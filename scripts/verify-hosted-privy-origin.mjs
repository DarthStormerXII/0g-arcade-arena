import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const hostedUrl = process.env.ARCADE_HOSTED_URL ?? "https://0g-arcade-arena.gabrielaxy.workers.dev/";
const evidencePath = "evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.json";
const screenshotPath = "evidence/live-proofs/hosted-privy-origin-blocker-2026-06-24.png";
const candidatePlaywrightModules = [
  process.env.PLAYWRIGHT_MODULE,
  join(root, "node_modules/playwright/index.js"),
  "/Users/gabrielantonyxaviour/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js",
].filter(Boolean);

async function loadPlaywright() {
  for (const modulePath of candidatePlaywrightModules) {
    if (!existsSync(modulePath)) continue;
    const mod = await import(modulePath);
    return mod.default ?? mod;
  }
  throw new Error("Playwright is not available. Set PLAYWRIGHT_MODULE to a playwright/index.js path.");
}

function normalize(text) {
  return text.toLowerCase();
}

function classifyConsoleEvent(text) {
  if (/frame-ancestors|not allowed|allowlist|403|postmessage/i.test(text)) return "origin-blocked";
  if (/err_name_not_resolved/i.test(text)) return "network-resource";
  if (/privy/i.test(text)) return "privy";
  return "other";
}

mkdirSync(dirname(evidencePath), { recursive: true });
const playwright = await loadPlaywright();
const { chromium } = playwright;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const consoleEvents = [];
page.on("console", (msg) => {
  const text = msg.text();
  if (/privy|frame-ancestors|allowlist|403|postMessage|ERR_NAME_NOT_RESOLVED/i.test(text)) {
    consoleEvents.push({ type: msg.type(), class: classifyConsoleEvent(text), text: text.slice(0, 800) });
  }
});
page.on("pageerror", (error) => consoleEvents.push({ type: "pageerror", class: "pageerror", text: String(error.message).slice(0, 800) }));

await page.goto(hostedUrl, { waitUntil: "networkidle", timeout: 30000 });
const firstViewportText = await page.locator("body").innerText();
const buttons = await page.locator("button").evaluateAll((items) => items.map((item) => item.textContent?.trim()).filter(Boolean));
const loginButton = page.getByRole("button", { name: /^login$/i });
let clickedLogin = false;
if (await loginButton.count()) {
  await loginButton.click();
  clickedLogin = true;
  await page.waitForTimeout(4000);
}
const textAfterClick = await page.locator("body").innerText();
await page.screenshot({ path: screenshotPath, fullPage: true });
await browser.close();

const normalizedBefore = normalize(firstViewportText);
const normalizedAfter = normalize(textAfterClick);
const originBlocked = consoleEvents.some((event) => event.class === "origin-blocked");
const notAuthenticated = !normalizedAfter.includes("signed in");
const staleCopy = normalizedBefore.includes("tournament paths");
const authSucceeded = normalizedAfter.includes("signed in") && !originBlocked;
const status = authSucceeded ? "passed" : "blocked";

const evidence = {
  mode: "hosted-privy-origin-check",
  status,
  checkedAt: new Date().toISOString(),
  url: hostedUrl,
  screenshot: screenshotPath,
  clickedLogin,
  assertions: {
    hostedRouteLoads: normalizedBefore.includes("0g arcade arena"),
    loginButtonPresent: buttons.some((button) => /^login$/i.test(button ?? "")),
    privyBlockedByOriginOrCsp: originBlocked,
    hostedBundleAppearsStale: staleCopy,
    notAuthenticated,
  },
  observed: {
    firstViewportText: firstViewportText.slice(0, 1000),
    buttons,
    consoleEvents,
  },
  conclusion: authSucceeded
    ? "Hosted Workers origin accepted Privy and rendered an authenticated session."
    : "Hosted Workers origin is reachable, but production Privy auth is not proven: Privy iframe/API is blocked for this origin or the hosted bundle is stale. Localhost Privy remains the verified auth path.",
};

writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`${evidencePath}: ${evidence.status}`);
