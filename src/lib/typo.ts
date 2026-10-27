// RU/EN typesetting for copy coming from data (docs/02 § 4, docs/11):
// no-break space after short words and before dashes, «*word*» → <em>, HTML-escaped input.
const NBSP = ' ';
const SHORT = /(^|[\s(«—])((?:[вксуояиаВКСУОЯИА])|(?:на|по|за|не|ни|из|от|до|во|со|ко|об|но|да|же|ли|бы|к|the|a|an|of|to|in|on|at|by|and|or)) /giu;

function escape(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

export function nb(s: string): string {
  return s
    .replace(SHORT, `$1$2${NBSP}`)
    .replace(SHORT, `$1$2${NBSP}`)
    .replace(/ —/g, `${NBSP}—`)
    .replace(/(\d) (?=\d{3}\b)/g, `$1${NBSP}`)
    .replace(/(\d) (?=[₽₸₩$])/g, `$1${NBSP}`);
}

/** Plain text → safe HTML with typographic spaces; *x* becomes <em>x</em>, a line break stays a <br>. */
export function typo(s: string): string {
  return nb(escape(s))
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}
