// PlaceCard (docs/02 § 7, docs/05 § 4): number, category, RU name, the source name as is, Naver data only when the client
// sent it (badge + «Открыть в Naver Map»), otherwise the source address with «Скопировать адрес» and no badge.
import { useState } from 'preact/hooks';
import { md, naverHref } from './md';
import type { Place } from './types';

const CATEGORY: Record<string, string> = {
  cafe: 'Кафе',
  bar: 'Бар',
  club: 'Клуб',
  restaurant: 'Ресторан',
  shop: 'Магазин',
  clinic: 'Клиника',
  salon: 'Салон',
  museum: 'Музей',
  gallery: 'Галерея',
  hotel: 'Отель',
};

export const categoryLabel = (c: string): string => CATEGORY[c] ?? (c ? c[0]!.toUpperCase() + c.slice(1) : '');

export function PlaceCard({ place }: { place: Place }) {
  const [copied, setCopied] = useState(false);
  const naver = naverHref(place.naver?.url);
  const address = place.naver?.address_ko ?? place.src_address;
  const copy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      // no clipboard access: select the address so a long press copies it
      const dd = document.querySelector(`#place-${place.id} .pc__addr`);
      if (dd) getSelection()?.selectAllChildren(dd);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <article class="pc" id={`place-${place.id}`} data-category={place.category}>
      {place.media.length > 0 && (
        <div class="pc__gallery">
          {place.media.map((m) => (
            <img
              key={m.id}
              src={m.url}
              alt={m.alt}
              width={m.width ?? undefined}
              height={m.height ?? undefined}
              loading="lazy"
              decoding="async"
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
            />
          ))}
        </div>
      )}
      <div class="pc__head">
        <span class="pc__n" aria-hidden="true">
          {place.n}
        </span>
        <div>
          {place.category && <span class="pc__cat">{categoryLabel(place.category)}</span>}
          <h3 class="pc__name">{place.name}</h3>
          {place.src_name !== place.name && <p class="pc__src">{place.src_name}</p>}
          {place.naver?.name_ko && (
            <p class="pc__ko" lang="ko">
              {place.naver.name_ko}
            </p>
          )}
        </div>
      </div>

      {place.description_md && <div class="pc__text md" dangerouslySetInnerHTML={{ __html: md(place.description_md) }} />}

      <dl class="pc__data">
        {address && (
          <div>
            <dt>Адрес</dt>
            <dd class="pc__addr" lang={place.naver?.address_ko ? 'ko' : undefined}>
              {address}
            </dd>
          </div>
        )}
        {(place.naver?.hours || place.hours) && (
          <div>
            <dt>Часы</dt>
            <dd>{place.naver?.hours ?? place.hours}</dd>
          </div>
        )}
        {place.naver?.phone && (
          <div>
            <dt>Телефон</dt>
            <dd>{place.naver.phone}</dd>
          </div>
        )}
      </dl>
      {naver && <p class="pc__badge">N · Данные Naver - без изменений</p>}

      {place.author_tip_md && (
        <div class="pc__tip">
          <span class="pc__tip-k">Заметка автора</span>
          <div class="md" dangerouslySetInnerHTML={{ __html: md(place.author_tip_md) }} />
        </div>
      )}

      <div class="pc__actions">
        {naver && (
          <a class="pc__naver" href={naver} target="_blank" rel="noopener">
            Открыть в Naver Map
          </a>
        )}
        {address && (
          <button class="pc__copy" type="button" onClick={copy} aria-live="polite">
            {copied ? 'Адрес скопирован' : 'Скопировать адрес'}
          </button>
        )}
      </div>
    </article>
  );
}
