import fs from "node:fs/promises";
import path from "node:path";
import { chromium, devices } from "playwright";

const BASE_URL = process.env.PORTFOLIO_BASE_URL ?? "http://127.0.0.1:3000";
const OUT_DIR = path.resolve(process.cwd(), "portfolio-shots");

async function ensureOutDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

async function capture(page, fileName, waitMs = 700, fullPage = true) {
  await page.waitForTimeout(waitMs);
  await page.screenshot({ path: path.join(OUT_DIR, fileName), fullPage });
}

async function safeClick(page, locator) {
  const count = await locator.count();
  if (!count) return false;
  await locator.first().click();
  return true;
}

async function runWorkflow(page, prefix, options = {}) {
  const { fullPage = true } = options;
  let step = 1;
  const name = (label) => `${prefix}-${String(step++).padStart(2, "0")}-${label}.png`;

  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await capture(page, name("home"), 700, fullPage);

  await safeClick(page, page.getByRole("link", { name: /browse/i }));
  await capture(page, name("browse-entry"), 700, fullPage);

  const browseSearchInput = page.locator('main input[placeholder="Search movies or series"]');
  if (await browseSearchInput.count()) {
    await browseSearchInput.fill("batman");
    await capture(page, name("search-batman"), 950, fullPage);
  }

  await safeClick(page, page.getByRole("button", { name: /discover movies/i }));
  await capture(page, name("discover-movies"), 950, fullPage);

  await safeClick(page, page.getByRole("button", { name: /discover series/i }));
  await capture(page, name("discover-series"), 950, fullPage);

  await safeClick(page, page.getByRole("button", { name: /discover kids/i }));
  await capture(page, name("discover-kids"), 950, fullPage);

  const firstTitleLink = page.locator('a[href^="/title/"]').first();
  if (await firstTitleLink.count()) {
    await firstTitleLink.click();
    await capture(page, name("title-details"), 1000, fullPage);
  }

  await page.goto(`${BASE_URL}/auth/sign-in`, { waitUntil: "domcontentloaded" });
  await capture(page, name("auth-sign-in"), 700, fullPage);

  await page.goto(`${BASE_URL}/library`, { waitUntil: "domcontentloaded" });
  await capture(page, name("library"), 700, fullPage);
}

async function captureDesktopWorkflow(browser) {
  const context = await browser.newContext({ viewport: { width: 1536, height: 960 } });
  const page = await context.newPage();
  await runWorkflow(page, "web", { fullPage: true });
  await context.close();
}

async function captureMobileWorkflow(browser) {
  const context = await browser.newContext({ ...devices["iPhone 14"] });
  const page = await context.newPage();
  await runWorkflow(page, "mobile", { fullPage: false });
  await context.close();
}

async function main() {
  await ensureOutDir();
  const browser = await chromium.launch({ headless: true });
  try {
    await captureDesktopWorkflow(browser);
    await captureMobileWorkflow(browser);
  } finally {
    await browser.close();
  }
  console.log(`Saved workflow snapshots to ${OUT_DIR}`);
}

main().catch((error) => {
  console.error("Snapshot capture failed:", error);
  process.exit(1);
});
