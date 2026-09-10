import { ApiError } from './problem';

/** 공개 Spring 계약: 1~128자 printable ASCII(U+0020..U+007E). */
export const isValidIdempotencyKey = (value: string) =>
  /^[\x20-\x7e]{1,128}$/.test(value);

export function assertIdempotencyKey(value: string): void {
  if (!isValidIdempotencyKey(value)) {
    throw new ApiError({ status: 0, code: 'INVALID_IDEMPOTENCY_KEY' });
  }
}

/** UUID는 허용 형식의 안전한 기본값일 뿐 호출자 제공값을 UUID로 제한하지 않는다. */
export const createIdempotencyKey = () => {
  const cryptoObject = globalThis.crypto as
    | { randomUUID?: () => string }
    | undefined;
  if (cryptoObject?.randomUUID) return cryptoObject.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
};

/** 기존 호출부 호환용 UUID 식별자 검사. 멱등성 계약 검증에는 사용하지 않는다. */
export const isCanonicalUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
    value,
  );
