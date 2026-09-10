import {
  ApiError,
  CLIENT_NETWORK_ERROR,
  hasCode,
  isApiError,
  isAuthError,
  isProblemDetails,
  type ProblemDetails,
} from '@/services/api/problem';

const problem: ProblemDetails = {
  type: 'https://timing-jeju.example/problems/place-not-found',
  title: 'Not Found',
  status: 404,
  detail: '장소를 찾을 수 없습니다.',
  instance: 'urn:timing-jeju:problem:trace-1',
  code: 'PLACE_NOT_FOUND',
  traceId: 'trace-1',
  fieldErrors: [],
};

describe('ApiError', () => {
  it('code · status · detail 을 담고 message 를 조립한다', () => {
    const error = new ApiError({
      code: 'PLACE_NOT_FOUND',
      status: 404,
      detail: '장소를 찾을 수 없습니다.',
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.message).toBe(
      'PLACE_NOT_FOUND (404): 장소를 찾을 수 없습니다.',
    );
    expect(error.traceId).toBeNull();
    expect(error.fieldErrors).toEqual([]);
    expect(error.problem).toBeNull();
  });

  it('reasonOf 는 해당 필드의 검증 실패 사유를 돌려준다', () => {
    const error = new ApiError({
      code: 'INVALID_REQUEST',
      status: 400,
      detail: '입력값이 올바르지 않습니다.',
      fieldErrors: [{ field: 'nickname', reason: '1..50자' }],
      traceId: 'trace-2',
      problem,
    });

    expect(error.reasonOf('nickname')).toBe('1..50자');
    expect(error.reasonOf('email')).toBeNull();
    expect(error.traceId).toBe('trace-2');
    expect(error.problem).toBe(problem);
  });
});

describe('판별 함수', () => {
  const notFound = new ApiError({
    code: 'PLACE_NOT_FOUND',
    status: 404,
    detail: '',
  });

  it('isApiError 는 ApiError 만 통과시킨다', () => {
    expect(isApiError(notFound)).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError(null)).toBe(false);
  });

  it('hasCode 는 여러 code 중 하나라도 맞으면 true 다', () => {
    expect(hasCode(notFound, 'PLACE_NOT_FOUND')).toBe(true);
    expect(hasCode(notFound, 'TRIP_NOT_FOUND', 'PLACE_NOT_FOUND')).toBe(true);
    expect(hasCode(notFound, 'TRIP_NOT_FOUND')).toBe(false);
    expect(hasCode(new Error('PLACE_NOT_FOUND'), 'PLACE_NOT_FOUND')).toBe(
      false,
    );
  });

  it('isAuthError 는 재로그인이 필요한 두 code 만 본다', () => {
    const required = new ApiError({
      code: 'AUTHENTICATION_REQUIRED',
      status: 401,
      detail: '',
    });
    const invalid = new ApiError({
      code: 'INVALID_ACCESS_TOKEN',
      status: 401,
      detail: '',
    });
    const network = new ApiError({
      code: CLIENT_NETWORK_ERROR,
      status: 0,
      detail: '',
    });

    expect(isAuthError(required)).toBe(true);
    expect(isAuthError(invalid)).toBe(true);
    expect(isAuthError(network)).toBe(false);
    expect(isAuthError(notFound)).toBe(false);
  });

  it('isProblemDetails 는 code · status · traceId 가 있는 객체만 인정한다', () => {
    expect(isProblemDetails(problem)).toBe(true);
    expect(isProblemDetails({ ...problem, traceId: undefined })).toBe(false);
    expect(isProblemDetails({ ...problem, status: '404' })).toBe(false);
    expect(isProblemDetails(null)).toBe(false);
    expect(isProblemDetails('<html>proxy error</html>')).toBe(false);
  });
});
