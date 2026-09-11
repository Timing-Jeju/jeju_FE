# Issue #13 여행 조건 내부 저장·복원

## 확정 범위
사용자 요청에 따라 화면 배치·스타일·컴포넌트·입력란을 변경하지 않는다. 공항/항구 및 체크인·체크아웃 입력란 추가와 숙소·입출도 신규 저장 연결은 제외했다. 기존 날짜별 활동 시간 저장, 저장된 상세 복원, 여행 전환 및 실패·충돌·재시도 처리를 연결한다.

## 변경
- Spring 실제 로컬 커밋의 OpenAPI와 runtime manifest로 타입 및 38-operation coverage를 생성했다. 현재 원격 전체 게이트·병합 대기 상태이며 최종 source pin은 원격 검증 이후 갱신한다.
- Trip/TripDay/TripSummary를 생성 타입에서 가져와 nullable 시간·입출도 및 필수 숙소 필드를 반영한다. 과거 생성/시간 변경 receipt는 최신 GET 조회 후 현재 ETag로 후속 요청한다.
- root 생성/수정 다음 전체 Day 시간을 PUT한다. 서버 Day ID만 사용하고 HH:mm 입력을 검증한다. 임의 시간·좌표·장소 ID를 만들지 않는다.
- 네트워크 등 불확실한 응답은 원본 body/ETag/Idempotency-Key를 메모리에 보존한다. 다음 저장은 먼저 해당 요청을 확정한다. 입력이 바뀌었으면 그 뒤 새 root/시간 요청을 수행한다.
- root만 성공한 상태는 saved=true로 알리지 않는다. 충돌은 최신 ETag만 복구하고 입력을 보존한다. 동일 여행 중복 저장을 차단하고 사용자·여행 선택 세대가 달라진 지연 응답을 버린다.
- 상세 조회의 실제 활동 시간·숙소·입출도 값을 store로 복원한다. null/빈 배열과 빈 여행 목록은 이전 값을 제거한다. 숙소 주소·좌표는 서버 상세에 없으므로 비워 두며, 체크아웃 날짜에 숙박을 만들어 넣지 않는다.

## 검증 기록
- API PUT wrapper RED→GREEN: /tmp/jeju-fe13-day-api-red.log, /tmp/jeju-fe13-day-api-green.log.
- 상세 복원 RED 2→GREEN, 빈 목록 RED→GREEN: /tmp/jeju-fe13-hydrate-projection-red.log, /tmp/jeju-fe13-hydrate-tests-final.log.
- 시간 저장 RED 3→GREEN, 저장 완료/중복 요청 RED 2→GREEN, 입력 변경 RED 1→GREEN. 마지막 집중 테스트 29 PASS: /tmp/jeju-fe13-draft-race-green.log.
- 타입 검사 PASS: /tmp/jeju-fe13-draft-typecheck.log.
- 중간 전체 검사에서 기존 37-operation matrix/옛 source SHA/고정 sp-hash 문서 assertion이 실패했다. 새 38-operation과 실제 opaque strong ETag 계약에 맞춰 갱신 중이다. 이를 전체 테스트 통과로 보고하지 않는다.
- UI StyleSheet 58개 비교 PASS: /tmp/jeju-fe13-internal-ui-check.log. 실제 기기 화면 검증을 대체하지 않는다.

## 남은 검증
선행 BE 원격 순차 검증·리뷰·병합, 최종 source pin과 API 생성, FE 전체 Jest/타입/lint/API/UI 검사 및 iOS·Android bundle export. 실제 staging·기기 재시작 검증은 별도 환경이 필요한 항목으로 유지한다.


## 내부 연결 최종 로컬 검사
- Jest 42 suites / 291 tests 전부 PASS: /tmp/jeju-fe13-complete-tests.log. 이전 source/matrix assertion 실패를 모두 수정한 결과다.
- 전체 타입·lint PASS: /tmp/jeju-fe13-complete-typecheck.log, /tmp/jeju-fe13-complete-lint.log.
- api:check 및 기존 58개 StyleSheet 비교 PASS: /tmp/jeju-fe13-final-api-check.log, /tmp/jeju-fe13-final-ui-check.log.
- iOS/Android Hermes bundle export PASS: /tmp/jeju-fe13-internal-expo-export.log. 실제 기기 실행이나 staging API 성공을 의미하지 않는다.
- 복원 시 이전 pending create/day/accommodation 정보 제거도 RED 후 전체 검사에 포함해 PASS했다.
- 화면 파일을 변경하지 않았으므로 기존 화면의 기본정보 저장 안내 문구도 이 변경에는 포함하지 않는다. 원격 반영 전 BE source pin 및 검증 증거를 최종 갱신한다.


## 찜 opaque ETag 연동 보완
기존 store가 sp-hex 접두사만 허용하던 것을 canonical의 opaque strong 형식으로 검증한다. 서버 값을 해석·생성하지 않고 그대로 DELETE에 전달한다. weak/wildcard/다중/공백 포함 값은 계속 거부한다. 집중 RED1→GREEN26: /tmp/jeju-fe13-opaque-etag-red.log, /tmp/jeju-fe13-opaque-etag-green.log. 변경 후 Jest42 suites/296 tests 및 전체 lint·타입 PASS: /tmp/jeju-fe13-296-tests.log, /tmp/jeju-fe13-296-lint.log, /tmp/jeju-fe13-opaque-etag-typecheck.log.
