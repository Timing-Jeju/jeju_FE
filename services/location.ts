import * as Location from 'expo-location';

import type { Coord } from './naverApi';

/** 위치 권한을 요청하고 현재 좌표를 반환한다. 권한 거부 시 에러를 던진다. */
export async function getCurrentLocation(): Promise<Coord> {
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
