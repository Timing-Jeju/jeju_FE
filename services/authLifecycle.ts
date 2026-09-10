type BeforeSignOut = (userId: string) => Promise<void>;
type AfterSignOutFailure = (userId: string) => Promise<void>;

let beforeSignOut: BeforeSignOut | null = null;
let afterSignOutFailure: AfterSignOutFailure | null = null;

export function registerBeforeSignOut(handler: BeforeSignOut): () => void {
  beforeSignOut = handler;
  return () => {
    if (beforeSignOut === handler) beforeSignOut = null;
  };
}

export function registerAfterSignOutFailure(
  handler: AfterSignOutFailure,
): () => void {
  afterSignOutFailure = handler;
  return () => {
    if (afterSignOutFailure === handler) afterSignOutFailure = null;
  };
}

/** 원격 cleanup 실패가 사용자의 로컬 로그아웃을 막지는 않는다. */
export async function runBeforeSignOut(userId: string): Promise<void> {
  try {
    await beforeSignOut?.(userId);
  } catch {
    // 식별자나 provider 오류를 기록하지 않는다.
  }
}

/** 로그아웃 자체가 실패하면 현재 세션의 기기 상태를 다시 맞춘다. */
export async function runAfterSignOutFailure(userId: string): Promise<void> {
  try {
    await afterSignOutFailure?.(userId);
  } catch {
    // 식별자나 provider 오류를 기록하지 않는다.
  }
}
