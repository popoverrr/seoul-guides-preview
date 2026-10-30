// Browser client for the PHP API (docs/04 § 5): same-origin cookies, double-submit CSRF on every change (D-049).
// Paid content only ever arrives through here at runtime — never at build time (docs/06 § 1).

const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

/** a site path that survives the Pages preview base (/repo/…) */
export const href = (path: string): string => BASE + path;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfter = 0,
  ) {
    super(message);
  }
}

function cookie(name: string): string {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1] ?? '') : '';
}

let csrfLoading: Promise<void> | null = null;
async function csrf(): Promise<string> {
  if (!cookie('sg_csrf')) {
    csrfLoading ??= fetch(href('/api/csrf'), { credentials: 'same-origin' }).then(() => undefined);
    await csrfLoading;
    csrfLoading = null;
  }
  return cookie('sg_csrf');
}

export async function api<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') headers['X-CSRF-Token'] = await csrf();
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    const init: RequestInit = { method, headers, credentials: 'same-origin' };
    if (body !== undefined) init.body = JSON.stringify(body);
    res = await fetch(href('/api' + path), init);
  } catch {
    throw new ApiError(0, 'offline', 'Нет связи с сервером');
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.error?.code ?? (res.status === 404 ? 'not_found' : 'server'),
      data?.error?.message ?? 'Ошибка сервера',
      Number(res.headers.get('Retry-After') ?? 0),
    );
  }
  return data as T;
}

export interface Me {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  locale: 'ru' | 'en';
  is_admin: boolean;
  watermark: string;
}

export interface MyGuide {
  slug: string;
  title: string;
  emblem: string;
  patch: string;
  owned: boolean;
}

/** current reader or null; any other failure is thrown */
export async function me(): Promise<Me | null> {
  try {
    return (await api<{ user: Me }>('GET', '/me')).user;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) return null;
    throw e;
  }
}

/** send a signed-out visitor to /login/ and come back here afterwards */
export function toLogin(): void {
  const next = location.pathname + location.search;
  location.replace(href('/login/') + '?next=' + encodeURIComponent(next));
}

/** «Неверный логин или пароль» etc. — the API answers in English codes, people read Russian */
export function humanError(e: unknown): string {
  if (!(e instanceof ApiError)) return 'Что-то пошло не так. Попробуйте ещё раз.';
  switch (e.code) {
    case 'invalid_credentials':
      return 'Неверный логин или пароль.';
    case 'too_many_attempts': {
      const min = Math.max(1, Math.ceil(e.retryAfter / 60));
      return `Слишком много попыток. Попробуйте через ${min} мин.`;
    }
    case 'invalid_login':
      return 'Введите email или номер телефона.';
    case 'weak_password':
      return 'Пароль должен быть не короче 10 символов.';
    case 'wrong_password':
      return 'Текущий пароль указан неверно.';
    case 'offline':
      return 'Нет связи с сервером. Проверьте интернет.';
    case 'no_access':
      return 'Этого гайда пока нет в вашем кабинете.';
    default:
      return e.status >= 500 ? 'Сервер не отвечает. Попробуйте чуть позже.' : e.message;
  }
}
