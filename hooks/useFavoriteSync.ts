import { useEffect } from 'react';
import { Alert } from 'react-native';

import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useUserStore } from '@/store/useUserStore';

export const favoriteMutationErrorMessage = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'status' in error &&
  (error.status === 409 || error.status === 412)
    ? '다른 곳에서 변경된 최신 내용을 불러왔어요. 입력한 내용을 확인한 뒤 다시 시도해 주세요.'
    : error instanceof Error
      ? error.message
      : '찜 요청을 완료하지 못했어요. 다시 시도해 주세요.';

/** 활성 인증 owner의 서버 찜 목록만 화면에 노출한다. */
export function useFavoriteSync() {
  const authReady = useUserStore((state) => state.authReady);
  const ownerId = useUserStore((state) => state.userId);
  const hydrate = useFavoriteStore((state) => state.hydrate);
  const reset = useFavoriteStore((state) => state.reset);

  useEffect(() => {
    if (!authReady) return;
    if (!ownerId) {
      reset();
      return;
    }
    void hydrate(ownerId).catch(() => {
      Alert.alert(
        '찜 목록을 불러오지 못했어요',
        '연결을 확인하고 다시 시도해 주세요.',
      );
    });
  }, [authReady, hydrate, ownerId, reset]);
}
