import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPendingConsentIntent,
  savePendingConsentIntent,
  submitPendingConsentIntent,
} from '@/services/pendingConsent';
import { updateLegalConsents } from '@/services/api/legal';
import { ApiError } from '@/services/api/problem';
import { useUserStore } from '@/store/useUserStore';

const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
    removeItem: jest.fn(async (key: string) => {
      mockStorage.delete(key);
    }),
    clear: jest.fn(async () => {
      mockStorage.clear();
    }),
  },
}));
jest.mock('@/services/api/legal', () => ({ updateLegalConsents: jest.fn() }));

const documents = [
  {
    documentId: '10000000-0000-4000-8000-000000000001',
    version: '1.0.0',
  },
];

beforeEach(async () => {
  mockStorage.clear();
  await AsyncStorage.clear();
  useUserStore.setState({
    authGeneration: 1,
    authReady: true,
    isLoggedIn: true,
    userId: 'user-a',
  });
});

test('명시적 pending intent는 인증 직후 한 번 PUT하고 성공 시 삭제한다', async () => {
  jest.mocked(updateLegalConsents).mockResolvedValueOnce({
    requiredConsentsSatisfied: true,
    updatedAt: '2026-09-10T00:00:00Z',
  });
  await savePendingConsentIntent(documents);

  await expect(submitPendingConsentIntent('user-a')).resolves.toBe('submitted');
  await expect(submitPendingConsentIntent('user-a')).resolves.toBe('none');
  expect(updateLegalConsents).toHaveBeenCalledTimes(1);
  expect(updateLegalConsents).toHaveBeenCalledWith(
    [{ documentId: documents[0].documentId, agreed: true }],
    expect.any(Function),
  );
});

test('백엔드가 정한 불투명한 약관 version 문자열도 그대로 허용한다', async () => {
  jest.mocked(updateLegalConsents).mockResolvedValueOnce({
    requiredConsentsSatisfied: true,
    updatedAt: '2026-09-10T00:00:00Z',
  });
  await savePendingConsentIntent([
    { documentId: documents[0].documentId, version: '2026.09-r2' },
  ]);

  await expect(submitPendingConsentIntent('user-a')).resolves.toBe('submitted');
  expect(updateLegalConsents).toHaveBeenCalledWith(
    [{ documentId: documents[0].documentId, agreed: true }],
    expect.any(Function),
  );
});

test('409는 자동 재시도하지 않고 검토 상태로 남겨 명시적 재동의를 요구한다', async () => {
  jest
    .mocked(updateLegalConsents)
    .mockRejectedValueOnce(
      new ApiError({ status: 409, code: 'PROFILE_CONFLICT' }),
    );
  await savePendingConsentIntent(documents);

  await expect(submitPendingConsentIntent('user-a')).rejects.toMatchObject({
    status: 409,
  });
  await expect(submitPendingConsentIntent('user-a')).resolves.toBe(
    'needs_review',
  );
  expect(updateLegalConsents).toHaveBeenCalledTimes(1);
  await clearPendingConsentIntent('user-a');
});

test('storage read 중 인증 계정이 바뀌면 계정별 작업으로 분리한다', async () => {
  await savePendingConsentIntent(documents);
  const raw = [...mockStorage.values()][0];
  let releaseRead!: (value: string) => void;
  jest.mocked(AsyncStorage.getItem).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        releaseRead = resolve;
      }),
  );

  const submission = submitPendingConsentIntent('user-a');
  while (!releaseRead) await Promise.resolve();
  useUserStore.setState({ userId: 'user-b', authGeneration: 2 });
  const nextSubmission = submitPendingConsentIntent('user-b');
  releaseRead(raw);

  await expect(submission).rejects.toMatchObject({ status: 401 });
  await expect(nextSubmission).resolves.toBe('submitted');
  expect(updateLegalConsents).toHaveBeenCalledTimes(1);
  const authContextIsCurrent =
    jest.mocked(updateLegalConsents).mock.calls[0][1];
  expect(authContextIsCurrent?.()).toBe(true);
});

test('PUT dispatch 전에 durable attempted 상태로 바꿔 재시작 자동 재전송을 막는다', async () => {
  let intentAtDispatch: Record<string, unknown> | null = null;
  jest.mocked(updateLegalConsents).mockImplementationOnce(async () => {
    intentAtDispatch = JSON.parse([...mockStorage.values()][0]);
    throw new Error('simulated process loss after dispatch');
  });
  await savePendingConsentIntent(documents);

  await expect(submitPendingConsentIntent('user-a')).rejects.toThrow(
    'simulated process loss',
  );
  expect(intentAtDispatch).toMatchObject({
    schemaVersion: 2,
    byOwner: {
      'user-a': {
        status: 'needs_review',
      },
    },
  });
  await expect(submitPendingConsentIntent('user-a')).resolves.toBe(
    'needs_review',
  );
  expect(updateLegalConsents).toHaveBeenCalledTimes(1);
});

test('A에게 귀속된 검토 intent는 B가 조회하거나 삭제할 수 없다', async () => {
  jest
    .mocked(updateLegalConsents)
    .mockRejectedValueOnce(new Error('leave durable review'));
  await savePendingConsentIntent(documents);
  await expect(submitPendingConsentIntent('user-a')).rejects.toThrow();
  const ownedRaw = [...mockStorage.values()][0];

  useUserStore.setState({ userId: 'user-b', authGeneration: 2 });
  await expect(submitPendingConsentIntent('user-b')).resolves.toBe('none');
  await clearPendingConsentIntent('user-b');
  expect([...mockStorage.values()][0]).toBe(ownedRaw);

  useUserStore.setState({ userId: 'user-a', authGeneration: 3 });
  await expect(submitPendingConsentIntent('user-a')).resolves.toBe(
    'needs_review',
  );
  await clearPendingConsentIntent('user-a');
  expect(mockStorage.size).toBe(0);
});
