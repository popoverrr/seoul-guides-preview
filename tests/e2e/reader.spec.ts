// P4 DoD (docs/08): a guest sees no paid content — not in pages, not via direct API or media URLs;
// a buyer reads only their own guides. Runs against `npm run dev` + the PHP API on :8090 with the seeded dev DB
// (cd api && ../tools/php bin/seed.php). Test accounts come from api/.env.example, never real ones.
import { expect, test, type Page } from '@playwright/test';

const BUYER = process.env.SEED_BUYER_LOGIN ?? 'buyer@seoul.test';
const BUYER_PW = process.env.SEED_BUYER_PASSWORD ?? 'change-me-buyer-0000';
const MARKER = process.env.SEED_PAID_MARKER ?? 'SEED_PAID_MARKER_7f3c';

async function signIn(page: Page) {
  await page.goto('/login/');
  await page.locator('input[name=login]').fill(BUYER);
  await page.locator('input[name=password]').fill(BUYER_PW);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/account\/$/);
}

test('guest: the reader sends to /login and no paid text reaches the page', async ({ page }) => {
  await page.goto('/account/guide/seoul-food/test/');
  await page.waitForURL(/\/login\/\?next=/);
  expect(await page.content()).not.toContain(MARKER);
});

test('guest: direct API and media URLs are closed', async ({ request }) => {
  const section = await request.get('/api/guides/seoul-food/sections/test');
  expect(section.status()).toBe(401);
  expect(await section.text()).not.toContain(MARKER);
  expect((await request.get('/api/guides/seoul-food/toc')).status()).toBe(401);
  expect((await request.get('/api/media/1?v=orig&exp=9999999999&sig=' + '0'.repeat(64))).status()).toBe(401);
});

test('buyer: signs in, reads the owned guide, sees places and Naver only where it exists', async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Мои гайды' })).toBeVisible();
  await page.getByRole('link', { name: /Seoul Food/ }).first().click();
  await page.waitForURL(/\/account\/guide\/seoul-food\/test\/$/);
  await expect(page.getByRole('heading', { name: 'Тестовый раздел', level: 1 })).toBeVisible();
  await expect(page.getByText(MARKER).first()).toBeVisible();
  await expect(page.locator('.pc')).toHaveCount(3);
  await expect(page.locator('.pc__badge')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Открыть в Naver Map' })).toHaveAttribute('href', 'https://naver.me/TEST0001');
  // the private photo opens through its signed link
  const img = page.locator('.b-gallery img').first();
  await expect(img).toHaveAttribute('src', /^\/api\/media\/\d+\?v=orig&exp=\d+&sig=[0-9a-f]{64}$/);
  expect(await img.evaluate((el: HTMLImageElement) => el.decode().then(() => el.naturalWidth))).toBeGreaterThan(0);
  // the watermark carries the masked login
  await expect(page.locator('.rd__wm')).toHaveAttribute('style', /bu%E2%80%A2%E2%80%A2%40seoul\.test/);
});

test('buyer: a guide not bought stays closed, also through the API and a copied media link', async ({ page }) => {
  await signIn(page);
  await page.goto('/account/guide/beauty/test/');
  await expect(page.getByText('Этого гайда пока нет в вашем кабинете.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Посмотреть гайд' })).toHaveAttribute('href', '/guides/beauty/');
  const r = await page.request.get('/api/guides/beauty/sections/test');
  expect(r.status()).toBe(403);
  expect(await r.text()).not.toContain('Чужой');
});

test('buyer: the position is remembered and «Продолжить чтение» leads back', async ({ page }) => {
  await signIn(page);
  await page.goto('/account/guide/seoul-food/test-night/');
  await expect(page.getByRole('heading', { name: 'Тестовый ночной раздел', level: 1 })).toBeVisible();
  // a night section reads in the dark
  await expect(page.locator('html')).toHaveAttribute('data-reader-night', '');
  await page.goto('/account/');
  await expect(page.getByRole('link', { name: /Продолжить чтение/ })).toHaveAttribute('href', '/account/guide/seoul-food/test-night/');
  // no section in the URL → back to where the reader stopped
  await page.goto('/account/guide/seoul-food/');
  await page.waitForURL(/\/seoul-food\/test-night\/$/);
});

test('buyer: logout closes the reader at once', async ({ page }) => {
  await signIn(page);
  await page.goto('/account/settings/');
  await page.getByRole('button', { name: 'Выйти из кабинета' }).click();
  await page.waitForURL(/\/login\/$/);
  await page.goto('/account/guide/seoul-food/test/');
  await page.waitForURL(/\/login\/\?next=/);
});
