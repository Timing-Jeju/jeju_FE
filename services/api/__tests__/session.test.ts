import {
  getAccessToken,
  setAccessTokenProvider,
  withAccessToken,
} from '@/services/api/session';

afterEach(() => {
  setAccessTokenProvider(() => null);
});

describe('access token 공급', () => {
  it('공급자를 등록하기 전에는 null 이다', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('등록한 공급자에서 매번 읽어 온다', () => {
    let token: string | null = 'first';
    setAccessTokenProvider(() => token);

    expect(getAccessToken()).toBe('first');
    token = 'refreshed';
    expect(getAccessToken()).toBe('refreshed');
  });
});

describe('withAccessToken', () => {
  it('실행 중에만 넘긴 토큰을 쓰고 끝나면 원래 공급자로 돌아간다', async () => {
    setAccessTokenProvider(() => 'store-token');

    const seen = await withAccessToken('temp-token', async () =>
      getAccessToken(),
    );

    expect(seen).toBe('temp-token');
    expect(getAccessToken()).toBe('store-token');
  });

  it('실행 중에 예외가 나도 우회 토큰을 정리한다', async () => {
    await expect(
      withAccessToken('temp-token', async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(getAccessToken()).toBeNull();
  });
});
