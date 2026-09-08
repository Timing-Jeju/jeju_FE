const CANONICAL_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isCanonicalPlaceId(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL_UUID.test(value);
}

/** 과거 이름/좌표 기반 항목은 서버 장소로 추정 매핑하지 않는다. */
export function requireCanonicalPlaceId(
  value: unknown,
): asserts value is string {
  if (!isCanonicalPlaceId(value))
    throw new Error('이 장소를 검색 결과에서 다시 선택해 주세요.');
}
