// «Карта» tab (docs/08 P4): the guide's districts on the same OpenStreetMap drawing as the free part (InkMap),
// loaded only when the tab is opened. Tap a district → its sections.
import map from '../../data/seoul-map.json';
import type { District, TocItem } from './types';

const [W, H] = map.viewBox as [number, number];
const [S, Wl, N, E] = map.bbox as [number, number, number, number];
const kx = Math.cos(((S + N) / 2) * (Math.PI / 180));
const xy = (lat: number, lon: number) => [(((lon - Wl) * kx) / ((E - Wl) * kx)) * W, ((N - lat) / (N - S)) * H] as const;

export default function MapTab({
  districts,
  toc,
  current,
  open,
}: {
  districts: District[];
  toc: TocItem[];
  current: string;
  open: (section: string) => void;
}) {
  const used = districts.filter((d) => toc.some((t) => t.district_code === d.code));
  return (
    <div class="rmap">
      <svg viewBox={`0 0 ${W} ${H}`} class="rmap__svg" aria-hidden="true">
        <path class="m-parks" d={map.parks} />
        <path class="m-roads" d={map.roads} />
        <path class="m-streams" d={map.streams} />
        <path class="m-river" d={map.river} style={`stroke-width:${(map.kmUnits * 0.95).toFixed(1)}`} />
        {used.map((d) => {
          const [x, y] = xy(d.lat, d.lon);
          const on = toc.some((t) => t.slug === current && t.district_code === d.code);
          return <circle key={d.code} cx={x} cy={y} r={on ? 14 : 9} class={on ? 'rmap__dot rmap__dot--on' : 'rmap__dot'} />;
        })}
      </svg>
      <p class="rmap__credit">{map.credit}</p>
      {used.length === 0 && <p class="rmap__empty">У разделов этого гайда пока нет районов на карте.</p>}
      <ul class="rmap__list">
        {used.map((d) => (
          <li key={d.code}>
            <p class="rmap__name">
              {d.name}{' '}
              <span lang="ko" class="rmap__ko">
                {d.ko}
              </span>
            </p>
            {toc
              .filter((t) => t.district_code === d.code)
              .map((t) => (
                <button key={t.slug} type="button" class={t.slug === current ? 'rmap__sec rmap__sec--on' : 'rmap__sec'} onClick={() => open(t.slug)}>
                  {t.title}
                </button>
              ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
