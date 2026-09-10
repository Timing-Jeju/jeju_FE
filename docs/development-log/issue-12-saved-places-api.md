# Issue #12 — 저장 장소 Spring API 동기화

## 기준

- 최초 FE base: `origin/main f55830212775bce1c6df88681fa2bd63aaee08e8`
- 고정 BE 계약: `Timing-Jeju/jeju_BE d1fa8184bb56b60febd483ad82d8ea16b5bb4774`
- 브랜치: `feat/12-saved-places-api`
- 최초 #12 commit: `c554bec`
- #11 통합 FE base: `origin/main f3af3d340ec216fcec02413abf80435857fa8951`
- 최종 #15 통합 FE base: `origin/main d5163ab265494da5478419bd014a3b11613f0590`
- 최종 #14 통합 FE base: `origin/main 052a3fd624f6116fce96e0d595b4070f21f0f91c`

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

## #14 main 통합

`origin/main 052a3fd624f6116fce96e0d595b4070f21f0f91c` 통합에서
`app/schedule-favorites.tsx` 한 파일이 충돌했다. typecheck의 conflict-marker 실패를
Red로 확인한 뒤 #12의 찜 hydration, 실제 PATCH 메모 수정, 미제공 체류시간 차단과
#14의 active schedule 확인, 서버 `createPlace` 순차 저장, submitting 중복 방지를 모두
보존했다.

- focused schedule + saved-place Jest: 34/34 Green
- 전체 Jest: 39 suites, 228/228 Green
- typecheck, lint, api:check, ui:check: Green
- Expo web static export: 23 routes Green

## #11 main 통합

#12 단독 Green commit 뒤 갱신된 `origin/main`을 merge했다. 충돌은 공용
`services/api/http.ts` 한 파일뿐이었다. #11의 `authGeneration`, 전송 직전
`authContextIsCurrent`, `getAccessToken(true)` 강제 갱신을 보존하고 #12의 인증 필수
GET 401 단일 재요청 제한을 결합했다. saved-place wrapper와 store도 같은 auth context를
모든 요청에 전달한다.

- #11 + #12 전체 Jest: 161/161 Green
- typecheck, lint, api:check, ui:check: Green
- merge 뒤 Expo web static export: 23 routes Green

## 계약 blocker

고정 BE OpenAPI와 실제 `SavedPlacesController`의 DELETE는 모두 request body와 `If-Match`가 없다. 따라서 FE는 재시작 목록에서 ETag가 있는 item에 대해서만 삭제를 시작하고 서버 204 뒤에만 반영할 수 있지만, 서버 원자적 delete CAS는 제공할 수 없다. BE가 DELETE `If-Match`와 409/412 계약을 추가하기 전까지 delete CAS acceptance는 차단된다.

실제 staging/DB/Android/iOS smoke는 요청 범위에 따라 수행하지 않았다.

## 독립 리뷰 동시성 보정

`6a4683b` 독립 리뷰에서 세 race를 동적으로 재현했고 운영 코드보다 먼저 회귀
테스트를 추가했다.

- mutation 중 시작되어 PATCH 성공 뒤 늦게 도착한 GET이 새 memo/ETag를 덮었다.
- A의 409 복구 GET을 기다리는 동안 B로 전환하면 A private draft가 B state에 기록됐다.
- 같은 owner/place의 동시 create가 서로 다른 durable key 두 개와 POST 두 건을 만들었다.

Green에서는 mutation start/success `dataEpoch`로 stale hydration commit을 폐기하고,
모든 충돌 복구 commit 직전에 owner/authGeneration을 다시 검증했다. create의 durable
read/write와 POST 전체는 owner+place single-flight로 묶어 같은 요청을 공유한다.

## #15 main 통합 뒤 최종 검증

동시성 보정 commit 뒤 `origin/main d5163ab265494da5478419bd014a3b11613f0590`을
충돌 없이 merge했다. 최종 `origin/main...HEAD` diff에는 #12 소유 파일만 남는다.

- 전체 Jest: 36 suites, 199/199 Green
- typecheck, lint, api:check, ui:check: Green
- Expo web static export: 23 routes Green
