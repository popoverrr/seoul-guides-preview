// One renderer for every block type of docs/05 § 2. Unknown types render nothing (a newer admin never breaks an older reader).
import type { ComponentChildren } from 'preact';
import { md } from './md';
import { PlaceCard } from './PlaceCard';
import type { Block, Media, Place } from './types';

type D = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const list = (v: unknown): D[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as D[]) : []);
const Md = ({ src, class: cls = 'md' }: { src: unknown; class?: string }) => <div class={cls} dangerouslySetInnerHTML={{ __html: md(str(src)) }} />;

function Gallery({ media, caption }: { media: Media[]; caption: string }) {
  return (
    <figure class="b-gallery">
      <div class="b-gallery__row">
        {media.map((m) =>
          m.kind === 'video' ? (
            <video key={m.id} src={m.url} controls playsInline preload="none" />
          ) : (
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
          ),
        )}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}

function Items({ items, render }: { items: D[]; render: (it: D) => ComponentChildren }) {
  return <ul class="b-items">{items.map((it, i) => <li key={i}>{render(it)}</li>)}</ul>;
}

export function Blocks({ blocks, places, visible }: { blocks: Block[]; places: Place[]; visible: (p: Place) => boolean }) {
  const byId = new Map(places.map((p) => [p.id, p]));
  const pick = (ids: unknown): Place[] =>
    (Array.isArray(ids) ? ids : []).map((id) => byId.get(Number(id))).filter((p): p is Place => !!p && visible(p));

  return (
    <>
      {blocks.map((b, i) => {
        const d = b.data;
        switch (b.type) {
          case 'heading':
            return (
              <h2 key={i} class="b-heading">
                {str(d.text)}
                {str(d.hangul) && (
                  <span class="b-heading__ko" lang="ko">
                    {str(d.hangul)}
                  </span>
                )}
              </h2>
            );
          case 'text':
            return <Md key={i} src={d.md} class="md b-text" />;
          case 'tip':
            return (
              <aside key={i} class="b-tip">
                <span class="b-tip__k">{str(d.author) || 'Заметка автора'}</span>
                <Md src={d.md} />
              </aside>
            );
          case 'callout':
            return (
              <aside key={i} class={`b-callout b-callout--${str(d.tone) || 'info'}`}>
                <Md src={d.md} />
              </aside>
            );
          case 'disclaimer':
            return (
              <aside key={i} class="b-callout b-callout--warn" role="note">
                <Md src={d.md} />
              </aside>
            );
          case 'partner-offer':
            return (
              <aside key={i} class="b-offer">
                <span class="b-offer__k">Партнёрское предложение · {str(d.partner)}</span>
                <Md src={d.md} />
                {str(d.code) && <p class="b-offer__code">Код: {str(d.code)}</p>}
                <Md src={d.disclosure_md} class="md b-offer__note" />
              </aside>
            );
          case 'gallery':
            return <Gallery key={i} media={(d.media as Media[] | undefined) ?? []} caption={str(d.caption)} />;
          case 'video':
            return <Gallery key={i} media={(d.media as Media[] | undefined) ?? []} caption={str(d.caption)} />;
          case 'place-list': {
            const ps = pick(d.place_ids);
            return ps.length ? (
              <div key={i} class={`b-places b-places--${str(d.layout) || 'cards'}`}>
                {ps.map((p) => (
                  <PlaceCard key={p.id} place={p} />
                ))}
              </div>
            ) : null;
          }
          case 'place': {
            const [p] = pick([d.place_id]);
            return p ? <PlaceCard key={i} place={p} /> : null;
          }
          case 'route':
            return (
              <ol key={i} class="b-route">
                {list(d.steps).map((s, n) => {
                  const p = byId.get(Number(s.place_id));
                  return (
                    <li key={n}>
                      {p && <strong>{p.name}</strong>}
                      <Md src={s.md} />
                    </li>
                  );
                })}
              </ol>
            );
          case 'checklist':
            return (
              <ul key={i} class="b-check">
                {(Array.isArray(d.items) ? d.items : []).map((t, n) => (
                  <li key={n}>{str(t)}</li>
                ))}
              </ul>
            );
          case 'divider':
            return <hr key={i} class="b-divider" />;
          case 'key-facts':
            return (
              <dl key={i} class="b-facts">
                {list(d.items).map((it, n) => (
                  <div key={n}>
                    <dt>{str(it.label)}</dt>
                    <dd>{str(it.link) ? <a href={str(it.link)} target="_blank" rel="noopener">{str(it.value)}</a> : str(it.value)}</dd>
                  </div>
                ))}
              </dl>
            );
          case 'link-list':
            return <Items key={i} items={list(d.items)} render={(it) => <a href={str(it.url)} target="_blank" rel="noopener nofollow">{str(it.label)}</a>} />;
          case 'app-list':
            return (
              <Items
                key={i}
                items={list(d.items)}
                render={(it) => (
                  <>
                    <strong>{str(it.name)}</strong> - {str(it.purpose)}
                    {str(it.ios_url) && <> · <a href={str(it.ios_url)} target="_blank" rel="noopener">iOS</a></>}
                    {str(it.android_url) && <> · <a href={str(it.android_url)} target="_blank" rel="noopener">Android</a></>}
                  </>
                )}
              />
            );
          case 'etiquette-list':
            return <Items key={i} items={list(d.items)} render={(it) => (<><strong>{str(it.title)}</strong><Md src={it.md} /></>)} />;
          case 'phrasebook':
            return (
              <table key={i} class="b-table">
                <tbody>
                  {list(d.items).map((it, n) => (
                    <tr key={n}>
                      <td>{str(it.ru)}</td>
                      <td lang="ko">{str(it.ko)}</td>
                      <td class="b-table__mute">{str(it.translit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          case 'hotel-list':
            return <Items key={i} items={list(d.items)} render={(it) => (<>{str(it.name)} {it.stars ? `· ${String(it.stars)}★` : ''} {str(it.area) && `· ${str(it.area)}`}</>)} />;
          case 'price-table':
            return (
              <figure key={i} class="b-prices">
                {str(d.caption) && <figcaption>{str(d.caption)}</figcaption>}
                <table class="b-table">
                  <tbody>
                    {list(d.rows).map((r, n) => (
                      <tr key={n}>
                        <td>{str(r.item)}{str(r.note) && <span class="b-table__mute"> · {str(r.note)}</span>}</td>
                        <td class="b-table__num">{str(r.price_raw)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {str(d.as_of) && <p class="b-table__mute">Цены на {str(d.as_of)}</p>}
              </figure>
            );
          case 'procedure-group':
            return (
              <section key={i} class="b-group">
                <h3>{str(d.title)}</h3>
                <Items key={i} items={list(d.items)} render={(it) => (<><strong>{str(it.name)}</strong>{str(it.price_raw) && ` · ${str(it.price_raw)}`}<Md src={it.md} /></>)} />
              </section>
            );
          case 'product':
            return (
              <aside key={i} class="b-product">
                <strong>{str(d.name)}</strong>
                {str(d.brand) && <span class="b-table__mute"> · {str(d.brand)}</span>}
                <Md src={d.md} />
                {str(d.why) && <p class="b-table__mute">{str(d.why)}</p>}
              </aside>
            );
          case 'district':
            return (
              <section key={i} class="b-group">
                <h3>
                  {str(d.code)} <span lang="ko">{str(d.hangul)}</span>
                </h3>
                <Md src={d.summary_md} />
              </section>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
