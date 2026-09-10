import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  clearPendingConsentIntent,
  savePendingConsentIntent,
  submitPendingConsentIntent,
} from '@/services/pendingConsent';
import { updateLegalConsents } from '@/services/api/legal';
import { ApiError } from '@/services/api/problem';

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
  expect(updateLegalConsents).toHaveBeenCalledWith([
    { documentId: documents[0].documentId, agreed: true },
  ]);
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
  expect(updateLegalConsents).toHaveBeenCalledWith([
    { documentId: documents[0].documentId, agreed: true },
  ]);
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
  await clearPendingConsentIntent();
});
