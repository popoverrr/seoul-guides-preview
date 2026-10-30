// Тексты сайта (public_blocks), заявки, журнал (docs/01 § 6). The texts reach the static pages after «Опубликовать».
import { useState } from 'preact/hooks';
import { api } from '../../lib/api';
import { adminError, Field, Notice, useLoad, when } from './ui';

interface PublicBlock {
  key: string;
  ru: unknown;
  en: unknown;
  updated_at: string;
}

const NAMES: Record<string, string> = {
  cover: 'Обложка главной',
  about: 'О нас (главная)',
  guides: 'Блок гайдов',
  inside: 'Как устроен гайд',
  night: 'Сеул после девяти',
  tour: 'Тур (главная)',
  prepare: 'Перед поездкой',
  authors: 'THE FOUNDERS',
  buy: 'Как купить и FAQ',
  footer: 'Подвал',
};

/** every string in a JSON value, with its path, so texts are edited as texts and the structure stays intact */
function strings(v: unknown, path: (string | number)[] = []): [(string | number)[], string][] {
  if (typeof v === 'string') return [[path, v]];
  if (Array.isArray(v)) return v.flatMap((x, i) => strings(x, [...path, i]));
  if (v && typeof v === 'object') return Object.entries(v).flatMap(([k, x]) => strings(x, [...path, k]));
  return [];
}
function setAt(v: unknown, path: (string | number)[], val: string): unknown {
  if (!path.length) return val;
  const [h, ...t] = path;
  const copy = (Array.isArray(v) ? [...v] : { ...(v as Record<string, unknown>) }) as Record<string | number, unknown>;
  copy[h as string] = setAt(copy[h as string], t, val);
  return copy;
}

function BlockEditor({ block, onSaved }: { block: PublicBlock; onSaved: (msg: string, err?: boolean) => void }) {
  const [ru, setRu] = useState<unknown>(block.ru);
  const fields = strings(ru).filter(([p]) => !/(_todo|href|guide|code|lat|lon|side|patch)$/.test(String(p[p.length - 1])));
  return (
    <form
      class="ad-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await api('PUT', `/admin/public-blocks/${block.key}`, { ru, en: block.en ?? null });
          onSaved('Сохранено. На сайте появится после «Опубликовать».');
        } catch (err) {
          onSaved(adminError(err), true);
        }
      }}
    >
      {fields.map(([p, v]) => (
        <Field key={p.join('.')} label={p.join(' › ')}>
          {v.length > 70 ? (
            <textarea class="ad-input" rows={Math.min(8, Math.ceil(v.length / 60))} value={v} onInput={(e) => setRu(setAt(ru, p, (e.target as HTMLTextAreaElement).value))} />
          ) : (
            <input class="ad-input" value={v} onInput={(e) => setRu(setAt(ru, p, (e.target as HTMLInputElement).value))} />
          )}
        </Field>
      ))}
      <button class="ad-btn ad-btn--go" type="submit">
        Сохранить
      </button>
    </form>
  );
}

export function SiteTexts() {
  const d = useLoad<{ blocks: PublicBlock[] }>('/admin/public-blocks');
  const [open, setOpen] = useState('');
  const [msg, setMsg] = useState<{ text: string; err: boolean }>({ text: '', err: false });
  return (
    <section class="ad-panel">
      <h1 class="ad-h1">Тексты сайта</h1>
      <p class="ad-muted">Длинное тире «—» само заменяется на «-». Изменения появятся на сайте после кнопки «Опубликовать».</p>
      <Notice text={d.error} tone="err" />
      <Notice text={msg.text} tone={msg.err ? 'err' : 'ok'} />
      <ul class="ad-list">
        {(d.data?.blocks ?? []).filter((b) => !b.key.startsWith('_')).map((b) => (
          <li key={b.key} class="ad-card">
            <button type="button" class="ad-sort__main" aria-expanded={open === b.key} onClick={() => setOpen(open === b.key ? '' : b.key)}>
              <strong>{NAMES[b.key] ?? b.key}</strong>
              <span class="ad-item__sub">изменено {when(b.updated_at)}</span>
            </button>
            {open === b.key && <BlockEditor block={b} onSaved={(text, err = false) => (setMsg({ text, err }), d.reload())} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface Lead {
  id: number;
  kind: string;
  slug: string;
  option_label: string | null;
  locale: string;
  utm: Record<string, string>;
  created_at: string;
}

export function Leads() {
  const [days, setDays] = useState(30);
  const d = useLoad<{ summary: { kind: string; slug: string; count: number }[]; leads: Lead[] }>(`/admin/leads?days=${days}`);
  return (
    <section class="ad-panel">
      <h1 class="ad-h1">Заявки</h1>
      <p class="ad-muted">Нажатия «Купить» и «Заявка» на сайте - чтобы видеть спрос. Сама переписка идёт в WhatsApp.</p>
      <div class="ad-seg" role="group" aria-label="Период">
        {[7, 30, 90].map((n) => (
          <button key={n} type="button" aria-pressed={days === n} onClick={() => setDays(n)}>
            {n} дней
          </button>
        ))}
      </div>
      <Notice text={d.error} tone="err" />
      <ul class="ad-list ad-list--plain ad-summary">
        {(d.data?.summary ?? []).map((s) => (
          <li key={s.kind + s.slug}>
            <strong>{s.count}</strong> · {s.kind === 'tour' ? 'тур' : 'гайд'} {s.slug}
          </li>
        ))}
      </ul>
      <table class="ad-table">
        <thead>
          <tr>
            <th>Когда</th>
            <th>Что</th>
            <th>Язык</th>
            <th>Откуда</th>
          </tr>
        </thead>
        <tbody>
          {(d.data?.leads ?? []).map((l) => (
            <tr key={l.id}>
              <td>{when(l.created_at)}</td>
              <td>
                {l.slug}
                {l.option_label ? ` · ${l.option_label}` : ''}
              </td>
              <td>{l.locale}</td>
              <td>{Object.values(l.utm).join(' / ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {d.data && d.data.leads.length === 0 && <p class="ad-muted">За этот период нажатий не было.</p>}
    </section>
  );
}

interface AuditRow {
  id: number;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string;
  diff: unknown;
  created_at: string;
}

export function Audit() {
  const d = useLoad<{ audit: AuditRow[] }>('/admin/audit');
  return (
    <section class="ad-panel">
      <h1 class="ad-h1">Журнал действий</h1>
      <Notice text={d.error} tone="err" />
      <table class="ad-table">
        <thead>
          <tr>
            <th>Когда</th>
            <th>Кто</th>
            <th>Что</th>
            <th>Подробности</th>
          </tr>
        </thead>
        <tbody>
          {(d.data?.audit ?? []).map((a) => (
            <tr key={a.id} class={a.action === 'place.unlock' ? 'ad-row--hl' : ''}>
              <td>{when(a.created_at)}</td>
              <td>{a.actor_name ?? '-'}</td>
              <td>
                {a.action} · {a.entity} #{a.entity_id}
              </td>
              <td class="ad-mono">{a.diff ? JSON.stringify(a.diff).slice(0, 240) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
