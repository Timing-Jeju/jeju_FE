import { startAppSession } from '@/services/appSession';
import { startAuthSession } from '@/services/auth';
import { startPendingConsentSync } from '@/services/pendingConsentSync';

jest.mock('@/services/auth', () => ({ startAuthSession: jest.fn() }));
jest.mock('@/services/pendingConsentSync', () => ({
  startPendingConsentSync: jest.fn(),
}));

test('RootLayout 세션은 pending 구독 후 인증 복원을 시작하고 함께 해제한다', () => {
  const calls: string[] = [];
  jest.mocked(startPendingConsentSync).mockImplementation(() => {
    calls.push('pending:start');
    return () => calls.push('pending:stop');
  });
  jest.mocked(startAuthSession).mockImplementation(() => {
    calls.push('auth:start');
    return () => calls.push('auth:stop');
  });

  const stop = startAppSession();
  expect(calls).toEqual(['pending:start', 'auth:start']);
  stop();
  expect(calls).toEqual([
    'pending:start',
    'auth:start',
    'auth:stop',
    'pending:stop',
  ]);
});
