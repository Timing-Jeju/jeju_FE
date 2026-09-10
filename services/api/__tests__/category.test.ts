import {
  categoryLabel,
  FILTER_CODES,
  isAttractionLabel,
  isCafeName,
} from '@/services/api/category';

describe('categoryLabel', () => {
  it('TourAPI 대분류 두 글자 코드를 한국어 라벨로 옮긴다', () => {
    expect(categoryLabel('FD')).toBe('식당');
    expect(categoryLabel('NA')).toBe('자연');
    expect(categoryLabel('SH')).toBe('쇼핑');
    expect(categoryLabel('AC')).toBe('숙박');
    expect(categoryLabel('EV')).toBe('축제·행사');
  });

  it('contentTypeId fallback 도 옮긴다', () => {
    expect(categoryLabel('content-type:12')).toBe('관광지');
    expect(categoryLabel('content-type:39')).toBe('식당');
  });

  it('해석하지 못하는 값은 기본 라벨(관광지)로 떨어진다', () => {
    expect(categoryLabel('ZZ')).toBe('관광지');
    expect(categoryLabel('content-type:99')).toBe('관광지');
    expect(categoryLabel('')).toBe('관광지');
    expect(categoryLabel(null)).toBe('관광지');
    expect(categoryLabel(undefined)).toBe('관광지');
  });
});

describe('FILTER_CODES', () => {
  it('관광지는 식당 · 쇼핑 · 숙박을 뺀 대분류 전부다', () => {
    expect(FILTER_CODES.관광지).not.toContain('FD');
    expect(FILTER_CODES.관광지).not.toContain('SH');
    expect(FILTER_CODES.관광지).not.toContain('AC');
    expect(FILTER_CODES.관광지).toEqual(
      expect.arrayContaining(['NA', 'HS', 'EX', 'VE', 'LS', 'EV']),
    );
  });

  it('식당과 카페는 음식(FD) 코드를 쓴다', () => {
    expect(FILTER_CODES.식당).toEqual(['FD']);
    expect(FILTER_CODES.카페).toEqual(['FD']);
  });

  it('필터 코드는 모두 라벨을 해석할 수 있는 코드다', () => {
    Object.values(FILTER_CODES)
      .flat()
      .forEach((code) => expect(categoryLabel(code)).not.toBe('관광지'));
  });
});

describe('isCafeName', () => {
  it('이름에 카페 · 커피 · coffee · cafe 가 들어가면 카페로 본다', () => {
    expect(isCafeName('카페 어림비')).toBe(true);
    expect(isCafeName('제주 커피 박물관')).toBe(true);
    expect(isCafeName('Jeju Coffee House')).toBe(true);
    expect(isCafeName('Blue Cafe')).toBe(true);
    expect(isCafeName('돈카츠 서황')).toBe(false);
  });
});

describe('isAttractionLabel', () => {
  it('식당 · 쇼핑 · 숙박만 관광지가 아니다', () => {
    expect(isAttractionLabel('자연')).toBe(true);
    expect(isAttractionLabel('관광지')).toBe(true);
    expect(isAttractionLabel('식당')).toBe(false);
    expect(isAttractionLabel('쇼핑')).toBe(false);
    expect(isAttractionLabel('숙박')).toBe(false);
  });
});
