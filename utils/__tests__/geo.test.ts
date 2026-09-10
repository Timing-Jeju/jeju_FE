import { formatDistance, haversine } from '@/utils/geo';

describe('haversine', () => {
  it('같은 좌표는 0m 이다', () => {
    const coord = { latitude: 33.5, longitude: 126.5 };
    expect(haversine(coord, coord)).toBe(0);
  });

  it('위도 1도는 약 111.2km 이다', () => {
    const distance = haversine(
      { latitude: 0, longitude: 0 },
      { latitude: 1, longitude: 0 },
    );
    expect(distance).toBeCloseTo(111195, -1);
  });

  it('방향을 바꿔도 거리는 같다', () => {
    const airport = { latitude: 33.5066, longitude: 126.4931 };
    const seongsan = { latitude: 33.4587, longitude: 126.9425 };
    const forward = haversine(airport, seongsan);

    expect(forward).toBeCloseTo(haversine(seongsan, airport), 6);
    // 제주공항 ↔ 성산일출봉은 직선으로 40km 남짓이다
    expect(forward).toBeGreaterThan(40_000);
    expect(forward).toBeLessThan(44_000);
  });
});

describe('formatDistance', () => {
  it('1km 미만은 m 단위로 반올림한다', () => {
    expect(formatDistance(25)).toBe('25m');
    expect(formatDistance(999.4)).toBe('999m');
    expect(formatDistance(0)).toBe('0m');
  });

  it('1km 이상은 소수 첫째 자리 km 로 표기한다', () => {
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(1234)).toBe('1.2km');
    expect(formatDistance(12_345)).toBe('12.3km');
  });
});
