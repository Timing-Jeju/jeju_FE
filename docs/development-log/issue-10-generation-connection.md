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
- 후보 본문·경로·설명은 AsyncStorage에 저장하지 않는다. 메모리 결과도 expiresAt에 폐기하고 최대 23시간 50분을 넘는 후보 응답은 거부한다.

## 검증 및 배포 경계

기존 58개 파일의 StyleSheet는 ui:check로 동일함을 확인한다. 기존 JSX 컨테이너·이미지·버튼 구성도 유지했다.
실제 기기 화면 비교와 인증된 BE staging E2E는 수행하지 않았다.

PLANNER_AVAILABLE=false를 유지한다. #89/#53/#79/#95/#54 런타임과 #216 저장 허용 근거를
검증한 뒤 별도 변경으로 활성화해야 한다. 이 PR을 전체 staging 생성·적용 완료로 표시하지 않는다.
새 planner-conditions/장소 선호/도보 저장 계약, 서버 일별 적용 이력 및 evidence 위험 등급은
현재 FE에 고정된 공개 OpenAPI에 없으므로 이를 지원한다고 가장하지 않는다.
첫 미완료 Day는 현재 활성 일정의 날짜별 항목 유무로 선택하며 최종 순차 생성 판정은 BE가 검증해야 한다.
재시작 복구는 로그인 및 여행 복원 후 동일 Day의 기존 생성 버튼에서 시작한다.

검증 명령: npm run lint, npm run typecheck, npm run ui:check, npm run api:check,
npm test, EXPO_NO_DOTENV=1 EXPO_NO_TELEMETRY=1 npx --no-install expo export --platform ios --platform android.
