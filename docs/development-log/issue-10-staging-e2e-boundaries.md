# Issue #10 staging E2E/API boundary 개발 일지

## 기준과 보호 범위

- 시작 및 최종 확인 `origin/main`: `26f207e170fb077e9b6dc7716c6f165d9e2a1367`
- 고정 Spring contract: `Timing-Jeju/jeju_BE@d1fa8184bb56b60febd483ad82d8ea16b5bb4774`
- #11/#12/#14/#15 병합 코드를 유지했다.
- 진행 중인 saved-place DELETE strong CAS와 #13 숙소·교통 projection 파일은 수정하지 않았다.
- AI/FastAPI/Spring 연결을 추가하지 않았고 `PLANNER_AVAILABLE=false`를 유지했다.
- 화면 StyleSheet, 레이아웃, 컴포넌트는 수정하지 않았다.

## Red → Green → Refactor

1. Red: 공통 transport에 `latitude`, `longitude`, `currentLocation`, 중첩 `lat/lng`, `gps`가 들어가도 adapter까지 전달되는 실패를 재현했다.
2. Red: staging runner가 없어 host/account 입력 누락을 구조적인 blocker로 증명할 수 없는 실패를 재현했다.
3. Green: Spring 공통 transport가 현재·간접 위치 key를 중첩 깊이와 무관하게 전송 전에 `CLIENT_LOCATION_DATA_FORBIDDEN`으로 거부하도록 했다. `regionCode`, `placeId`, `tripItemId` 같은 공개 selector는 허용한다.
4. Green: HTTPS origin과 짧은 수명 access token을 요구하는 read-only staging harness를 추가했다. legal/place/profile/saved-place/trip/notification-preference와 전체 item 반복 조회, seeded trip의 detail/schedule을 mock 없이 실제 HTTP로 검사한다. 2xx Problem, 비 JSON, 최소 response shape 불일치는 fail-closed한다.
5. Refactor: runtime 37개 operation을 화면 domain에 한 번씩 매핑하고 connected operation마다 wrapper 밖의 실제 호출 증거가 존재하는지 테스트로 고정했다. 선언만 있는 trip/place preference wrapper는 adapter-only/deferred로 분리했다.
6. 리뷰 보정: 문자열 JSON도 parse 후 위치 key를 검사하고 malformed JSON, primitive, FormData, URLSearchParams를 비계약 payload로 거부했다. 반복 GET은 서버 read consistency로만 명명하고 앱 재시작 hydration은 staging blocked로 유지했다.

## 검증

| 명령                                               | 결과                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------- |
| `CI=1 npm test -- --no-watchman`                   | 41 suites, 248 tests 통과                                              |
| `npm run typecheck`                                | 통과                                                                   |
| `npm run lint`                                     | 통과                                                                   |
| `npm run api:check`                                | 통과                                                                   |
| `npm run ui:check`                                 | 기존 58개 StyleSheet 일치                                              |
| `npx expo export --platform web --output-dir dist` | 23개 static route export 통과                                          |
| `npm run staging:e2e`                              | exit 2, `STAGING_API_BASE_URL`/`STAGING_ACCESS_TOKEN` 누락으로 blocked |
| `git diff --check`                                 | 통과                                                                   |

첫 baseline 전체 Jest 실행에서 `tests/signupLegal.test.tsx` 2개가 timeout/후속 assertion으로 실패했지만, 변경 없이 최종 CI 실행에서 포함한 248개 전체 테스트가 통과했다. sandbox의 Watchman state 권한 때문에 Jest는 `--no-watchman`으로 실행했다. Expo export는 성공했으나 Node 20 지원 중단 예정 경고가 있어 이후 Node 22+ 환경 검증이 필요하다.

## 남은 staging 입력과 차단 사유

- HTTPS `STAGING_API_BASE_URL`
- 격리 Supabase staging 계정에서 발급한 짧은 수명 `STAGING_ACCESS_TOKEN`
- trip detail/schedule hydration용 seeded trip
- mutation smoke용 disposable account, canonical place, seeded schedule
- push smoke용 Android/iOS 기기와 유효한 push registration token
- profile image smoke용 격리 storage object
- 소셜 인증 smoke용 provider configuration/token
- 확정된 saved-place DELETE strong CAS 계약
- #13 숙소·교통 projection 병합
- AI 생성·평가·적용용 공개 Spring endpoint와 Spring runtime SHA

위 입력이 없으므로 실제 staging HTTP 및 native smoke를 PASS로 대체하지 않았다. Browser plugin도 현재 세션에 없어 화면 runtime 검증을 수행하지 않았으며, UI 변경은 없고 Expo export와 StyleSheet 정합성만 확인했다.
