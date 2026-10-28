// Brand chosen 28.10 (Q20, D-045). One constant for the whole site.
export const BRAND = 'SEOUL DEPT.';
/** the wordmark as set in the bar and the footer (Prata, as the client writes it; logo — TODO(client) Q4) */
export const BRAND_TITLE = 'SEOUL DEPT.';
/** working slogan (owner 27.10: «Сеул в деталях»); final — TODO(client) Q4 */
export const SLOGAN = 'Сеул в деталях';
// TODO(client): WhatsApp number (Q5). Empty → buttons link to the contacts note instead of wa.me.
export const WHATSAPP = '';

export function waLink(text: string): string {
  return WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}` : '#contacts';
}
