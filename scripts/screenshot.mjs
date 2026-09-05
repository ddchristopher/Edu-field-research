// Renders the dashboard in headless Chromium and saves screenshots for review.
// Usage: node scripts/screenshot.mjs [baseUrl] [outDir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const base = process.argv[2] || 'http://localhost:8080/';
const outDir = resolve(process.argv[3] || 'qa');
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const shots = [
  { name: 'desktop-light', width: 1440, height: 900, scheme: 'light' },
  { name: 'desktop-dark', width: 1440, height: 900, scheme: 'dark' },
  { name: 'tablet-light', width: 900, height: 1000, scheme: 'light' },
  { name: 'mobile-light', width: 390, height: 844, scheme: 'light' }
];
let failures = 0;
for (const s of shots) {
  const context = await browser.newContext({ viewport: { width: s.width, height: s.height }, colorScheme: s.scheme, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('requestfailed', r => { if (!r.url().includes('fonts.g')) errors.push('requestfailed: ' + r.url()); });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.waitForSelector('body.is-ready', { timeout: 15000 }).catch(() => errors.push('body.is-ready never appeared'));
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  if (overflow) errors.push('horizontal overflow detected');
  const file = resolve(outDir, `${s.name}.png`);
  await page.screenshot({ path: file, fullPage: s.name !== 'mobile-light' });
  // Section crops for closer inspection on desktop light.
  if (s.name === 'desktop-light' || s.name === 'desktop-dark') {
    const suffix = s.name === 'desktop-dark' ? '-dark' : '';
    // hover a line chart point to capture the tooltip (scroll first so the element does not move under the pointer)
    const card = await page.$('#chart-absenteeism');
    if (card) {
      await card.scrollIntoViewIfNeeded();
      const box = await (await card.$('svg')).boundingBox();
      await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5);
      await page.waitForTimeout(200);
      await card.screenshot({ path: resolve(outDir, `tooltip-absenteeism${suffix}.png`) });
      await page.mouse.move(0, 0);
    }
    // section crops with the sticky masthead hidden so it does not overlay the crop
    await page.addStyleTag({ content: '.masthead{visibility:hidden}' });
    for (const id of ['overview', 'ai', 'math', 'briefing', 'sources']) {
      const el = await page.$('#' + id);
      if (el) await el.screenshot({ path: resolve(outDir, `section-${id}${suffix}.png`) });
    }
  }
  if (s.name === 'mobile-light') {
    // viewport-sized crops at the top and at each section instead of one huge full-page image
    for (const id of ['top', 'overview', 'ai', 'math', 'briefing']) {
      if (id !== 'top') await page.evaluate(sel => document.querySelector(sel).scrollIntoView(), '#' + id);
      await page.waitForTimeout(200);
      await page.screenshot({ path: resolve(outDir, `mobile-${id}.png`), fullPage: false });
    }
  }
  console.log(`${s.name}: ${file}${errors.length ? '\n  ' + errors.join('\n  ') : ' (no errors)'}`);
  if (errors.length) failures++;
  await context.close();
}
await browser.close();
process.exit(failures ? 1 : 0);
