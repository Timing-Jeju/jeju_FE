import { formatDistance, haversine, regionOf } from '@/utils/geo';

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

describe('regionOf', () => {
  const airport = { latitude: 33.5066, longitude: 126.4931 };
  const seongsan = { latitude: 33.4587, longitude: 126.9425 };

  it('두 좌표가 여백을 두고 모두 들어가는 영역을 만든다', () => {
    const region = regionOf([airport, seongsan]);

    expect(region.latitude).toBeLessThan(seongsan.latitude);
    expect(region.longitude).toBeLessThan(airport.longitude);
    expect(region.latitude + region.latitudeDelta).toBeGreaterThan(
      airport.latitude,
    );
    expect(region.longitude + region.longitudeDelta).toBeGreaterThan(
      seongsan.longitude,
    );
    // 여백은 양쪽에 같은 비율로 붙는다 (경도 폭 0.4494 × 0.35 × 2)
    expect(region.longitudeDelta).toBeCloseTo(0.4494 * 1.7, 3);
  });

  it('좌표가 하나면 최소 폭의 영역을 그 좌표 중심으로 만든다', () => {
    const region = regionOf([airport], 0.35, 0.02);

    expect(region.latitudeDelta).toBeCloseTo(0.02, 6);
    expect(region.longitudeDelta).toBeCloseTo(0.02, 6);
    expect(region.latitude + region.latitudeDelta / 2).toBeCloseTo(
      airport.latitude,
      6,
    );
    expect(region.longitude + region.longitudeDelta / 2).toBeCloseTo(
      airport.longitude,
      6,
    );
  });
});
