import {
  fetchPlace as fetchCanonicalPlace,
  fetchPlaces as fetchCanonicalPlaces,
} from './api/places';
import { isCanonicalPlaceId, requireCanonicalPlaceId } from './canonicalId';
import type { components, operations } from './generated/places';
import type { Coord } from './naverApi';

type Query = NonNullable<operations['placesList']['parameters']['query']>;
type Detail = components['schemas']['PlaceDetailResponse'];
export interface Place {
  placeId: string;
  name: string;
  roadAddress: string;
  coord: Coord | null;
  category: string;
  categoryLabel: string;
  recommendedStayMinutes: number | null;
  thumbnailUrl: string | null;
}
export interface PlaceDetail extends Place {
  overview: string | null;
  contact: Detail['contact'];
  operations: Detail['operations'];
}
const invalid = () =>
  new Error('장소 응답을 확인할 수 없어요. 다시 검색해 주세요.');
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw invalid();
  return value as Record<string, unknown>;
}
function nullableText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') throw invalid();
  return value;
}
function adapt(value: unknown): Place {
  const row = record(value);
  if (
    !isCanonicalPlaceId(row.placeId) ||
    typeof row.name !== 'string' ||
    !row.name.trim()
  )
    throw invalid();
  let coord: Coord | null = null;
  if (row.location != null) {
    const point = record(row.location);
    if (
      typeof point.lat !== 'number' ||
      !Number.isFinite(point.lat) ||
      Math.abs(point.lat) > 90 ||
      typeof point.lng !== 'number' ||
      !Number.isFinite(point.lng) ||
      Math.abs(point.lng) > 180
    )
      throw invalid();
    coord = { latitude: point.lat, longitude: point.lng };
  }
  const stay = row.recommendedStayMinutes;
  if (
    stay != null &&
    (typeof stay !== 'number' ||
      !Number.isInteger(stay) ||
      stay < 1 ||
      stay > 1440)
  )
    throw invalid();
  const category = nullableText(row.category) ?? '';
  const labels: Record<string, string> = {
    'content-type:12': '관광지',
    'content-type:32': '숙소',
    'content-type:39': '식당',
  };
  return {
    placeId: row.placeId,
    name: row.name,
    roadAddress: nullableText(row.address) ?? '',
    coord,
    category,
    categoryLabel: labels[category] ?? '장소',
    recommendedStayMinutes: typeof stay === 'number' ? stay : null,
    thumbnailUrl: nullableText(row.thumbnailUrl),
  };
}
export async function listPlaces(
  input: Pick<Query, 'query' | 'category' | 'cursor'> = {},
  signal?: AbortSignal,
) {
  const params: Query = {
    query: input.query,
    category: input.category,
    cursor: input.cursor,
    size: 20,
  };
  const response = record(await fetchCanonicalPlaces(params, signal));
  if (!Array.isArray(response.items)) throw invalid();
  const items = response.items.map(adapt);
  if (new Set(items.map((item) => item.placeId)).size !== items.length)
    throw invalid();
  const page = record(response.page);
  if (
    typeof page.size !== 'number' ||
    !Number.isInteger(page.size) ||
    page.size < 1 ||
    page.size > 100 ||
    typeof page.hasNext !== 'boolean'
  )
    throw invalid();
  const nextCursor = nullableText(page.nextCursor);
  if (page.hasNext ? !nextCursor : nextCursor !== null) throw invalid();
  return {
    items,
    page: { size: page.size, hasNext: page.hasNext, nextCursor },
  };
}
export async function searchPlaces(
  query: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  return (await listPlaces({ query }, signal)).items;
}
export async function getPlace(
  placeId: string,
  signal?: AbortSignal,
): Promise<PlaceDetail> {
  requireCanonicalPlaceId(placeId);
  const row = record(await fetchCanonicalPlace(placeId, signal));
  const place = adapt(row);
  if (place.placeId !== placeId) throw invalid();
  const contact = record(row.contact);
  const ops = record(row.operations);
  return {
    ...place,
    overview: nullableText(row.overview),
    contact: {
      phone: nullableText(contact.phone),
      homepageUrl: nullableText(contact.homepageUrl),
    },
    operations: {
      operatingHoursText: nullableText(ops.operatingHoursText),
      closedDaysText: nullableText(ops.closedDaysText),
      parkingText: nullableText(ops.parkingText),
      admissionFeeText: nullableText(ops.admissionFeeText),
    },
  };
}
