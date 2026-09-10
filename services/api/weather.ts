import type { components, operations } from '../generated/backend';
import { requestData } from './http';
import { ApiError } from './problem';

export type WeatherForecast = components['schemas']['WeatherForecastResponse'];
export type WeatherForecastQuery = NonNullable<
  operations['weatherForecastRead']['parameters']['query']
>;

const CANONICAL_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const REGION_CODE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const JEJU_HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:00:00\+09:00$/;
const HORIZON_MS = 10 * 24 * 60 * 60 * 1000;

const rejectQuery = (status: number, code: string): never => {
  throw new ApiError({ status, code });
};

/** 위치/GPS 필드는 허용하지 않고 공개 계약의 selector XOR와 예보 기간을 검증한다. */
export function validateWeatherForecastQuery(
  value: WeatherForecastQuery,
  now: Date = new Date(),
): void {
  const query = value as WeatherForecastQuery & Record<string, unknown>;
  const allowed = new Set(['regionCode', 'placeId', 'tripItemId', 'dateTime']);
  if (Object.keys(query).some((key) => !allowed.has(key))) {
    rejectQuery(400, 'INVALID_WEATHER_SELECTOR');
  }
  const selectors = [query.regionCode, query.placeId, query.tripItemId].filter(
    (item) => item !== undefined,
  );
  if (
    selectors.length !== 1 ||
    (query.regionCode !== undefined && !REGION_CODE.test(query.regionCode)) ||
    (query.placeId !== undefined && !CANONICAL_UUID.test(query.placeId)) ||
    (query.tripItemId !== undefined &&
      !CANONICAL_UUID.test(query.tripItemId)) ||
    !JEJU_HOUR.test(query.dateTime)
  ) {
    rejectQuery(400, 'INVALID_WEATHER_SELECTOR');
  }
  const requested = Date.parse(query.dateTime);
  const currentHour = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  currentHour.setUTCMinutes(0, 0, 0);
  const current = currentHour.getTime() - 9 * 60 * 60 * 1000;
  if (
    !Number.isFinite(requested) ||
    toForecastDateTime(new Date(requested)) !== query.dateTime ||
    requested < current ||
    requested - current > HORIZON_MS
  ) {
    rejectQuery(422, 'WEATHER_FORECAST_HORIZON_NOT_SUPPORTED');
  }
}

/** regionCode/placeId/tripItemId 중 한 selector와 dateTime을 보내는 공개 예보 조회. */
export const fetchWeatherForecast = async (
  query: WeatherForecastQuery,
  signal?: AbortSignal,
) => {
  validateWeatherForecastQuery(query);
  return requestData<WeatherForecast>({
    method: 'GET',
    path: '/weather/forecast',
    auth: 'optional',
    params: { ...query },
    ...(signal ? { signal } : {}),
  });
};

export const toForecastDateTime = (date: Date) => {
  if (!Number.isFinite(date.getTime())) {
    rejectQuery(400, 'INVALID_WEATHER_SELECTOR');
  }
  const seoul = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${seoul.getUTCFullYear()}-${pad(seoul.getUTCMonth() + 1)}-${pad(
    seoul.getUTCDate(),
  )}T${pad(seoul.getUTCHours())}:00:00+09:00`;
};
