import { collectPages } from '@/services/api/pagination';
import type { CursorPageResponse } from '@/services/api/types';

const page = <T>(
  items: T[],
  nextCursor: string | null,
  hasNext = nextCursor !== null,
): CursorPageResponse<T> => ({
  items,
  page: { size: items.length, hasNext, nextCursor },
});

describe('collectPages', () => {
  it('cursor 를 그대로 넘기며 마지막 페이지까지 항목을 모은다', async () => {
    const load = jest
      .fn<Promise<CursorPageResponse<number>>, [string | undefined]>()
      .mockResolvedValueOnce(page([1, 2], 'c1'))
      .mockResolvedValueOnce(page([3], 'c2'))
      .mockResolvedValueOnce(page([4], null));

    await expect(collectPages(load)).resolves.toEqual([1, 2, 3, 4]);
    expect(load.mock.calls.map(([cursor]) => cursor)).toEqual([
      undefined,
      'c1',
      'c2',
    ]);
  });

  it('hasNext 가 true 여도 nextCursor 가 null 이면 멈춘다', async () => {
    const load = jest.fn().mockResolvedValue(page([1], null, true));

    await expect(collectPages(load)).resolves.toEqual([1]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('서버가 hasNext 를 계속 true 로 주면 maxPages 에서 멈춘다', async () => {
    const load = jest.fn().mockResolvedValue(page(['x'], 'again'));

    await expect(collectPages(load, 3)).resolves.toEqual(['x', 'x', 'x']);
    expect(load).toHaveBeenCalledTimes(3);
  });

  it('빈 페이지면 빈 목록이다', async () => {
    const load = jest.fn().mockResolvedValue(page([], null));
    await expect(collectPages(load)).resolves.toEqual([]);
  });
});
