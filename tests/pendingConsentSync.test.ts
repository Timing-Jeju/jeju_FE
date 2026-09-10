import { startPendingConsentSync } from '@/services/pendingConsentSync';
import { submitPendingConsentIntent } from '@/services/pendingConsent';
import { useUserStore } from '@/store/useUserStore';

const mockRecordConsentError = jest.fn();
const mockLoadLegalDocuments = jest.fn(async () => undefined);

jest.mock('@/services/pendingConsent', () => ({
  submitPendingConsentIntent: jest.fn(),
}));
jest.mock('@/store/useProfileLegalStore', () => ({
  useProfileLegalStore: {
    getState: () => ({
      recordConsentError: mockRecordConsentError,
      loadLegalDocuments: mockLoadLegalDocuments,
    }),
  },
}));

const settle = async () => {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
};

beforeEach(() => {
  useUserStore.setState({
    authGeneration: 0,
    userId: null,
    isLoggedIn: false,
  });
  jest.mocked(submitPendingConsentIntent).mockResolvedValue('none');
});

test('인증 사용자 전환에만 pending intent를 한 번 제출한다', async () => {
  const stop = startPendingConsentSync();
  useUserStore.setState({ userId: 'user-a', isLoggedIn: true });
  await settle();
  expect(submitPendingConsentIntent).toHaveBeenCalledWith('user-a');

  useUserStore.setState({ authReady: true });
  await settle();
  expect(submitPendingConsentIntent).toHaveBeenCalledTimes(1);
  stop();
});

test('로그아웃 뒤 같은 사용자가 다시 로그인하면 새 pending intent를 확인한다', async () => {
  const stop = startPendingConsentSync();
  useUserStore.setState({ userId: 'user-a', isLoggedIn: true });
  await settle();
  useUserStore.setState({ userId: null, isLoggedIn: false });
  useUserStore.setState({ userId: 'user-a', isLoggedIn: true });
  await settle();

  expect(submitPendingConsentIntent).toHaveBeenNthCalledWith(1, 'user-a');
  expect(submitPendingConsentIntent).toHaveBeenNthCalledWith(2, 'user-a');
  stop();
});

test('409 검토 상태는 자동 PUT 없이 최신 문서를 조회해 사용자 재동의를 요구한다', async () => {
  jest.mocked(submitPendingConsentIntent).mockResolvedValueOnce('needs_review');
  const stop = startPendingConsentSync();
  useUserStore.setState({ userId: 'user-a', isLoggedIn: true });
  await settle();

  expect(mockRecordConsentError).toHaveBeenCalledWith(
    expect.objectContaining({ status: 409, code: 'PROFILE_CONFLICT' }),
  );
  expect(mockLoadLegalDocuments).toHaveBeenCalledTimes(1);
  expect(submitPendingConsentIntent).toHaveBeenCalledTimes(1);
  stop();
});

test('이전 사용자의 늦은 실패는 현재 사용자 상태에 기록하지 않는다', async () => {
  let rejectFirst!: (error: Error) => void;
  jest.mocked(submitPendingConsentIntent).mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectFirst = reject;
      }),
  );
  const stop = startPendingConsentSync();
  useUserStore.setState({ userId: 'user-a', isLoggedIn: true });
  useUserStore.setState({ userId: 'user-b', isLoggedIn: true });
  rejectFirst(new Error('late failure'));
  await settle();

  expect(mockRecordConsentError).not.toHaveBeenCalled();
  stop();
});

test('같은 사용자라도 로그아웃 뒤 재로그인하면 이전 세대의 늦은 실패를 폐기한다', async () => {
  let rejectFirst!: (error: Error) => void;
  jest.mocked(submitPendingConsentIntent).mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectFirst = reject;
      }),
  );
  const stop = startPendingConsentSync();
  useUserStore.setState({
    authGeneration: 4,
    userId: 'user-a',
    isLoggedIn: true,
  });
  useUserStore.setState({
    authGeneration: 5,
    userId: null,
    isLoggedIn: false,
  });
  useUserStore.setState({
    authGeneration: 6,
    userId: 'user-a',
    isLoggedIn: true,
  });
  rejectFirst(new Error('old generation failure'));
  await settle();

  expect(mockRecordConsentError).not.toHaveBeenCalled();
  stop();
});
