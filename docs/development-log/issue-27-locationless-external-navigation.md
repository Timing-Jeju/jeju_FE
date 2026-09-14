# Issue #27 사용자 위치 무전송 지도 길찾기

## 공식 계약 근거

- NAVER Cloud 공식 [Maps 앱 연동 URL Scheme](https://guide.ncloud-docs.com/docs/en/maps-url-scheme)은 `nmap://navigation`과 필수 `appname`을 정의한다.
- 같은 문서의 “Navigation from current location to destination” 예시는 `dlat`, `dlng`, `dname`, `appname`만 전달한다. 공통 파라미터 표에서 `slat`, `slng`, `sname`을 생략하면 현재 위치는 NAVER 지도 앱이 사용한다고 명시한다.
- Google 공식 [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)는 범용 HTTPS 길찾기 경로를 `https://www.google.com/maps/dir/?api=1`로 정의한다. `destination`은 좌표를 받을 수 있고 `origin`은 선택 사항이며, 생략하면 단말 위치 등 가장 적절한 출발지를 Google Maps가 자체 처리한다.
- 따라서 Timing Jeju는 출발 좌표·이름이나 현재 GPS를 만들거나 전달하지 않고, 서버 일정에 이미 있는 목적지 좌표와 표시명만 외부 앱에 넘긴다.

## TDD 기록

- Red: 목적지 URL 경계/인코딩, 딥링크 성공·HTTPS fallback·전체 실패, secret REST 제거, 일정 구간 화면 연결과 계약 matrix 테스트를 먼저 추가했다. 서비스와 matrix가 없어 2 suites가 로드 실패하고 matrix 신규 테스트 1개가 실패했다.
- Green: 목적지 좌표·이름만 받는 URL builder와 외부 열기 서비스를 구현했다. NAVER 앱 딥링크 실패 시 목적지 전용 HTTPS 링크로 한 번만 fallback하고, 둘 다 실패하면 URL·좌표를 포함하지 않은 재시도 오류를 반환한다.
- 일정 구간의 기존 도착 장소 행을 연결하되 StyleSheet와 화면 이동 구조는 유지했다. 클라이언트 Directions polyline 호출은 제거하고 기존 서버 일정의 출발·도착 marker 렌더링은 유지했다.
- 최초 관련 검사: external navigation, 일정 화면, API matrix, 서버 payload 보안 4 suites/59 tests PASS. typecheck, 대상 ESLint, api:check, ui:check, diff-check PASS.
- 실제 iOS/Android 개발 빌드 딥링크·fallback QA와 인증된 staging Spring/FastAPI 요청 검사는 실행 환경이 없어 미수행이다. 코드 계약은 서버 operation 0건과 위치 field 차단을 검증하지만 이 두 수동 검증을 대체하지 않는다.
- Reviewer P1/P2 Red: 비공식 NAVER HTTPS host, platform 식별자 분기 부재, matrix 공식 계약 불일치로 관련 2 suites의 24개 중 6개가 실패했다. Green에서는 HTTPS fallback을 Google 공식 destination-only URL로 교체하고 `origin`을 금지했다. NAVER `appname`은 iOS bundle ID와 Android package만 사용하며 web에서는 NAVER scheme을 비활성화하고 Google HTTPS 기능을 유지한다. 최종 4 suites/61 tests, typecheck, 대상 ESLint, api:check, ui:check, diff-check가 모두 PASS했다.

## 보안 경계

- 클라이언트 Directions, Geocoding, Naver Local Search REST 호출과 공개 번들 client secret 설정 코드를 제거한다.
- Mobile Dynamic Map 렌더링에 필요한 공개 `EXPO_PUBLIC_NCP_MAPS_CLIENT_ID` 주입은 유지한다.
- URL이나 좌표를 로깅하지 않으며 Spring/FastAPI operation을 추가하지 않는다.
- `PLANNER_AVAILABLE=false`와 기존 StyleSheet를 유지한다.
