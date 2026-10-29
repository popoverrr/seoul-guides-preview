// Living cover (owner 29.10, D-051): the client's photo stays the first paint and the LCP; after the page has loaded
// and the browser is idle, a 3.8-second seamless loop of the same frame (clouds drift, the four people walk on; the tail
// crossfades into the head) fades in over it and keeps looping. Phones only (9:16); never with reduced motion or Save-Data.
export function initCoverVideo(root: Document): () => void {
  const video = root.querySelector<HTMLVideoElement>('[data-cover-video]');
  if (!video) return () => {};
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const skip =
    matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(max-width: 1023px)').matches || conn?.saveData === true;
  if (skip) return () => {};

  let cancelled = false;
  const show = () => video.setAttribute('data-on', '');
  const start = () => {
    if (cancelled) return;
    video.preload = 'auto';
    video.addEventListener('playing', show, { once: true });
    video.play().catch(() => {
      /* autoplay refused (low-power mode): the photo simply stays */
    });
  };
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 2500 }) : setTimeout(start, 1200));
  if (root.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });

  // no point decoding while the cover is scrolled away
  const io = new IntersectionObserver(([e]) => {
    if (!video.hasAttribute('data-on')) return;
    if (e?.isIntersecting) void video.play().catch(() => {});
    else video.pause();
  });
  io.observe(video);

  return () => {
    cancelled = true;
    io.disconnect();
    video.pause();
  };
}
