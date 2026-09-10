import { useEffect, useState } from 'react';

import {
  fetchWeatherForecast,
  toForecastDateTime,
  type WeatherForecast,
} from '@/services/api/weather';
import { hasCode } from '@/services/api/problem';

export type WeatherViewState =
  | { status: 'idle' | 'loading'; message: string }
  | { status: 'ready'; message: string; forecast: WeatherForecast }
  | { status: 'unavailable'; message: string };

export function weatherErrorMessage(error: unknown): string {
  if (hasCode(error, 'WEATHER_REFERENCE_NOT_FOUND')) {
    return '이 장소의 날씨 기준을 찾을 수 없어요.';
  }
  if (hasCode(error, 'WEATHER_FORECAST_HORIZON_NOT_SUPPORTED')) {
    return '이 날짜의 예보는 아직 제공되지 않아요.';
  }
  if (hasCode(error, 'WEATHER_FORECAST_UNAVAILABLE')) {
    return '현재 날씨 예보를 불러올 수 없어요. 잠시 후 다시 시도해 주세요.';
  }
  if (hasCode(error, 'INVALID_WEATHER_SELECTOR')) {
    return '장소를 다시 선택하면 날씨를 확인할 수 있어요.';
  }
  return '날씨 예보를 불러오지 못했어요.';
}

const skyLabel: Record<string, string> = {
  clear: '맑음',
  mostly_cloudy: '구름 많음',
  cloudy: '흐림',
};

const forecastMessage = (forecast: WeatherForecast) => {
  const temperature =
    forecast.temperatureC === null
      ? '기온 미제공'
      : `${forecast.temperatureC}°C`;
  const sky = forecast.skyCode
    ? (skyLabel[forecast.skyCode] ?? '날씨 정보 제공')
    : '하늘 상태 미제공';
  const stale = forecast.stale ? ' · 직전 예보' : '';
  return `${temperature} · ${sky}${stale}`;
};

/** canonical placeId만 사용하며 좌표나 현재 위치는 읽지 않는다. */
export function useWeatherForecast(placeId: string | null): WeatherViewState {
  const [result, setResult] = useState<{
    placeId: string;
    state: WeatherViewState;
  } | null>(null);

  useEffect(() => {
    if (!placeId) return;
    const controller = new AbortController();
    fetchWeatherForecast(
      { placeId, dateTime: toForecastDateTime(new Date()) },
      controller.signal,
    )
      .then((forecast) => {
        if (!controller.signal.aborted) {
          setResult({
            placeId,
            state: {
              status: 'ready',
              message: forecastMessage(forecast),
              forecast,
            },
          });
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            placeId,
            state: {
              status: 'unavailable',
              message: weatherErrorMessage(error),
            },
          });
        }
      });
    return () => controller.abort();
  }, [placeId]);

  if (!placeId) return { status: 'idle', message: '' };
  if (result?.placeId !== placeId) {
    return { status: 'loading', message: '날씨 예보를 불러오는 중' };
  }
  return result.state;
}
