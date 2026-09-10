import type { components, operations } from '../generated/backend';
import { requestData } from './http';
import { collectPages } from './pagination';

type GeneratedPlacesListResponse = components['schemas']['PlacesListResponse'];
type GeneratedPlacePage = NonNullable<GeneratedPlacesListResponse['page']>;
export type PlaceListItem = NonNullable<
  GeneratedPlacesListResponse['items']
>[number];
export interface PlacesListResponse {
  items: NonNullable<GeneratedPlacesListResponse['items']>;
  page: {
    size: NonNullable<GeneratedPlacePage['size']>;
    hasNext: NonNullable<GeneratedPlacePage['hasNext']>;
    nextCursor: NonNullable<GeneratedPlacePage['nextCursor']> | null;
  };
}
export type PlacesListQuery = NonNullable<
  operations['placesList']['parameters']['query']
>;
export type PlaceDetail = components['schemas']['PlaceDetailResponse'];

/**
 * canonical 장소 목록. 인증은 선택이며 cursor를 해석하지 않고 그대로 전달한다.
 * 최신 공개 계약에 없는 lat/lng/radius 같은 stale query는 노출하지 않는다.
 */
export const fetchPlaces = (
  query: PlacesListQuery = {},
  signal?: AbortSignal,
) =>
  requestData<PlacesListResponse>({
    method: 'GET',
    path: '/places',
    auth: 'optional',
    params: { ...query },
    signal,
  });

export const fetchAllPlaces = (query: PlacesListQuery = {}) =>
  collectPages<PlaceListItem>((cursor) =>
    fetchPlaces({ ...query, size: query.size ?? 100, cursor }),
  );

export const fetchPlace = (placeId: string, signal?: AbortSignal) =>
  requestData<PlaceDetail>({
    method: 'GET',
    path: `/places/${encodeURIComponent(placeId)}`,
    auth: 'optional',
    signal,
  });
