// Small shared pieces of the admin: routing, the API hook, notices. No UI library (docs/07 § 4).
import type { ComponentChildren } from 'preact';
import { useCallback, useEffect, useState } from 'preact/hooks';
import { api, ApiError, href, humanError } from '../../lib/api';

export const ROOT = '/admin/';

/** /admin/guides/seoul-food/ → ['guides', 'seoul-food'] */
export function parts(): string[] {
  return location.pathname.slice(href(ROOT).length).split('/').filter(Boolean).map(decodeURIComponent);
}

export function go(path: string) {
  history.pushState(null, '', href(ROOT + path));
  dispatchEvent(new Event('admin:route'));
  scrollTo(0, 0);
}

export function useRoute(): string[] {
  const [p, setP] = useState<string[]>(() => parts());
  useEffect(() => {
    const on = () => setP(parts());
    addEventListener('popstate', on);
    addEventListener('admin:route', on);
    return () => {
      removeEventListener('popstate', on);
      removeEventListener('admin:route', on);
    };
  }, []);
  return p;
}

/** load once, reload on demand; errors become text people can read */
export function useLoad<T>(path: string | null): { data: T | null; error: string; reload: () => void; set: (d: T) => void } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!path) return;
    let live = true;
    setError('');
    api<T>('GET', path)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(adminError(e)));
    return () => {
      live = false;
    };
  }, [path, n]);
  return { data, error, reload: useCallback(() => setN((x) => x + 1), []), set: setData };
}

export function adminError(e: unknown): string {
  if (e instanceof ApiError) {
    const map: Record<string, string> = {
      locked: 'Это поле из файла заказчицы или из Naver. Сначала разблокируйте его.',
      email_taken: 'Этот email уже есть у другого покупателя.',
      phone_taken: 'Этот телефон уже есть у другого покупателя.',
      login_required: 'Укажите телефон или email.',
      slug_taken: 'Такой адрес раздела уже есть в этом гайде.',
      has_places: 'В разделе ещё есть места: сначала перенесите или удалите их.',
      in_use: 'Файл ещё используется в гайде.',
      rights_required: 'Подтвердите, что фото или видео ваше или есть права.',
      already_running: 'Публикация уже идёт.',
      invalid_naver_url: 'Только ссылка Naver от заказчицы (naver.me или map.naver.com).',
    };
    return map[e.code] ?? humanError(e);
  }
  return humanError(e);
}

export function Notice({ text, tone = 'ok' }: { text: string; tone?: 'ok' | 'err' }) {
  return text ? (
    <p class={`ad-notice ad-notice--${tone}`} role={tone === 'err' ? 'alert' : 'status'}>
      {text}
    </p>
  ) : null;
}

export function Field({ label, children, hint }: { label: string; children: ComponentChildren; hint?: string }) {
  return (
    <label class="ad-field">
      <span class="ad-field__label">{label}</span>
      {children}
      {hint && <span class="ad-field__hint">{hint}</span>}
    </label>
  );
}

export function Link({ to, children, class: cls }: { to: string; children: ComponentChildren; class?: string }) {
  return (
    <a
      class={cls}
      href={href(ROOT + to)}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey) return;
        e.preventDefault();
        go(to);
      }}
    >
      {children}
    </a>
  );
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export const when = (s: string | null) =>
  s ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(s.replace(' ', 'T'))) : '-';

/** move item i by d inside a list (for the arrow buttons next to drag handles) */
export function moved<T>(list: T[], from: number, to: number): T[] {
  const out = [...list];
  const [x] = out.splice(from, 1);
  if (x !== undefined) out.splice(Math.max(0, Math.min(out.length, to)), 0, x);
  return out;
}
