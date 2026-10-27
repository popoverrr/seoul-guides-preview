// C11: dots appear when the map comes into view; tap → jade ring + bottom sheet, swipe down to close.
export function initInkmap(root: Document): () => void {
  const map = root.querySelector<HTMLElement>('[data-inkmap]');
  const sheet = map?.querySelector<HTMLDialogElement>('[data-sheet]');
  const body = map?.querySelector<HTMLElement>('[data-sheet-body]');
  const grip = map?.querySelector<HTMLElement>('[data-sheet-grip]');
  if (!map || !sheet || !body || !grip) return () => {};
  const dots = [...map.querySelectorAll<HTMLButtonElement>('[data-district]')];
  let active: HTMLButtonElement | null = null;

  const io = new IntersectionObserver(
    ([e]) => {
      if (e?.isIntersecting) {
        map.setAttribute('data-shown', '');
        io.disconnect();
      }
    },
    { threshold: 0.25 },
  );
  io.observe(map);

  const open = (btn: HTMLButtonElement) => {
    const tpl = map.querySelector<HTMLTemplateElement>(`[data-district-tpl="${btn.dataset.district}"]`);
    if (!tpl) return;
    body.replaceChildren(tpl.content.cloneNode(true));
    active?.setAttribute('aria-expanded', 'false');
    active = btn;
    btn.setAttribute('aria-expanded', 'true');
    sheet.style.removeProperty('--drag');
    if (!sheet.open) sheet.showModal();
  };
  const onDot = (e: Event) => open(e.currentTarget as HTMLButtonElement);
  const onClose = () => {
    active?.setAttribute('aria-expanded', 'false');
    active?.focus({ preventScroll: true });
    active = null;
  };
  const onSheetClick = (e: MouseEvent) => {
    if (e.target === sheet || (e.target as HTMLElement).closest('[data-sheet-close]')) sheet.close();
  };

  // drag-to-dismiss with a little inertia: a flick faster than 0.5 px/ms or a drag past 30% closes
  let y0 = 0;
  let t0 = 0;
  let dy = 0;
  const onDown = (e: PointerEvent) => {
    y0 = e.clientY;
    t0 = performance.now();
    dy = 0;
    grip.setPointerCapture(e.pointerId);
    sheet.setAttribute('data-dragging', '');
  };
  const onMove = (e: PointerEvent) => {
    if (!sheet.hasAttribute('data-dragging')) return;
    dy = Math.max(0, e.clientY - y0);
    sheet.style.setProperty('--drag', `${dy}px`);
  };
  const onUp = () => {
    if (!sheet.hasAttribute('data-dragging')) return;
    sheet.removeAttribute('data-dragging');
    const v = dy / Math.max(1, performance.now() - t0);
    if (v > 0.5 || dy > sheet.offsetHeight * 0.3) sheet.close();
    sheet.style.removeProperty('--drag');
  };

  dots.forEach((d) => {
    d.setAttribute('aria-expanded', 'false');
    d.addEventListener('click', onDot);
  });
  sheet.addEventListener('close', onClose);
  sheet.addEventListener('click', onSheetClick);
  grip.addEventListener('pointerdown', onDown);
  grip.addEventListener('pointermove', onMove);
  grip.addEventListener('pointerup', onUp);
  grip.addEventListener('pointercancel', onUp);

  return () => {
    io.disconnect();
    dots.forEach((d) => d.removeEventListener('click', onDot));
    sheet.removeEventListener('close', onClose);
    sheet.removeEventListener('click', onSheetClick);
    grip.removeEventListener('pointerdown', onDown);
    grip.removeEventListener('pointermove', onMove);
    grip.removeEventListener('pointerup', onUp);
    grip.removeEventListener('pointercancel', onUp);
    if (sheet.open) sheet.close();
  };
}
