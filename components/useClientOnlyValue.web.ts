import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

// `useSyncExternalStore` with a server-specific snapshot is the recommended way
// to handle hydration-safe client-only values in React 18+.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  return isClient ? client : server;
}
