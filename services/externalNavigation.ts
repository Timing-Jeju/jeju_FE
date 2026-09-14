import Constants from 'expo-constants';
import { Linking, Platform } from 'react-native';

import type { Coord } from './naverApi';

const NAVER_LATITUDE = { min: 31.43, max: 44.35 } as const;
const NAVER_LONGITUDE = { min: 122.37, max: 132 } as const;
const NAVER_DEEP_LINK = 'nmap://navigation';
const GOOGLE_DIRECTIONS_URL = 'https://www.google.com/maps/dir/';

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
  platform?: string;
}

interface ExpoIdentityConfig {
  ios?: { bundleIdentifier?: string };
  android?: { package?: string };
}

export const configuredAppName = (
  platform: string = Platform.OS,
  config: ExpoIdentityConfig | null = Constants.expoConfig,
) => {
  if (platform === 'ios') return config?.ios?.bundleIdentifier;
  if (platform === 'android') return config?.android?.package;
  return undefined;
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

const buildGoogleDestinationLink = (destination: NavigationDestination) => {
  const { latitude, longitude } = requireDestination(destination);
  return `${GOOGLE_DIRECTIONS_URL}?${query([
    ['api', '1'],
    ['destination', `${latitude},${longitude}`],
  ])}`;
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
    httpsFallback: buildGoogleDestinationLink(destination),
  } as const;
};

export const openNaverDestinationNavigation = async (
  destination: NavigationDestination,
  options: NavigationOptions = {},
) => {
  const openURL = options.openURL ?? Linking.openURL;
  const platform = options.platform ?? Platform.OS;
  const openFallback = async (url: string) => {
    try {
      await openURL(url);
      return 'https-fallback' as const;
    } catch {
      throw new ExternalNavigationError(
        '지도를 열지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    }
  };
  const appName = options.appName ?? configuredAppName(platform);
  if (platform === 'web' || !appName) {
    return openFallback(buildGoogleDestinationLink(destination));
  }
  const links = buildNaverDestinationLinks(destination, appName);
  try {
    await openURL(links.deepLink);
    return 'deep-link' as const;
  } catch {
    return openFallback(links.httpsFallback);
  }
};
