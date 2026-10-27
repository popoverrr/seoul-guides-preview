// Working brand until the client decides (Q4, Q20). One constant for the whole site.
export const BRAND = 'SEOUL NOTES';
/** the wordmark as set in the bar and the footer (sentence case in Prata, no tracked capitals) */
export const BRAND_TITLE = 'Seoul Notes';
/** working slogan (owner 27.10: «Сеул в деталях»); final — TODO(client) Q4 */
export const SLOGAN = 'Сеул в деталях';
// TODO(client): WhatsApp number (Q5). Empty → buttons link to the contacts note instead of wa.me.
export const WHATSAPP = '';

export function waLink(text: string): string {
  return WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}` : '#contacts';
}
