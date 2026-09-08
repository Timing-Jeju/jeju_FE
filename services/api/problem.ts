/**
 * RFC 9457 Problem Details — 백엔드의 모든 오류 응답 형식.
 *
 * 명세 원칙 두 가지를 그대로 따른다.
 * 1. 오류 body는 아래 8개 필드로 닫혀 있다. `message` 같은 별도 envelope는 없다.
 * 2. 분기 기준은 HTTP status나 `type` host가 아니라 안정적인 `code`다.
 *    (현재 `type` host가 .com과 .example로 섞여 있어 type으로 분기하면 깨진다.)
 */

/** 검증 실패 시 어떤 필드가 왜 틀렸는지 */
export interface ProblemFieldError {
  field: string;
  reason: string;
}

export interface ProblemDetails {
  /** 문제 유형 URI — host가 정렬되기 전까지 분기 key로 쓰지 않는다 */
  type: string;
  title: string;
  status: number;
  detail: string;
  /** `urn:timing-jeju:problem:<traceId>` */
  instance: string;
  /** 프론트 분기의 기준 */
  code: string;
  /** 응답 헤더 X-Trace-Id와 같은 값 */
  traceId: string;
  /** 검증 오류가 아니어도 항상 존재하며, 없으면 빈 배열이다 */
  fieldErrors: ProblemFieldError[];
}

/**
 * 서버에 닿지 못했을 때 쓰는 클라이언트 전용 code.
 * 서버 registry에 있는 code가 아니므로 이름으로 구분해 둔다.
 */
export const CLIENT_NETWORK_ERROR = 'CLIENT_NETWORK_ERROR';
export const CLIENT_NOT_CONFIGURED = 'CLIENT_NOT_CONFIGURED';

/** 백엔드 호출 실패 — code로 분기하고, 사용자에게는 detail을 보여준다 */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly traceId: string | null;
  readonly detail: string;
  readonly fieldErrors: ProblemFieldError[];
  /** 서버가 Problem Details를 내려줬는지 (네트워크 실패면 false) */
  readonly problem: ProblemDetails | null;

  constructor(params: {
    code: string;
    status: number;
    detail: string;
    traceId?: string | null;
    fieldErrors?: ProblemFieldError[];
    problem?: ProblemDetails | null;
  }) {
    super(`${params.code} (${params.status}): ${params.detail}`);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    this.detail = params.detail;
    this.traceId = params.traceId ?? null;
    this.fieldErrors = params.fieldErrors ?? [];
    this.problem = params.problem ?? null;
  }

  /** 특정 필드의 검증 실패 사유 */
  reasonOf(field: string): string | null {
    return (
      this.fieldErrors.find((item) => item.field === field)?.reason ?? null
    );
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;

/** 여러 code 중 하나인지 — `if (hasCode(error, 'PLACE_NOT_FOUND'))` */
export const hasCode = (error: unknown, ...codes: string[]) =>
  isApiError(error) && codes.includes(error.code);

/** 재로그인이 필요한 인증 실패 */
export const isAuthError = (error: unknown) =>
  hasCode(error, 'AUTHENTICATION_REQUIRED', 'INVALID_ACCESS_TOKEN');

/**
 * 응답 body가 Problem Details인지. 서버가 8필드를 모두 채워 보내므로
 * code / status / traceId 존재만 확인하면 충분하다.
 */
export const isProblemDetails = (body: unknown): body is ProblemDetails => {
  if (typeof body !== 'object' || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.code === 'string' &&
    typeof candidate.status === 'number' &&
    typeof candidate.traceId === 'string'
  );
};
