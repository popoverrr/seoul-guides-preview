// The guides' Markdown (docs/05 § 2 `text`): **bold**, *italic*, links, lists, paragraphs — and no HTML ever.
// Everything is escaped first; only http(s), mailto and in-site links survive.

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string);

function safeUrl(u: string): string | null {
  const url = u.trim();
  if (/^(https?:\/\/|mailto:)/i.test(url) || (url.startsWith('/') && !url.startsWith('//'))) return url;
  return null;
}

/** inline: links, bold, italic — on already escaped text */
function inline(s: string): string {
  return esc(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, text: string, url: string) => {
      const ok = safeUrl(url.replace(/&amp;/g, '&'));
      if (!ok) return text;
      const ext = /^https?:/i.test(ok);
      return `<a href="${esc(ok)}"${ext ? ' target="_blank" rel="noopener nofollow"' : ''}>${text}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
}

export function md(src: string | null | undefined): string {
  if (!src) return '';
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
    para = [];
  };
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  for (const raw of src.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const ul = line.match(/^\s*[-•*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const kind = ul ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
      out.push(`<li>${inline((ul ?? ol)![1] ?? '')}</li>`);
    } else if (line.trim() === '') {
      flushPara();
      closeList();
    } else {
      closeList();
      para.push(line);
    }
  }
  flushPara();
  closeList();
  return out.join('');
}

/** Naver links the reader may open (docs/05 § 4): only the client's own naver.me / map.naver.com links, never built by us */
export function naverHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /(^|\.)(naver\.me|map\.naver\.com|naver\.com)$/i.test(u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}
