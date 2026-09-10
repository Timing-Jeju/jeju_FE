/**
 * 장소 카테고리 변환.
 *
 * 서버 `category`는 두 가지 형태로 온다. (`^(?:[A-Z]{2}|content-type:[0-9]{1,10})$`)
 *
 * 1. `FD` 같은 두 글자 코드 — TourAPI 4.0 관광타입 분류체계의 대분류(lclsSystm1)를
 *    그대로 보존한 값이다. 실제 데이터는 전부 이쪽이다.
 * 2. `content-type:39` — 1이 없을 때만 쓰는 contentTypeId fallback.
 *
 * 두 글자 코드의 이름은 TourAPI 공개 분류체계를 따르고, 로컬 데이터의 장소 이름으로
 * 코드마다 대조해 확인했다. (VE: 도서관 · 평화센터 · 리조트, EV: 축제 · 행사)
 */
const LCLS_LABELS: Record<string, string> = {
  NA: '자연',
  HS: '역사',
  EX: '체험',
  VE: '문화시설',
  EV: '축제·행사',
  LS: '레저',
  SH: '쇼핑',
  FD: '식당',
  AC: '숙박',
};

/** contentTypeId fallback — 공개 표준 코드다. 앱의 "카페"에 해당하는 code는 없다 */
const CONTENT_TYPE_LABELS: Record<string, string> = {
  '12': '관광지',
  '14': '문화시설',
  '15': '축제공연행사',
  '25': '여행코스',
  '28': '레포츠',
  '32': '숙박',
  '38': '쇼핑',
  '39': '식당',
};

/** 해석하지 못한 코드에 쓰는 라벨 */
const DEFAULT_LABEL = '관광지';

/** `FD` → `식당`, `content-type:12` → `관광지` */
export const categoryLabel = (category: string | null | undefined): string => {
  if (!category) return DEFAULT_LABEL;

  if (category.startsWith('content-type:')) {
    const code = category.slice('content-type:'.length);
    return CONTENT_TYPE_LABELS[code] ?? DEFAULT_LABEL;
  }

  return LCLS_LABELS[category] ?? DEFAULT_LABEL;
};

/** 화면의 장소 필터 칩 하나 (관심장소의 필수 / 선택방문 필터와는 별개) */
export type PlaceFilter = '관광지' | '식당' | '카페';

/**
 * 필터 한 칸에 해당하는 서버 코드 묶음.
 *
 * 서버는 요청당 category 하나만 받으므로(`NA,HS`는 400) 코드마다 따로 불러 합친다 —
 * `fetchPlacesByFilter`. 관광지는 식당 · 쇼핑 · 숙박을 뺀 나머지 대분류 전부다.
 */
export const FILTER_CODES: Record<PlaceFilter, readonly string[]> = {
  관광지: ['NA', 'HS', 'EX', 'VE', 'LS', 'EV'],
  식당: ['FD'],
  // 카페는 분류에 없어 음식(FD) 안에서 이름으로 거른다 — isCafeName
  카페: ['FD'],
};

/** 음식점 중 카페로 볼 수 있는 이름 (분류 정보가 생기면 그쪽으로 바꾼다) */
export const isCafeName = (name: string) =>
  /카페|커피|coffee|cafe|로스터/i.test(name);

/** 식당 · 쇼핑 · 숙박이 아니면 관광지 계열로 본다 (관심장소 필터) */
export const isAttractionLabel = (label: string) =>
  !['식당', '쇼핑', '숙박'].includes(label);
