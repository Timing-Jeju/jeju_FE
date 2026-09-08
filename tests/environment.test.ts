import { serverOrigin } from '@/services/environment';

test.each([
  ['설정 누락', undefined],
  ['경로 포함', 'https://backend.example.invalid/api/v1'],
  ['사용자정보 포함', 'https://user:password@backend.example.invalid'],
  ['외부 평문 연결', 'http://backend.example.invalid'],
  ['쿼리 포함', 'https://backend.example.invalid?key=synthetic'],
])('%s 주소는 요청 전에 거부한다', (_name, value) => {
  expect(() => serverOrigin(value)).toThrow('서버 연결 설정');
});

test('HTTPS origin만 정상화하여 사용한다', () => {
  expect(serverOrigin('https://backend.example.invalid/')).toBe(
    'https://backend.example.invalid',
  );
});
