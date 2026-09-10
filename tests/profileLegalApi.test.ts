import {
  fetchLegalDocuments,
  isSafeLegalContentUrl,
  updateLegalConsents,
} from '@/services/api/legal';
import { fetchProfile, updateProfile } from '@/services/api/profile';
import { requestData } from '@/services/api/http';

jest.mock('@/services/api/http', () => ({ requestData: jest.fn() }));

beforeEach(() => {
  jest.mocked(requestData).mockResolvedValue({});
});

test('프로필 GET/PATCH는 공개 계약 필드만 전송한다', async () => {
  await fetchProfile();
  await updateProfile({ nickname: ' 제주 여행자 ', locale: 'ko-KR' });

  expect(requestData).toHaveBeenNthCalledWith(1, {
    method: 'GET',
    path: '/me',
    auth: 'required',
  });
  expect(requestData).toHaveBeenNthCalledWith(2, {
    method: 'PATCH',
    path: '/me',
    auth: 'required',
    body: { nickname: '제주 여행자', locale: 'ko-KR' },
  });
  expect(JSON.stringify(jest.mocked(requestData).mock.calls)).not.toMatch(
    /latitude|longitude|\blat\b|\blng\b|location/i,
  );
});

test.each(['', ' ', '가'.repeat(51)])(
  '닉네임 validation 경계는 외부 요청 전에 거부한다: %s',
  async (nickname) => {
    await expect(updateProfile({ nickname })).rejects.toMatchObject({
      status: 400,
      code: 'INVALID_PROFILE_LEGAL_REQUEST',
    });
    expect(requestData).not.toHaveBeenCalled();
  },
);

test('약관 GET과 동의 PUT은 문서 식별자와 동의만 전송한다', async () => {
  const documentId = '10000000-0000-4000-8000-000000000001';
  await fetchLegalDocuments('ko-KR');
  await updateLegalConsents([{ documentId, agreed: true }]);

  expect(requestData).toHaveBeenNthCalledWith(1, {
    method: 'GET',
    path: '/legal-documents',
    auth: 'optional',
    params: { locale: 'ko-KR' },
  });
  expect(requestData).toHaveBeenNthCalledWith(2, {
    method: 'PUT',
    path: '/me/consents',
    auth: 'required',
    body: { consents: [{ documentId, agreed: true }] },
  });
});

test('중복·빈 동의는 필수 약관 누락으로 성공 처리하지 않는다', async () => {
  const duplicate = '10000000-0000-4000-8000-000000000001';
  await expect(updateLegalConsents([])).rejects.toMatchObject({ status: 422 });
  await expect(
    updateLegalConsents([
      { documentId: duplicate, agreed: true },
      { documentId: duplicate, agreed: false },
    ]),
  ).rejects.toMatchObject({ status: 400 });
  expect(requestData).not.toHaveBeenCalled();
});

test.each([
  ['https://legal.example.invalid/terms', true],
  ['http://legal.example.invalid/terms', false],
  ['https://user:secret@legal.example.invalid/terms', false],
  ['not-a-url', false],
])('법적 문서는 자격정보 없는 HTTPS만 연다: %s', (url, expected) => {
  expect(isSafeLegalContentUrl(url)).toBe(expected);
});
