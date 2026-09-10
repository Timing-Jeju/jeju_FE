import {
  fetchWeatherForecast,
  toForecastDateTime,
  validateWeatherForecastQuery,
} from '@/services/api/weather';
import { ApiError } from '@/services/api/problem';
import { requestData } from '@/services/api/http';

jest.mock('@/services/api/http', () => ({ requestData: jest.fn() }));

test('날씨 요청은 canonical selector 하나와 제주 정시만 전송한다', async () => {
  jest.mocked(requestData).mockResolvedValue({ temperatureC: 22 });
  const dateTime = toForecastDateTime(new Date(Date.now() + 60 * 60 * 1000));

  await fetchWeatherForecast({
    placeId: '34000000-0000-4000-8000-000000000001',
    dateTime,
  });

  expect(requestData).toHaveBeenCalledWith({
    method: 'GET',
    path: '/weather/forecast',
    auth: 'optional',
    params: {
      placeId: '34000000-0000-4000-8000-000000000001',
      dateTime,
    },
  });
  expect(JSON.stringify(jest.mocked(requestData).mock.calls)).not.toMatch(
    /latitude|longitude|\blat\b|\blng\b|coord/i,
  );
});

test.each([
  { dateTime: '2026-09-10T12:00:00+09:00' },
  {
    regionCode: 'jeju-si',
    placeId: '34000000-0000-4000-8000-000000000001',
    dateTime: '2026-09-10T12:00:00+09:00',
  },
  {
    placeId: 'not-canonical',
    dateTime: '2026-09-10T12:00:00+09:00',
  },
  {
    placeId: '34000000-0000-4000-8000-000000000001',
    dateTime: '2026-09-10T12:30:00+09:00',
  },
])('selector/date 위반은 네트워크 전에 거부한다', async (query) => {
  await expect(fetchWeatherForecast(query as never)).rejects.toBeInstanceOf(
    ApiError,
  );
  expect(requestData).not.toHaveBeenCalled();
});

test('Date는 실제 instant를 제주 현지 정시로 변환한다', () => {
  expect(toForecastDateTime(new Date('2026-09-10T01:59:59Z'))).toBe(
    '2026-09-10T10:00:00+09:00',
  );
});

test('현재 정시부터 10일까지만 예보 기간으로 허용한다', () => {
  const now = new Date('2026-09-10T01:30:00Z');
  expect(() =>
    validateWeatherForecastQuery(
      {
        regionCode: 'jeju-si',
        dateTime: '2026-09-20T10:00:00+09:00',
      },
      now,
    ),
  ).not.toThrow();
  expect(() =>
    validateWeatherForecastQuery(
      {
        regionCode: 'jeju-si',
        dateTime: '2026-09-20T11:00:00+09:00',
      },
      now,
    ),
  ).toThrow(expect.objectContaining({ status: 422 }));
});

test('regionCode는 pinned underscore와 50자 경계를 정확히 허용한다', () => {
  const now = new Date('2026-09-10T01:30:00Z');
  const validate = (regionCode: string) =>
    validateWeatherForecastQuery(
      { regionCode, dateTime: '2026-09-10T10:00:00+09:00' },
      now,
    );

  expect(() => validate('jeju_special-zone')).not.toThrow();
  expect(() => validate(`a${'_'.repeat(49)}`)).not.toThrow();
  expect(() => validate(`a${'_'.repeat(50)}`)).toThrow(
    expect.objectContaining({ status: 400 }),
  );
});

test.each([
  [400, 'INVALID_WEATHER_SELECTOR'],
  [404, 'WEATHER_REFERENCE_NOT_FOUND'],
  [503, 'WEATHER_FORECAST_UNAVAILABLE'],
] as const)('날씨 %i 오류를 원문 없이 보존한다', async (status, code) => {
  jest.mocked(requestData).mockRejectedValue(new ApiError({ status, code }));
  const dateTime = toForecastDateTime(new Date(Date.now() + 60 * 60 * 1000));
  await expect(
    fetchWeatherForecast({
      regionCode: 'jeju-si',
      dateTime,
    }),
  ).rejects.toMatchObject({ status, code });
});
