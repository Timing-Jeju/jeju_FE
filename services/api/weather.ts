import { requestData } from './http';

/** 기상청 정규화 예보. 인증 선택이다. */

export type ForecastType = 'ultra_short' | 'village';

export interface WeatherForecast {
  contractVersion: string;
  grid: { nx: number; ny: number; regionName: string | null };
  provider: string;
  providerApiVersion: string;
  forecastType: ForecastType;
  /** YYYY-MM-DD */
  baseDate: string;
  /** HH:mm */
  baseTime: string;
  forecastedAt: string;
  validAt: string;
  /* 아래 category 파생 값은 key가 항상 있고 원천 값이 없으면 null이다 */
  temperatureC: number | null;
  precipitationProbabilityPercent: number | null;
  precipitationAmountMm: number | null;
  precipitationType: string | null;
  skyCode: string | null;
  humidityPercent: number | null;
  windSpeedMps: number | null;
  observedAt: string;
  expiresAt: string;
  stale: boolean;
  fallbackUsed: boolean;
}

export interface WeatherForecastQuery {
  lat: number;
  lng: number;
  /** Asia/Seoul 정시 + `+09:00` (예: 2026-08-25T12:00:00+09:00) */
  dateTime: string;
}

/**
 * 예보 조회. 세 query 모두 필수다.
 *
 * 지금 정시부터 10일 이내만 지원하고, 저장해 둔 정규화 예보를 돌려준다.
 * dateTime은 반드시 정시여야 한다 — `toForecastDateTime`으로 만들어 넘긴다.
 *
 * 오류 code: INVALID_WEATHER_FORECAST_QUERY (400), INVALID_ACCESS_TOKEN (401),
 * WEATHER_LOCATION_NOT_SUPPORTED / WEATHER_FORECAST_HORIZON_NOT_SUPPORTED (422),
 * WEATHER_FORECAST_UNAVAILABLE (503).
 */
export const fetchWeatherForecast = (query: WeatherForecastQuery) =>
  requestData<WeatherForecast>({
    method: 'GET',
    path: '/weather/forecast',
    auth: 'optional',
    params: { ...query },
  });

/**
 * Date를 예보 query가 요구하는 "Asia/Seoul 정시 + +09:00" 문자열로 바꾼다.
 * 분/초를 버리므로 그대로 넘기면 된다.
 */
export const toForecastDateTime = (date: Date) => {
  // +09:00 기준의 벽시계 값을 얻어 정시로 자른다
  const seoul = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');

  const year = seoul.getUTCFullYear();
  const month = pad(seoul.getUTCMonth() + 1);
  const day = pad(seoul.getUTCDate());
  const hour = pad(seoul.getUTCHours());

  return `${year}-${month}-${day}T${hour}:00:00+09:00`;
};
