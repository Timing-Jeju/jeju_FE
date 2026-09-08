# 서버 장소 ID 연결 — 부분 구현

FE 기준 base는 `main`의 `2c38a89bbc810764b62e9ab6f2b9db311f73d9d5`다.
공개 장소 계약은 BE 검증 commit `c699bd121e1bcd7d78fb31c60caed002a0c60e74`
(PR #236, #221의 장소 API 포함)의 생성 OpenAPI에서 가져왔다.
이 변경은 MCP 계약을 변경하지 않으며 planner 기능 flag는 비활성 상태다.

## 연결 범위

| 사용자 동작 | 연결 및 상태 |
|---|---|
| 지도·Day 장소 검색·숙소 검색 | 인증 client로 `GET /api/v1/places`, canonical ID 유지 |
| 다음 검색 결과 | 서버 opaque cursor 사용, ID 중복 제거 |
| 장소 상세 | `GET /api/v1/places/{placeId}`, 잘못된 ID 및 다른 ID 응답 거부 |
| 찜·Day 장소 선택·체류 변경·순서 변경 | ID 기반 **메모리 초안**; 서버 저장은 후속 |
| 숙소 입력 완료 검사 | 이름만 있는 이전 항목은 재선택 필요 |
| 추천 정렬·주변 추천·빈시간 채우기 | 임시 결과 제거, 미지원 상태 유지 |
| 생성·평가·후보 적용·재시작 복원 | 이번 변경에 포함하지 않음, 기존 차단 유지 |

검색 요청은 query/category/cursor/size만 명시적으로 구성한다. 현재 위치나 파생 위치를
서버 검색 요청에 포함하지 않는다. 공개 장소 좌표가 없으면 지도 좌표를 만들지 않는다.
앱 지도에서의 현재 위치·직선거리 표시는 기존 로컬 표시 범위이며 경로 evidence가 아니다.
상세 화면은 운영·요금·추천 체류 정보가 없을 때 미제공으로 표시한다.
초안에 담을 때 체류 시간 미제공에 사용하는 60분은 화면에 안내하는 편집 가능한 기본값이다.
이미 사용자가 수정한 Day 체류 시간은 재선택으로 덮어쓰지 않는다.
동일 이름의 다른 ID는 별도 항목이며 옛 이름/좌표를 ID로 추정 매핑하지 않는다.

## 공개 타입 재생성

```sh
npm ci
npm ci --prefix tooling/openapi
node tooling/openapi/import.mjs /path/to/verified/openapi.json <verified-BE-40-character-SHA>
npm run api:generate
npm run api:check
```

`contracts/places.source.json`은 원본/추출 문서 checksum과 BE SHA를 기록한다.
CI는 checksum 및 생성 타입 일치를 검사한다. 이 검사는 실제 HTTP staging 응답 검증을
대체하지 않는다. 목록 DTO의 OpenAPI required/nullable 표시는 BE 후속 보완이 필요하므로
adapter는 실제 입력을 unknown으로 검증하고 미제공 nullable 값을 보존한다.
앱 TypeScript 6과 생성 도구의 TypeScript 5 peer 요구는 별도 lockfile의 도구 폴더로 분리했다.
앱 의존성을 강제 설치하거나 낮추지 않았다. 생성 타입은 수동 편집하지 않는다.

## 검증 및 남은 작업

- Jest: 55개 통과. 같은 이름/다른 ID, 체류 보존, invalid ID·좌표·페이지,
  현재 위치 필드 미전송, 검색 취소·응답 순서·추가 페이지·오류 구분,
  상세 미제공 표시 및 이전 링크 재선택 포함.
- 독립 리뷰에서 발견한 지도 하트 ID 상태 및 이전 위치 응답 경합을 수정하고 회귀 테스트를 추가했다.
- `npm run typecheck`, `npm run lint`, `npm run api:check`: PASS.
- `EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 npx --no-install expo export --platform ios --platform android`: PASS.
- 실제 인증+Spring HTTP, Android emulator, iOS Simulator, Maestro, 승인 provider staging: **SKIPPED**.
- 여행 서버 저장/aggregate ETag/입출도 anchor/찜 서버 저장/일정 복원은 후속이다.
  특히 Day 활동 시간의 공개 저장 계약 공백은 BE #89에 기록했다.
- TMAP #216의 저장 허용 근거가 미확정이므로 후보 저장·적용 출시는 차단한다.

이 변경을 전체 생성·평가·적용 통합 완료로 판정하지 않는다.
