import * as Crypto from 'expo-crypto';

import { installWebCrypto } from '@/services/webCrypto';

jest.mock('expo-crypto', () => ({
  digest: jest.fn(),
  getRandomValues: jest.fn(),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

const mockedDigest = jest.mocked(Crypto.digest);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('installWebCrypto', () => {
  it('crypto 가 아예 없으면 getRandomValues 와 subtle.digest 를 채운다', async () => {
    const scope: Parameters<typeof installWebCrypto>[0] = {};
    mockedDigest.mockResolvedValue(new ArrayBuffer(32));

    const webCrypto = installWebCrypto(scope);
    const data = new Uint8Array([1, 2, 3]);
    const digest = webCrypto.subtle?.digest as (
      algorithm: string,
      data: BufferSource,
    ) => Promise<ArrayBuffer>;

    expect(scope.crypto).toBe(webCrypto);
    expect(webCrypto.getRandomValues).toBe(Crypto.getRandomValues);
    await expect(digest('SHA-256', data)).resolves.toBeInstanceOf(ArrayBuffer);
    expect(mockedDigest).toHaveBeenCalledWith('SHA-256', data);
  });

  it('이미 있는 구현은 건드리지 않는다', () => {
    const existingDigest = jest.fn();
    const existingRandom = jest.fn();
    const scope = {
      crypto: {
        getRandomValues: existingRandom,
        subtle: { digest: existingDigest },
      },
    };

    const webCrypto = installWebCrypto(scope);

    expect(webCrypto.getRandomValues).toBe(existingRandom);
    expect(webCrypto.subtle?.digest).toBe(existingDigest);
  });

  it('getRandomValues 만 있으면 subtle 만 보탠다', () => {
    const existingRandom = jest.fn();
    const scope = { crypto: { getRandomValues: existingRandom } };

    const webCrypto = installWebCrypto(scope);

    expect(webCrypto.getRandomValues).toBe(existingRandom);
    expect(typeof webCrypto.subtle?.digest).toBe('function');
  });
});
