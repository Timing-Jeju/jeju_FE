/** 좌표 · 거리 유틸 (지도 화면에서 함께 쓴다) */

import type { Coord } from '@/services/naverApi';

/** 지구 반지름 (m) */
const EARTH_RADIUS_M = 6371000;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** 두 좌표 사이의 대원 거리 (m) */
export const haversine = (a: Coord, b: Coord) => {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

/** 1km 미만은 m, 이상은 소수 첫째 자리 km (25m / 1.3km) */
export const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`;
