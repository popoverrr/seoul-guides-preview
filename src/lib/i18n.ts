import ru from '../data/ui-strings.ru.json';
import en from '../data/ui-strings.en.json';

export type Locale = 'ru' | 'en';
const dict = { ru, en } as const;
export type Key = keyof typeof ru;

export function t(locale: Locale, key: Key): string {
  return (dict[locale] as Record<string, string>)[key] ?? dict.ru[key];
}

/** Path without the deploy base (GitHub Pages preview serves the site under /<repo>/). */
function sitePath(url: URL): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base && url.pathname.startsWith(base) ? url.pathname.slice(base.length) || '/' : url.pathname;
}

export function localeFrom(url: URL): Locale {
  const p = sitePath(url);
  return p.startsWith('/en/') || p === '/en' ? 'en' : 'ru';
}

/** Same page in the other language — root-absolute; scripts/rebase.mjs adds the base on the preview. */
export function altPath(url: URL, to: Locale): string {
  const path = sitePath(url).replace(/^\/en(\/|$)/, '/');
  return to === 'en' ? `/en${path}` : path;
}
