/**
 * 장소 카테고리 변환.
 *
 * 서버 `category`는 두 가지 형태로 온다. (`^(?:[A-Z]{2}|content-type:[0-9]{1,10})$`)
 *
 * 1. `VE` 같은 두 글자 코드 — TourAPI `lclsSystm1` 대분류를 그대로 보존한 값이다.
 *    실제 데이터는 대부분 이쪽이다.
 * 2. `content-type:39` — 1이 없을 때만 쓰는 contentTypeId fallback.
 *
 * 두 글자 코드의 한국어 이름은 TourAPI `lclsSystmCode2` 동기화 결과
 * (`external_reference_codes`)에 있는데, 공개 API 20개에는 그걸 내려주는 endpoint가
 * 없다. 그래서 지금은 해석하지 못하고 기본 라벨로 떨어진다.
 * 코드표를 지어내지 않고, 확인 가능한 contentTypeId만 옮긴다.
 *
 * contentTypeId는 공개 표준 코드다. 다만 앱의 "카페"에 해당하는 code가 없어서
 * 음식점(39) 안에서 카페를 갈라내려면 별도 분류 정보가 필요하다.
 */
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

/**
 * 해석하지 못한 코드에 쓰는 라벨.
 * 두 글자 코드가 전부 여기로 떨어지므로, 음식점·숙박이 관광지로 보일 수 있다.
 */
const DEFAULT_LABEL = '관광지';

/** `content-type:12` → `관광지` */
export const categoryLabel = (category: string | null | undefined): string => {
  if (!category) return DEFAULT_LABEL;

  const code = category.startsWith('content-type:')
    ? category.slice('content-type:'.length)
    : null;

  return (code && CONTENT_TYPE_LABELS[code]) || DEFAULT_LABEL;
};

/** `관광지` → `content-type:12` (목록 조회 필터로 되돌릴 때) */
export const categoryCode = (label: string): string | undefined => {
  const entry = Object.entries(CONTENT_TYPE_LABELS).find(
    ([, value]) => value === label,
  );
  return entry ? `content-type:${entry[0]}` : undefined;
};
