import { useUserStore } from '@/store/useUserStore';

export interface AuthScope {
  generation: number;
  userId: string | null;
}

let generation = 0;
let userId = useUserStore.getState().userId;

useUserStore.subscribe((state) => {
  if (state.userId === userId) return;
  userId = state.userId;
  generation += 1;
});

export const captureAuthScope = (): AuthScope => ({ generation, userId });

export const isCurrentAuthScope = (scope: AuthScope) =>
  scope.generation === generation && scope.userId === userId;
