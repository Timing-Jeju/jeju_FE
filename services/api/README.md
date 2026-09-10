# Spring API wrappers

이 디렉터리는 최신 `Timing-Jeju/jeju_BE` `develop`의 공개 Spring API를 도메인별로 감싼다. 고정한 backend SHA, OpenAPI checksum, runtime manifest, 37개 operation별 wrapper·화면 연결·선행 조건은 `contracts/backend.*`와 `docs/backend-api-coverage.md`에 있다.

## 공통 경계

- 서버 주소는 `EXPO_PUBLIC_API_BASE_URL`로 주입하며 HTTPS origin만 허용한다. 개발 중 loopback 주소만 HTTP를 허용한다.
- Supabase 세션은 최신 `services/auth.ts`가 소유한다. wrapper는 token을 저장하지 않고 요청 직전에 읽는다.
- 상대 `/api/v1/**` 경로만 호출한다. 외부 origin이나 요청별 base URL 재정의는 허용하지 않는다.
- 공개 endpoint의 인증 모드는 `none`, `optional`, `required`, Naver provider token으로 구분한다.
- cursor는 opaque 값으로 그대로 전달하며 필터가 바뀌면 처음부터 조회한다.
- 변경 요청은 자동 재시도하지 않는다. 재시도하는 호출자가 같은 `Idempotency-Key`와 서버에서 다시 얻은 최신 ETag를 관리한다.
- `Idempotency-Key`는 1~128자 printable ASCII다. 기본 생성값은 UUID지만 호출자 제공값을 UUID로 제한하지 않는다.
- `If-Match`에는 큰따옴표를 포함한 strong ETag를 그대로 전달한다. 성공 응답의 새 ETag로 다음 변경 전에 갱신한다.
- 오류 객체에는 검증된 stable code, HTTP status, 안전한 trace ID만 남긴다. access token, axios config/cause, 원문 Problem body·detail·field error는 보존하지 않는다.

## 범위

profile/legal/place/saved-place/trip/schedule/accommodation/transport/weather/push wrapper만 제공한다. 화면 연결이 후속인 operation은 coverage 문서에 `deferred`로 표시한다. 공개 Spring endpoint가 없는 AI 생성·조회·적용은 가짜 성공으로 연결하지 않으며 `PLANNER_AVAILABLE=false`를 유지한다.
