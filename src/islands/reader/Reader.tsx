// The guide reader (docs/08 P4, C2 «чтение в Сеуле»): one island with its own routing under /account/guide/{slug}/{section}/.
// Read on a phone, one hand, in the street: ReaderBar on top, chips by category, place cards, TabBar at the thumb.
// Everything paid arrives from the API at runtime (docs/06 § 1); the watermark is drawn from /api/me (docs/06 § 2).
import { lazy, Suspense } from 'preact/compat';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { api, ApiError, href, humanError, me, toLogin, type Me } from '../../lib/api';
import { Blocks } from './Blocks';
import { categoryLabel } from './PlaceCard';
import { md } from './md';
import type { District, Place, SectionData, TocItem } from './types';

const MapTab = lazy(() => import('./MapTab'));
type Tab = 'read' | 'sections' | 'map' | 'search';
const ROOT = '/account/guide/';

/** /account/guide/seoul-food/hongdae/ → ['seoul-food', 'hongdae'] (base-aware for the Pages preview) */
function route(): [string, string] {
  const path = location.pathname.slice(href(ROOT).length);
  const [slug = '', section = ''] = path.split('/').filter(Boolean);
  return [decodeURIComponent(slug), decodeURIComponent(section)];
}

const store = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = localStorage.getItem(k);
      return v === null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* private mode */
    }
  },
};

/** diagonal «an••@mail.ru · #0142», opacity .06 — invisible while reading, there on a screenshot */
function watermark(text: string): string {
  const t = text.replace(/[<&>"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><text x="0" y="110" transform="rotate(-24 160 90)" font-family="Commissioner, Arial, sans-serif" font-size="13" fill="#1a1916">${t}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const ddmm = (s: string) => {
  const d = new Date(s.replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export default function Reader({ districts }: { districts: District[] }) {
  const [user, setUser] = useState<Me | null>(null);
  const [[slug, sectionSlug], setRoute] = useState<[string, string]>(() => (typeof location === 'undefined' ? ['', ''] : route()));
  const [toc, setToc] = useState<TocItem[]>([]);
  const [data, setData] = useState<SectionData | null>(null);
  const [error, setError] = useState<{ text: string; code: string } | null>(null);
  const [tab, setTab] = useState<Tab>('read');
  const [chip, setChip] = useState('');
  const [night, setNight] = useState<'auto' | 'on' | 'off'>(() => (typeof localStorage === 'undefined' ? 'auto' : store.get('sn-night', 'auto')));
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<SectionData[] | null>(null);
  const restored = useRef('');
  const searchBox = useRef<HTMLInputElement>(null);

  const go = (s: string, sec: string, replace = false) => {
    const url = href(`${ROOT}${s}/${sec ? sec + '/' : ''}`);
    if (replace) history.replaceState(null, '', url);
    else history.pushState(null, '', url);
    setRoute([s, sec]);
    setTab('read');
    setChip('');
  };

  // who is reading
  useEffect(() => {
    me()
      .then((u) => (u ? setUser(u) : toLogin()))
      .catch((e) => setError({ text: humanError(e), code: 'server' }));
    const onPop = () => setRoute(route());
    addEventListener('popstate', onPop);
    return () => removeEventListener('popstate', onPop);
  }, []);

  // table of contents of this guide; no section in the URL → where the reader stopped last time, else the first one
  useEffect(() => {
    if (!user || !slug) return;
    setToc([]);
    setAll(null);
    api<{ sections: TocItem[] }>('GET', `/guides/${encodeURIComponent(slug)}/toc`)
      .then(({ sections }) => {
        setToc(sections);
        if (!sectionSlug && sections.length) {
          const last = store.get<{ slug: string; section: string } | null>('sn-last', null);
          const target = last?.slug === slug && sections.some((x) => x.slug === last.section) ? last.section : sections[0]!.slug;
          go(slug, target, true);
        }
      })
      .catch((e) => setError({ text: humanError(e), code: e instanceof ApiError ? e.code : 'server' }));
  }, [user, slug]);

  // the section itself
  useEffect(() => {
    if (!user || !slug || !sectionSlug) return;
    setData(null);
    setError(null);
    api<SectionData>('GET', `/guides/${encodeURIComponent(slug)}/sections/${encodeURIComponent(sectionSlug)}`)
      .then((d) => {
        setData(d);
        store.set('sn-last', { slug, section: sectionSlug, title: `${d.guide.title} · ${d.section.title}` });
        document.title = `${d.section.title} - ${d.guide.title}`;
      })
      .catch((e) => setError({ text: humanError(e), code: e instanceof ApiError ? e.code : 'server' }));
  }, [user, slug, sectionSlug]);

  // remember the scroll position per section, restore it once the section is drawn
  useEffect(() => {
    if (!data) return;
    const key = `sn-pos:${slug}/${sectionSlug}`;
    if (restored.current !== key) {
      restored.current = key;
      const hash = location.hash.slice(1);
      setTimeout(() => {
        const el = hash ? document.getElementById(hash) : null;
        if (el) el.scrollIntoView();
        else scrollTo(0, store.get(key, 0));
      });
    }
    let t = 0;
    const onScroll = () => {
      clearTimeout(t);
      t = window.setTimeout(() => store.set(key, Math.round(scrollY)), 250);
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, [data]);

  const dark = night === 'on' || (night === 'auto' && data?.section.tone === 'night');
  useEffect(() => {
    document.documentElement.toggleAttribute('data-reader-night', dark);
  }, [dark]);

  // a search hit inside the section that is already open: just scroll to the card
  useEffect(() => {
    if (tab !== 'read' || !data || !location.hash) return;
    setTimeout(() => document.getElementById(location.hash.slice(1))?.scrollIntoView(), 0);
  }, [tab, data]);

  // the search field takes the keyboard as soon as the tab opens
  useEffect(() => {
    if (tab === 'search') searchBox.current?.focus();
  }, [tab]);

  // search loads every section of this guide once, on first use, and filters on the phone
  useEffect(() => {
    if (tab !== 'search' || all || !toc.length) return;
    Promise.all(toc.map((t) => api<SectionData>('GET', `/guides/${encodeURIComponent(slug)}/sections/${encodeURIComponent(t.slug)}`)))
      .then(setAll)
      .catch(() => setAll([]));
  }, [tab, toc]);

  const categories = useMemo(() => [...new Set((data?.places ?? []).map((p) => p.category).filter(Boolean))], [data]);
  const visible = (p: Place) => !chip || p.category === chip;
  const inBlocks = useMemo(() => {
    const ids = new Set<number>();
    for (const b of data?.blocks ?? []) {
      const d = b.data as { place_ids?: unknown[]; place_id?: unknown };
      (d.place_ids ?? []).forEach((x) => ids.add(Number(x)));
      if (d.place_id !== undefined) ids.add(Number(d.place_id));
    }
    return ids;
  }, [data]);
  const loose = (data?.places ?? []).filter((p) => !inBlocks.has(p.id));

  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ru');
    if (!all || q.length < 2) return [];
    return all.flatMap((s) =>
      s.places
        .filter((p) => [p.name, p.src_name, p.naver?.name_ko ?? '', s.section.title].some((v) => v.toLocaleLowerCase('ru').includes(q)))
        .map((p) => ({ p, s })),
    );
  }, [all, query]);

  if (error) {
    return (
      <div class="rd rd--msg">
        <p class="rd__msg">{error.text}</p>
        {error.code === 'no_access' && (
          <a class="rd__btn" href={href(`/guides/${slug}/`)}>
            Посмотреть гайд
          </a>
        )}
        <a class="rd__link" href={href('/account/')}>
          Мои гайды
        </a>
      </div>
    );
  }
  if (!slug) {
    if (typeof location !== 'undefined' && user) location.replace(href('/account/'));
    return null;
  }

  const s = data?.section;
  return (
    <div class="rd" style={`--patch:var(${data?.guide.patch ?? '--green'})`}>
      {user && <div class="rd__wm" aria-hidden="true" style={`background-image:${watermark(user.watermark)}`} />}

      <header class="rbar">
        <a class="rbar__back" href={href('/account/')} aria-label="Мои гайды">
          ←
        </a>
        <div class="rbar__mid">
          <span class="rbar__guide">{data?.guide.title ?? ' '}</span>
          {s && (
            <span class="rbar__pos">
              раздел {s.index} из {s.total}
            </span>
          )}
        </div>
        <button
          class="rbar__night"
          type="button"
          aria-pressed={dark}
          onClick={() => {
            const v = dark ? 'off' : 'on';
            setNight(v);
            store.set('sn-night', v);
          }}
        >
          {dark ? 'День' : 'Ночь'}
        </button>
        <span class="rbar__progress" style={`--p:${s ? s.index / s.total : 0}`} aria-hidden="true" />
      </header>

      <main id="main" class="rd__main">
        {tab === 'read' && !data && <p class="rd__loading">Открываем раздел…</p>}

        {tab === 'read' && data && s && (
          <article class="rd__section">
            <p class="rd__emblem" lang="ko" aria-hidden="true">
              {data.guide.emblem}
            </p>
            <h1 class="rd__title">{s.title}</h1>
            {ddmm(s.updated_at) && <p class="rd__updated">обновлено {ddmm(s.updated_at)}</p>}
            {s.intro_md && <div class="md rd__intro" dangerouslySetInnerHTML={{ __html: md(s.intro_md) }} />}

            {categories.length > 1 && (
              <div class="chips" role="group" aria-label="Категории">
                {['', ...categories].map((c) => (
                  <button key={c || 'all'} type="button" class="chip" aria-pressed={chip === c} onClick={() => setChip(c)}>
                    {c ? categoryLabel(c) : 'Все'}
                  </button>
                ))}
              </div>
            )}

            <Blocks blocks={data.blocks} places={data.places} visible={visible} />
            {loose.filter(visible).length > 0 && <Blocks blocks={[{ type: 'place-list', data: { place_ids: loose.map((p) => p.id) } }]} places={data.places} visible={visible} />}

            <nav class="rd__pager" aria-label="Разделы">
              {s.prev ? (
                <button type="button" onClick={() => go(slug, s.prev!)}>
                  ← Назад
                </button>
              ) : (
                <span />
              )}
              {s.next && (
                <button type="button" class="rd__next" onClick={() => go(slug, s.next!)}>
                  Следующий раздел →
                </button>
              )}
            </nav>
          </article>
        )}

        {tab === 'sections' && (
          <section class="rd__panel" aria-label="Разделы">
            <h1 class="rd__title">Разделы</h1>
            <ol class="toc">
              {toc.map((t, n) => (
                <li key={t.slug}>
                  <button type="button" class={t.slug === sectionSlug ? 'toc__i toc__i--on' : 'toc__i'} onClick={() => go(slug, t.slug)}>
                    <span class="toc__n">{n + 1}</span>
                    <span>{t.title}</span>
                    {t.tone === 'night' && <span class="toc__night">вечер</span>}
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}

        {tab === 'map' && (
          <section class="rd__panel" aria-label="Карта">
            <h1 class="rd__title">Карта</h1>
            <Suspense fallback={<p class="rd__loading">Загружаем карту…</p>}>
              <MapTab districts={districts} toc={toc} current={sectionSlug} open={(sec) => go(slug, sec)} />
            </Suspense>
          </section>
        )}

        {tab === 'search' && (
          <section class="rd__panel" aria-label="Поиск">
            <h1 class="rd__title">Поиск</h1>
            <input
              ref={searchBox}
              class="rd__search"
              type="search"
              placeholder="Название места или район"
              value={query}
              onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            />
            {!all && <p class="rd__loading">Готовим поиск по гайду…</p>}
            {all && query.trim().length >= 2 && results.length === 0 && <p class="rd__loading">Ничего не нашлось.</p>}
            <ul class="found">
              {results.map(({ p, s: sec }) => (
                <li key={p.id}>
                  <a
                    href={href(`${ROOT}${slug}/${sec.section.slug}/#place-${p.id}`)}
                    onClick={(e) => {
                      e.preventDefault();
                      restored.current = '';
                      history.pushState(null, '', href(`${ROOT}${slug}/${sec.section.slug}/#place-${p.id}`));
                      setRoute([slug, sec.section.slug]);
                      setTab('read');
                    }}
                  >
                    <strong>{p.name}</strong>
                    <span>{sec.section.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <nav class="tabbar" aria-label="Навигация по гайду">
        {(
          [
            ['sections', 'Разделы', 'M5 7h14M5 12h14M5 17h9'],
            ['map', 'Карта', 'M4 7l5-2 6 2 5-2v12l-5 2-6-2-5 2zM9 5v12M15 7v12'],
            ['search', 'Поиск', 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM16 16l4 4'],
          ] as const
        ).map(([id, label, d]) => (
          <button key={id} type="button" class="tabbar__i" aria-pressed={tab === id} onClick={() => setTab(tab === id ? 'read' : id)}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d={d} />
            </svg>
            <span>{label}</span>
          </button>
        ))}
        <a class="tabbar__i" href={href('/account/')}>
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
            <path d="M5 5h6v14H5zM13 5h6v14h-6z" />
          </svg>
          <span>Мои гайды</span>
        </a>
      </nav>
    </div>
  );
}
