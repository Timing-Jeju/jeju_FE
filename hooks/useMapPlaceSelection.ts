import { useCallback, useEffect, useRef, useState } from 'react';
import { getCurrentLocation } from '@/services/location';
import type { Coord } from '@/services/naverApi';
import type { Place } from '@/services/places';
import { useFavoriteStore } from '@/store/useFavoriteStore';

const haversine = (a: Coord, b: Coord) => {
  const radius = 6371000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const h =
    Math.sin(toRad(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(toRad(b.longitude - a.longitude) / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
};

/** GPS와 직선거리는 현재 선택의 지도 표시에만 사용하며 서버로 보내지 않는다. */
export function useMapPlaceSelection() {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  const liked = useFavoriteStore(
    (state) =>
      !!selectedPlace &&
      state.favorites.some((place) => place.placeId === selectedPlace.placeId),
  );
  const selectPlace = useCallback(async (place: Place | null) => {
    const currentGeneration = ++generation.current;
    setSelectedPlace(place);
    setDistance(null);
    if (!place?.coord) return;
    try {
      const current = await getCurrentLocation();
      if (currentGeneration === generation.current)
        setDistance(haversine(current, place.coord));
    } catch {
      // 권한 거부/조회 실패에서는 미제공 상태를 유지한다.
    }
  }, []);
  return { selectedPlace, distance, liked, selectPlace };
}
