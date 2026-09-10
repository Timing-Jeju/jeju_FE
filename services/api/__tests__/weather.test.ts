import { toForecastDateTime } from '@/services/api/weather';

describe('toForecastDateTime', () => {
  it('UTC 시각을 +09:00 벽시계로 옮기고 정시로 자른다', () => {
    expect(toForecastDateTime(new Date('2026-09-10T00:10:00Z'))).toBe(
      '2026-09-10T09:00:00+09:00',
    );
  });

  it('한국 시간으로 날짜가 넘어가면 다음 날로 표기한다', () => {
    expect(toForecastDateTime(new Date('2026-09-10T15:30:00Z'))).toBe(
      '2026-09-11T00:00:00+09:00',
    );
  });

  it('연말 경계도 넘어간다', () => {
    expect(toForecastDateTime(new Date('2026-12-31T20:59:59Z'))).toBe(
      '2027-01-01T05:00:00+09:00',
    );
  });
});
