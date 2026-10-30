// P5 DoD (docs/08): access is given from a phone in ≤ 60 s; unlocking a Naver field writes the audit log;
// publishing starts the workflow (dry run without a GitHub token). Runs against `npm run dev` + the PHP API on :8090
// with the seeded dev DB. Test accounts come from api/.env.example, never real ones.
import { expect, test, type Page } from '@playwright/test';

const ADMIN = process.env.SEED_ADMIN_LOGIN ?? 'admin@seoul.test';
const ADMIN_PW = process.env.SEED_ADMIN_PASSWORD ?? 'change-me-admin-0000';

async function signIn(page: Page, next: string) {
  await page.goto('/login/?next=' + encodeURIComponent(next));
  await page.locator('input[name=login]').fill(ADMIN);
  await page.locator('input[name=password]').fill(ADMIN_PW);
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(new RegExp(next.replace(/\//g, '\\/') + '$'));
}

test.use({ viewport: { width: 390, height: 844 } });

test('give access from a phone in under 60 seconds, and the buyer can read', async ({ page, browser }) => {
  await signIn(page, '/admin/users/new/');
  const started = Date.now();
  const phone = '8 701 ' + String(Date.now()).slice(-7).replace(/(\d{3})(\d{2})(\d{2})/, '$1 $2 $3');
  await page.locator('input[name=buyer-name]').fill('Покупатель e2e');
  await page.locator('input[name=buyer-phone]').fill(phone);
  await page.getByRole('checkbox', { name: 'Seoul Food' }).check();
  await page.getByRole('button', { name: 'Выдать доступ' }).click();
  await expect(page.getByRole('heading', { name: 'Доступ выдан' })).toBeVisible();
  const seconds = (Date.now() - started) / 1000;
  expect(seconds).toBeLessThan(60);
  console.log(`access given in ${seconds.toFixed(1)} s`);

  const message = (await page.locator('.ad-message__v').textContent()) ?? '';
  expect(message).toContain('Seoul Food');
  expect(message).not.toMatch(/[—–]/);
  await expect(page.getByRole('link', { name: 'Отправить в WhatsApp' })).toHaveAttribute('href', /^https:\/\/wa\.me\/7701\d{7}\?text=/);

  // the buyer signs in with the login and password from the message
  const login = message.match(/Логин: (\S+)/)?.[1] ?? '';
  const password = message.match(/Пароль: (\S+)/)?.[1] ?? '';
  const buyer = await (await browser.newContext()).newPage();
  await buyer.goto('/login/');
  await buyer.locator('input[name=login]').fill(login);
  await buyer.locator('input[name=password]').fill(password);
  await buyer.getByRole('button', { name: 'Войти' }).click();
  await buyer.waitForURL(/\/account\/$/);
  await expect(buyer.getByRole('link', { name: /Seoul Food/ }).first()).toBeVisible();
});

test('unlocking a Naver field asks first and is written to the log', async ({ page }) => {
  await signIn(page, '/admin/guides/seoul-food/');
  await page.getByRole('link', { name: /Тестовый раздел/ }).first().click();
  await page.getByRole('tab', { name: /Места/ }).click();
  await page.getByRole('button', { name: /Тестовый ресторан без адреса/ }).click();
  const url = page.locator('.ad-locked input[name=naver_url]');
  await expect(url).toHaveAttribute('readonly', '');
  let asked = '';
  page.once('dialog', async (d) => {
    asked = d.message();
    await d.accept();
  });
  await page.getByRole('button', { name: 'Разблокировать' }).click();
  expect(asked).toContain('Изменение запишется в журнал');
  await url.fill('https://naver.me/E2E0001');
  await page.getByRole('button', { name: 'Сохранить место' }).click();
  await expect(page.getByText('изменение данных заказчицы записано в журнал')).toBeVisible();

  await page.getByRole('link', { name: 'Журнал' }).click();
  await expect(page.locator('tr.ad-row--hl').first()).toContainText('place.unlock');
  await expect(page.locator('tr.ad-row--hl').first()).toContainText('https://naver.me/E2E0001');
});

test('publish starts a run (dry run on staging)', async ({ page }) => {
  await signIn(page, '/admin/guides/');
  await page.getByRole('button', { name: 'Опубликовать' }).click();
  await expect(page.locator('.ad-publish__status')).toContainText(/проверка без сборки|собираем сайт|опубликовано/);
});

test('a buyer cannot open the admin', async ({ page }) => {
  await page.goto('/login/?next=/admin/');
  await page.locator('input[name=login]').fill(process.env.SEED_BUYER_LOGIN ?? 'buyer@seoul.test');
  await page.locator('input[name=password]').fill(process.env.SEED_BUYER_PASSWORD ?? 'change-me-buyer-0000');
  await page.getByRole('button', { name: 'Войти' }).click();
  await page.waitForURL(/\/admin\/$/);
  await expect(page.getByText('Админка доступна только администраторам.')).toBeVisible();
  expect((await page.request.get('/api/admin/users')).status()).toBe(403);
});
