// Shapes of GET /api/guides/{slug}/sections/{section} (api/src/Domain/Reader/ReaderApi.php).

export interface Media {
  id: number;
  url: string;
  kind: 'image' | 'video';
  width: number | null;
  height: number | null;
  alt: string;
}

export interface Place {
  id: number;
  n: number;
  category: string;
  kind: string;
  name: string;
  src_name: string;
  src_address: string | null;
  naver: { url: string; name_ko: string | null; address_ko: string | null; phone: string | null; hours: string | null } | null;
  description_md: string | null;
  author_tip_md: string | null;
  hours: string | null;
  price_level: number | null;
  extra: Record<string, unknown>;
  media: Media[];
}

export interface Block {
  type: string;
  data: Record<string, unknown>;
}

export interface SectionData {
  guide: { slug: string; title: string; emblem: string; patch: string };
  section: {
    slug: string;
    title: string;
    intro_md: string | null;
    tone: 'day' | 'night';
    district: string | null;
    updated_at: string;
    index: number;
    total: number;
    prev: string | null;
    next: string | null;
  };
  blocks: Block[];
  places: Place[];
}

export interface TocItem {
  slug: string;
  title: string;
  tone: 'day' | 'night';
  district_code: string | null;
}

export interface District {
  code: string;
  name: string;
  ko: string;
  lat: number;
  lon: number;
}
