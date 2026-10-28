// Motion entry (docs/03 § 6). Light vanilla modules run on every page load;
// GSAP and its plugins are imported lazily after idle / first interaction and never with reduced motion.
import { initTopbar } from './topbar';
import { initMenu } from './menu';
import { initInkmap } from './inkmap';
import { initLeads } from './leads';
import { initNotes } from './notes';
import { initPick } from './pick';

type Cleanup = () => void;
let cleanups: Cleanup[] = [];

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// GSAP starts on the first gesture (scroll, touch, key): everything it animates is below the first screen,
// so nothing is lost, and its setup never lands inside the load window (TBT on a mid-range phone, D-040).
function onFirstGesture(fn: () => void): Cleanup {
  let done = false;
  const events = ['scroll', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const;
  const off = () => events.forEach((e) => removeEventListener(e, run));
  function run() {
    if (done) return;
    done = true;
    off();
    fn();
  }
  events.forEach((e) => addEventListener(e, run, { once: true, passive: true }));
  return () => {
    done = true;
    off();
  };
}

async function heavy(): Promise<Cleanup[]> {
  const { setup } = await import('./gsap');
  const ctx = await setup();
  const [reveal, scenes] = await Promise.all([import('./reveal'), import('./scenes')]);
  const done = [await scenes.init(document, ctx), await reveal.init(document, ctx)];
  return [...done, () => ctx.kill()];
}

function start() {
  cleanups = [initTopbar(document), initMenu(document), initInkmap(document), initLeads(document), initNotes(document), initPick(document)];
  if (reduced()) return;
  let alive = true;
  cleanups.push(() => {
    alive = false;
  });
  cleanups.push(
    onFirstGesture(() => {
      heavy().then((c) => (alive ? cleanups.push(...c) : c.forEach((f) => f())));
    }),
  );
}

function stop() {
  cleanups.forEach((f) => f());
  cleanups = [];
}

export function boot() {
  document.addEventListener('astro:page-load', start);
  document.addEventListener('astro:before-swap', stop);
}
