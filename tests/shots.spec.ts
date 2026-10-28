// npm run shots [-- --grep "390"] — full-page and per-chapter screenshots into qa/shots/<phase>/ (docs/10 § 1).
// PHASE=p2 ONLY=/ npm run shots
import { test, type Page } from '@playwright/test';

const PHASE = process.env.PHASE ?? 'p2';
const URLS = (process.env.ONLY ?? '/,/guides/seoul-food/,/prepare/,/tours/christmas-glow/,/lab/').split(',');
const VIEWPORTS = [
  { w: 390, h: 844, touch: true },
  { w: 375, h: 667, touch: true },
  { w: 360, h: 800, touch: true },
  { w: 430, h: 932, touch: true },
  { w: 1440, h: 900, touch: false },
];

const slug = (u: string) => (u === '/' ? 'home' : u.replace(/^\/|\/$/g, '').replace(/\//g, '-'));

async function settle(page: Page) {
  // scroll through once so lazy images load and once-only reveals finish, then back to top
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += innerHeight * 0.8) {
      scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    scrollTo(0, 0);
  });
  await page.waitForTimeout(1600);
}

for (const vp of VIEWPORTS) {
  for (const url of URLS) {
    test(`${slug(url)} ${vp.w}`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: vp.touch ? 2 : 1,
        isMobile: vp.touch,
        hasTouch: vp.touch,
        // full-page shots show the finished layout: scroll-bound masks would be closed at the top
        reducedMotion: 'reduce',
      });
      const page = await ctx.newPage();
      const res = await page.goto(url, { waitUntil: 'networkidle' });
      test.skip(!res || res.status() === 404, `${url} not built yet`);
      await settle(page);
      const dir = `../qa/shots/${PHASE}`;
      await page.screenshot({ path: `${dir}/${slug(url)}-${vp.w}.png`, fullPage: true });
      // per-chapter frames on the main mobile size
      if (vp.w === 390) {
        const ids = await page.$$eval('main > section[id]', (els) => els.map((e) => e.id));
        for (const id of ids) {
          await page.locator(`#${id}`).scrollIntoViewIfNeeded();
          await page.waitForTimeout(900);
          await page.screenshot({ path: `${dir}/${slug(url)}-${vp.w}-${id}.png` });
        }
      }
      await ctx.close();
    });
  }
}
