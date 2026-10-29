// C2 cover parallax, C3 chapter frames unmask, C7 bojagi seams → patches, C9 night, I4 cursor (pointer:fine).
// Only transform / opacity / clip-path (docs/03 § 5).
import { below, gsap, yieldToMain, type Ctx } from './gsap';

export async function init(root: Document, ctx: Ctx): Promise<() => void> {
  const offs: (() => void)[] = [];
  await yieldToMain();

  ctx.add(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // C2: the cover frame slowly zooms 1.00 → 1.06 and lags behind the text
      const media = root.querySelector('[data-cover-media]');
      const text = root.querySelector('[data-cover-text]');
      if (media && text) {
        const st = { trigger: '[data-cover-section]', start: 'top top', end: 'bottom top', scrub: true };
        gsap.to(media, { scale: 1.06, yPercent: 15, ease: 'none', scrollTrigger: st });
        gsap.to(text, { yPercent: -10, autoAlpha: 0.2, ease: 'none', scrollTrigger: st });
      }

      // C3: the first frame of a chapter opens with a mask from the bottom up
      root.querySelectorAll<HTMLElement>('[data-frame]').forEach((frame) => {
        if (!below(frame)) return;
        gsap.fromTo(
          frame,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          {
            clipPath: 'inset(0% 0% 0% 0%)',
            ease: 'none',
            scrollTrigger: { trigger: frame, start: 'top bottom', end: 'top 40%', scrub: 0.4 },
          },
        );
      });

      // C7: seams are drawn first, then photos develop in their patches (≤ 2 at a time)
      const bojagi = root.querySelector<HTMLElement>('[data-bojagi]');
      if (bojagi && below(bojagi)) {
        const grid = bojagi.querySelector('.bojagi__grid');
        const patches = bojagi.querySelectorAll('.bojagi__patch a');
        const tl = gsap.timeline({ scrollTrigger: { trigger: bojagi, start: 'top 80%', once: true } });
        tl.from(grid, { clipPath: 'inset(0% 100% 0% 0%)', duration: 0.4, ease: 'turn' })
          .from(patches, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, stagger: { each: 0.18 } }, '>-0.05');
      }

      // C9: cream fades into night; the light line ignites from the centre; the italic word warms up
      const dusk = root.querySelector('[data-dusk]');
      if (dusk) {
        gsap.to(dusk, { opacity: 1, ease: 'none', scrollTrigger: { trigger: dusk, start: 'top bottom', end: 'top 30%', scrub: true } });
      }
      const line = root.querySelector('[data-glow-line]');
      const word = root.querySelector('[data-glow]');
      if (line) {
        gsap.from(line, {
          scaleX: 0,
          duration: 1.4,
          ease: 'turn',
          scrollTrigger: { trigger: line, start: 'top 85%', once: true, onEnter: () => word?.setAttribute('data-lit', '') },
        });
      }
    });

    // I4: delicate reaction to the cursor - frames follow ≤ 8px (lerp .08), "Открыть" label near links
    mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
      const frames = [...root.querySelectorAll<HTMLElement>('[data-frame] .photo')];
      const label = document.createElement('span');
      label.className = 'cursor-label t-nav';
      label.setAttribute('aria-hidden', 'true');
      document.body.append(label);
      let mx = 0;
      let my = 0;
      let x = 0;
      let y = 0;
      let lx = 0;
      let ly = 0;
      let raf = 0;
      const tick = () => {
        x += (mx - x) * 0.08;
        y += (my - y) * 0.08;
        lx += (mx - lx) * 0.25;
        ly += (my - ly) * 0.25;
        const dx = (x / innerWidth - 0.5) * 16;
        const dy = (y / innerHeight - 0.5) * 16;
        frames.forEach((f) => (f.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(1.03)`));
        label.style.transform = `translate3d(${lx + 18}px, ${ly + 14}px, 0)`;
        raf = requestAnimationFrame(tick);
      };
      const onMove = (e: PointerEvent) => {
        mx = e.clientX;
        my = e.clientY;
        const t = (e.target as HTMLElement).closest<HTMLElement>('[data-cursor]');
        label.textContent = t?.dataset.cursor ?? '';
        label.toggleAttribute('data-on', !!t);
      };
      addEventListener('pointermove', onMove, { passive: true });
      raf = requestAnimationFrame(tick);
      const off = () => {
        removeEventListener('pointermove', onMove);
        cancelAnimationFrame(raf);
        label.remove();
        frames.forEach((f) => (f.style.transform = ''));
      };
      offs.push(off);
      return off;
    });
    offs.push(() => mm.revert());
  });

  return () => offs.forEach((f) => f());
}
