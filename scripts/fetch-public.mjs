// Before the build: the public texts edited in the admin (public_blocks) replace the fixture (docs/05 § 1, P5).
// Runs only when EXPORT_URL and EXPORT_TOKEN are set (production / the publish workflow); otherwise the fixture stays.
// The export carries public texts only, never guide content (api SiteApi::export).
import { readFileSync, writeFileSync } from 'node:fs';

const url = process.env.EXPORT_URL;
const token = process.env.EXPORT_TOKEN;
if (!url || !token) {
  console.log('fetch-public: EXPORT_URL/EXPORT_TOKEN not set, building from the fixture');
  process.exit(0);
}
const file = new URL('../src/content/fixtures/public.ru.json', import.meta.url);
const res = await fetch(url.replace(/\/$/, '') + '/api/export/public', { headers: { 'X-Export-Token': token } });
if (!res.ok) {
  console.error(`fetch-public: export answered ${res.status}`);
  process.exit(1);
}
const { ru } = await res.json();
const current = JSON.parse(readFileSync(file, 'utf8'));
let n = 0;
for (const [key, data] of Object.entries(ru ?? {})) {
  if (key in current && data && typeof data === 'object') {
    current[key] = data;
    n++;
  }
}
writeFileSync(file, JSON.stringify(current, null, 2) + '\n');
console.log(`fetch-public: ${n} blocks from the admin`);
