import { render, waitFor } from '@testing-library/react-native';

import FavoriteScreen from '@/app/(tabs)/favorite';
import { fetchAllSavedPlaces } from '@/services/api/savedPlaces';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useUserStore } from '@/store/useUserStore';

jest.mock('@/services/api/savedPlaces', () => ({
  createSavedPlace: jest.fn(),
  deleteSavedPlace: jest.fn(),
  fetchAllSavedPlaces: jest.fn(),
  updateSavedPlace: jest.fn(),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

beforeEach(() => {
  useFavoriteStore.setState(useFavoriteStore.getInitialState(), true);
  useUserStore.setState({
    authReady: true,
    isLoggedIn: true,
    userId: 'favorite-screen-owner',
    userName: null,
  });
});

test('관심장소 화면은 로그인 owner의 실제 GET 목록을 같은 레이아웃에 표시한다', async () => {
  jest.mocked(fetchAllSavedPlaces).mockResolvedValue([
    {
      placeId: '34000000-0000-4000-8000-000000000001',
      etag: '"sp-11111111111111111111111111111111"',
      name: '새별오름',
      category: 'content-type:12',
      regionLabel: '제주시',
      thumbnailUrl: null,
      recommendedStayMinutes: 90,
      memo: '노을 시간 방문',
      tags: ['오름'],
      priority: 5,
      targetDay: 2,
      savedAt: '2026-09-10T00:00:00Z',
      updatedAt: '2026-09-10T00:00:00Z',
    },
  ]);

  const screen = await render(<FavoriteScreen />);

  await waitFor(() => expect(screen.getByText('새별오름')).toBeTruthy());
  expect(screen.getByText('관심장소')).toBeTruthy();
  expect(screen.getByText('노을 시간 방문')).toBeTruthy();
  expect(screen.getByText('설정 체류 90분')).toBeTruthy();
  expect(screen.getAllByText('필수방문')).toHaveLength(2);
});
