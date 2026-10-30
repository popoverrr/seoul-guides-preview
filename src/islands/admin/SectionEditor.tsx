// A section: its blocks (drag-sort, a form per type, preview exactly as the buyer sees it) and its places.
// Place fields from the client's file (src_*) and from Naver (naver_*) are locked: «Разблокировать» asks first and
// the change is written to the log (docs/05 § 4.7).
import { useEffect, useState } from 'preact/hooks';
import { api } from '../../lib/api';
import { Blocks } from '../reader/Blocks';
import type { SectionData } from '../reader/types';
import { adminError, Field, Link, moved, Notice, useLoad } from './ui';

interface Block {
  id: number;
  type: string;
  locale: 'ru' | 'en' | null;
  data: Record<string, unknown>;
}
interface Place {
  id: number;
  category: string;
  kind: string;
  src_name: string;
  src_address: string | null;
  src_doc: string;
  naver_name_ko: string | null;
  naver_address_ko: string | null;
  naver_url: string | null;
  naver_phone: string | null;
  naver_hours_raw: string | null;
  has_naver: boolean;
  media_ids: number[];
  i18n: Record<string, { name?: string; description_md?: string | null; author_tip_md?: string | null; hours_human?: string | null }>;
}
interface SectionResp {
  section: {
    id: number;
    guide: string;
    slug: string;
    tone: 'day' | 'night';
    district_code: string | null;
    i18n: Record<string, { title?: string; intro_md?: string | null }>;
  };
  blocks: Block[];
  places: Place[];
}
interface MediaRow {
  id: number;
  thumb: string;
  alt_ru: string;
  kind: string;
}

const TYPES: [string, string][] = [
  ['text', 'Текст'],
  ['heading', 'Заголовок'],
  ['tip', 'Заметка автора'],
  ['place-list', 'Список мест'],
  ['gallery', 'Галерея'],
  ['callout', 'Выноска'],
  ['disclaimer', 'Дисклеймер'],
  ['partner-offer', 'Партнёрское предложение'],
  ['checklist', 'Чек-лист'],
  ['divider', 'Разделитель'],
  ['route', 'Маршрут'],
  ['price-table', 'Прайс'],
  ['key-facts', 'Факты'],
  ['link-list', 'Ссылки'],
  ['product', 'Товар'],
  ['procedure-group', 'Процедуры'],
];
const LABEL = Object.fromEntries(TYPES);
const LOCKED: [keyof Place, string][] = [
  ['src_name', 'Название из файла'],
  ['src_address', 'Адрес из файла'],
  ['naver_url', 'Ссылка Naver'],
  ['naver_name_ko', 'Название Naver (кор.)'],
  ['naver_address_ko', 'Адрес Naver (кор.)'],
  ['naver_phone', 'Телефон Naver'],
  ['naver_hours_raw', 'Часы Naver'],
];

const str = (v: unknown) => (typeof v === 'string' ? v : '');

function BlockForm({ block, places, media, onSave }: { block: Block; places: Place[]; media: MediaRow[]; onSave: (data: Record<string, unknown>) => void }) {
  const [d, setD] = useState<Record<string, unknown>>(block.data);
  const [json, setJson] = useState(JSON.stringify(block.data, null, 2));
  const [jsonErr, setJsonErr] = useState('');
  const set = (k: string, v: unknown) => setD({ ...d, [k]: v });
  const ids = (k: string) => (Array.isArray(d[k]) ? (d[k] as number[]) : []);
  const toggle = (k: string, id: number) => set(k, ids(k).includes(id) ? ids(k).filter((x) => x !== id) : [...ids(k), id]);
  const md = (k: string, label: string, rows = 6) => (
    <Field label={label} hint="**жирный**, *курсив*, - список, [ссылка](https://…)">
      <textarea class="ad-input" rows={rows} value={str(d[k])} onInput={(e) => set(k, (e.target as HTMLTextAreaElement).value)} />
    </Field>
  );

  let body;
  switch (block.type) {
    case 'text':
      body = md('md', 'Текст', 8);
      break;
    case 'heading':
      body = (
        <>
          <Field label="Заголовок">
            <input class="ad-input" value={str(d.text)} onInput={(e) => set('text', (e.target as HTMLInputElement).value)} />
          </Field>
          <Field label="Хангыль (по желанию)">
            <input class="ad-input" value={str(d.hangul)} onInput={(e) => set('hangul', (e.target as HTMLInputElement).value)} />
          </Field>
        </>
      );
      break;
    case 'tip':
      body = (
        <>
          {md('md', 'Совет')}
          <Field label="Подпись (по умолчанию «Заметка автора»)">
            <input class="ad-input" value={str(d.author)} onInput={(e) => set('author', (e.target as HTMLInputElement).value)} />
          </Field>
        </>
      );
      break;
    case 'callout':
    case 'disclaimer':
      body = (
        <>
          {md('md', block.type === 'disclaimer' ? 'Текст дисклеймера' : 'Текст')}
          <Field label="Тон">
            <select class="ad-input" value={str(d[block.type === 'disclaimer' ? 'kind' : 'tone']) || (block.type === 'disclaimer' ? 'medical' : 'info')} onChange={(e) => set(block.type === 'disclaimer' ? 'kind' : 'tone', (e.target as HTMLSelectElement).value)}>
              {block.type === 'disclaimer' ? (
                <>
                  <option value="medical">медицинский</option>
                  <option value="general">общий</option>
                </>
              ) : (
                <>
                  <option value="info">информация</option>
                  <option value="warn">предупреждение</option>
                </>
              )}
            </select>
          </Field>
        </>
      );
      break;
    case 'place-list':
      body = (
        <fieldset class="ad-fieldset">
          <legend class="ad-field__label">Места в списке (по порядку раздела)</legend>
          {places.map((p) => (
            <label key={p.id} class="ad-check ad-check--row">
              <input type="checkbox" checked={ids('place_ids').includes(p.id)} onChange={() => toggle('place_ids', p.id)} />
              <span>{p.i18n.ru?.name ?? p.src_name}</span>
            </label>
          ))}
          {places.length === 0 && <p class="ad-muted">В разделе пока нет мест.</p>}
        </fieldset>
      );
      break;
    case 'gallery':
      body = (
        <fieldset class="ad-fieldset">
          <legend class="ad-field__label">Фото гайда (загружаются в «Медиа»)</legend>
          <div class="ad-thumbs">
            {media.map((m) => (
              <button key={m.id} type="button" class={ids('media_ids').includes(m.id) ? 'ad-thumb ad-thumb--on' : 'ad-thumb'} onClick={() => toggle('media_ids', m.id)} aria-pressed={ids('media_ids').includes(m.id)}>
                {m.kind === 'image' ? <img src={m.thumb} alt={m.alt_ru} loading="lazy" /> : <span>видео #{m.id}</span>}
              </button>
            ))}
          </div>
          <Field label="Подпись">
            <input class="ad-input" value={str(d.caption)} onInput={(e) => set('caption', (e.target as HTMLInputElement).value)} />
          </Field>
        </fieldset>
      );
      break;
    case 'divider':
      body = <p class="ad-muted">У разделителя нет настроек.</p>;
      break;
    default:
      body = (
        <Field label="Данные блока (JSON, docs/05 § 2)">
          <textarea
            class="ad-input ad-mono"
            rows={10}
            value={json}
            onInput={(e) => {
              const v = (e.target as HTMLTextAreaElement).value;
              setJson(v);
              try {
                const parsed = JSON.parse(v) as unknown;
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
                setD(parsed as Record<string, unknown>);
                setJsonErr('');
              } catch {
                setJsonErr('Ошибка в JSON');
              }
            }}
          />
          {jsonErr && <span class="ad-field__hint ad-err">{jsonErr}</span>}
        </Field>
      );
  }
  return (
    <form
      class="ad-blockform"
      onSubmit={(e) => {
        e.preventDefault();
        if (!jsonErr) onSave(d);
      }}
    >
      {body}
      <button class="ad-btn ad-btn--go" type="submit" disabled={!!jsonErr}>
        Сохранить блок
      </button>
    </form>
  );
}

function PlaceForm({ place, onSave, onDelete }: { place: Place; onSave: (body: Record<string, unknown>) => void; onDelete: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  return (
    <form
      class="ad-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget as HTMLFormElement);
        const body: Record<string, unknown> = {
          category: String(f.get('category') ?? ''),
          i18n: {
            ru: {
              name: String(f.get('name') ?? ''),
              description_md: String(f.get('description') ?? '') || null,
              author_tip_md: String(f.get('tip') ?? '') || null,
              hours_human: String(f.get('hours') ?? '') || null,
            },
          },
        };
        if (unlocked) {
          body.unlock = true;
          for (const [k] of LOCKED) {
            const v = String(f.get(k) ?? '');
            body[k] = v === '' ? (k === 'src_name' ? place.src_name : null) : v;
          }
        }
        onSave(body);
      }}
    >
      <Field label="Название на сайте (RU)">
        <input class="ad-input" name="name" defaultValue={place.i18n.ru?.name ?? place.src_name} required />
      </Field>
      <Field label="Категория" hint="cafe, bar, club, restaurant, shop, clinic, salon, museum…">
        <input class="ad-input" name="category" defaultValue={place.category} pattern="[a-z0-9-]*" />
      </Field>
      <Field label="Описание">
        <textarea class="ad-input" name="description" rows={4} defaultValue={place.i18n.ru?.description_md ?? ''} />
      </Field>
      <Field label="Заметка автора">
        <textarea class="ad-input" name="tip" rows={2} defaultValue={place.i18n.ru?.author_tip_md ?? ''} />
      </Field>
      <Field label="Часы (своими словами)">
        <input class="ad-input" name="hours" defaultValue={place.i18n.ru?.hours_human ?? ''} />
      </Field>

      <fieldset class={unlocked ? 'ad-locked ad-locked--open' : 'ad-locked'}>
        <legend class="ad-field__label">🔒 Данные заказчицы и Naver - только как в источнике</legend>
        {LOCKED.map(([k, label]) => (
          <Field key={k} label={label}>
            <input class="ad-input" name={k} defaultValue={(place[k] as string | null) ?? ''} readOnly={!unlocked} />
          </Field>
        ))}
        {!unlocked && (
          <button
            type="button"
            class="ad-btn ad-btn--warn"
            onClick={() =>
              confirm(
                'Эти поля переносятся дословно из файла заказчицы и из Naver. Менять их можно только по её данным, без «исправлений». Изменение запишется в журнал. Разблокировать?',
              ) && setUnlocked(true)
            }
          >
            Разблокировать
          </button>
        )}
      </fieldset>
      <div class="ad-row">
        <button class="ad-btn ad-btn--go" type="submit">
          Сохранить место
        </button>
        <button type="button" class="ad-btn ad-btn--warn" onClick={() => confirm('Удалить место из гайда?') && onDelete()}>
          Удалить
        </button>
      </div>
    </form>
  );
}

export function SectionEditor({ id }: { id: string }) {
  const d = useLoad<SectionResp>(`/admin/sections/${id}`);
  const [preview, setPreview] = useState<SectionData | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [openPlace, setOpenPlace] = useState<number | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [tab, setTab] = useState<'blocks' | 'places' | 'preview' | 'settings'>('blocks');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refreshPreview = () =>
    api<SectionData>('GET', `/admin/sections/${id}/preview`)
      .then(setPreview)
      .catch(() => setPreview(null));
  useEffect(() => {
    if (tab === 'preview') refreshPreview();
  }, [tab, d.data]);
  useEffect(() => {
    if (d.data) api<{ media: MediaRow[] }>('GET', `/admin/media?guide=${d.data.section.guide}`).then((r) => setMedia(r.media), () => {});
  }, [d.data?.section.guide]);

  if (d.error) return <Notice text={d.error} tone="err" />;
  if (!d.data) return <p class="ad-muted">Загружаем…</p>;
  const { section, blocks, places } = d.data;

  const run = async (fn: () => Promise<SectionResp>, ok: string) => {
    setError('');
    setNotice('');
    try {
      d.set(await fn());
      setNotice(ok);
    } catch (e) {
      setError(adminError(e));
    }
  };
  const order = (ids: number[]) => run(() => api('PUT', `/admin/sections/${id}/blocks/order`, { ids }), 'Порядок сохранён');

  return (
    <section class="ad-panel">
      <Link to={`guides/${section.guide}`} class="ad-link">
        ← Гайд
      </Link>
      <h1 class="ad-h1">{section.i18n.ru?.title ?? section.slug}</h1>
      <div class="ad-seg" role="tablist">
        {(
          [
            ['blocks', `Блоки (${blocks.length})`],
            ['places', `Места (${places.length})`],
            ['preview', 'Как в кабинете'],
            ['settings', 'Настройки'],
          ] as const
        ).map(([t, l]) => (
          <button key={t} type="button" role="tab" aria-pressed={tab === t} onClick={() => setTab(t)}>
            {l}
          </button>
        ))}
      </div>
      <Notice text={notice} />
      <Notice text={error} tone="err" />

      {tab === 'blocks' && (
        <>
          <ol class="ad-sortable">
            {blocks.map((b, i) => (
              <li
                key={b.id}
                class={drag === i ? 'ad-sort ad-sort--drag' : 'ad-sort'}
                draggable={open !== b.id}
                onDragStart={() => setDrag(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (drag !== null && drag !== i) order(moved(blocks, drag, i).map((x) => x.id));
                  setDrag(null);
                }}
                onDragEnd={() => setDrag(null)}
              >
                <span class="ad-sort__handle" aria-hidden="true">
                  ⋮⋮
                </span>
                <button type="button" class="ad-sort__main" onClick={() => setOpen(open === b.id ? null : b.id)} aria-expanded={open === b.id}>
                  <strong>{LABEL[b.type] ?? b.type}</strong>
                  <span class="ad-item__sub">{(str(b.data.text) || str(b.data.md) || str(b.data.caption)).slice(0, 90)}</span>
                </button>
                <span class="ad-sort__arrows">
                  <button type="button" aria-label="Выше" disabled={i === 0} onClick={() => order(moved(blocks, i, i - 1).map((x) => x.id))}>
                    ↑
                  </button>
                  <button type="button" aria-label="Ниже" disabled={i === blocks.length - 1} onClick={() => order(moved(blocks, i, i + 1).map((x) => x.id))}>
                    ↓
                  </button>
                  <button type="button" aria-label="Удалить блок" onClick={() => confirm('Удалить блок?') && run(() => api('DELETE', `/admin/blocks/${b.id}`), 'Блок удалён')}>
                    ×
                  </button>
                </span>
                {open === b.id && (
                  <div class="ad-sort__body">
                    <BlockForm block={b} places={places} media={media} onSave={(data) => run(() => api('PATCH', `/admin/blocks/${b.id}`, { data }), 'Блок сохранён')} />
                  </div>
                )}
              </li>
            ))}
          </ol>
          <form
            class="ad-row ad-row--wrap"
            onSubmit={(e) => {
              e.preventDefault();
              const type = String(new FormData(e.currentTarget as HTMLFormElement).get('type'));
              run(async () => {
                const r = await api<SectionResp>('POST', `/admin/sections/${id}/blocks`, { type, data: {} });
                setOpen(r.blocks[r.blocks.length - 1]?.id ?? null);
                return r;
              }, 'Блок добавлен');
            }}
          >
            <select class="ad-input" name="type">
              {TYPES.map(([t, l]) => (
                <option key={t} value={t}>
                  {l}
                </option>
              ))}
            </select>
            <button class="ad-btn" type="submit">
              + Блок
            </button>
          </form>
        </>
      )}

      {tab === 'places' && (
        <>
          <ul class="ad-list">
            {places.map((p) => (
              <li key={p.id} class="ad-card">
                <button type="button" class="ad-sort__main" onClick={() => setOpenPlace(openPlace === p.id ? null : p.id)} aria-expanded={openPlace === p.id}>
                  <strong>{p.i18n.ru?.name ?? p.src_name}</strong>
                  <span class="ad-item__sub">
                    {p.src_name} · {p.src_address ?? 'без адреса'} · {p.has_naver ? <span class="ad-tag">Naver есть</span> : <span class="ad-tag ad-tag--warn">нет данных Naver</span>}
                  </span>
                </button>
                {openPlace === p.id && (
                  <PlaceForm
                    place={p}
                    onSave={(body) => run(() => api('PATCH', `/admin/places/${p.id}`, body), body.unlock ? 'Сохранено, изменение данных заказчицы записано в журнал' : 'Место сохранено')}
                    onDelete={() => run(() => api('DELETE', `/admin/places/${p.id}`), 'Место удалено')}
                  />
                )}
              </li>
            ))}
          </ul>
          <form
            class="ad-card ad-grid"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget as HTMLFormElement);
              run(
                () =>
                  api('POST', `/admin/sections/${id}/places`, {
                    src_name: String(f.get('src_name') ?? ''),
                    src_address: String(f.get('src_address') ?? '') || null,
                    category: String(f.get('category') ?? ''),
                  }),
                'Место добавлено',
              ).then(() => (e.currentTarget as HTMLFormElement | null)?.reset());
            }}
          >
            <h2 class="ad-h2">Добавить место вручную</h2>
            <p class="ad-muted">Название и адрес - дословно как в файле заказчицы. Гайды целиком переносятся импортом (P6).</p>
            <Field label="Название из файла">
              <input class="ad-input" name="src_name" required />
            </Field>
            <Field label="Адрес из файла">
              <input class="ad-input" name="src_address" />
            </Field>
            <Field label="Категория">
              <input class="ad-input" name="category" pattern="[a-z0-9-]*" placeholder="cafe" />
            </Field>
            <button class="ad-btn" type="submit">
              + Место
            </button>
          </form>
        </>
      )}

      {tab === 'preview' && (
        <div class="rd ad-preview">
          {preview ? (
            <article class="rd__section">
              <h1 class="rd__title">{preview.section.title}</h1>
              <Blocks blocks={preview.blocks} places={preview.places} visible={() => true} />
            </article>
          ) : (
            <p class="ad-muted">Собираем предпросмотр…</p>
          )}
        </div>
      )}

      {tab === 'settings' && (
        <form
          class="ad-card ad-grid"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget as HTMLFormElement);
            run(
              () =>
                api('PATCH', `/admin/sections/${id}`, {
                  slug: String(f.get('slug') ?? ''),
                  tone: f.get('tone') === 'night' ? 'night' : 'day',
                  district_code: String(f.get('district') ?? '') || null,
                  i18n: { ru: { title: String(f.get('title') ?? ''), intro_md: String(f.get('intro') ?? '') || null } },
                }),
              'Раздел сохранён',
            );
          }}
        >
          <Field label="Название">
            <input class="ad-input" name="title" defaultValue={section.i18n.ru?.title ?? ''} required />
          </Field>
          <Field label="Адрес раздела (латиницей)">
            <input class="ad-input" name="slug" defaultValue={section.slug} pattern="[a-z0-9][a-z0-9-]*" required />
          </Field>
          <Field label="Вступление">
            <textarea class="ad-input" name="intro" rows={4} defaultValue={section.i18n.ru?.intro_md ?? ''} />
          </Field>
          <Field label="Район на карте" hint="seochon, ikseon, hongdae, myeongdong, seongsu, haebangchon, itaewon, gangnam">
            <input class="ad-input" name="district" defaultValue={section.district_code ?? ''} />
          </Field>
          <Field label="Тон">
            <select class="ad-input" name="tone" defaultValue={section.tone}>
              <option value="day">день</option>
              <option value="night">вечер (тёмная страница)</option>
            </select>
          </Field>
          <div class="ad-row">
            <button class="ad-btn ad-btn--go" type="submit">
              Сохранить
            </button>
            <button
              type="button"
              class="ad-btn ad-btn--warn"
              onClick={async () => {
                if (!confirm('Удалить раздел?')) return;
                try {
                  await api('DELETE', `/admin/sections/${id}`);
                  history.back();
                } catch (err) {
                  setError(adminError(err));
                }
              }}
            >
              Удалить раздел
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
