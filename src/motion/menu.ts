// C10 menu: native <dialog> (focus trap, Esc, inert page); the slide-down itself is CSS (@starting-style).
export function initMenu(root: Document): () => void {
  const dialog = root.querySelector<HTMLDialogElement>('[data-menu]');
  const openBtn = root.querySelector<HTMLButtonElement>('[data-menu-open]');
  if (!dialog || !openBtn) return () => {};

  const open = () => {
    dialog.showModal();
    openBtn.setAttribute('aria-expanded', 'true');
  };
  const onClose = () => {
    openBtn.setAttribute('aria-expanded', 'false');
    openBtn.focus({ preventScroll: true });
  };
  const onClick = (e: Event) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-menu-close]') || t.closest('[data-menu-link]')) dialog.close();
  };

  openBtn.setAttribute('aria-expanded', 'false');
  openBtn.addEventListener('click', open);
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('close', onClose);
  return () => {
    openBtn.removeEventListener('click', open);
    dialog.removeEventListener('click', onClick);
    dialog.removeEventListener('close', onClose);
    if (dialog.open) dialog.close();
  };
}
