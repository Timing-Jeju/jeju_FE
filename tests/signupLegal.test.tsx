import { fireEvent, render, waitFor } from '@testing-library/react-native';
import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

import SignupScreen from '@/app/signup';
import { fetchLegalDocuments, updateLegalConsents } from '@/services/api/legal';
import { ApiError } from '@/services/api/problem';
import {
  clearPendingConsentIntent,
  savePendingConsentIntent,
} from '@/services/pendingConsent';
import { useProfileLegalStore } from '@/store/useProfileLegalStore';
import { useUserStore } from '@/store/useUserStore';

jest.mock('@/services/api/legal', () => ({
  fetchLegalDocuments: jest.fn(),
  updateLegalConsents: jest.fn(),
  isSafeLegalContentUrl: (value: string) => value.startsWith('https://'),
}));
jest.mock('@/services/api/profile', () => ({
  fetchProfile: jest.fn(),
  updateProfile: jest.fn(),
}));
jest.mock('@/services/pendingConsent', () => ({
  savePendingConsentIntent: jest.fn(),
  clearPendingConsentIntent: jest.fn(),
}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

const userId = '00000000-0000-4000-8000-000000000001';
const terms = {
  documentId: '10000000-0000-4000-8000-000000000001',
  type: 'terms' as const,
  version: '1.0.0',
  title: '서비스 이용약관',
  contentUrl: 'https://legal.example.invalid/terms',
  required: true,
  effectiveAt: '2026-09-10T00:00:00Z',
};
const privacy = {
  ...terms,
  documentId: '10000000-0000-4000-8000-000000000002',
  type: 'privacy' as const,
  title: '개인정보 처리방침',
  contentUrl: 'https://legal.example.invalid/privacy',
};
const termsV2 = {
  ...terms,
  documentId: '10000000-0000-4000-8000-000000000003',
  version: '2.0.0',
  title: '서비스 이용약관 v2',
  contentUrl: 'https://legal.example.invalid/terms-v2',
};

beforeEach(() => {
  useUserStore.setState({
    authReady: true,
    isLoggedIn: true,
    userId,
    userName: null,
  });
  useProfileLegalStore.getState().resetForUser(userId);
  jest.mocked(fetchLegalDocuments).mockResolvedValue({
    evaluatedAt: '2026-09-10T00:00:00Z',
    locale: 'ko-KR',
    items: [terms, privacy],
  });
  jest.mocked(updateLegalConsents).mockResolvedValue({
    requiredConsentsSatisfied: true,
    updatedAt: '2026-09-10T00:00:00Z',
  });
  jest.mocked(savePendingConsentIntent).mockResolvedValue(undefined);
  jest.mocked(clearPendingConsentIntent).mockResolvedValue(undefined);
});

test('최신 서버 약관을 표시하고 HTTPS 본문만 연다', async () => {
  const screen = await render(<SignupScreen />);
  await waitFor(() =>
    expect(screen.getByText('[필수] 서비스 이용약관')).toBeTruthy(),
  );
  expect(screen.getByText('[필수] 개인정보 처리방침')).toBeTruthy();

  await fireEvent.press(screen.getAllByText('보기')[0]);
  expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(terms.contentUrl);
});

test('비로그인 signup은 명시한 최신 동의 의도를 보관하고 PUT하지 않는다', async () => {
  useUserStore.setState({ isLoggedIn: false, userId: null });
  const screen = await render(<SignupScreen />);
  await waitFor(() => screen.getByText('[필수] 서비스 이용약관'));
  await fireEvent.press(screen.getByText('[필수] 만 14세 이상입니다.'));
  await fireEvent.press(screen.getByText('[필수] 서비스 이용약관'));
  await fireEvent.press(screen.getByText('[필수] 개인정보 처리방침'));
  await fireEvent.press(screen.getAllByText('회원가입').at(-1)!);

  await waitFor(() =>
    expect(savePendingConsentIntent).toHaveBeenCalledWith([
      { documentId: terms.documentId, version: terms.version },
      { documentId: privacy.documentId, version: privacy.version },
    ]),
  );
  expect(updateLegalConsents).not.toHaveBeenCalled();
  expect(screen.getByText(/로그인에 사용할/)).toBeTruthy();
});

test.each([
  [409, 'PROFILE_CONFLICT', '최신 정보를 다시 불러온 뒤 시도해 주세요.'],
  [422, 'LEGAL_CONSENT_REQUIRED', '필수 약관에 모두 동의해 주세요.'],
])(
  '%i 실패를 성공처럼 넘기지 않고 복구 메시지를 표시한다',
  async (status, code, message) => {
    jest
      .mocked(updateLegalConsents)
      .mockRejectedValueOnce(new ApiError({ status, code }));
    const screen = await render(<SignupScreen />);
    await waitFor(() => screen.getByText('[필수] 서비스 이용약관'));
    await fireEvent.press(screen.getByText('[필수] 만 14세 이상입니다.'));
    await fireEvent.press(screen.getByText('[필수] 서비스 이용약관'));
    await fireEvent.press(screen.getByText('[필수] 개인정보 처리방침'));
    await fireEvent.press(screen.getAllByText('회원가입').at(-1)!);

    await waitFor(() => expect(screen.getByText(message)).toBeTruthy());
    expect(screen.queryByText(/로그인에 사용할/)).toBeNull();
  },
);

test('409는 최신 v2를 다시 불러와 체크를 초기화하고 명시적 재동의 뒤에만 PUT한다', async () => {
  jest
    .mocked(fetchLegalDocuments)
    .mockResolvedValueOnce({
      evaluatedAt: '2026-09-10T00:00:00Z',
      locale: 'ko-KR',
      items: [terms, privacy],
    })
    .mockResolvedValueOnce({
      evaluatedAt: '2026-09-11T00:00:00Z',
      locale: 'ko-KR',
      items: [termsV2, privacy],
    });
  jest
    .mocked(updateLegalConsents)
    .mockRejectedValueOnce(
      new ApiError({ status: 409, code: 'PROFILE_CONFLICT' }),
    )
    .mockResolvedValueOnce({
      requiredConsentsSatisfied: true,
      updatedAt: '2026-09-11T00:00:00Z',
    });
  const screen = await render(<SignupScreen />);
  await waitFor(() => screen.getByText('[필수] 서비스 이용약관'));
  await fireEvent.press(screen.getByText('[필수] 만 14세 이상입니다.'));
  await fireEvent.press(screen.getByText('[필수] 서비스 이용약관'));
  await fireEvent.press(screen.getByText('[필수] 개인정보 처리방침'));
  await fireEvent.press(screen.getAllByText('회원가입').at(-1)!);

  await waitFor(() => screen.getByText('[필수] 서비스 이용약관 v2'));
  const submit = screen.getAllByText('회원가입').at(-1)!;
  expect(submit.parent?.props.accessibilityState.disabled).toBe(true);
  expect(updateLegalConsents).toHaveBeenCalledTimes(1);

  await fireEvent.press(screen.getByText('[필수] 서비스 이용약관 v2'));
  await fireEvent.press(screen.getByText('[필수] 개인정보 처리방침'));
  await fireEvent.press(submit);
  await waitFor(() => expect(updateLegalConsents).toHaveBeenCalledTimes(2));
  expect(updateLegalConsents).toHaveBeenLastCalledWith(
    [
      { documentId: termsV2.documentId, agreed: true },
      { documentId: privacy.documentId, agreed: true },
    ],
    expect.any(Function),
  );
});

test('legal GET 503에서는 나이 체크와 무관하게 다음 단계가 비활성화된다', async () => {
  jest
    .mocked(fetchLegalDocuments)
    .mockRejectedValueOnce(
      new ApiError({ status: 503, code: 'PROFILE_DATA_UNAVAILABLE' }),
    );
  const screen = await render(<SignupScreen />);
  await waitFor(() =>
    screen.getByText(
      '프로필 정보를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
    ),
  );
  await fireEvent.press(screen.getByText('[필수] 만 14세 이상입니다.'));
  const submit = screen.getAllByText('회원가입').at(-1)!;
  expect(submit.parent?.props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(submit);
  expect(screen.queryByText(/로그인에 사용할/)).toBeNull();
});

test('Spring 회원가입 계약이 없어 완료를 가짜 성공 처리하지 않는다', async () => {
  useUserStore.setState({ isLoggedIn: false, userId: null });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  const screen = await render(<SignupScreen />);
  await waitFor(() => screen.getByText('[필수] 서비스 이용약관'));
  await fireEvent.press(screen.getByText('[필수] 만 14세 이상입니다.'));
  await fireEvent.press(screen.getByText('[필수] 서비스 이용약관'));
  await fireEvent.press(screen.getByText('[필수] 개인정보 처리방침'));
  await fireEvent.press(screen.getAllByText('회원가입').at(-1)!);

  await fireEvent.changeText(
    screen.getByPlaceholderText('아이디를 입력해주세요.'),
    'traveler',
  );
  await fireEvent.press(screen.getByText('중복 확인'));
  await fireEvent.changeText(
    screen.getByPlaceholderText('비밀번호를 입력해주세요.'),
    'Password1!',
  );
  await fireEvent.changeText(
    screen.getByPlaceholderText('비밀번호 확인'),
    'Password1!',
  );
  await fireEvent.press(screen.getByText('다음'));

  const fields = screen.getAllByPlaceholderText('내용을 입력해주세요.');
  await fireEvent.changeText(fields[0], '여행자');
  await fireEvent.changeText(fields[1], '제주 여행자');
  await fireEvent.press(screen.getByText('중복 확인'));
  await fireEvent.changeText(fields[2], 'traveler@example.invalid');
  await fireEvent.press(screen.getByText('다음'));

  expect(alert).toHaveBeenCalledWith(
    '회원가입 준비 중',
    '회원가입 기능을 준비하고 있어요.',
  );
  expect(screen.queryByText('회원가입이 완료되었습니다.')).toBeNull();
});
