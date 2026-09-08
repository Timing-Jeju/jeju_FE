# Planner 인증 기반 및 통합 차단 상태

상태: **Partial**. 전체 생성·평가·적용 통합 완료 PR이 아니다.

## 기준과 변경

FE base `main`: `3c280a1cc05c73150e6f0bb1174443906de04f91`.
BE 검토 base `develop`: `e677725`.
AI 검토 base `develop`: `2d9a6fbedb97515d6284b96757091f5cc428cfb0`, MCP `0.7.0`.
전체 화면→REST→MCP→저장 매핑은 jeju_AI의
`docs/reports/2026-09-08-fe-integration-readiness.md`를 참조한다.

- Supabase 이메일·비밀번호 인증, 초기 세션의 인증 서버 확인, 갱신 이벤트,
  백그라운드 갱신 중지/복귀 재개, local scope 로그아웃을 연결했다.
- Root의 인증 준비가 끝난 뒤 보호 화면을 선택한다. 늦은 복원 응답은 로그아웃을 덮지 않는다.
- 사용자 token/비밀번호는 Zustand에 보관하지 않는다. 사용자 변경·로그아웃 시
  여행/검토/찜 메모리를 초기화한다. SDK는 네이티브 AsyncStorage에 인증 세션을 보관한다.
- API client는 지정 origin의 `/api/v1/` 상대 경로만 허용하며 사용자 access token을 첨부한다.
  이 클라이언트의 실제 여행 endpoint 연결은 후속이다. 자동 mutation retry는 없다.
- 이름 해시로 생성하던 버스·시간·거리·요금, 자동 체류시간 덮어쓰기와
  2초 후 성공 화면 이동, 로컬 확정을 제거했다.
- 검토·구간 상세·live 기존 화면 내용은 유지하되 실제로 mount되지 않도록 차단했다.
- 여행 조건은 서버 저장으로 표시하지 않고 메모리 임시 보관으로 표시한다.
- 초기 mock 찜 목록과 로그아웃을 회원 탈퇴로 처리하던 동작을 제거했다.

## 실행 설정

`.env.example`을 참고해 로컬 또는 격리 staging 값을 `.env`에 설정한다.

- `EXPO_PUBLIC_API_BASE_URL`: Spring origin, `/api/v1`을 붙이지 않는다.
- `EXPO_PUBLIC_SUPABASE_URL`: 해당 Spring이 검증하는 Auth project origin.
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_` 공개 키만 허용.

서버용 service role, JWT secret, provider key를 앱에 넣지 않는다.
HTTPS를 사용하며 개발 모드에서만 localhost/127.0.0.1/::1/Android emulator
10.0.2.2의 HTTP를 허용한다. 실제 환경 값이나 테스트 계정은 이 PR에 포함하지 않는다.
세션 구현 근거는 [Supabase React Native 공식 가이드](https://supabase.com/docs/guides/auth/quickstarts/react-native)다.

## 검증 근거

Jest는 Expo 56 호환 `jest-expo`를 사용한다. 이미지 resolver는 Metro처럼 실제 `@3x`/`@2x`
파일을 찾으며 존재하지 않는 이미지를 가짜 파일로 숨기지 않는다.
기존 lockfile에서 `npm ci`의 peer dependency 누락을 발견해 npm install 후 lockfile을 동기화했다.
Expo/React Native 직접 의존 버전은 유지했다.

- 최초 RED: API client factory 부재 및 기존 모의 생성·재평가·확정의 성공 동작을 검출.
- GREEN: `npm test` — 26 tests passed, 6 suites.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm ci --dry-run --ignore-scripts` — PASS.
- `EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 npx --no-install expo export --platform ios --platform android` — PASS.
- native Maestro — **SKIPPED**, 현재 환경에 maestro/adb/iOS Simulator 없음.
  `.maestro/auth-input-validation.yaml`은 실제 인증 전에 입력 검증만 확인하는 첫 흐름이다.
  `APP_ID=com.jeju.tourist maestro test .maestro/auth-input-validation.yaml`처럼 실행한다.
  전체 로그인→생성→적용 E2E가 아니며 이 흐름도 실제 기기에서 아직 실행하지 않았다.
- Supabase/BE 실제 HTTP 및 provider E2E — **SKIPPED**, staging 연결값·계정·승인 계약 미준비.
- CI workflow는 추가했으나 원격 CI 통과 여부는 별도 확인해야 한다.

## 검증 공백과 잔여 위험

BE #220(위치 무수집), #216(TMAP 영속 projection), #89(생성 계약)가 OPEN이다.
AI source catalog는 TMAP 파생 수치 영속 저장을 금지한다. BE ADR-0052의 AI 수집 소유권,
FE integration 계약의 단일 balanced 후보와 non-null 비용도 이번 계획과 충돌한다.
해당 충돌과 저장 허용 근거가 해소되기 전에는 `PLANNER_AVAILABLE`을 활성화하지 않는다.

후속 미구현: canonical ID 장소·숙소·터미널, 여행 서버 저장/ETag/부분 실패 재시도,
Spring facts, MCP 0.8, generation/feasibility worker와 원자 저장, 3개 후보 비교/선택 적용,
실제 polling, 서버 일정 복원, nullable 비용·검증 불가 adapter, 구간 lineage 상세.
기존 signup/find-account·장소 검색/로컬 찜 화면도 실제 서버 완료 흐름으로 간주하지 않는다.
따라서 이번 PR을 FE 전체 서비스 또는 1차 통합 완료로 표시하면 안 된다.

DB 변경·운영 배포·Notion/Figma readback·독립 승인 리뷰는 수행하지 않았다.

## 독립 리뷰 보완: 오프라인 복귀

앱 복귀 시 인증 서버의 일시적 통신 오류를 로그아웃으로 처리해 임시 여행을 지우던
문제를 수정했다. 명시적인 세션 거부/만료/로그아웃과 통신 장애를 분리한다. 장애 시
기존 사용자 입력을 보존하며 최초 복원에서 검증되지 않은 로그인 상태를 만들지 않는다.
실제 BE 접근은 access token 검증을 계속 요구한다.

[Supabase 오류 분류](https://supabase.com/docs/guides/auth/debugging/error-codes)와
설치된 SDK 2.116.0의 오류 타입을 확인했다. foreground 장애→연결 회복, SDK refresh
통신 오류, 최초 오프라인, 명시적 세션 거부 및 기존 auth event 경합 테스트를 포함한다.
현재 Jest 31개, typecheck/lint 통과. 실제 인증 서버·native E2E의 SKIPPED 상태는 유지한다.
