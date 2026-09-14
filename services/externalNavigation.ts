import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import type { Coord } from './naverApi';

const NAVER_LATITUDE = { min: 31.43, max: 44.35 } as const;
const NAVER_LONGITUDE = { min: 122.37, max: 132 } as const;
const NAVER_DEEP_LINK = 'nmap://navigation';
const NAVER_HTTPS_FALLBACK = 'https://app.map.naver.com/launchApp/';

export interface NavigationDestination {
  name: string;
  coord: Coord | null;
}

export class ExternalNavigationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExternalNavigationError';
  }
}

type UrlOpener = (url: string) => Promise<unknown>;

interface NavigationOptions {
  appName?: string;
  openURL?: UrlOpener;
}

const configuredAppName = () => {
  if (Platform.OS === 'ios') return Constants.expoConfig?.ios?.bundleIdentifier;
  if (Platform.OS === 'android') return Constants.expoConfig?.android?.package;
  const scheme = Constants.expoConfig?.scheme;
  return typeof scheme === 'string' ? scheme : undefined;
};

const query = (entries: [string, string][]) =>
  entries
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

const requireDestination = (destination: NavigationDestination) => {
  if (!destination.coord)
    throw new ExternalNavigationError('목적지 좌표를 확인해 주세요.');
  const { latitude, longitude } = destination.coord;
  if (
    !Number.isFinite(latitude) ||
    latitude < NAVER_LATITUDE.min ||
    latitude > NAVER_LATITUDE.max
  ) {
    throw new ExternalNavigationError('목적지 위도를 확인해 주세요.');
  }
  if (
    !Number.isFinite(longitude) ||
    longitude < NAVER_LONGITUDE.min ||
    longitude > NAVER_LONGITUDE.max
  ) {
    throw new ExternalNavigationError('목적지 경도를 확인해 주세요.');
  }
  const name = destination.name.trim();
  if (!name) throw new ExternalNavigationError('목적지 이름을 확인해 주세요.');
  return { latitude, longitude, name };
};

/**
 * NAVER Maps 공식 URL Scheme의 현재 위치→목적지 예시처럼 출발지 파라미터를
 * 완전히 생략한다. 현재 위치 권한과 처리는 외부 지도 앱의 책임이다.
 */
export const buildNaverDestinationLinks = (
  destination: NavigationDestination,
  appName: string,
) => {
  const { latitude, longitude, name } = requireDestination(destination);
  const identifier = appName.trim();
  if (!identifier)
    throw new ExternalNavigationError('앱 식별자를 확인해 주세요.');
  const lat = String(latitude);
  const lng = String(longitude);
  return {
    deepLink: `${NAVER_DEEP_LINK}?${query([
      ['dlat', lat],
      ['dlng', lng],
      ['dname', name],
      ['appname', identifier],
    ])}`,
    httpsFallback: `${NAVER_HTTPS_FALLBACK}?${query([
      ['version', '11'],
      ['menu', 'navigation'],
      ['elat', lat],
      ['elng', lng],
      ['etitle', name],
    ])}`,
  } as const;
};

export const openNaverDestinationNavigation = async (
  destination: NavigationDestination,
  options: NavigationOptions = {},
) => {
  const links = buildNaverDestinationLinks(
    destination,
    options.appName ?? configuredAppName() ?? '',
  );
  const openURL = options.openURL ?? Linking.openURL;
  try {
    await openURL(links.deepLink);
    return 'deep-link' as const;
  } catch {
    try {
      await openURL(links.httpsFallback);
      return 'https-fallback' as const;
    } catch {
      throw new ExternalNavigationError(
        '네이버 지도를 열지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    }
  }
};
