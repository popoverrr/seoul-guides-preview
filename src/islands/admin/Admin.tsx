// Админка (docs/01 § 6, docs/08 P5): one shell, routes under /admin/…, admins only.
// Desktop first, but the access scenario is laid out for a phone held in one hand.
import { useEffect, useState } from 'preact/hooks';
import { api, href, me, toLogin, type Me } from '../../lib/api';
import { GuideCard, GuidesList } from './Guides';
import { Media } from './Media';
import { SectionEditor } from './SectionEditor';
import { Audit, Leads, SiteTexts } from './Site';
import { adminError, Link, useRoute, when } from './ui';
import { NewBuyer, UserCard, UsersList } from './Users';

interface Run {
  id: number;
  status: 'queued' | 'running' | 'done' | 'failed';
  dry_run: boolean;
  message: string | null;
  url: string | null;
  created_at: string;
}

function Publish() {
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api<{ runs: Run[] }>('GET', '/admin/publish').then((r) => setRun(r.runs[0] ?? null), () => {});
  }, []);
  // follow a running build
  useEffect(() => {
    if (!run || (run.status !== 'queued' && run.status !== 'running')) return;
    const t = setTimeout(() => api<{ run: Run }>('GET', `/admin/publish/${run.id}`).then((r) => setRun(r.run), () => {}), 5000);
    return () => clearTimeout(t);
  }, [run]);
  const busy = run?.status === 'queued' || run?.status === 'running';
  const label = !run
    ? ''
    : run.status === 'done'
      ? run.dry_run
        ? `проверка без сборки · ${when(run.created_at)}`
        : `опубликовано ${when(run.created_at)}`
      : run.status === 'failed'
        ? 'сборка не удалась'
        : 'собираем сайт…';
  return (
    <div class="ad-publish">
      <button
        type="button"
        class="ad-btn ad-btn--go"
        disabled={busy}
        onClick={async () => {
          setError('');
          try {
            setRun((await api<{ run: Run }>('POST', '/admin/publish')).run);
          } catch (e) {
            setError(adminError(e));
          }
        }}
      >
        {busy ? 'Публикуем…' : 'Опубликовать'}
      </button>
      <span class="ad-publish__status" title={run?.message ?? ''}>
        {error || label}
        {run?.url && (
          <>
            {' '}
            <a href={run.url} target="_blank" rel="noopener">
              ход сборки
            </a>
          </>
        )}
      </span>
    </div>
  );
}

const NAV: [string, string][] = [
  ['users', 'Покупатели'],
  ['guides', 'Гайды'],
  ['media', 'Медиа'],
  ['site', 'Тексты сайта'],
  ['leads', 'Заявки'],
  ['audit', 'Журнал'],
];

export default function Admin() {
  const [user, setUser] = useState<Me | null | undefined>(undefined);
  const route = useRoute();
  useEffect(() => {
    me().then((u) => (u ? setUser(u) : toLogin()), () => setUser(null));
  }, []);

  if (user === undefined) return <p class="ad-muted ad-pad">Загружаем…</p>;
  if (user === null || !user.is_admin) {
    return (
      <div class="ad-pad">
        <p>Админка доступна только администраторам.</p>
        <a class="ad-link" href={href('/account/')}>
          В кабинет
        </a>
      </div>
    );
  }

  const [section = 'users', a, b] = route;
  let page;
  if (section === 'users' && a === 'new') page = <NewBuyer />;
  else if (section === 'users' && a) page = <UserCard id={a} key={a} />;
  else if (section === 'guides' && a) page = <GuideCard slug={a} key={a} />;
  else if (section === 'guides') page = <GuidesList />;
  else if (section === 'sections' && a) page = <SectionEditor id={a} key={a} />;
  else if (section === 'media') page = <Media />;
  else if (section === 'site') page = <SiteTexts />;
  else if (section === 'leads') page = <Leads />;
  else if (section === 'audit') page = <Audit />;
  else page = <UsersList />;
  void b;

  const active = section === 'sections' ? 'guides' : section;
  return (
    <div class="ad">
      <header class="ad-bar">
        <a class="ad-bar__brand" href={href('/')}>
          KOREA HAUS · админка
        </a>
        <Publish />
      </header>
      <nav class="ad-nav" aria-label="Разделы админки">
        {NAV.map(([to, label]) => (
          <Link key={to} to={to} class={active === to ? 'ad-nav__i ad-nav__i--on' : 'ad-nav__i'}>
            {label}
          </Link>
        ))}
      </nav>
      <main id="main" class="ad-main">
        {page}
      </main>
    </div>
  );
}
