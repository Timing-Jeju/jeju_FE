/**
 * 도메인 모듈이 공통 호출부에 경로 · 헤더 · body 를 명세대로 넘기는지 본다.
 * (네트워크는 http.test.ts 에서 따로 검증한다)
 */
import { request, requestData, type ApiResponse } from '@/services/api/http';
import { isCanonicalUuid } from '@/services/api/idempotency';
import { fetchNaverUserInfo } from '@/services/api/authSocial';
import { fetchLegalDocuments } from '@/services/api/legal';
import { deleteProfileImage } from '@/services/api/profileImage';
import {
  createSavedPlace,
  deleteSavedPlace,
  fetchAllSavedPlaces,
  readSavedPlaceEtag,
  updateSavedPlace,
  type SavedPlace,
} from '@/services/api/savedPlaces';
import {
  createScheduleItem,
  deleteScheduleItem,
} from '@/services/api/scheduleItems';
import { deleteTransportEvent } from '@/services/api/transportEvents';
import { replaceTripPlacePreferences } from '@/services/api/trips';

jest.mock('@/services/api/http', () => ({
  request: jest.fn(),
  requestData: jest.fn(),
}));

const mockedRequest = jest.mocked(request);
const mockedRequestData = jest.mocked(requestData);

const response = <T>(data: T, etag: string | null = null): ApiResponse<T> => ({
  data,
  status: 200,
  etag,
  location: null,
  idempotencyReplayed: null,
  traceId: null,
});

const savedPlace: SavedPlace = {
  placeId: 'p1',
  name: '함덕해수욕장',
  category: 'content-type:12',
  regionLabel: '조천',
  thumbnailUrl: null,
  recommendedStayMinutes: 90,
  memo: '노을',
  tags: ['바다'],
  priority: 5,
  targetDay: 2,
  savedAt: '',
  updatedAt: '',
};

beforeEach(() => {
  mockedRequest.mockReset();
  mockedRequestData.mockReset();
  mockedRequest.mockResolvedValue(response({}));
});

describe('찜 (saved places)', () => {
  it('등록은 Idempotency-Key 를 만들어 보내고, 넘기면 그대로 쓴다', async () => {
    await createSavedPlace({ placeId: 'p1' });
    const generated = mockedRequest.mock.calls[0][0];
    expect(generated).toMatchObject({
      method: 'POST',
      path: '/me/saved-places',
      auth: 'required',
      body: { placeId: 'p1' },
    });
    expect(isCanonicalUuid(generated.headers!['Idempotency-Key'])).toBe(true);

    await createSavedPlace({ placeId: 'p1' }, 'my-key');
    expect(mockedRequest.mock.calls[1][0].headers).toEqual({
      'Idempotency-Key': 'my-key',
    });
  });

  it('수정은 If-Match 에 ETag 를 큰따옴표째 넘긴다', async () => {
    await updateSavedPlace('p1', { memo: null }, '"etag-1"');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'PATCH',
      path: '/me/saved-places/p1',
      auth: 'required',
      body: { memo: null },
      headers: { 'If-Match': '"etag-1"' },
    });
  });

  it('삭제는 body 없이 보내고 아무것도 돌려주지 않는다', async () => {
    await expect(deleteSavedPlace('p1')).resolves.toBeUndefined();
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'DELETE',
      path: '/me/saved-places/p1',
      auth: 'required',
    });
  });

  it('readSavedPlaceEtag 는 현재 값 그대로 다시 POST 해 ETag 만 읽는다', async () => {
    mockedRequest.mockResolvedValue(response(savedPlace, '"etag-9"'));

    await expect(readSavedPlaceEtag(savedPlace)).resolves.toBe('"etag-9"');
    expect(mockedRequest.mock.calls[0][0].body).toEqual({
      placeId: 'p1',
      memo: '노을',
      tags: ['바다'],
      priority: 5,
      targetDay: 2,
    });
  });

  it('fetchAllSavedPlaces 는 size 100 으로 cursor 를 따라간다', async () => {
    mockedRequestData
      .mockResolvedValueOnce({
        items: [savedPlace],
        page: { size: 100, hasNext: true, nextCursor: 'c1' },
      })
      .mockResolvedValueOnce({
        items: [{ ...savedPlace, placeId: 'p2' }],
        page: { size: 100, hasNext: false, nextCursor: null },
      });

    const all = await fetchAllSavedPlaces({ sort: 'priority_desc' });

    expect(all.map((item) => item.placeId)).toEqual(['p1', 'p2']);
    expect(
      mockedRequestData.mock.calls.map(([options]) => options.params),
    ).toEqual([
      { sort: 'priority_desc', size: 100, cursor: undefined },
      { sort: 'priority_desc', size: 100, cursor: 'c1' },
    ]);
  });
});

describe('여행 · 일정 편집', () => {
  it('장소 선호 교체는 items 로 감싸 보낸다', async () => {
    const items = [
      {
        placeId: 'p1',
        type: 'must_visit' as const,
        targetDayNo: 1,
        priority: 50,
      },
    ];
    await replaceTripPlacePreferences('t1', items, '"trip-t1-r3"');
    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/trips/t1/place-preferences',
      auth: 'required',
      body: { items },
      headers: { 'If-Match': '"trip-t1-r3"' },
    });
  });

  it('일정 항목 추가는 두 잠금 값을 헤더와 body 로 나눠 보낸다', async () => {
    await createScheduleItem(
      't1',
      {
        dayNo: 1,
        sequenceNo: 2,
        itemType: 'place_visit',
        placeId: 'p1',
        plannedStartAt: '2026-09-01T10:00:00+09:00',
        stayMinutes: 60,
      },
      { etag: '"trip-t1-r3"', expectedActiveScheduleVersionId: 'v7' },
      'idem-1',
    );

    expect(mockedRequest).toHaveBeenCalledWith({
      method: 'POST',
      path: '/trips/t1/schedule-items',
      auth: 'required',
      body: expect.objectContaining({
        expectedActiveScheduleVersionId: 'v7',
        placeId: 'p1',
      }),
      headers: { 'If-Match': '"trip-t1-r3"', 'Idempotency-Key': 'idem-1' },
    });
  });

  it('일정 항목 삭제는 버전 잠금을 query 로 보낸다', async () => {
    await deleteScheduleItem(
      't1',
      'i1',
      { etag: '"e"', expectedActiveScheduleVersionId: 'v7' },
      'idem-2',
    );
    expect(mockedRequest.mock.calls[0][0]).toMatchObject({
      method: 'DELETE',
      path: '/trips/t1/schedule-items/i1',
      params: { expectedActiveScheduleVersionId: 'v7' },
      headers: { 'If-Match': '"e"', 'Idempotency-Key': 'idem-2' },
    });
  });

  it('교통편 삭제는 eventType 을 query 로 보낸다', async () => {
    await deleteTransportEvent('t1', 'arrival', '"e"');
    expect(mockedRequest.mock.calls[0][0]).toMatchObject({
      method: 'DELETE',
      path: '/trips/t1/transport-event',
      params: { eventType: 'arrival' },
      headers: { 'If-Match': '"e"' },
    });
  });
});

describe('프로필 이미지 · 법정 문서 · 소셜', () => {
  it('프로필 이미지 삭제는 object key 를 null 로 PUT 한다', async () => {
    await deleteProfileImage('"profile-image-3"');
    expect(mockedRequest.mock.calls[0][0]).toMatchObject({
      method: 'PUT',
      path: '/me/profile-image',
      body: { profileImageObjectKey: null },
      headers: expect.objectContaining({ 'If-Match': '"profile-image-3"' }),
    });
  });

  it('법정 문서 목록은 인증 선택으로 locale 만 넘긴다', async () => {
    mockedRequestData.mockResolvedValue({});
    await fetchLegalDocuments('ko-KR');
    expect(mockedRequestData).toHaveBeenCalledWith({
      method: 'GET',
      path: '/legal-documents',
      auth: 'optional',
      params: { locale: 'ko-KR' },
    });
  });

  it('네이버 프로필 조회는 naver 인증 모드로 provider 토큰을 넘긴다', async () => {
    mockedRequestData.mockResolvedValue({});
    await fetchNaverUserInfo('naver-token');
    expect(mockedRequestData).toHaveBeenCalledWith({
      method: 'GET',
      path: '/auth/social/naver/userinfo',
      auth: 'naver',
      naverAccessToken: 'naver-token',
    });
  });
});
