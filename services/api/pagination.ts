import type { CursorPageResponse } from './types';

/**
 * cursor 페이지를 끝까지 따라가며 항목을 모은다.
 *
 * cursor를 받은 뒤 filter/sort/size를 바꾸면 400 CURSOR_CONTEXT_MISMATCH이므로
 * `load`는 cursor만 바꾸고 나머지 조건은 그대로 유지해야 한다.
 */
export async function collectPages<T>(
  load: (cursor?: string) => Promise<CursorPageResponse<T>>,
  /** 안전장치 — 서버가 hasNext를 계속 true로 주는 상황을 대비한다 */
  maxPages = 10,
): Promise<T[]> {
  const items: T[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < maxPages; page += 1) {
    const response = await load(cursor);
    items.push(...response.items);

    if (!response.page.hasNext || !response.page.nextCursor) break;
    cursor = response.page.nextCursor;
  }

  return items;
}
