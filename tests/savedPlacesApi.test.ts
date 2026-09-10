import { request, requestData } from '@/services/api/http';
import {
  deleteSavedPlace,
  fetchAllSavedPlaces,
  type SavedPlace,
} from '@/services/api/savedPlaces';

jest.mock('@/services/api/http', () => ({
  request: jest.fn(),
  requestData: jest.fn(),
}));

const item = (placeId: string, etag: string): SavedPlace => ({
  placeId,
  etag,
  name: '장소',
  category: 'content-type:12',
  regionLabel: null,
  thumbnailUrl: null,
  recommendedStayMinutes: null,
  memo: null,
  tags: [],
  priority: 0,
  targetDay: null,
  savedAt: '2026-09-10T00:00:00Z',
  updatedAt: '2026-09-10T00:00:00Z',
});

test('opaque cursor를 그대로 따라가며 각 목록 item의 strong ETag를 보존한다', async () => {
  jest
    .mocked(requestData)
    .mockResolvedValueOnce({
      items: [
        item(
          '34000000-0000-4000-8000-000000000001',
          '"sp-11111111111111111111111111111111"',
        ),
      ],
      page: { size: 1, hasNext: true, nextCursor: 'opaque+/=' },
    })
    .mockResolvedValueOnce({
      items: [
        item(
          '34000000-0000-4000-8000-000000000002',
          '"sp-22222222222222222222222222222222"',
        ),
      ],
      page: { size: 1, hasNext: false, nextCursor: null },
    });

  const result = await fetchAllSavedPlaces();

  expect(result.map((place) => place.etag)).toEqual([
    '"sp-11111111111111111111111111111111"',
    '"sp-22222222222222222222222222222222"',
  ]);
  expect(requestData).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({
      params: expect.objectContaining({ cursor: 'opaque+/=' }),
    }),
  );
});

test('hydration에서 받은 strong ETag를 DELETE If-Match로 정확히 전송한다', async () => {
  jest.mocked(request).mockResolvedValue({
    data: undefined,
    status: 204,
    etag: null,
    location: null,
    idempotencyReplayed: null,
    traceId: null,
  });

  await deleteSavedPlace(
    '34000000-0000-4000-8000-000000000001',
    '"saved-place.34.v3"',
  );

  expect(request).toHaveBeenCalledWith({
    method: 'DELETE',
    path: '/me/saved-places/34000000-0000-4000-8000-000000000001',
    auth: 'required',
    headers: { 'If-Match': '"saved-place.34.v3"' },
  });
});
