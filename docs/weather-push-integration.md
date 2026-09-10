# 날씨·푸시 통합 경계

Issue #15 구현은 `Timing-Jeju/jeju_BE@73cb2b9310ecb2eba5a931459a78229cd06e7028`에서 고정한 OpenAPI만 사용한다.

- 날씨는 `regionCode`, `placeId`, `tripItemId` 중 하나만 전송한다. 현재 장소 상세 연결은 canonical `placeId`만 사용하며 좌표와 현재·간접 위치를 읽거나 Spring에 보내지 않는다.
- 기기 등록은 앱 설치별 stable UUID와 FCM registration token을 같은 `PUT` 경로로 replay한다. token, JWT, device ID는 로그와 오류 상태에 보존하지 않는다.
- 알림 권한을 자동으로 요청하지 않는다. 기존에 허용된 권한은 세션 복원 시 동기화하고, 명시적 사용자 동작은 `requestPushPermission`으로 연결한다. 거부와 철회는 정상 상태이며 철회 시 기기를 해제한다.
- 알림 설정 cache와 mutation queue는 인증 세대별로 격리하고 이전 세대 요청을 취소한다. 충돌 응답이 오면 성공으로 표시하지 않고 서버 값을 다시 조회하며, 더 늦은 GET은 최신 PATCH를 덮지 않는다.
- Web에서는 native push lifecycle 전체를 unsupported로 처리해 권한, UUID, token, PUT/DELETE 작업을 시작하지 않는다.

## 후속 통합과 blocker

- `app/(tabs)/mypage.tsx`는 병렬 이슈 소유 파일이므로 이 브랜치에서 수정하지 않았다. 후속 통합에서 기존 알림 설정 행을 `useNotificationPreferences`와 `requestPushPermission`에 연결하고, 거부 상태에는 OS 설정에서 다시 허용하는 안내를 표시해야 한다.
- 고정 OpenAPI의 push device `PUT`에는 `Idempotency-Key`, notification preference에는 `ETag`/`If-Match`와 409/412 응답이 정의돼 있지 않다. 따라서 현재 구현은 공개 계약대로 동일 device `PUT` replay와 클라이언트 mutation 직렬화만 수행한다. 실제 preference CAS는 백엔드 공개 계약이 추가되기 전까지 구현하거나 성공으로 가장할 수 없다.
- BE #243은 공개 API 변경이 아니라 푸시 eligibility에서 위치 동의 의존성을 제거하는 작업이며 아직 미병합이다. 병합 전 staging에서는 OS 권한과 서버 opt-in이 켜져도 위치 동의 때문에 실제 발송 대상에서 제외될 수 있다.
- Android/iOS 실제 등록·수신 검증에는 Firebase 설정 파일, APNs/FCM 자격증명, development build와 실제 기기가 필요하다. 저장소에는 자격증명을 넣지 않는다.
