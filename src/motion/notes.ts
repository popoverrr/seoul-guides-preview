// Handwritten notes and shelf plinths appear once when they enter the viewport (vanilla, no GSAP).
export function initNotes(root: Document): () => void {
  const els = [...root.querySelectorAll<HTMLElement>('[data-note], [data-rise], [data-neon]')];
  if (!els.length) return () => {};
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const t = e.target;
        t.setAttribute(t.hasAttribute('data-note') ? 'data-drawn' : t.hasAttribute('data-neon') ? 'data-lit' : 'data-risen', '');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -12% 0px' },
  );
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
