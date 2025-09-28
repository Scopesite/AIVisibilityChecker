import { chromium, Browser, BrowserContext, Page } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/124.0.0.0 Safari/537.36';

export async function openContext(): Promise<{browser: Browser, ctx: BrowserContext}> {
  const browser = await chromium.launch({ headless: true, args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1366, height: 768 },
    javaScriptEnabled: true,
    locale: 'en-GB',
    timezoneId: 'Europe/London',
  });

  // reduce bot signals
  await ctx.addInitScript(() => {
    // @ts-ignore
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  return { browser, ctx };
}

export async function fetchRenderedHTML(ctx: BrowserContext, url: string, runId: string) {
  const page = await ctx.newPage();

  // DO NOT block stylesheets; minimal blocking only
  await page.route('**/*', (route) => {
    const t = route.request().resourceType();
    if (['font', 'media'].includes(t)) return route.abort();
    return route.continue();
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });

  // extra settle to let head/meta mutate
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);

  const html = await page.content();
  const title = await page.title();

  // persist evidence
  const outDir = path.join(process.cwd(), 'out', runId);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'dom.html'), html, 'utf8');
  await page.screenshot({ path: path.join(outDir, 'screenshot.png'), fullPage: true });

  return { page, html, title, outDir };
}