/** 앱 경계 밖의 원문 Problem/config/token을 보존하지 않는 오류 모델. */

export const CLIENT_NETWORK_ERROR = 'CLIENT_NETWORK_ERROR';
export const CLIENT_NOT_CONFIGURED = 'CLIENT_NOT_CONFIGURED';
export const CLIENT_LOCATION_DATA_FORBIDDEN = 'CLIENT_LOCATION_DATA_FORBIDDEN';

export interface ProblemDetails {
  code: string;
  status: number;
}

const messages: Record<string, string> = {
  AUTHENTICATION_REQUIRED: '로그인이 필요합니다.',
  INVALID_ACCESS_TOKEN: '로그인 정보를 다시 확인해 주세요.',
  AUTH_ACCESS_DENIED: '이 요청을 수행할 권한이 없습니다.',
  RATE_LIMITED: '요청이 많습니다. 잠시 뒤 다시 시도해 주세요.',
  CLIENT_NOT_CONFIGURED: '서버 연결 설정을 확인해 주세요.',
  CLIENT_NETWORK_ERROR: '서버에 연결하지 못했습니다.',
  CLIENT_LOCATION_DATA_FORBIDDEN: '현재 위치 정보는 서버로 전송할 수 없습니다.',
  INVALID_API_TARGET: '서버 연결 대상을 확인해 주세요.',
  INVALID_IDEMPOTENCY_KEY: '요청 식별 키를 확인해 주세요.',
  INVALID_ETAG: '최신 데이터를 다시 불러와 주세요.',
  PRECONDITION_FAILED:
    '데이터가 변경되었습니다. 최신 데이터를 다시 불러와 주세요.',
  TRIP_VERSION_CONFLICT:
    '여행 정보가 변경되었습니다. 최신 일정을 확인해 주세요.',
  ACTIVE_SCHEDULE_VERSION_CONFLICT:
    '일정이 변경되었습니다. 최신 일정을 확인한 뒤 다시 시도해 주세요.',
  SCHEDULE_ITEM_COMPLETED: '완료된 일정 항목은 변경할 수 없습니다.',
  SCHEDULE_ORDER_NOT_PERMUTATION: '일정 항목을 빠짐없이 한 번씩 정렬해 주세요.',
  SERVICE_UNAVAILABLE:
    '요청을 완료하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
  REQUEST_FAILED: '요청을 완료하지 못했습니다. 다시 시도해 주세요.',
  INVALID_PROFILE_LEGAL_REQUEST: '입력값을 확인해 주세요.',
  PROFILE_CONFLICT: '최신 정보를 다시 불러온 뒤 시도해 주세요.',
  LEGAL_CONSENT_REQUIRED: '필수 약관에 모두 동의해 주세요.',
  PROFILE_DATA_UNAVAILABLE:
    '프로필 정보를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly traceId: string | null;

  constructor(params: {
    status: number;
    code: string;
    traceId?: string | null;
  }) {
    super(messages[params.code] ?? messages.REQUEST_FAILED);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.traceId = params.traceId ?? null;
  }
}

export const isApiError = (error: unknown): error is ApiError =>
  error instanceof ApiError;

export const hasCode = (error: unknown, ...codes: string[]) =>
  isApiError(error) && codes.includes(error.code);

export const isAuthError = (error: unknown) =>
  hasCode(error, 'AUTHENTICATION_REQUIRED', 'INVALID_ACCESS_TOKEN');
