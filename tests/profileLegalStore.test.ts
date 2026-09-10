import { useProfileLegalStore } from '@/store/useProfileLegalStore';
import { fetchProfile, updateProfile } from '@/services/api/profile';
import { fetchLegalDocuments, updateLegalConsents } from '@/services/api/legal';
import { ApiError } from '@/services/api/problem';

jest.mock('@/services/api/profile', () => ({
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
}));
jest.mock('@/services/api/legal', () => ({
  fetchLegalDocuments: jest.fn(),
  updateLegalConsents: jest.fn(),
}));

const profile = (userId: string, nickname: string) => ({
  userId,
  email: `${nickname}@example.invalid`,
  nickname,
  profileImageUrl: null,
  locale: 'ko-KR',
  providers: [],
  onboardingCompleted: true,
  updatedAt: '2026-09-10T00:00:00Z',
});

beforeEach(() => {
  useProfileLegalStore.getState().resetForUser(null);
});

test('프로필 조회와 수정은 Spring 응답으로 같은 사용자 캐시를 갱신한다', async () => {
  jest.mocked(fetchProfile).mockResolvedValueOnce(profile('user-a', '기존'));
  jest.mocked(updateProfile).mockResolvedValueOnce(profile('user-a', '변경'));

  await useProfileLegalStore.getState().loadProfile('user-a');
  await useProfileLegalStore.getState().saveNickname('user-a', ' 변경 ');

  expect(updateProfile).toHaveBeenCalledWith({ nickname: '변경' });
  expect(useProfileLegalStore.getState()).toMatchObject({
    ownerUserId: 'user-a',
    profile: { nickname: '변경' },
    profileStatus: 'ready',
  });
});

test('사용자 전환 뒤 도착한 이전 사용자의 응답은 새 캐시를 오염시키지 않는다', async () => {
  let resolveOld!: (value: ReturnType<typeof profile>) => void;
  jest
    .mocked(fetchProfile)
    .mockImplementationOnce(
      () => new Promise((resolve) => (resolveOld = resolve)),
    );
  const oldRequest = useProfileLegalStore.getState().loadProfile('user-a');
  useProfileLegalStore.getState().resetForUser('user-b');
  resolveOld(profile('user-a', '이전 사용자'));
  await oldRequest;

  expect(useProfileLegalStore.getState()).toMatchObject({
    ownerUserId: 'user-b',
    profile: null,
  });
});

test('필수 약관만 동의 payload로 만들고 서버 409/422를 성공으로 바꾸지 않는다', async () => {
  const required = {
    documentId: '10000000-0000-4000-8000-000000000001',
    type: 'terms' as const,
    version: '1.0.0',
    title: '필수 이용약관',
    contentUrl: 'https://legal.example.invalid/terms',
    required: true,
    effectiveAt: '2026-09-10T00:00:00Z',
  };
  jest.mocked(fetchLegalDocuments).mockResolvedValueOnce({
    evaluatedAt: '2026-09-10T00:00:00Z',
    locale: 'ko-KR',
    items: [required],
  });
  jest
    .mocked(updateLegalConsents)
    .mockRejectedValueOnce(
      new ApiError({ status: 409, code: 'PROFILE_CONFLICT' }),
    );

  await useProfileLegalStore.getState().loadLegalDocuments();
  await expect(
    useProfileLegalStore.getState().saveRequiredConsents('user-a', new Set()),
  ).rejects.toMatchObject({ status: 422 });
  await expect(
    useProfileLegalStore
      .getState()
      .saveRequiredConsents('user-a', new Set([required.documentId])),
  ).rejects.toMatchObject({ status: 409 });
  expect(useProfileLegalStore.getState()).toMatchObject({
    consentStatus: 'error',
    consentError: expect.stringContaining('최신'),
  });
});

test('로그아웃은 프로필과 약관 사용자 캐시를 지운다', () => {
  useProfileLegalStore.setState({
    ownerUserId: 'user-a',
    profile: profile('user-a', '사용자'),
  });
  useProfileLegalStore.getState().resetForUser(null);
  expect(useProfileLegalStore.getState()).toMatchObject({
    ownerUserId: null,
    profile: null,
    consentStatus: 'idle',
  });
});
