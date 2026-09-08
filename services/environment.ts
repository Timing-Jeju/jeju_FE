/** 앱 설정에는 공개 키와 서버 origin만 허용한다. */
export function serverOrigin(value: string | undefined): string {
  try {
    if (!value || value.trim() !== value) throw new Error();
    const url = new URL(value);
    const local =
      __DEV__ &&
      ['localhost', '127.0.0.1', '[::1]', '10.0.2.2'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== '/'
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new Error('서버 연결 설정을 확인해 주세요.');
  }
}
