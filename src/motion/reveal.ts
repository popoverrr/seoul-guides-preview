// C5 (lines from a mask), fade, hairline drawn left→right, C6 rows one by one with seams. Once each.
// Set up element by element, yielding to the main thread in between: no long task on a weak phone (TBT).
import { below, gsap, SplitText, yieldToMain, type Ctx } from './gsap';

export async function init(root: Document, ctx: Ctx): Promise<() => void> {
  const splits: SplitText[] = [];
  const q = (sel: string) => [...root.querySelectorAll<HTMLElement>(sel)].filter(below);

  for (const el of q('[data-reveal="lines"]')) {
    ctx.add(() => {
      const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'rl' });
      splits.push(split);
      gsap.from(split.lines, {
        yPercent: 105,
        duration: 1,
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });
    await yieldToMain();
  }

  ctx.add(() => {
    q('[data-reveal="fade"]').forEach((el) =>
      gsap.from(el, { autoAlpha: 0, y: 12, duration: 0.7, scrollTrigger: { trigger: el, start: 'top 90%', once: true } }),
    );
    q('[data-reveal="rule"]').forEach((el) =>
      gsap.from(el, { scaleX: 0, duration: 1, ease: 'turn', scrollTrigger: { trigger: el, start: 'top 92%', once: true } }),
    );
  });
  await yieldToMain();

  for (const list of q('[data-reveal="rows"]')) {
    ctx.add(() => {
      const rows = [...list.children] as HTMLElement[];
      const seams = rows.map((r) => r.querySelector('.toc__seam')).filter(Boolean);
      const tl = gsap.timeline({ scrollTrigger: { trigger: list, start: 'top 85%', once: true } });
      tl.from(rows, { autoAlpha: 0, y: 14, duration: 0.7, stagger: 0.06 }, 0);
      if (seams.length) tl.from(seams, { scaleX: 0, duration: 0.9, ease: 'turn', stagger: 0.06 }, 0.1);
    });
    await yieldToMain();
  }
  return () => splits.forEach((s) => s.revert());
}
