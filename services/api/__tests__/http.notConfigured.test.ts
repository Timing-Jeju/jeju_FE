import { request } from '@/services/api/http';
import { CLIENT_NOT_CONFIGURED } from '@/services/api/problem';

const mockRequest = jest.fn();

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  return {
    __esModule: true,
    ...actual,
    default: {
      ...actual.default,
      // http.ts 가 모듈 로드 시점에 create 를 부르므로 request 는 호출 시점에 mock 을 찾게 한다
      create: jest.fn(() => ({
        request: (...args: unknown[]) => mockRequest(...args),
      })),
    },
  };
});

jest.mock('@/services/api/config', () => ({
  API_BASE_URL: '',
  API_PREFIX: '/api/v1',
  API_TIMEOUT_MS: 1000,
  isApiConfigured: () => false,
}));

describe('서버 주소가 주입되지 않았을 때', () => {
  it('호출을 시도하지 않고 CLIENT_NOT_CONFIGURED 로 실패한다', async () => {
    await expect(
      request({ method: 'GET', path: '/places', auth: 'none' }),
    ).rejects.toMatchObject({ code: CLIENT_NOT_CONFIGURED, status: 0 });
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
