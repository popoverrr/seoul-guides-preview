// Гайды и разделы (docs/01 § 6): order, status, prices, emblem, texts RU/EN; the sections of a guide with drag-sort.
import { useState } from 'preact/hooks';
import { api } from '../../lib/api';
import { adminError, Field, Link, moved, Notice, useLoad, when } from './ui';

interface GuideRow {
  id: number;
  slug: string;
  status: 'draft' | 'published';
  hangul_label: string;
  romanization: string;
  patch_token: string;
  price_rub: number | null;
  price_kzt: number | null;
  price_usd: number | null;
  title_ru: string | null;
  sections: number | null;
  places: number | null;
  places_without_naver: number | null;
  buyers: number | null;
  i18n?: Record<string, { title?: string; subtitle?: string; description_md?: string | null }>;
}
interface SectionRow {
  id: number;
  slug: string;
  title: string;
  tone: 'day' | 'night';
  district_code: string | null;
  blocks: number;
  places: number;
  updated_at: string;
}

export function GuidesList() {
  const list = useLoad<{ guides: GuideRow[] }>('/admin/guides');
  return (
    <section class="ad-panel">
      <h1 class="ad-h1">Гайды</h1>
      <Notice text={list.error} tone="err" />
      <ul class="ad-list">
        {(list.data?.guides ?? []).map((g) => (
          <li key={g.slug}>
            <Link to={`guides/${g.slug}`} class="ad-item" >
              <span class="ad-item__main" style={`--patch:var(${g.patch_token})`}>
                <span class="ad-ko" lang="ko">
                  {g.hangul_label}
                </span>
                <strong>{g.title_ru ?? g.slug}</strong>
                <span class={g.status === 'published' ? 'ad-tag' : 'ad-tag ad-tag--warn'}>{g.status === 'published' ? 'опубликован' : 'черновик'}</span>
              </span>
              <span class="ad-item__sub">
                разделов {g.sections} · мест {g.places}
                {g.places_without_naver ? ` (без Naver: ${g.places_without_naver})` : ''} · покупателей {g.buyers}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const num = (v: FormDataEntryValue | null): number | null => {
  const s = String(v ?? '').replace(/\s/g, '');
  return s === '' ? null : Number.parseInt(s, 10);
};

export function GuideCard({ slug }: { slug: string }) {
  const d = useLoad<{ guide: GuideRow; sections: SectionRow[] }>(`/admin/guides/${slug}`);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [drag, setDrag] = useState<number | null>(null);
  const g = d.data?.guide;
  if (d.error) return <Notice text={d.error} tone="err" />;
  if (!g || !d.data) return <p class="ad-muted">Загружаем…</p>;
  const sections = d.data.sections;

  const save = async (body: Record<string, unknown>, ok = 'Сохранено') => {
    setError('');
    setNotice('');
    try {
      d.set(await api('PATCH', `/admin/guides/${slug}`, body));
      setNotice(ok);
    } catch (e) {
      setError(adminError(e));
    }
  };
  const order = async (ids: number[]) => {
    try {
      d.set(await api('PUT', `/admin/guides/${slug}/sections/order`, { ids }));
    } catch (e) {
      setError(adminError(e));
    }
  };

  return (
    <section class="ad-panel">
      <Link to="guides" class="ad-link">
        ← Гайды
      </Link>
      <div class="ad-head">
        <h1 class="ad-h1">
          <span class="ad-ko" lang="ko">
            {g.hangul_label}
          </span>{' '}
          {g.i18n?.ru?.title ?? g.slug}
        </h1>
        <button
          type="button"
          class={g.status === 'published' ? 'ad-btn' : 'ad-btn ad-btn--go'}
          onClick={() => save({ status: g.status === 'published' ? 'draft' : 'published' }, g.status === 'published' ? 'Снят с публикации' : 'Опубликован')}
        >
          {g.status === 'published' ? 'Снять с публикации' : 'Опубликовать гайд'}
        </button>
      </div>
      <Notice text={notice} />
      <Notice text={error} tone="err" />

      <div class="ad-card">
        <h2 class="ad-h2">Разделы</h2>
        <p class="ad-muted">Перетащите строку за «⋮⋮» или нажмите стрелки, чтобы поменять порядок.</p>
        <ol class="ad-sortable">
          {sections.map((s, i) => (
            <li
              key={s.id}
              class={drag === i ? 'ad-sort ad-sort--drag' : 'ad-sort'}
              draggable
              onDragStart={() => setDrag(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (drag !== null && drag !== i) order(moved(sections, drag, i).map((x) => x.id));
                setDrag(null);
              }}
              onDragEnd={() => setDrag(null)}
            >
              <span class="ad-sort__handle" aria-hidden="true">
                ⋮⋮
              </span>
              <Link to={`sections/${s.id}`} class="ad-sort__main">
                <strong>{s.title}</strong>
                <span class="ad-item__sub">
                  /{s.slug}/ · блоков {s.blocks} · мест {s.places}
                  {s.tone === 'night' ? ' · вечер' : ''} · {when(s.updated_at)}
                </span>
              </Link>
              <span class="ad-sort__arrows">
                <button type="button" aria-label="Выше" disabled={i === 0} onClick={() => order(moved(sections, i, i - 1).map((x) => x.id))}>
                  ↑
                </button>
                <button type="button" aria-label="Ниже" disabled={i === sections.length - 1} onClick={() => order(moved(sections, i, i + 1).map((x) => x.id))}>
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ol>
        <form
          class="ad-row ad-row--wrap"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget as HTMLFormElement);
            setError('');
            try {
              await api('POST', `/admin/guides/${slug}/sections`, {
                title: String(f.get('title') ?? ''),
                slug: String(f.get('slug') ?? ''),
                district_code: String(f.get('district') ?? '') || null,
              });
              (e.currentTarget as HTMLFormElement).reset();
              d.reload();
              setNotice('Раздел добавлен');
            } catch (err) {
              setError(adminError(err));
            }
          }}
        >
          <input class="ad-input" name="title" placeholder="Название раздела" required />
          <input class="ad-input" name="slug" placeholder="адрес латиницей: hongdae" pattern="[a-z0-9][a-z0-9-]*" required />
          <input class="ad-input" name="district" placeholder="район: hongdae (по желанию)" />
          <button class="ad-btn" type="submit">
            + Раздел
          </button>
        </form>
      </div>

      <form
        class="ad-card ad-grid"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget as HTMLFormElement);
          save({
            price_rub: num(f.get('rub')),
            price_kzt: num(f.get('kzt')),
            price_usd: num(f.get('usd')),
            i18n: {
              ru: { title: String(f.get('title_ru') ?? ''), subtitle: String(f.get('sub_ru') ?? ''), description_md: String(f.get('desc_ru') ?? '') },
              ...(String(f.get('title_en') ?? '') ? { en: { title: String(f.get('title_en')), subtitle: String(f.get('sub_en') ?? '') } } : {}),
            },
          });
        }}
      >
        <h2 class="ad-h2">Описание и цены</h2>
        <Field label="Название RU">
          <input class="ad-input" name="title_ru" defaultValue={g.i18n?.ru?.title ?? ''} required />
        </Field>
        <Field label="Подзаголовок RU">
          <input class="ad-input" name="sub_ru" defaultValue={g.i18n?.ru?.subtitle ?? ''} />
        </Field>
        <Field label="Описание RU">
          <textarea class="ad-input" name="desc_ru" rows={4} defaultValue={g.i18n?.ru?.description_md ?? ''} />
        </Field>
        <Field label="Название EN">
          <input class="ad-input" name="title_en" defaultValue={g.i18n?.en?.title ?? ''} />
        </Field>
        <Field label="Подзаголовок EN">
          <input class="ad-input" name="sub_en" defaultValue={g.i18n?.en?.subtitle ?? ''} />
        </Field>
        <div class="ad-row ad-row--wrap">
          <Field label="Цена ₸">
            <input class="ad-input" name="kzt" inputMode="numeric" defaultValue={g.price_kzt?.toString() ?? ''} />
          </Field>
          <Field label="Цена ₽">
            <input class="ad-input" name="rub" inputMode="numeric" defaultValue={g.price_rub?.toString() ?? ''} />
          </Field>
          <Field label="Цена $">
            <input class="ad-input" name="usd" inputMode="numeric" defaultValue={g.price_usd?.toString() ?? ''} />
          </Field>
        </div>
        <button class="ad-btn ad-btn--go" type="submit">
          Сохранить
        </button>
      </form>
    </section>
  );
}
