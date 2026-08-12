import * as Location from 'expo-location';

import type { Coord } from './naverApi';

/** 시뮬레이터에서 GPS가 안 잡힐 때 쓰는 더미 위치 (울산 삼산동) */
const USE_DUMMY_LOCATION = false;
const DUMMY_LOCATION: Coord = {
  latitude: 35.5384,
  longitude: 129.3114,
};

/**
 * 위치 권한만 요청한다. 지도의 현위치 오버레이는 네이버 지도 SDK가 직접
 * 위치를 받아 그리므로 좌표는 필요 없고 허용 여부만 알면 된다.
 */
export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

/** 위치 권한을 요청하고 현재 좌표를 반환한다. 권한 거부 시 에러를 던진다. */
export async function getCurrentLocation(): Promise<Coord> {
  if (USE_DUMMY_LOCATION) {
    return DUMMY_LOCATION;
  }

  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    throw new Error(
      '위치 권한이 거부되었습니다. 설정에서 위치 권한을 허용해주세요.',
    );
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}
