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

/** 지도에 보이는 영역 — south-west 기준점과 위·경도 폭 (NaverMapView 의 region 형식) */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * 모든 좌표가 여백을 두고 보이는 지도 영역. 좌표는 하나 이상이어야 한다.
 * 좌표가 하나뿐이거나 서로 가까우면 최소 폭(minDelta)만큼은 보여준다.
 */
export const regionOf = (
  coords: Coord[],
  paddingRatio = 0.35,
  minDelta = 0.01,
): MapRegion => {
  const latitudes = coords.map((coord) => coord.latitude);
  const longitudes = coords.map((coord) => coord.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latPad = Math.max((maxLat - minLat) * paddingRatio, minDelta / 2);
  const lngPad = Math.max((maxLng - minLng) * paddingRatio, minDelta / 2);

  return {
    latitude: minLat - latPad,
    longitude: minLng - lngPad,
    latitudeDelta: maxLat - minLat + latPad * 2,
    longitudeDelta: maxLng - minLng + lngPad * 2,
  };
};

/** 1km 미만은 m, 이상은 소수 첫째 자리 km (25m / 1.3km) */
export const formatDistance = (meters: number) =>
  meters >= 1000 ? `${(meters / 1000).toFixed(1)}km` : `${Math.round(meters)}m`;
