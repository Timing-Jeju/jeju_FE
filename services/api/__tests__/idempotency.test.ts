import {
  createIdempotencyKey,
  isCanonicalUuid,
} from '@/services/api/idempotency';

describe('createIdempotencyKey', () => {
  it('lowercase canonical UUID v4 형식이다', () => {
    const key = createIdempotencyKey();

    expect(isCanonicalUuid(key)).toBe(true);
    expect(key).toBe(key.toLowerCase());
    // 세 번째 그룹은 4로, 네 번째 그룹은 8·9·a·b 로 시작한다 (v4 / RFC 4122 variant)
    expect(key[14]).toBe('4');
    expect('89ab').toContain(key[19]);
  });

  it('찜 등록의 Idempotency-Key 패턴도 만족한다', () => {
    expect(createIdempotencyKey()).toMatch(/^[A-Za-z0-9._:-]{1,128}$/);
  });

  it('호출마다 다른 값을 만든다', () => {
    const keys = new Set(Array.from({ length: 200 }, createIdempotencyKey));
    expect(keys.size).toBe(200);
  });
});

describe('isCanonicalUuid', () => {
  it('소문자 8-4-4-4-12 형식만 통과시킨다', () => {
    expect(isCanonicalUuid('123e4567-e89b-42d3-a456-426614174000')).toBe(true);
    expect(isCanonicalUuid('123E4567-E89B-42D3-A456-426614174000')).toBe(false);
    expect(isCanonicalUuid('123e4567e89b42d3a456426614174000')).toBe(false);
    expect(isCanonicalUuid('')).toBe(false);
  });
});
