import * as Crypto from 'expo-crypto';

/**
 * supabase-js 는 `crypto.subtle.digest` 가 있어야 PKCE code challenge 를 S256 으로 만들고,
 * 없으면 경고와 함께 plain 으로 떨어진다. React Native 에는 WebCrypto 가 없으므로
 * 필요한 두 함수만 expo-crypto 로 채운다. 이미 있는 구현은 건드리지 않는다.
 */
interface WebCryptoLike {
  getRandomValues?: unknown;
  subtle?: { digest?: unknown };
}

export const installWebCrypto = (
  scope: { crypto?: WebCryptoLike } = globalThis as { crypto?: WebCryptoLike },
) => {
  const webCrypto = scope.crypto ?? (scope.crypto = {});

  if (typeof webCrypto.getRandomValues !== 'function') {
    webCrypto.getRandomValues = Crypto.getRandomValues;
  }
  if (typeof webCrypto.subtle?.digest !== 'function') {
    webCrypto.subtle = {
      ...webCrypto.subtle,
      digest: (algorithm: string, data: BufferSource) =>
        Crypto.digest(algorithm as Crypto.CryptoDigestAlgorithm, data),
    };
  }

  return webCrypto;
};
