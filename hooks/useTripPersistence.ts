import { useMemo } from 'react';

import { createTripPersistenceActions } from '@/services/tripPersistence';

/** 여행 aggregate API 동작은 store 기반이라 렌더 사이에 안정적인 action 객체로 노출한다. */
export function useTripPersistence() {
  return useMemo(() => createTripPersistenceActions(), []);
}
