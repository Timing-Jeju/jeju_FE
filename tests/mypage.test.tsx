import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import MypageScreen from '@/app/(tabs)/mypage';
import { fetchProfile, updateProfile } from '@/services/api/profile';
import { ApiError } from '@/services/api/problem';
import { useProfileLegalStore } from '@/store/useProfileLegalStore';
import { useUserStore } from '@/store/useUserStore';

jest.mock('@/services/api/profile', () => ({
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
}));
jest.mock('@/services/api/legal', () => ({
  fetchLegalDocuments: jest.fn(),
  updateLegalConsents: jest.fn(),
}));
jest.mock('@/services/auth', () => ({ signOut: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), push: jest.fn() }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const userId = '00000000-0000-4000-8000-000000000001';
const profile = (nickname: string) => ({
  userId,
  email: 'traveler@example.invalid',
  nickname,
  profileImageUrl: null,
  locale: 'ko-KR',
  providers: [],
  onboardingCompleted: true,
  updatedAt: '2026-09-10T00:00:00Z',
});

beforeEach(() => {
  useUserStore.setState({
    authReady: true,
    isLoggedIn: true,
    userId,
    userName: null,
  });
  useProfileLegalStore.getState().resetForUser(userId);
});

test('마이페이지는 GET /me의 실제 프로필을 표시한다', async () => {
  jest.mocked(fetchProfile).mockResolvedValueOnce(profile('제주 여행자'));
  const screen = await render(<MypageScreen />);

  await waitFor(() => expect(screen.getByText('제주 여행자')).toBeTruthy());
  expect(screen.getByText('traveler@example.invalid')).toBeTruthy();
  expect(screen.queryByText('제주도굿')).toBeNull();
});

test('정보 수정은 PATCH 응답으로 화면과 캐시를 갱신한다', async () => {
  jest.mocked(fetchProfile).mockResolvedValueOnce(profile('기존 닉네임'));
  jest.mocked(updateProfile).mockResolvedValueOnce(profile('새 닉네임'));
  const screen = await render(<MypageScreen />);
  await waitFor(() => screen.getByText('기존 닉네임'));

  await fireEvent.press(screen.getByText('정보 수정'));
  await fireEvent.changeText(screen.getByLabelText('닉네임'), ' 새 닉네임 ');
  await fireEvent.press(screen.getByText('저장'));

  await waitFor(() => expect(screen.getByText('새 닉네임')).toBeTruthy());
  expect(updateProfile).toHaveBeenCalledWith({ nickname: '새 닉네임' });
  expect(useProfileLegalStore.getState().profile?.nickname).toBe('새 닉네임');
});

test('A의 수정 초안은 B 사용자 전환 즉시 닫히고 B PATCH에 사용되지 않는다', async () => {
  jest.mocked(fetchProfile).mockResolvedValueOnce(profile('A 사용자'));
  const screen = await render(<MypageScreen />);
  await waitFor(() => screen.getByText('A 사용자'));
  await fireEvent.press(screen.getByText('정보 수정'));
  await fireEvent.changeText(screen.getByLabelText('닉네임'), 'A의 초안');
  const staleSave = screen.getByText('저장');

  await act(() => {
    useUserStore.setState({ userId: '00000000-0000-4000-8000-000000000002' });
    fireEvent.press(staleSave);
  });

  expect(screen.queryByLabelText('닉네임')).toBeNull();
  expect(updateProfile).not.toHaveBeenCalled();
});

test('503은 기존 UI 안에서 재시도 가능한 상태로 표시한다', async () => {
  jest
    .mocked(fetchProfile)
    .mockRejectedValueOnce(
      new ApiError({ status: 503, code: 'PROFILE_DATA_UNAVAILABLE' }),
    )
    .mockResolvedValueOnce(profile('복구된 사용자'));
  const screen = await render(<MypageScreen />);

  await waitFor(() =>
    expect(
      screen.getByText(
        '프로필 정보를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
      ),
    ).toBeTruthy(),
  );
  await fireEvent.press(screen.getByText('다시 시도'));
  await waitFor(() => expect(screen.getByText('복구된 사용자')).toBeTruthy());
  expect(fetchProfile).toHaveBeenCalledTimes(2);
});
