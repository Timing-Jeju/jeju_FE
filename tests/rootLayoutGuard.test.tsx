import { render } from '@testing-library/react-native';

import { RootLayoutNav } from '@/app/_layout';
import { useUserStore } from '@/store/useUserStore';

const mockProfileState = { consentStatus: 'idle' };

jest.mock('@/services/appSession', () => ({ startAppSession: jest.fn() }));
jest.mock('react-native-reanimated', () => ({}));
jest.mock('@/components/useColorScheme', () => ({
  useColorScheme: () => 'light',
}));
jest.mock('@/store/useProfileLegalStore', () => ({
  useProfileLegalStore: (
    selector: (state: typeof mockProfileState) => unknown,
  ) => selector(mockProfileState),
}));
jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: jest.fn(),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-router', () => {
  const mockReact = jest.requireActual('react');
  const { Text: MockText } = jest.requireActual('react-native');
  const Stack = function MockStack({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return children;
  };
  Stack.Protected = function MockStackProtected({
    guard,
    children,
  }: {
    guard: boolean;
    children: React.ReactNode;
  }) {
    return guard ? children : null;
  };
  Stack.Screen = function MockStackScreen({ name }: { name: string }) {
    return mockReact.createElement(MockText, null, name);
  };
  const ThemeProvider = function MockThemeProvider({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return children;
  };
  return {
    DarkTheme: {},
    DefaultTheme: {},
    ThemeProvider,
    Stack,
  };
});

beforeEach(() => {
  useUserStore.setState({ isLoggedIn: true, userId: 'user-a' });
  mockProfileState.consentStatus = 'idle';
});

test('로그인 사용자는 일반 signup에 접근하지 않는다', async () => {
  const screen = await render(<RootLayoutNav />);
  expect(screen.queryByText('signup')).toBeNull();
  expect(screen.getByText('(tabs)')).toBeTruthy();
});

test('pending consent 검토 오류가 있을 때만 로그인 사용자에게 signup 복구 경로를 연다', async () => {
  mockProfileState.consentStatus = 'error';
  const screen = await render(<RootLayoutNav />);
  expect(screen.getByText('signup')).toBeTruthy();
  expect(screen.queryByText('login')).toBeNull();
  expect(screen.getByText('(tabs)')).toBeTruthy();
});

test('동의 저장 중에는 응답이 확정될 때까지 signup 복구 경로를 유지한다', async () => {
  mockProfileState.consentStatus = 'saving';
  const screen = await render(<RootLayoutNav />);

  expect(screen.getByText('signup')).toBeTruthy();
  expect(screen.getByText('(tabs)')).toBeTruthy();
});
