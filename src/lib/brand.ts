// Final brand from the client 28.10 (Q4, Q20, D-046). One constant for the whole site.
export const BRAND = 'KOREA HAUS';
/** the wordmark as set in the bar and the footer (Prata, as the client writes it; logo - TODO(client) Q4) */
export const BRAND_TITLE = 'KOREA HAUS';
/** the client's slogan (28.10) */
export const SLOGAN = 'Твой персональный путеводитель по современному Сеулу';
/** WhatsApp Business of the project (client 28.10): wa.me format, digits only */
export const WHATSAPP = '77003249395';
export const WHATSAPP_SHOWN = '+7 700 324 9395';

export function waLink(text: string): string {
  return WHATSAPP ? `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}` : '#contacts';
}
