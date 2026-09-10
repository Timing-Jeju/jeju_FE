import { categoryCode, categoryLabel } from '@/services/api/category';

describe('categoryLabel', () => {
  it('contentTypeId 를 한국어 라벨로 옮긴다', () => {
    expect(categoryLabel('content-type:12')).toBe('관광지');
    expect(categoryLabel('content-type:39')).toBe('식당');
    expect(categoryLabel('content-type:32')).toBe('숙박');
  });

  it('해석하지 못하는 값은 기본 라벨(관광지)로 떨어진다', () => {
    expect(categoryLabel('VE')).toBe('관광지');
    expect(categoryLabel('content-type:99')).toBe('관광지');
    expect(categoryLabel('')).toBe('관광지');
    expect(categoryLabel(null)).toBe('관광지');
    expect(categoryLabel(undefined)).toBe('관광지');
  });
});

describe('categoryCode', () => {
  it('라벨을 목록 조회 필터 코드로 되돌린다', () => {
    expect(categoryCode('관광지')).toBe('content-type:12');
    expect(categoryCode('식당')).toBe('content-type:39');
  });

  it('대응 코드가 없는 라벨(전체 · 카페)은 undefined 라 필터를 걸지 않는다', () => {
    expect(categoryCode('전체')).toBeUndefined();
    expect(categoryCode('카페')).toBeUndefined();
  });

  it('라벨 → 코드 → 라벨 왕복이 맞는다', () => {
    ['관광지', '문화시설', '식당', '쇼핑'].forEach((label) => {
      expect(categoryLabel(categoryCode(label))).toBe(label);
    });
  });
});
