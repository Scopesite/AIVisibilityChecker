import { openContext, fetchRenderedHTML } from './renderer';
import { runSeoChecks } from './checks/seo';
import { runSchemaChecks } from './checks/schema';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function validateUrl(url: string) {
  const runId = Date.now().toString();
  const { browser, ctx } = await openContext();
  try {
    const { page, html, title, outDir } = await fetchRenderedHTML(ctx, url, runId);

    // EMPTY DOM fallback / retry logic
    if (!html || html.replace(/\s+/g, '').length < 500) {
      // retry once with different viewport (looks more human)
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
    }

    const finalHtml = await page.content();

    // if still empty, declare bot-blocked
    if (!finalHtml || finalHtml.replace(/\s+/g, '').length < 500) {
      await fs.writeFile(path.join(outDir, 'bot_blocked.txt'), 'Site likely served blank to automation', 'utf8');
      return {
        status: 'blocked',
        message: 'Target served empty DOM (likely bot protection). See /out for evidence.',
        outDir
      };
    }

    // RUN CHECKS from the same DOM
    const seo = await runSeoChecks(page);      // reads post-JS <head>, H1, etc
    const schema = await runSchemaChecks(page); // parses JSON-LD blocks

    const report = { url, runId, status: 'ok', seo, schema, outDir, ts: new Date().toISOString() };
    await fs.writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
    return report;
  } finally {
    await ctx.close();
    await browser.close();
  }
}