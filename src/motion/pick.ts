// «Моя подборка»: guides picked on any page, kept in localStorage, bought with one WhatsApp message (D-043).
// Markup contract:
//   [data-pick-toggle="slug"]   button, aria-pressed reflects the state (hidden until JS runs)
//   [data-pick-count]           text = number of picked guides; [data-pick-has] shown only when > 0
//   [data-pick-dock]            bottom bar, shown when > 0 (not on pages with html[data-no-dock])
//   [data-pick-wa]              link to WhatsApp with the picked guides in the message
//   [data-pick-list]            <ul> on /pick/, filled from <template data-pick-item="slug">
//   [data-pick-label]           text like «2 гайда»
import { WHATSAPP } from '../lib/brand';

const KEY = 'sn-pick';
type Titles = Record<string, string>;

function read(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function write(list: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* private mode: the selection lives for this page only */
  }
}

export function plural(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  const w = m10 === 1 && m100 !== 11 ? 'гайд' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'гайда' : 'гайдов';
  return `${n} ${w}`;
}

export function message(titles: string[]): string {
  return titles.length === 1
    ? `Здравствуйте! Хочу купить гайд «${titles[0]}» (RU)`
    : `Здравствуйте! Хочу купить гайды: ${titles.join(', ')} (RU)`;
}

export function initPick(root: Document): () => void {
  let list = read();
  const titles: Titles = JSON.parse(root.querySelector('[data-pick-titles]')?.textContent ?? '{}');

  const render = () => {
    const n = list.length;
    root.querySelectorAll<HTMLButtonElement>('[data-pick-toggle]').forEach((b) => {
      const on = list.includes(b.dataset.pickToggle ?? '');
      b.hidden = false;
      b.setAttribute('aria-pressed', String(on));
      b.closest('[data-pick-card]')?.toggleAttribute('data-picked', on);
    });
    root.querySelectorAll<HTMLElement>('[data-pick-count]').forEach((el) => (el.textContent = String(n)));
    root.querySelectorAll<HTMLElement>('[data-pick-has]').forEach((el) => (el.hidden = n === 0));
    root.querySelectorAll<HTMLElement>('[data-pick-empty]').forEach((el) => (el.hidden = n > 0));
    root.querySelectorAll<HTMLElement>('[data-pick-label]').forEach((el) => (el.textContent = plural(n)));
    const dockOn = n > 0 && !root.documentElement.hasAttribute('data-no-dock');
    root.querySelectorAll<HTMLElement>('[data-pick-dock]').forEach((el) => el.toggleAttribute('data-on', dockOn));
    root.documentElement.toggleAttribute('data-dock', dockOn);
    const names = list.map((s) => titles[s] ?? s);
    root.querySelectorAll<HTMLAnchorElement>('[data-pick-wa]').forEach((a) => {
      a.href = WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message(names))}` : '#contacts';
      a.dataset.leadOption = list.join(',').slice(0, 64);
    });
    root.querySelectorAll<HTMLElement>('[data-pick-message]').forEach((el) => (el.textContent = `«${message(names)}»`));
    const ul = root.querySelector<HTMLElement>('[data-pick-list]');
    if (ul) {
      ul.replaceChildren(
        ...list.flatMap((s) => {
          const tpl = root.querySelector<HTMLTemplateElement>(`template[data-pick-item="${s}"]`);
          return tpl ? [tpl.content.cloneNode(true)] : [];
        }),
      );
    }
  };

  const onClick = (e: Event) => {
    const t = e.target as HTMLElement;
    const toggle = t.closest<HTMLElement>('[data-pick-toggle]');
    const remove = t.closest<HTMLElement>('[data-pick-remove]');
    const slug = toggle?.dataset.pickToggle ?? remove?.dataset.pickRemove;
    if (!slug) return;
    e.preventDefault();
    list = list.includes(slug) ? list.filter((x) => x !== slug) : [...list, slug];
    write(list);
    render();
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      list = read();
      render();
    }
  };

  render();
  root.addEventListener('click', onClick);
  addEventListener('storage', onStorage);
  return () => {
    root.removeEventListener('click', onClick);
    removeEventListener('storage', onStorage);
  };
}
