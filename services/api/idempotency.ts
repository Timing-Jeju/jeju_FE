/**
 * 생성 요청의 Idempotency-Key 생성.
 *
 * 명세가 요구하는 형식이 endpoint마다 다르다.
 * - trip POST        : lowercase canonical UUID
 * - saved place POST : `^[A-Za-z0-9._:-]{1,128}$`
 *
 * canonical UUID는 두 번째 pattern도 만족하므로 한 가지 생성기로 둘 다 쓴다.
 *
 * 두 endpoint 모두 TTL이 24시간이고 같은 key + 같은 payload면 원본 응답을 replay한다.
 * 따라서 timeout이 났을 때는 새 key를 만들지 말고 같은 key로 재시도해야 한다.
 * (그래서 key 생성은 호출부가 아니라 재시도 단위에서 한 번만 해야 한다.)
 */

/** lowercase canonical UUID v4 */
export const createIdempotencyKey = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });

/** lowercase canonical UUID인지 — path/query에 넣기 전 형식 확인용 */
export const isCanonicalUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value);
