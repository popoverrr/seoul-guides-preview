// Logs «Купить / Оставить заявку в WhatsApp» clicks to POST /api/leads (docs/01 § 6). Fire-and-forget.
export function initLeads(root: Document): () => void {
  const onClick = (e: MouseEvent) => {
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('[data-lead]');
    if (!a) return;
    const utm = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => k.startsWith('utm_')));
    const body = JSON.stringify({
      kind: a.dataset.lead,
      slug: a.dataset.leadSlug,
      option: a.dataset.leadOption,
      locale: document.documentElement.lang,
      utm,
    });
    navigator.sendBeacon?.('/api/leads', new Blob([body], { type: 'application/json' }));
  };
  root.addEventListener('click', onClick);
  return () => root.removeEventListener('click', onClick);
}
