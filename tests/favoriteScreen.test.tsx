import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import FavoriteScreen from '@/app/(tabs)/favorite';
import {
  deleteSavedPlace,
  fetchAllSavedPlaces,
} from '@/services/api/savedPlaces';
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

const savedPlace = {
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
};

beforeEach(() => {
  jest.mocked(deleteSavedPlace).mockReset();
  jest.mocked(fetchAllSavedPlaces).mockReset();
  useFavoriteStore.setState(useFavoriteStore.getInitialState(), true);
  useUserStore.setState({
    authGeneration: 1,
    authReady: true,
    isLoggedIn: true,
    userId: 'favorite-screen-owner',
    userName: null,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('관심장소 화면은 로그인 owner의 실제 GET 목록을 같은 레이아웃에 표시한다', async () => {
  jest.mocked(fetchAllSavedPlaces).mockResolvedValue([savedPlace]);

  const screen = await render(<FavoriteScreen />);

  await waitFor(() => expect(screen.getByText('새별오름')).toBeTruthy());
  expect(screen.getByText('관심장소')).toBeTruthy();
  expect(screen.getByText('노을 시간 방문')).toBeTruthy();
  expect(screen.getByText('설정 체류 90분')).toBeTruthy();
  expect(screen.getAllByText('필수방문')).toHaveLength(2);
});

test('삭제 ETag 재조회 성공은 자동 삭제 없이 실제 화면에서 재시도를 안내한다', async () => {
  jest.mocked(fetchAllSavedPlaces).mockResolvedValue([savedPlace]);
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const screen = await render(<FavoriteScreen />);
  await waitFor(() => expect(screen.getByText('새별오름')).toBeTruthy());
  await act(() => {
    useFavoriteStore.setState((state) => ({
      favorites: state.favorites.map((place) => ({
        ...place,
        etag: undefined,
      })),
    }));
  });

  const likeButton = screen.container.queryAll(
    (node) =>
      node.type === 'View' &&
      node.props.accessible === true &&
      node.children.length === 1 &&
      typeof node.children[0] !== 'string' &&
      node.children[0].type === 'Image',
  )[0];
  expect(likeButton).toBeDefined();
  await fireEvent.press(likeButton);
  await fireEvent.press(screen.getByText('삭제'));

  await waitFor(() =>
    expect(alert).toHaveBeenCalledWith(
      '찜을 삭제하지 못했어요',
      '최신 찜 정보를 다시 불러왔어요. 삭제할 장소를 확인한 뒤 다시 시도해 주세요.',
    ),
  );
  expect(deleteSavedPlace).not.toHaveBeenCalled();
});
