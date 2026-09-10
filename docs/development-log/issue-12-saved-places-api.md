# Issue #12 — 저장 장소 Spring API 동기화

## 기준

- 최초 FE base: `origin/main f55830212775bce1c6df88681fa2bd63aaee08e8`
- 고정 BE 계약: `Timing-Jeju/jeju_BE d1fa8184bb56b60febd483ad82d8ea16b5bb4774`
- 브랜치: `feat/12-saved-places-api`

## Red

운영 코드 수정 전에 아래 focused test를 추가하고 실행했다.

```text
npm test -- --no-watchman --runTestsByPath \
  tests/savedPlacesSync.test.ts \
  tests/apiGetAuthRefresh.test.ts \
  tests/savedPlacesApi.test.ts
```

- `hydrate is not a function`: 실제 GET hydrate와 owner generation이 없었다.
- mutation action이 Promise/API 요청 없이 즉시 local state를 성공 처리했다.
- `createApiTransport`가 GET 401 단일 token refresh provider를 받지 않았다.
- 첫 실행은 sandbox의 Watchman state 권한 때문에 제품 실패를 관찰하지 못해 Red 근거에서 제외하고 `--no-watchman`으로 재실행했다.

## Green / Refactor

- 목록의 opaque cursor를 끝까지 전달하고 각 item의 body strong `etag`를 store에 보존한다.
- POST 성공 후에만 추가하며 요청 전에 owner/place/payload별 `Idempotency-Key`를 AsyncStorage에 기록한다. network/5xx처럼 결과가 불확실하면 key를 남기고 사용자가 다시 요청할 때 같은 key/body를 쓴다.
- PATCH는 목록/직전 응답 ETag를 `If-Match`로 보내고 409/412에서 mutation을 자동 재시도하지 않는다. 최신 목록을 다시 읽고 사용자 draft와 충돌 안내를 보존한다.
- DELETE는 서버 204 뒤에만 local item을 제거한다.
- 인증 owner generation이 바뀌면 이전 GET/mutation completion이 새 owner state를 덮지 않는다.
- 인증 필수 GET의 401만 token을 한 번 강제 갱신하고 한 번 재요청한다. mutation은 자동 재시도하지 않는다.
- Spring saved-place payload에는 canonical `placeId`, memo, priority만 보내며 GPS, 현재/간접 위치, 좌표를 보내지 않는다.
- 기존 StyleSheet와 화면 동선은 유지하고 async 실패/충돌은 기존 Alert/Modal 안에서 안내한다.

## 검증

- focused Jest: 49/49 Green
- 전체 Jest: 110/110 Green
- `npm run typecheck`: Green
- `npm run lint`: Green
- `npm run api:check`: Green
- `npm run ui:check`: 기존 58개 StyleSheet 일치
- Expo web static export: 23 routes Green

## 계약 blocker

고정 BE OpenAPI와 실제 `SavedPlacesController`의 DELETE는 모두 request body와 `If-Match`가 없다. 따라서 FE는 재시작 목록에서 ETag가 있는 item에 대해서만 삭제를 시작하고 서버 204 뒤에만 반영할 수 있지만, 서버 원자적 delete CAS는 제공할 수 없다. BE가 DELETE `If-Match`와 409/412 계약을 추가하기 전까지 delete CAS acceptance는 차단된다.

실제 staging/DB/Android/iOS smoke는 요청 범위에 따라 수행하지 않았다.
