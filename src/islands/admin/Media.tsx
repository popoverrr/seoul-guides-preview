// Медиа (docs/01 § 6): upload a photo or video into a guide → AVIF/WebP variants are made on the server; alt RU/EN.
// Only own or licensed material (D-024): the checkbox is required.
import { useState } from 'preact/hooks';
import { href } from '../../lib/api';
import { adminError, Field, Notice, useLoad, when } from './ui';
import { api } from '../../lib/api';

interface MediaRow {
  id: number;
  kind: 'image' | 'video';
  guide: string | null;
  rights: string;
  width: number | null;
  height: number | null;
  variants: string[];
  alt_ru: string;
  alt_en: string;
  created_at: string;
  thumb: string;
}

function cookie(name: string): string {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1] ?? '') : '';
}

export function Media() {
  const guides = useLoad<{ guides: { slug: string; title_ru: string | null }[] }>('/admin/guides');
  const [guide, setGuide] = useState('');
  const list = useLoad<{ media: MediaRow[] }>(`/admin/media${guide ? '?guide=' + guide : ''}`);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  return (
    <section class="ad-panel">
      <h1 class="ad-h1">Медиа</h1>
      <form
        class="ad-card ad-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget as HTMLFormElement;
          const data = new FormData(form);
          if (!data.get('rights')) return setError('Подтвердите права на фото или видео.');
          setBusy(true);
          setError('');
          setNotice('');
          try {
            // multipart, so not through api(): the CSRF header is set by hand
            if (!cookie('sg_csrf')) await fetch(href('/api/csrf'), { credentials: 'same-origin' });
            const res = await fetch(href('/api/admin/media'), { method: 'POST', body: data, credentials: 'same-origin', headers: { 'X-CSRF-Token': cookie('sg_csrf') } });
            const body = (await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null;
            if (!res.ok) throw Object.assign(new Error(body?.error?.message ?? 'Ошибка'), { status: res.status, code: body?.error?.code ?? '' });
            form.reset();
            setNotice('Загружено: варианты для телефона и компьютера готовы.');
            list.reload();
          } catch (err) {
            const code = (err as { code?: string }).code;
            setError(code === 'bad_type' ? 'Только фото JPEG, PNG, WebP, AVIF или видео MP4/WebM.' : code === 'too_big' ? 'Файл слишком большой.' : adminError(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 class="ad-h2">Загрузить</h2>
        <Field label="Файл">
          <input class="ad-input" type="file" name="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" required />
        </Field>
        <Field label="Гайд">
          <select class="ad-input" name="guide" required>
            {(guides.data?.guides ?? []).map((g) => (
              <option key={g.slug} value={g.slug}>
                {g.title_ru ?? g.slug}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Описание для незрячих (alt), RU">
          <input class="ad-input" name="alt_ru" />
        </Field>
        <label class="ad-check ad-check--row">
          <input type="checkbox" name="rights" value="own" />
          <span>Это наше фото/видео или у нас есть права на него</span>
        </label>
        <Notice text={notice} />
        <Notice text={error} tone="err" />
        <button class="ad-btn ad-btn--go" type="submit" disabled={busy}>
          {busy ? 'Загружаем и готовим варианты…' : 'Загрузить'}
        </button>
      </form>

      <div class="ad-row">
        <select class="ad-input" value={guide} onChange={(e) => setGuide((e.target as HTMLSelectElement).value)} aria-label="Фильтр по гайду">
          <option value="">Все гайды</option>
          {(guides.data?.guides ?? []).map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.title_ru ?? g.slug}
            </option>
          ))}
        </select>
      </div>
      <ul class="ad-media">
        {(list.data?.media ?? []).map((m) => (
          <li key={m.id} class="ad-card">
            {m.kind === 'image' ? <img src={m.thumb} alt={m.alt_ru} loading="lazy" /> : <p class="ad-muted">видео</p>}
            <p class="ad-item__sub">
              #{m.id} · {m.guide ?? 'без гайда'} · {m.width}×{m.height} · {when(m.created_at)}
            </p>
            <input
              class="ad-input"
              defaultValue={m.alt_ru}
              placeholder="alt RU"
              onChange={(e) => api('PATCH', `/admin/media/${m.id}`, { alt_ru: (e.target as HTMLInputElement).value }).then(() => setNotice('Описание сохранено'), (err) => setError(adminError(err)))}
            />
            <button
              type="button"
              class="ad-link"
              onClick={() =>
                confirm('Удалить файл?') &&
                api('DELETE', `/admin/media/${m.id}`).then(
                  () => list.reload(),
                  (err) => setError(adminError(err)),
                )
              }
            >
              Удалить
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
