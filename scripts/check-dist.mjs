// Fails the build if paid content leaked into the static bundle (docs/06 § 1).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const marker = process.env.SEED_PAID_MARKER ?? 'SEED_PAID_MARKER_7f3c';
const hits = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|js|json|css|txt|xml)$/.test(name) && readFileSync(p, 'utf8').includes(marker)) hits.push(p);
  }
};
walk('dist');
if (hits.length) {
  console.error('Paid marker found in dist:', hits);
  process.exit(1);
}
console.log('check-dist: no paid content in dist');
