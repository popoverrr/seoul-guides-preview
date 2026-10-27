// GitHub Pages preview: the site is served under BASE (e.g. /seoul-guides-preview/), but pages and components
// link root-absolute ("/guides/…", "/fonts/…"). Prefix those in the built HTML and CSS. No-op when BASE is "/".
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const base = (process.env.BASE ?? '/').replace(/\/?$/, '/');
if (base === '/') process.exit(0);
const pre = base.slice(0, -1); // "/repo"

const fix = (u) => (u.startsWith('//') || u.startsWith(base) ? u : pre + u);
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|css)$/.test(name)) {
      let s = readFileSync(p, 'utf8');
      s = s.replace(/\b(href|src|action|poster|content)="(\/[^"]*)"/g, (m, a, u) => (a === 'content' && !u.startsWith('/_') ? m : `${a}="${fix(u)}"`));
      s = s.replace(/\bsrcset="([^"]*)"/g, (m, v) => `srcset="${v.replace(/(^|,\s*)(\/[^\s,]+)/g, (x, sep, u) => sep + fix(u))}"`);
      s = s.replace(/url\((['"]?)(\/[^)'"]+)\1\)/g, (m, q, u) => `url(${q}${fix(u)}${q})`);
      writeFileSync(p, s);
    }
  }
};
walk('dist');
console.log(`rebase: links prefixed with ${pre}`);
