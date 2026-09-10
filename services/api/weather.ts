import type { components, operations } from '../generated/backend';
import { requestData } from './http';

export type WeatherForecast = components['schemas']['WeatherForecastResponse'];
export type WeatherForecastQuery = NonNullable<
  operations['weatherForecastRead']['parameters']['query']
>;

/** regionCode/placeId/tripItemId 중 한 selector와 dateTime을 보내는 공개 예보 조회. */
export const fetchWeatherForecast = (query: WeatherForecastQuery) =>
  requestData<WeatherForecast>({
    method: 'GET',
    path: '/weather/forecast',
    auth: 'optional',
    params: { ...query },
  });

export const toForecastDateTime = (date: Date) => {
  const seoul = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${seoul.getUTCFullYear()}-${pad(seoul.getUTCMonth() + 1)}-${pad(
    seoul.getUTCDate(),
  )}T${pad(seoul.getUTCHours())}:00:00+09:00`;
};
