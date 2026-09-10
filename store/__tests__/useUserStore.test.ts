import { fetchProfile, type Profile } from '@/services/api';
import { getAccessToken } from '@/services/api/session';
import { useUserStore } from '@/store/useUserStore';

jest.mock('@/services/api', () => ({
  ...jest.requireActual('@/services/api'),
  fetchProfile: jest.fn(),
}));

const mockedFetchProfile = jest.mocked(fetchProfile);

const session = { accessToken: 'jwt', userId: 'u1', email: 'a@b.c' };
const profile: Profile = {
  userId: 'u1',
  email: 'a@b.c',
  nickname: '제주도굿',
  profileImageUrl: null,
  locale: 'ko-KR',
  providers: [],
  onboardingCompleted: true,
  updatedAt: '',
};

beforeEach(() => {
  mockedFetchProfile.mockReset();
  useUserStore.getState().logout();
});

describe('세션 반영', () => {
  it('applySession 은 로그인 상태와 토큰을 채우고, 프로필은 건드리지 않는다', () => {
    useUserStore.setState({ profile, userName: '제주도굿' });

    useUserStore.getState().applySession({ ...session, accessToken: 'new' });

    expect(useUserStore.getState()).toMatchObject({
      isLoggedIn: true,
      userId: 'u1',
      email: 'a@b.c',
      accessToken: 'new',
      profile,
      userName: '제주도굿',
    });
  });

  it('null 세션과 logout 은 프로필까지 모두 비운다', () => {
    useUserStore.getState().applySession(session);
    useUserStore.setState({ profile, userName: '제주도굿' });

    useUserStore.getState().applySession(null);

    expect(useUserStore.getState()).toMatchObject({
      isLoggedIn: false,
      userId: null,
      userName: null,
      email: null,
      accessToken: null,
      profile: null,
    });
  });

  it('백엔드 호출부는 store 의 access token 을 읽어 간다', () => {
    expect(getAccessToken()).toBeNull();
    useUserStore.getState().applySession(session);
    expect(getAccessToken()).toBe('jwt');
    useUserStore.getState().logout();
    expect(getAccessToken()).toBeNull();
  });
});

describe('loadProfile', () => {
  it('프로필과 닉네임을 채운다', async () => {
    mockedFetchProfile.mockResolvedValue(profile);

    await expect(useUserStore.getState().loadProfile()).resolves.toBe(profile);
    expect(useUserStore.getState().profile).toBe(profile);
    expect(useUserStore.getState().userName).toBe('제주도굿');
  });

  it('서버 닉네임이 없으면 기존 이름을 유지한다', async () => {
    useUserStore.setState({ userName: '기존이름' });
    mockedFetchProfile.mockResolvedValue({ ...profile, nickname: null });

    await useUserStore.getState().loadProfile();

    expect(useUserStore.getState().userName).toBe('기존이름');
  });

  it('실패하면 null 을 돌려주고 로그인 상태는 풀지 않는다', async () => {
    useUserStore.getState().applySession(session);
    mockedFetchProfile.mockRejectedValue(new Error('network'));

    await expect(useUserStore.getState().loadProfile()).resolves.toBeNull();
    expect(useUserStore.getState().isLoggedIn).toBe(true);
    expect(useUserStore.getState().profile).toBeNull();
  });
});
