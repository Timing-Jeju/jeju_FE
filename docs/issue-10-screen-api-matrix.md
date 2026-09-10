# Issue #10 화면 → Spring API 감사

기준 FE commit은 `26f207e170fb077e9b6dc7716c6f165d9e2a1367`, 고정 Spring contract는 `d1fa8184bb56b60febd483ad82d8ea16b5bb4774`다. 기계 판독 원본과 증거 경로는 `contracts/screen-api.matrix.json`에 있고, 테스트가 runtime 37개 operation의 누락·중복과 호출/응답/error/restart-hydration 증거를 검사한다.

| 화면/도메인             | endpoint 범위                 | 응답·오류·재시작 결과                                       | staging 상태                       |
| ----------------------- | ----------------------------- | ----------------------------------------------------------- | ---------------------------------- |
| 회원가입·마이페이지     | profile, legal 4개            | 프로필 재조회, 저장 오류·재시도, pending consent 복구 연결  | host/token 필요                    |
| 홈 검색·상세            | places 2개                    | canonical 응답과 미제공 오류 연결; 화면 진입마다 재조회     | host 필요                          |
| 홈·상세·찜·일정 찜      | saved places 4개              | owner별 hydration, rollback, 409/412 재조회 연결            | host/token 및 seeded place 필요    |
| 여행 조건·캘린더 root   | trips/preferences 7개         | create/update와 최신 trip 재조회 연결                       | host/token 및 disposable trip 필요 |
| 캘린더 수동 일정        | schedule/items/order/move 6개 | mutation journal, conflict 재조회, 명시 재시도 연결         | host/token 및 seeded schedule 필요 |
| 홈 날씨                 | weather 1개                   | 명시 region/place/trip-item selector만 허용, 오류 안내 연결 | host와 예보 가능 selector 필요     |
| push·알림 설정          | push device/preferences 4개   | 로그인 수명주기·설정 hydration 연결                         | host/token 및 native device 필요   |
| 소셜 인증·프로필 이미지 | 4개                           | wrapper만 있으며 대응 화면 연결은 deferred                  | provider/storage 입력 필요         |
| 숙소·입출도 교통        | 5개                           | aggregate adapter 테스트는 있으나 projection은 #13 대기     | 이번 작업에서 파일 미수정          |

## staging harness

`npm run staging:e2e`는 mock 없이 HTTPS Spring에 직접 요청한다. `STAGING_API_BASE_URL`과 격리 계정의 짧은 수명 `STAGING_ACCESS_TOKEN`이 반드시 필요하며, 누락 시 exit code 2와 `blocked` JSON을 반환한다. 토큰과 Problem 원문은 출력하지 않는다.

현재 harness는 legal/place 공개 응답, profile/saved-place/trip/notification-preference 인증 응답, saved-place/trip 재조회 동등성, 그리고 seeded trip이 있을 때 trip detail/schedule hydration을 검증한다. 쓰기 workflow는 disposable 계정·canonical place·seeded schedule과 확정된 DELETE concurrency 계약 없이는 실행하지 않는다.

AI/FastAPI/Spring 생성·평가·적용 endpoint는 공개 Spring contract에 없으므로 성공으로 대체하지 않으며 `PLANNER_AVAILABLE=false`를 유지한다. 현재 또는 간접 GPS field는 공통 HTTP transport에서 전송 전에 차단한다.
