# #10 기존 화면의 AI 생성·검토·적용 연결

기준: FE main `0f69b73`. 공개 여행/일정 조회 모델은 기존 generated/backend.d.ts를 유지한다.
생성 adapter는 BE #89 로컬 계약 수정본 `9c8a730`의 schedule-generations 요청, nullable 기준 버전,
Trip If-Match, 정확히 세 전략, 후보 URL을 따른다. 이 BE 계약과 런타임은 아직 배포 완료 상태가 아니다.

## 구현

- 캘린더의 기존 생성 버튼에서 저장 여부, 항공, 5일, 활동 시간, canonical 숙소와 체류 입력을 확인한다.
- 접수 전 사용자·여행·Day별 command/ETag/멱등 키를 기록한다. 네트워크 유실과 재접속 후 같은 Day 요청은 기존 키/작업을 재사용한다.
- 로딩 화면에서 Retry-After에 따라 조회하며 백그라운드에서는 중지하고 복귀 시 같은 작업을 재개한다. 임의 진행률은 추가하지 않는다.
- 검토 화면의 기존 더보기 메뉴 세 항목으로 균형형·여유형·경험 최대형을 선택한다. 기존 카드·버튼·스타일은 유지한다. 후보 편집은 적용 전 차단한다.
- 균형형은 미리보기만 기본 선택한다. 적용 버튼을 눌러야 서버 적용 요청을 보내며 새 ETag와 기존 기준 버전을 각각 전달한다.
- 적용 응답 유실 후에는 후보 본문 없이 저장된 적용 식별자와 같은 키로 receipt를 재확인한다. 성공 후 Trip/활성 일정을 새로 조회하고 다음 미완료 Day를 선택한다.
- 만료/명확한 충돌은 후보를 폐기한다. 통신 오류에는 원래 키를 유지한다. 여행/인증 주체 변경의 늦은 응답은 반영하지 않는다.
- 후보 본문·경로·설명은 AsyncStorage에 저장하지 않는다. 메모리 결과는 서버 expiresAt에 폐기한다. 승인된 정규화 파생값의 BE 24시간 후보 계약을 지원하며 단말 시계 기준 23시간 50분 상한으로 정상 응답을 거부하지 않는다.

## 2026-09-14 후보 보존 계약 정합화

- `fix/10-generation-contract-alignment`는 최신 `origin/main`에서 분기했다. UI 화면·동선·컴포넌트는 수정하지 않고 generation API 검증만 변경했다.
- 실제 BE는 24시간 후보를 반환하지만 FE의 85,800,000ms 상한이 이를 거부했다. 24시간과 단말 시계 지연 회귀 테스트로 RED를 확인하고 해당 client-relative 상한을 제거했다. 최종 만료·적용 여부는 서버가 검증한다.
- `npm test`: 44 suites, 313 tests PASS (4.39초). `npm run typecheck`, `npm run lint` PASS. 초기 lint 포맷 오류는 Prettier로 수정 후 재검증했다.
- `npm run ui:check`: 기존 58개 파일 StyleSheet 일치. 실제 기기 화면 비교를 대신하지 않는다. 기능 플래그는 OFF이며 staging·원격 CI·최종 PR 검증을 완료했다고 주장하지 않는다.

## 2026-09-14 실제 생성 API 인계와 도보 저장

- BE `feat/53-generation-run-intake@a017d86c769511ed398a1475af6865c90dedd3ff`의 clean 소스에서 재생성한 OpenAPI와 runtime manifest를 공식 import/generate 스크립트로 인계했다. 개발 브랜치이며 develop 병합/전체 품질 게이트 완료를 뜻하지 않는다. source checksum과 43개 operation을 고정하고 wrapper/화면 감사 목록을 일치시켰다.
- 도보 저장과 재접속 복원 테스트 2개 RED(0.658초)를 확인한 뒤 bus→public_transit, taxi→taxi, walk→walk를 손실 없이 변환한다. generated Trip enum을 새 계약으로 재생성해 별도 타입 우회 없이 typecheck 오류를 해결했다. 기존 UI 파일은 변경하지 않았다.
- planner-conditions wrapper 부재와 인계 목록 5개 누락 RED(0.613초)를 확인했다. canonical Day/숙소 ID와 스타일만 받는 wrapper 및 필수 ETag/멱등 헤더를 추가했다. 화면 저장 orchestration은 아직 후속이므로 coverage를 deferred로 유지한다.
- GREEN: 전체 44 suites/315 tests(3.474초), typecheck, lint, api:check, ui:check. UI 검사 결과는 기존 58개 StyleSheet 일치이며 실제 기기 비교가 아니다. 24시간 후보 수신·도보 저장·복원 및 planner wrapper 회귀를 포함한다.

## 남은 배포 전 검증

### 숙소·스타일 저장 순서 후속

- 기본정보와 활동 시간 저장 다음 planner-conditions PUT과 최종 Trip GET을 연결했다. Day 입력 journal에 해당 시도의 planner snapshot을 함께 보존하고, planner PUT/마지막 GET의 네트워크 유실에는 원래 body·ETag·멱등 키를 재사용한다. 다른 입력으로 재시도하면 이전 시도를 먼저 확정한다.
- 서버 Day ID에 canonical 숙소 ID만 매핑하며 이름·주소·좌표는 제외한다. 저장된 planner anchor/style을 복원하고 서버에 없는 숙소 이름이나 좌표는 만들지 않는다. 저장 중 숙소·스타일·항공 입력 변경은 이전 응답으로 완료 처리하지 않는다.
- RED: 변환 모듈 부재, planner 요청 미호출과 네트워크 실패 미전파. GREEN: 관련 41개 및 전체 45 suites/324 tests(3.163초), typecheck/lint/api:check/ui:check 통과. 기존 58개 StyleSheet 일치이며 기기 시각 검증은 아니다.
- 제한적 독립 리뷰에서 신규 차단 사항은 없었다. 공식 최종 승인/recorder는 아직 없다. 항공 이벤트·장소 선호 저장과 앱 재시작 후 입력 journal 복원은 계속 구현해야 하며 전체 연결 완료가 아니다.

### 교통 저장 재시도와 빈 숙소 기준점 복원 후속

- 사용자 범위 조정: 1차 PR에서는 앱 재시작 후 입력·작업 journal 복원 보강을 후속으로 분리한다. 앱 실행 중 실제 저장→하루 생성→정확히 세 후보 검토→선택 적용의 기능적 완성은 유지한다. 기존 복구 기능은 제거하지 않으며 서버 worker 복구·멱등 재시도·원자적 적용은 이 유예에 포함하지 않는다.

- transport-event PUT wrapper에 선택적 Idempotency-Key를 연결했다. 항공 terminal 두 필드는 null로 보내 서버의 승인 공항 확인을 사용한다. wrapper 테스트 7개와 typecheck PASS. 이 사실만으로 saveTrip 항공 단계가 연결됐다고 보지 않는다.
- 명시적 빈 planner dayAnchors가 과거 accommodations를 재선택하는 RED를 확인했다(5개 중 1개 실패, 0.593초). plannerConditions가 존재하면 빈 배열도 권위 있는 선택 해제로 복원하고 일반 숙소 기록은 별도로 유지한다. plannerConditions 자체가 없는 구버전 응답에만 기존 복원 경로를 유지한다.
- 관련 42개 테스트 PASS(0.657초), typecheck PASS. 숙소 정보 복원 테스트는 실제 planner anchor를 함께 제공하여 저장된 canonical ID와 이름 연결을 검증한다. UI 파일은 변경하지 않았다.
- 입출도·장소 선호 저장 orchestration, 앱 재시작 입력 journal, 최신 BE 계약 재생성과 최종 통합 검증은 남아 있다.
- 후속 BE `67a60f77682680afd5c093cbde276bc817a81aec`에서 transport PUT receipt와 선박 미확정 항구 null 저장을 구현했다. FE 기존 개별 PUT action의 XOR가 항공/선박 null을 모두 거부하는 RED(39개 중2개,0.645초)를 확인하고 명시적 두 null을 서버로 전달하도록 맞췄다. 전체45 suites/328 tests PASS(3.635초), typecheck/lint/api:check/ui:check PASS. 마지막 api:check는 현재 핀 산출물의 자체 일치 검사이며 새 BE SHA 재인계 완료를 의미하지 않는다. saveTrip의 전체 입출도 orchestration은 아직 다음 작업이다.

### 입출도 실제 저장·삭제 연결

- saveTrip을 root→활동 시간→planner→현재 Trip 확인→입도·출도 PUT 또는 삭제→최종 Trip GET 순서로 연결했다. 최초 시도의 구조화 교통 입력을 day/planner 단계에서 보존하고 전송할 각 단계의 body/selector·ETag·키를 고정한다. 날짜는 여행 시작/종료일, 시간은 입력값만 +09:00으로 정규화한다.
- 비운 교통편은 현재 서버에 있으면 DELETE하고 없으면 요청하지 않는다. 단계 응답 유실은 같은 요청만 재시도하며, 모두 응답을 받은 뒤 최종 GET만 실패하면 PUT을 반복하지 않는다. 여행·사용자 전환, 저장 중 입력 변경, 최종 ETag 불일치를 저장 완료로 표시하지 않는다. 앱 재시작 journal 보강은 사용자 요청대로 후속이다.
- orchestration 미연결 3개 RED→GREEN, 최종 ETag 불일치 RED→GREEN. 독립 부분 리뷰에서 기존 터미널·편명·메모를 지우는 finding을 받아 2개 RED로 재현했다. 동일 수단은 기존 상세를 보존하고 수단 변경 때 터미널·편명만 초기화하며 메모를 유지한다. 새로운 사용자 원문·좌표는 받거나 만들지 않으며 기존 서버 필드만 보존한다.
- 관련47개 테스트와 typecheck PASS(0.736초). BE DELETE는 선택적 receipt를 구현하고 같은 selector 재생·다른 selector409·타 사용자404를 실제 HTTP/DB로 검증했다. FE wrapper8개+typecheck PASS. 전체 최종 검증·최신 계약 재인계·날짜별 장소 저장 연결은 남아 있다.
- 후속 전체45 suites/337 tests PASS(3.362초), typecheck/lint/api:check/ui:check PASS. 부분 reviewer가 상세 보존 finding 해소 및 신규 차단0을 확인했다. 기기 화면·staging E2E·최종 정식 승인 증거는 아니다.

### 최초 일정 전 장소 추가 연결 (2026-09-14)

- 장소 선호 wrapper를 생성된 PlacePreferenceItem/PlacePreferencesResponse 타입으로 정렬했다. preferred 및 requestedStayMinutes를 전달하며 이름·주소 등 초과 필드는 전송하지 않는다. 실제 wire 필드명은 type이다.
- schedule-favorites/schedule-search의 기존 추가 버튼에서 활성 일정 필수 차단을 제거했다. createPlace는 active=null일 때 최신 Trip을 확인하고 날짜별 place-preferences를 If-Match로 저장하며, 실제 일정 버전·항목·시각은 만들지 않는다. 검색의 임의 60분 기본값도 제거했다.
- 로그인·여행 전환 및 같은 여행의 최신 ETag/serverTrip 변경 뒤 늦은 응답 반영을 차단한다. 독립 reviewer의 동일 여행 경합 finding을 RED→GREEN으로 해소했고 재검토에서 신규 차단 없음(정식 승인은 아님)을 확인했다.
- 같은 선호가 서버에 이미 저장돼 있으면 GET 확인 후 PUT을 반복하지 않는다. 이는 서버 receipt 기반 멱등 재생을 대체하지 않으며 place-preferences receipt 연결은 남아 있다.
- 전체 45 suites/344 tests PASS(3.296초), typecheck/lint PASS. api:check 및 UI58 StyleSheet 검사 PASS. 렌더링된 두 추가 화면의 버튼 통합 테스트와 실제 기기 검증은 아직 없다.
- 남은 연결: 최초 캘린더의 서버 장소 초안 hydration, 활성 일정이 있으나 대상 Day가 미완료인 경우, favorite 대상 날짜, 초안 편집·삭제, 생성/적용 전체 계약 검증. 아직 기능 완성이나 PR 준비 완료를 뜻하지 않는다.

### 최초 캘린더 장소 초안 복원 (2026-09-14)

- hydrateSchedule은 기존 serverTrip의 active=null이고 수동 일정 journal이 없으면 최신 Trip을 조회한다. 여전히 active=null일 때 날짜가 지정된 must_visit/preferred만 canonical 장소 상세로 복원하고 avoid는 표시하지 않는다.
- 사용자가 지정한 체류시간을 우선하며 미지정은 서버 추천값을 사용한다. 둘 다 없거나 유효하지 않으면 입력 필요 오류로 종료하며 60분·시각·일정 항목 ID를 합성하지 않는다. 빈 서버 초안은 이전 장소·검토 상태를 지운다.
- 모든 조회 완료 후 요청·인증·여행·서버 revision을 확인한다. 왕복 여행 전환 뒤 늦은 GET 결과도 적용하지 않는다.
- 최초 schedule GET 오류 RED→GREEN, 사용자 체류/추천 fallback, 제외 장소, 왕복 여행 전환 테스트를 확인했다. 전체45 suites/348 tests PASS(3.38초), typecheck/lint/api:check/ui:check/diff-check PASS. 독립 부분 review 신규 차단 없음(정식 승인 아님).
- 대상 날짜 미지정 선호와 active 일정이 있는 미완료 Day, 초안 편집·삭제는 여전히 후속 연결 범위다. 실제 기기·staging 전체 생성 적용 검증은 아직 아니다.

### 최초 초안 삭제 서버 연결 (2026-09-14)

- 공통 mutateDraftPlace에 삭제를 연결하고 캘린더 기존 삭제 메뉴가 날짜/canonical ID로 서버 선호 전체 교체를 호출하게 했다. 다른 장소·avoid 선호는 보존하며 대상이 이미 없으면 GET으로 확인해 PUT을 반복하지 않는다.
- 서버에서 대상이 다른 날짜 또는 avoid로 바뀌었으면 삭제하지 않는다. 저장 성공 전 로컬 제거도 하지 않는다. 실제 schedule-item DELETE와 분리되며 기존 revision fence를 유지한다.
- 서비스 미구현 RED→GREEN, 렌더링된 캘린더 메뉴 미연결 RED→GREEN 확인. React 스킬에 따라 서비스에 저장 처리를 두고 JSX/스타일은 유지했다. 체류시간 변경·다른 날짜 이동의 초안 서버 연결은 아직 남아 있다.

### 최초 초안 체류시간·날짜 이동 연결 (2026-09-14)

- updateDraftPlace는 최신 서버 선호를 기준으로 stayMinutes/targetDayNo 중 지정된 필드만 바꾸고 필수·선택 선호와 우선순위를 보존한다. 삭제됐거나 avoid로 전환된 입력은 재생성하지 않는다. source/target 날짜와 체류시간 범위를 확인한다.
- 캘린더의 기존 체류시간·날짜 선택 시트를 서비스에 연결했다. 저장 성공 후 시트를 닫고 실패하면 기존 오류 안내로 전달한다. 실제 일정 itemId가 있으면 기존 일정 편집 API를 계속 사용한다. 같은 Day 편집은 기존 로컬 위치를 보존하도록 정리했다.
- 서비스 편집2개 RED→GREEN 및 렌더링된 날짜 이동 메뉴 RED→GREEN. 전체45 suites/353 tests PASS(3.326초), typecheck/lint/api:check/ui:check/diff-check PASS. 독립 부분 reviewer 신규 차단 없음(정식 승인 아님). 실제 기기 화면 비교는 미수행이다.
- 아직 active가 있는 미완료 Day, favorite 대상 날짜, 서버 place-preferences receipt, 최종 생성/적용 전 구간 검증·최종 PR은 남아 있다.

### 활성 일정 이후 빈 Day 입력 연결 (2026-09-14)

- 활성 버전이 있고 Day2 이후 해당 날짜에 서버 itemId가 없으면 createPlace는 초안 선호 저장으로 보낸다. 저장 직전 최신 Trip/active schedule을 조회해 버전 일치와 source/target 날짜의 실제 항목 부재를 검사한다.
- hydrateSchedule은 저장된 선호가 있을 때 적용된 날짜의 실제 항목을 유지하고 빈 날짜의 장소 초안을 병합한다. 적용된 날짜의 입력 선호는 중복 표시하지 않는다. 실제 버전/항목/시각을 추가 생성하지 않는다.
- Day1 유지→Day2 장소 저장→캘린더 재조회로 두 날짜 데이터 보존 테스트 RED→GREEN. 전체45 suites/354 tests PASS(3.529초), lint/typecheck/api:check/ui:check/diff-check PASS.
- 첫 수동 Day와 순차 생성 이력의 최종 BE 정책 정합성, place-preferences receipt 및 최종 전 구간 검증/PR은 여전히 남아 있다. 이 결과는 실서버 staging 생성·적용 완료가 아니다.
- 독립 reviewer에서 동일 canonical 장소를 미래 초안에 추가할 때 적용 Day의 실제 itemId 항목이 로컬에서 제거되는 finding을 받았다. 동일 장소/다른 장소 두 경우로 테스트를 확장해 RED를 재현했고 중복 제거를 itemId 없는 초안으로 제한했다. 실제 일정 항목은 유지한다.

### 위험 정보 연결 공백 확인 (2026-09-14)

- FE scheduleToReviews는 아직 모든 leg를 cautionary로 표시한다. 생성된 공개 ScheduleLeg 타입에는 riskScore만 있고 riskLevel/riskReasonCodes는 없다. 따라서 FE 임계값 추정으로 해결하지 않는다.
- BE bc69fc81의 GenerationTimeline은 event별 critical/high/medium/low/unknown, reasonCodes, evidenceFactIds를 검증한다. JdbcGenerationCandidateWriter.connectionFacts는 해당 연결의 검증된 risks를 trip_legs.facts.generation.risks에 이미 저장한다. 원본 TMAP/geometry를 다시 저장할 필요가 없다.
- 미연결 지점은 JdbcScheduleStore.validateLeg → ScheduleLegSnapshot → ScheduleLegResponse다. 현재 이 경로는 riskScore만 반환한다. 다음 변경은 저장된 structured risks의 제한된 projection을 공개 leg 필드에 연결하고 OpenAPI/FE 생성 계약을 재인계해야 한다. 숫자로 위험 등급을 새로 만들지 않는다.
- 이 점검은 원인·연결 위치 확인이며 구현/통합 검증 완료가 아니다. 최종 PR은 여전히 미생성이다.

### BE 위험 계약 재인계와 FE 표시 (2026-09-14)

- BE fbf54cda236185797dd24e5e96263d5776dbbbcf의 OpenAPI(43개 readiness PASS)와 runtime manifest를 정규 import-backend 도구로 가져왔다. manifest branch는 실제 feat/53-generation-run-intake를 기록하고 SHA/hash/coverage와 생성 타입을 갱신했다. develop 병합으로 표시하지 않았다.
- scheduleToReviews는 서버 riskLevel의 low→positive, medium→cautionary, high/critical→warning을 사용한다. unknown/null은 기존 cautionary 스타일과 미제공 문구로 표시한다. riskReasonCodes를 보존하고 riskScore로 등급을 만들지 않는다. JSX/스타일은 변경하지 않았다.
- 기존 일괄 cautionary 때문에 low/high/critical 세 케이스 RED→GREEN. 6개 등급·상충 점수100·reason code 전달을 검증했다. 전체45 suites/360 tests PASS(3.339초), typecheck/lint/api:check/ui:check/diff-check PASS. 독립 부분 리뷰 신규 차단 없음(정식 승인은 아님).
- 최종 전체 품질 게이트/Docker/정식 리뷰/PR은 미완료이며 staging 검증을 대체하지 않는다.

### Planner 저장 후 동시 변경 차단 (2026-09-14)

- planner PUT 응답의 ETag와 후속 Trip GET의 ETag가 다르면 TRIP_VERSION_CONFLICT로 중단한다. 기존 충돌 처리로 최신 버전을 조회하고 pending 저장을 해제하며, 교통 PUT/DELETE를 시작하거나 저장 완료로 표시하지 않는다.
- 최초 실패 테스트의 잘못된 ETag 형식을 실제 Trip 형식으로 수정한 뒤, 충돌 상황에서도 saveTrip이 성공 반환하는 RED를 확인했다. 정상 PUT 및 멱등 receipt 재생 두 경우를 검증했다.
- 전체 45 suites/362 tests PASS(3.734초), typecheck/lint/api:check/ui:check/diff-check PASS. 화면 파일은 이번 수정에서 변경하지 않았다.
- 이 검증은 저장 단계의 동시 변경 처리에 한정된다. 장소 선호 receipt, 전체 생성·적용 E2E, Docker와 정식 리뷰 및 최종 PR은 아직 완료되지 않았다.

### 장소 선호 멱등 API wrapper 준비 (2026-09-14)

- replaceTripPlacePreferences에 호출자가 보존한 선택적 키를 전달하도록 추가했다. wrapper가 키를 새로 만들지 않으며 기존 canonical 필드 allowlist를 유지한다.
- 헤더 누락 RED→GREEN, tripsApi 10개 및 typecheck PASS. 실제 화면의 pending mutation 동일 키/body/ETag 재시도 orchestration과 BE 계약 재인계는 아직 남았다. wrapper만으로 응답 유실 복구 완료라고 주장하지 않는다.
- BE 9d8d3281bd36358d49988d7f64f6eab598994cd6의 OpenAPI/runtime을 정규 import 및 generate 도구로 재인계했다. 실제 source branch를 기록했으며 develop 병합으로 표시하지 않았다. 전체 FE 45 suites/363 tests PASS(3.457초). 실제 화면의 pending 재시도 연결은 여전히 미완료다.

### 실행 중 장소 초안 재시도 연결 (2026-09-14)

- 최초 장소 선호 mutation의 canonical items/ETag/UUID key를 메모리에 보존한다. 같은 작업만 원본 요청으로 재생하고 최신 Trip GET의 ETag가 receipt와 같을 때 초안을 반영한다. 재조회 유실에도 같은 요청을 유지한다.
- 여행 전환은 pending을 제거하고 인증 세대가 바뀌면 이전 pending을 사용하지 않는다. 다른 입력은 새 요청으로 덮어쓰지 않고 이전 작업 재시도를 요구한다. 확정 4xx 충돌은 pending을 해제하며 429/처리 중 충돌은 보존한다.
- 기존 GET 상태 비교만으로 PUT 재시도를 생략하던 RED→GREEN. 정상/다른 입력/GET 유실/버전 충돌/여행 전환/사용자 재로그인 6개 경우를 검증했다. 테스트 간에는 여행 선택을 초기화해 메모리 journal을 격리한다.
- 전체 45 suites/369 tests PASS(3.591초), typecheck/lint/api:check/ui:check/diff-check PASS. 독립 부분 리뷰 신규 차단 없음(정식 승인 아님). 화면 파일은 이번 변경에서 수정하지 않았다.
- 앱 재시작 durable recovery 강화는 사용자 요청대로 후순위다. 전체 생성·적용 E2E, 최종 품질 게이트/Docker/정식 승인/PR은 아직 남았다.

기존 58개 파일의 StyleSheet는 ui:check로 동일함을 확인한다. 기존 JSX 컨테이너·이미지·버튼 구성도 유지했다.
실제 기기 화면 비교와 인증된 BE staging E2E는 수행하지 않았다.

PLANNER_AVAILABLE=false를 유지한다. #89/#53/#79/#95/#54 런타임과 #216 저장 허용 근거를
검증한 뒤 별도 변경으로 활성화해야 한다. 이 PR을 전체 staging 생성·적용 완료로 표시하지 않는다.
planner-conditions/장소 선호/도보 저장 계약은 새 공개 OpenAPI에 포함됐다. 도보 저장·복원과
planner 조건·항공 이벤트 저장 orchestration은 연결됐지만 장소 선호의 화면 저장 orchestration,
서버 일별 적용 이력 및 evidence 위험 등급의 실제 화면 반영은 별도 완료 검증이 필요하다.
첫 미완료 Day는 현재 활성 일정의 날짜별 항목 유무로 선택하며 최종 순차 생성 판정은 BE가 검증해야 한다.
재시작 복구는 로그인 및 여행 복원 후 동일 Day의 기존 생성 버튼에서 시작한다.

검증 명령: npm run lint, npm run typecheck, npm run ui:check, npm run api:check,
npm test, EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 npx --no-install expo export --platform ios --platform android.
