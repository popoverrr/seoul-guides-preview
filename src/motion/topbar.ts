// TopBar state + C4 chapter indicator: html[data-past-cover], html[data-night], chapter numeral and progress.
export function initTopbar(root: Document): () => void {
  const html = root.documentElement;
  const cover = root.querySelector<HTMLElement>('[data-cover-section]');
  const num = root.querySelector<HTMLElement>('[data-chapter-num]');
  const progress = root.querySelector<HTMLElement>('[data-chapter-progress]');
  const chapters = [...root.querySelectorAll<HTMLElement>('[data-chapter]')];
  const night = root.querySelector<HTMLElement>('[data-night-chapter]');
  const observers: IntersectionObserver[] = [];

  if (!cover) html.setAttribute('data-past-cover', '');
  else {
    const io = new IntersectionObserver(([e]) => html.toggleAttribute('data-past-cover', !e?.isIntersecting), {
      rootMargin: '-56px 0px 0px 0px',
    });
    io.observe(cover);
    observers.push(io);
  }

  if (night) {
    // the bar turns night while the night chapter sits under it
    const io = new IntersectionObserver(([e]) => html.toggleAttribute('data-night', !!e?.isIntersecting), {
      rootMargin: '0px 0px -92% 0px',
    });
    io.observe(night);
    observers.push(io);
  }

  let current = chapters[0]?.dataset.chapter ?? '';
  const order = (v: string) => chapters.findIndex((c) => c.dataset.chapter === v);
  const setNum = (value: string) => {
    if (!num || value === current) return;
    const down = order(value) > order(current);
    current = value;
    num.textContent = value;
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      num.animate(
        [{ transform: `translateY(${down ? 100 : -100}%)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 480, easing: 'cubic-bezier(.22,.61,.12,1)' },
      );
    }
  };

  if (chapters.length) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setNum((e.target as HTMLElement).dataset.chapter ?? '');
      },
      { rootMargin: '-45% 0px -54% 0px' },
    );
    chapters.forEach((c) => io.observe(c));
    observers.push(io);
  }

  let raf = 0;
  const onScroll = () => {
    if (raf || !progress) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const max = html.scrollHeight - innerHeight;
      progress.parentElement?.style.setProperty('--progress', String(max > 0 ? scrollY / max : 0));
    });
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return () => {
    observers.forEach((o) => o.disconnect());
    removeEventListener('scroll', onScroll);
    cancelAnimationFrame(raf);
    html.removeAttribute('data-night');
  };
}
