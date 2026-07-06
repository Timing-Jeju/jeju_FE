import axios from 'axios';

import {
  isKeyConfigured,
  NAVER_SEARCH_CLIENT_ID,
  NAVER_SEARCH_CLIENT_SECRET,
  NCP_MAPS_CLIENT_ID,
  NCP_MAPS_CLIENT_SECRET,
} from './naverKeys';

export interface Coord {
  latitude: number;
  longitude: number;
}

export interface Place {
  name: string;
  roadAddress: string;
  coord: Coord;
}

export interface DrivingRoute {
  /** 경로를 이루는 좌표 목록 (지도에 Polyline으로 그림) */
  path: Coord[];
  /** 총 거리 (미터) */
  distance: number;
  /** 총 소요 시간 (밀리초) */
  duration: number;
}

const stripTags = (text: string) => text.replace(/<[^>]+>/g, '');

/**
 * 네이버 검색(지역) API — 키워드로 장소(POI)를 검색해 좌표를 얻는다.
 * mapx/mapy는 WGS84 좌표 * 1e7 값으로 내려온다. 결과는 최대 5건.
 */
async function searchPlacesByKeyword(query: string): Promise<Place[]> {
  const { data } = await axios.get(
    'https://openapi.naver.com/v1/search/local.json',
    {
      params: { query, display: 5 },
      headers: {
        'X-Naver-Client-Id': NAVER_SEARCH_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_SEARCH_CLIENT_SECRET,
      },
    },
  );

  return (data.items ?? []).map(
    (item: {
      title: string;
      roadAddress: string;
      address: string;
      mapx: string;
      mapy: string;
    }) => ({
      name: stripTags(item.title),
      roadAddress: item.roadAddress || item.address,
      coord: {
        longitude: Number(item.mapx) / 1e7,
        latitude: Number(item.mapy) / 1e7,
      },
    }),
  );
}

interface GeocodeAddress {
  roadAddress: string;
  jibunAddress: string;
  x: string;
  y: string;
  addressElements: { types: string[]; longName: string }[];
}

/**
 * 네이버 클라우드 Geocoding API — 주소를 검색해 좌표를 얻는다.
 * 주소 전용이라 "경복궁" 같은 장소명(POI)은 결과가 없다. (예: "강남대로 390")
 */
async function searchPlacesByAddress(query: string): Promise<Place[]> {
  const { data } = await axios.get(
    'https://maps.apigw.ntruss.com/map-geocode/v2/geocode',
    {
      params: { query, count: 5 },
      headers: {
        'x-ncp-apigw-api-key-id': NCP_MAPS_CLIENT_ID,
        'x-ncp-apigw-api-key': NCP_MAPS_CLIENT_SECRET,
      },
    },
  );

  if (data.status !== 'OK') {
    throw new Error(data.errorMessage || '주소 검색에 실패했습니다.');
  }

  return (data.addresses ?? []).map((address: GeocodeAddress) => {
    const buildingName = address.addressElements.find((element) =>
      element.types.includes('BUILDING_NAME'),
    )?.longName;
    const roadAddress = address.roadAddress || address.jibunAddress;

    return {
      name: buildingName || roadAddress,
      roadAddress,
      coord: {
        longitude: Number(address.x),
        latitude: Number(address.y),
      },
    };
  });
}

/**
 * 장소명(POI)은 지역 검색 API로 찾고, 결과가 없으면 Geocoding(주소)으로 폴백한다.
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  if (
    !isKeyConfigured(NAVER_SEARCH_CLIENT_ID) ||
    !isKeyConfigured(NAVER_SEARCH_CLIENT_SECRET)
  ) {
    throw new Error(
      '네이버 검색 API 키가 설정되지 않았습니다. .env를 확인하세요.',
    );
  }

  const places = await searchPlacesByKeyword(query);
  if (places.length > 0) {
    return places;
  }

  if (
    isKeyConfigured(NCP_MAPS_CLIENT_ID) &&
    isKeyConfigured(NCP_MAPS_CLIENT_SECRET)
  ) {
    return searchPlacesByAddress(query);
  }

  return [];
}

/**
 * 네이버 클라우드 Directions 5 API — 두 좌표 사이의 자동차 경로를 얻는다.
 * path는 [경도, 위도] 쌍의 배열로 내려온다.
 */
export async function getDrivingRoute(
  start: Coord,
  goal: Coord,
): Promise<DrivingRoute> {
  if (
    !isKeyConfigured(NCP_MAPS_CLIENT_ID) ||
    !isKeyConfigured(NCP_MAPS_CLIENT_SECRET)
  ) {
    throw new Error(
      '네이버 클라우드 Directions API 키가 설정되지 않았습니다. services/naverKeys.ts를 확인하세요.',
    );
  }

  const { data } = await axios.get(
    'https://maps.apigw.ntruss.com/map-direction/v1/driving',
    {
      params: {
        start: `${start.longitude},${start.latitude}`,
        goal: `${goal.longitude},${goal.latitude}`,
        option: 'trafast',
      },
      headers: {
        'x-ncp-apigw-api-key-id': NCP_MAPS_CLIENT_ID,
        'x-ncp-apigw-api-key': NCP_MAPS_CLIENT_SECRET,
      },
    },
  );

  if (data.code !== 0) {
    throw new Error(data.message ?? '경로를 찾을 수 없습니다.');
  }

  const route = data.route.trafast[0];

  return {
    path: route.path.map(([longitude, latitude]: [number, number]) => ({
      latitude,
      longitude,
    })),
    distance: route.summary.distance,
    duration: route.summary.duration,
  };
}
