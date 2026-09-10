import { useMemo } from 'react';

import { createSchedulePersistenceActions } from '@/services/schedulePersistence';

export function useSchedulePersistence() {
  return useMemo(() => createSchedulePersistenceActions(), []);
}
