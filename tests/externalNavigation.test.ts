import {
  ExternalNavigationError,
  buildNaverDestinationLinks,
  configuredAppName,
  openNaverDestinationNavigation,
} from '@/services/externalNavigation';

const destination = {
  name: '섭지코지 & 성산',
  coord: { latitude: 33.423, longitude: 126.93 },
};

const queryKeys = (value: string) => [...new URL(value).searchParams.keys()];

test.each([
  [31.43, 122.37],
  [44.35, 132],
])(
  '공식 경계의 목적지 (%s, %s)만 Naver navigation 링크에 넣는다',
  (latitude, longitude) => {
    const links = buildNaverDestinationLinks(
      { name: destination.name, coord: { latitude, longitude } },
      'com.jeju.tourist',
    );

    const deep = new URL(links.deepLink);
    expect(`${deep.protocol}//${deep.hostname}`).toBe('nmap://navigation');
    expect(Object.fromEntries(deep.searchParams)).toEqual({
      dlat: String(latitude),
      dlng: String(longitude),
      dname: destination.name,
      appname: 'com.jeju.tourist',
    });
    const fallback = new URL(links.httpsFallback);
    expect(fallback.protocol).toBe('https:');
    expect(fallback.hostname).toBe('www.google.com');
    expect(fallback.pathname).toBe('/maps/dir/');
    expect(Object.fromEntries(fallback.searchParams)).toEqual({
      api: '1',
      destination: `${latitude},${longitude}`,
    });
    expect(queryKeys(links.deepLink)).toEqual([
      'dlat',
      'dlng',
      'dname',
      'appname',
    ]);
    expect(queryKeys(links.httpsFallback).sort()).toEqual(
      ['api', 'destination'].sort(),
    );
    expect(fallback.searchParams.has('origin')).toBe(false);
  },
);

test('NAVER appname은 iOS bundle과 Android package만 사용하고 web에서는 비활성화한다', () => {
  const config = {
    ios: { bundleIdentifier: 'com.jeju.ios' },
    android: { package: 'com.jeju.android' },
    scheme: 'timing-jeju',
  };

  expect(configuredAppName('ios', config)).toBe('com.jeju.ios');
  expect(configuredAppName('android', config)).toBe('com.jeju.android');
  expect(configuredAppName('web', config)).toBeUndefined();
});

test('목적지 이름에 query 문자가 있어도 출발지 파라미터로 해석되지 않는다', () => {
  const links = buildNaverDestinationLinks(
    {
      ...destination,
      name: '섭지코지&slat=33.1&currentLocation=secret',
    },
    'com.jeju.tourist',
  );

  expect(new URL(links.deepLink).searchParams.get('dname')).toBe(
    '섭지코지&slat=33.1&currentLocation=secret',
  );
  expect(queryKeys(links.deepLink)).not.toEqual(
    expect.arrayContaining(['slat', 'slng', 'sname', 'currentLocation', 'gps']),
  );
});

test.each([
  [{ latitude: 31.4299, longitude: 126.5 }, '위도'],
  [{ latitude: 44.3501, longitude: 126.5 }, '위도'],
  [{ latitude: 33.4, longitude: 122.3699 }, '경도'],
  [{ latitude: 33.4, longitude: 132.0001 }, '경도'],
  [{ latitude: Number.NaN, longitude: 126.5 }, '위도'],
  [{ latitude: 33.4, longitude: Number.POSITIVE_INFINITY }, '경도'],
  [null, '좌표'],
] as const)(
  '유효하지 않은 목적지 %j는 링크를 만들지 않는다',
  (coord, field) => {
    expect(() =>
      buildNaverDestinationLinks(
        { name: '목적지', coord: coord as never },
        'com.jeju.tourist',
      ),
    ).toThrow(field);
  },
);

test.each(['', '   '])('빈 목적지 이름 %j은 거부한다', (name) => {
  expect(() =>
    buildNaverDestinationLinks({ ...destination, name }, 'com.jeju.tourist'),
  ).toThrow('이름');
});

test('딥링크가 열리면 HTTPS fallback을 호출하지 않는다', async () => {
  const openURL = jest.fn().mockResolvedValue(undefined);

  await expect(
    openNaverDestinationNavigation(destination, {
      appName: 'com.jeju.tourist',
      openURL,
    }),
  ).resolves.toBe('deep-link');

  expect(openURL).toHaveBeenCalledTimes(1);
  expect(openURL.mock.calls[0][0]).toMatch(/^nmap:\/\/navigation\?/);
});

test('딥링크 열기가 실패하면 공식 Google destination-only HTTPS 링크만 연다', async () => {
  const openURL = jest
    .fn()
    .mockRejectedValueOnce(new Error('not installed'))
    .mockResolvedValueOnce(undefined);

  await expect(
    openNaverDestinationNavigation(destination, {
      appName: 'com.jeju.tourist',
      openURL,
    }),
  ).resolves.toBe('https-fallback');

  expect(openURL).toHaveBeenCalledTimes(2);
  expect(openURL.mock.calls[1][0]).toMatch(
    /^https:\/\/www\.google\.com\/maps\/dir\/\?/,
  );
  expect(new URL(openURL.mock.calls[1][0]).searchParams.has('origin')).toBe(
    false,
  );
});

test('web에서는 NAVER scheme을 시도하지 않고 Google HTTPS fallback을 유지한다', async () => {
  const openURL = jest.fn().mockResolvedValue(undefined);

  await expect(
    openNaverDestinationNavigation(destination, {
      platform: 'web',
      openURL,
    }),
  ).resolves.toBe('https-fallback');

  expect(openURL).toHaveBeenCalledTimes(1);
  expect(openURL.mock.calls[0][0]).toMatch(
    /^https:\/\/www\.google\.com\/maps\/dir\/\?/,
  );
});

test('딥링크와 HTTPS fallback이 모두 실패하면 URL을 노출하지 않는 재시도 오류를 반환한다', async () => {
  const openURL = jest.fn().mockRejectedValue(new Error('unavailable'));

  await expect(
    openNaverDestinationNavigation(destination, {
      appName: 'com.jeju.tourist',
      openURL,
    }),
  ).rejects.toEqual(
    new ExternalNavigationError(
      '지도를 열지 못했어요. 잠시 후 다시 시도해 주세요.',
    ),
  );
  expect(openURL).toHaveBeenCalledTimes(2);
});
