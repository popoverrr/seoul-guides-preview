// Покупатели и доступы (docs/01 § 6, C1): «выдать доступ за 60 секунд с телефона» — имя, телефон, галочки гайдов,
// одна кнопка, готовое сообщение → «Отправить в WhatsApp». Plus search, a buyer's card, devices and the log.
import { useState } from 'preact/hooks';
import { api } from '../../lib/api';
import { plural } from '../../motion/pick';
import { adminError, copy, Field, go, Link, Notice, useLoad, when } from './ui';

export interface AdminUser {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  locale: 'ru' | 'en';
  status: 'active' | 'blocked';
  is_admin: boolean;
  note: string | null;
  created_at: string;
  last_login_at: string | null;
  devices: number | null;
  last_seen_at: string | null;
  guides: string[];
  flag?: 'reads' | 'networks' | null;
}
interface GuideLite {
  slug: string;
  title_ru: string | null;
  hangul_label: string;
  status: string;
}

const FLAG = { reads: 'много разделов за час', networks: 'вход из 5+ сетей за сутки' } as const;

/** wa.me wants digits only; an email-only buyer gets a share link without a number */
const waTo = (phone: string | null, text: string) => `https://wa.me/${(phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

function GuideChecks({ guides, value, onChange }: { guides: GuideLite[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div class="ad-checks">
      {guides.map((g) => (
        <label key={g.slug} class={value.includes(g.slug) ? 'ad-check ad-check--on' : 'ad-check'}>
          <input
            type="checkbox"
            aria-label={g.title_ru ?? g.slug}
            checked={value.includes(g.slug)}
            onChange={(e) => onChange((e.target as HTMLInputElement).checked ? [...value, g.slug] : value.filter((x) => x !== g.slug))}
          />
          <span class="ad-check__ko" lang="ko">
            {g.hangul_label}
          </span>
          <span>{g.title_ru ?? g.slug}</span>
        </label>
      ))}
    </div>
  );
}

function Message({ text, phone, onDone }: { text: string; phone: string | null; onDone?: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div class="ad-message">
      <p class="ad-message__k">Сообщение с доступом</p>
      <pre class="ad-message__v">{text}</pre>
      <div class="ad-row">
        <a class="ad-btn ad-btn--go" href={waTo(phone, text)} target="_blank" rel="noopener" onClick={onDone}>
          Отправить в WhatsApp
        </a>
        <button type="button" class="ad-btn" onClick={async () => setCopied(await copy(text))}>
          {copied ? 'Скопировано' : 'Скопировать'}
        </button>
      </div>
    </div>
  );
}

export function NewBuyer() {
  const guides = useLoad<{ guides: GuideLite[] }>('/admin/guides');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [locale, setLocale] = useState<'ru' | 'en'>('ru');
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ user: AdminUser; message: string } | null>(null);

  if (done) {
    return (
      <section class="ad-panel">
        <h1 class="ad-h1">Доступ выдан</h1>
        <p class="ad-lead">
          {done.user.name || done.user.phone || done.user.email} · {plural(done.user.guides.length)}
        </p>
        <Message text={done.message} phone={done.user.phone} />
        <div class="ad-row">
          <Link to={`users/${done.user.id}`} class="ad-link">
            Карточка покупателя
          </Link>
          <button
            type="button"
            class="ad-link"
            onClick={() => {
              setDone(null);
              setName('');
              setPhone('');
              setEmail('');
              setPicked([]);
            }}
          >
            Выдать ещё один доступ
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      class="ad-panel"
      onSubmit={async (e) => {
        e.preventDefault();
        setError('');
        if (!phone.trim() && !email.trim()) return setError('Укажите телефон или email.');
        if (!picked.length) return setError('Отметьте хотя бы один гайд.');
        setBusy(true);
        try {
          const body: Record<string, unknown> = { name: name.trim(), locale, guides: picked };
          if (phone.trim()) body.phone = phone.trim();
          if (email.trim()) body.email = email.trim();
          setDone(await api<{ user: AdminUser; message: string }>('POST', '/admin/users', body));
        } catch (err) {
          setError(adminError(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1 class="ad-h1">Выдать доступ</h1>
      <Field label="Имя">
        <input class="ad-input" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} autoComplete="off" name="buyer-name" />
      </Field>
      <Field label="Телефон WhatsApp" hint="Можно в любом виде: 8 700…, +7 700…">
        <input class="ad-input" type="tel" inputMode="tel" value={phone} onInput={(e) => setPhone((e.target as HTMLInputElement).value)} name="buyer-phone" />
      </Field>
      <Field label="Email (если нет телефона)">
        <input class="ad-input" type="email" inputMode="email" value={email} onInput={(e) => setEmail((e.target as HTMLInputElement).value)} name="buyer-email" />
      </Field>
      <fieldset class="ad-fieldset">
        <legend class="ad-field__label">Гайды</legend>
        {guides.data ? <GuideChecks guides={guides.data.guides} value={picked} onChange={setPicked} /> : <p class="ad-muted">Загружаем…</p>}
      </fieldset>
      <div class="ad-seg" role="group" aria-label="Язык сообщения">
        {(['ru', 'en'] as const).map((l) => (
          <button key={l} type="button" aria-pressed={locale === l} onClick={() => setLocale(l)}>
            {l === 'ru' ? 'Русский' : 'English'}
          </button>
        ))}
      </div>
      <Notice text={error} tone="err" />
      <button class="ad-btn ad-btn--go ad-btn--wide" type="submit" disabled={busy}>
        {busy ? 'Создаём…' : 'Выдать доступ'}
      </button>
      <p class="ad-muted">Пароль придумается сам: три слова и две цифры, его легко продиктовать.</p>
    </form>
  );
}

export function UsersList() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const list = useLoad<{ users: AdminUser[] }>(`/admin/users${query ? '?q=' + encodeURIComponent(query) : ''}`);
  return (
    <section class="ad-panel">
      <div class="ad-head">
        <h1 class="ad-h1">Покупатели</h1>
        <Link to="users/new" class="ad-btn ad-btn--go">
          + Выдать доступ
        </Link>
      </div>
      <form
        class="ad-search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <input class="ad-input" type="search" placeholder="Имя, телефон или email" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
        <button class="ad-btn" type="submit">
          Найти
        </button>
      </form>
      <Notice text={list.error} tone="err" />
      <ul class="ad-list">
        {(list.data?.users ?? []).map((u) => (
          <li key={u.id}>
            <Link to={`users/${u.id}`} class="ad-item">
              <span class="ad-item__main">
                <strong>{u.name || u.phone || u.email}</strong>
                {u.is_admin && <span class="ad-tag">админ</span>}
                {u.status === 'blocked' && <span class="ad-tag ad-tag--warn">заблокирован</span>}
                {u.flag && <span class="ad-tag ad-tag--warn">проверить: {FLAG[u.flag]}</span>}
              </span>
              <span class="ad-item__sub">
                {[u.phone, u.email].filter(Boolean).join(' · ')} · гайдов: {u.guides.length} · устройств: {u.devices ?? 0}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {list.data && list.data.users.length === 0 && <p class="ad-muted">Никого не нашли.</p>}
    </section>
  );
}

interface Session {
  id: string;
  device: string;
  last_seen_at: string;
}
interface AuditRow {
  id: number;
  action: string;
  actor_name: string | null;
  diff: unknown;
  created_at: string;
}

const ACTION: Record<string, string> = {
  'user.create': 'создан',
  'user.update': 'изменён',
  'user.password_reset': 'новый пароль',
  'user.sessions_reset': 'устройства сброшены',
  'access.set': 'гайды изменены',
};

export function UserCard({ id }: { id: string }) {
  const user = useLoad<{ user: AdminUser }>(`/admin/users/${id}`);
  const guides = useLoad<{ guides: GuideLite[] }>('/admin/guides');
  const sessions = useLoad<{ sessions: Session[] }>(`/admin/users/${id}/sessions`);
  const log = useLoad<{ audit: AuditRow[] }>(`/admin/audit?user=${id}`);
  const [msg, setMsg] = useState<{ text: string; phone: string | null } | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const u = user.data?.user;
  if (user.error) return <Notice text={user.error} tone="err" />;
  if (!u) return <p class="ad-muted">Загружаем…</p>;

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(ok);
      user.reload();
      sessions.reload();
      log.reload();
    } catch (e) {
      setError(adminError(e));
    }
  };

  return (
    <section class="ad-panel">
      <Link to="users" class="ad-link">
        ← Покупатели
      </Link>
      <h1 class="ad-h1">{u.name || u.phone || u.email}</h1>
      <p class="ad-lead">
        {[u.phone, u.email].filter(Boolean).join(' · ')} · с {when(u.created_at)} · последний вход {when(u.last_login_at)}
      </p>
      <Notice text={notice} />
      <Notice text={error} tone="err" />

      <div class="ad-card">
        <h2 class="ad-h2">Гайды</h2>
        {guides.data && (
          <GuideChecks
            guides={guides.data.guides}
            value={u.guides}
            onChange={(v) => act(() => api('PUT', `/admin/users/${u.id}/access`, { guides: v }), 'Доступ обновлён')}
          />
        )}
      </div>

      <div class="ad-card">
        <h2 class="ad-h2">Сообщение с доступом</h2>
        {msg ? (
          <Message text={msg.text} phone={msg.phone} />
        ) : (
          <div class="ad-row">
            <button
              type="button"
              class="ad-btn"
              onClick={async () => {
                const r = await api<{ message: string }>('GET', `/admin/users/${u.id}/access-message?locale=${u.locale}`);
                setMsg({ text: r.message, phone: u.phone });
              }}
            >
              Показать сообщение
            </button>
            <button
              type="button"
              class="ad-btn"
              onClick={() =>
                confirm('Создать новый пароль? Старый перестанет работать, покупатель выйдет на всех устройствах.') &&
                act(async () => {
                  const r = await api<{ message: string }>('POST', `/admin/users/${u.id}/password`);
                  setMsg({ text: r.message, phone: u.phone });
                }, 'Новый пароль создан: отправьте сообщение покупателю')
              }
            >
              Новый пароль
            </button>
          </div>
        )}
      </div>

      <div class="ad-card">
        <h2 class="ad-h2">Устройства</h2>
        <ul class="ad-list ad-list--plain">
          {(sessions.data?.sessions ?? []).map((s) => (
            <li key={s.id}>
              {s.device} · был активен {when(s.last_seen_at)}
            </li>
          ))}
        </ul>
        {sessions.data && sessions.data.sessions.length === 0 && <p class="ad-muted">Нигде не вошёл.</p>}
        <button type="button" class="ad-btn" onClick={() => act(() => api('DELETE', `/admin/users/${u.id}/sessions`), 'Покупатель вышел на всех устройствах')}>
          Выйти на всех устройствах
        </button>
      </div>

      <div class="ad-card">
        <h2 class="ad-h2">Данные</h2>
        <form
          class="ad-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget as HTMLFormElement);
            act(
              () =>
                api('PATCH', `/admin/users/${u.id}`, {
                  name: String(f.get('name') ?? ''),
                  phone: String(f.get('phone') ?? '') || null,
                  email: String(f.get('email') ?? '') || null,
                  note: String(f.get('note') ?? ''),
                  locale: f.get('locale') === 'en' ? 'en' : 'ru',
                }),
              'Сохранено',
            );
          }}
        >
          <Field label="Имя">
            <input class="ad-input" name="name" defaultValue={u.name} />
          </Field>
          <Field label="Телефон">
            <input class="ad-input" name="phone" type="tel" defaultValue={u.phone ?? ''} />
          </Field>
          <Field label="Email">
            <input class="ad-input" name="email" type="email" defaultValue={u.email ?? ''} />
          </Field>
          <Field label="Язык сообщений">
            <select class="ad-input" name="locale" defaultValue={u.locale}>
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Заметка (видна только админам)">
            <textarea class="ad-input" name="note" rows={3} defaultValue={u.note ?? ''} />
          </Field>
          <div class="ad-row">
            <button class="ad-btn ad-btn--go" type="submit">
              Сохранить
            </button>
            {!u.is_admin && (
              <button
                type="button"
                class="ad-btn ad-btn--warn"
                onClick={() =>
                  (u.status === 'blocked' || confirm('Заблокировать? Покупатель сразу выйдет и не сможет войти.')) &&
                  act(() => api('PATCH', `/admin/users/${u.id}`, { status: u.status === 'blocked' ? 'active' : 'blocked' }), u.status === 'blocked' ? 'Разблокирован' : 'Заблокирован')
                }
              >
                {u.status === 'blocked' ? 'Разблокировать' : 'Заблокировать'}
              </button>
            )}
          </div>
        </form>
      </div>

      <div class="ad-card">
        <h2 class="ad-h2">Журнал</h2>
        <ul class="ad-list ad-list--plain">
          {(log.data?.audit ?? []).map((a) => (
            <li key={a.id}>
              {when(a.created_at)} · {ACTION[a.action] ?? a.action}
              {a.actor_name ? ` · ${a.actor_name}` : ''}
            </li>
          ))}
        </ul>
      </div>
      <button type="button" class="ad-link" onClick={() => go('users')}>
        К списку
      </button>
    </section>
  );
}
