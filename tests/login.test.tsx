import { fireEvent, render, waitFor } from '@testing-library/react-native';
import LoginScreen from '@/app/login';
import { signIn } from '@/services/auth';

jest.mock('@/services/auth', () => ({ signIn: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

test('이메일과 비밀번호를 입력하고 실제 인증 실패를 화면에 표시한다', async () => {
  jest.mocked(signIn).mockRejectedValueOnce(new Error('로그인하지 못했어요.'));
  const screen = await render(<LoginScreen />);
  await fireEvent.changeText(
    screen.getByLabelText('이메일'),
    'test@example.invalid',
  );
  await fireEvent.changeText(
    screen.getByLabelText('비밀번호'),
    'synthetic-password',
  );
  await fireEvent.press(screen.getByText('로그인'));
  await waitFor(() =>
    expect(screen.getByText('로그인하지 못했어요.')).toBeTruthy(),
  );
  expect(signIn).toHaveBeenCalledWith(
    'test@example.invalid',
    'synthetic-password',
  );
});

test('이메일 형식 오류는 인증 요청 전에 표시한다', async () => {
  const screen = await render(<LoginScreen />);
  await fireEvent.changeText(screen.getByLabelText('이메일'), 'not-an-email');
  await fireEvent.changeText(
    screen.getByLabelText('비밀번호'),
    'synthetic-password',
  );
  await fireEvent.press(screen.getByText('로그인'));
  expect(screen.getByText('이메일 형식을 확인해 주세요.')).toBeTruthy();
  expect(signIn).not.toHaveBeenCalled();
});
