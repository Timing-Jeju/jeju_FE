# Spring API wrapper coverage

Backend: `Timing-Jeju/jeju_BE@1110049686e2d9408b9e107d4ff2f5f26a430247` (`feat/53-generation-run-intake`)

| Operation | Wrapper | 화면 연결 | 선행 조건 |
| --- | --- | --- | --- |
| `DELETE /api/v1/me/push-devices/{deviceId}` | `push.ts#deletePushDevice` | connected | Supabase session |
| `DELETE /api/v1/me/saved-places/{placeId}` | `savedPlaces.ts#deleteSavedPlace` | connected | session and hydrated list item strong ETag |
| `DELETE /api/v1/trips/{tripId}` | `trips.ts#deleteTrip` | deferred | Supabase session |
| `DELETE /api/v1/trips/{tripId}/accommodations/{accommodationId}` | `accommodations.ts#deleteAccommodation` | deferred | session and latest trip ETag |
| `DELETE /api/v1/trips/{tripId}/schedule-items/{itemId}` | `scheduleItems.ts#deleteScheduleItem` | connected | session, ETag, schedule version, Idempotency-Key |
| `DELETE /api/v1/trips/{tripId}/transport-event` | `transportEvents.ts#deleteTransportEvent` | connected | cleared trip-condition transport input, session, eventType, latest trip ETag |
| `GET /api/v1/auth/social/naver/userinfo` | `authSocial.ts#fetchNaverUserInfo` | deferred | Naver provider token |
| `GET /api/v1/auth/social/providers` | `authSocial.ts#fetchSocialProviders` | deferred | provider configuration |
| `GET /api/v1/legal-documents` | `legal.ts#fetchLegalDocuments` | connected | none; optional session |
| `GET /api/v1/me` | `profile.ts#fetchProfile` | connected | Supabase session |
| `GET /api/v1/me/notification-preferences` | `push.ts#fetchNotificationPreference` | deferred | Supabase session |
| `GET /api/v1/me/profile-image` | `profileImage.ts#fetchProfileImage` | deferred | Supabase session |
| `GET /api/v1/me/saved-places` | `savedPlaces.ts#fetchSavedPlaces` | connected | active Supabase owner generation |
| `GET /api/v1/places` | `places.ts#fetchPlaces` | connected | existing canonical place flow preserved |
| `GET /api/v1/places/{placeId}` | `places.ts#fetchPlace` | connected | canonical placeId |
| `GET /api/v1/trips` | `trips.ts#fetchTrips` | connected | Supabase session |
| `GET /api/v1/trips/{tripId}` | `trips.ts#fetchTrip` | connected | Supabase session |
| `GET /api/v1/trips/{tripId}/schedule` | `schedule.ts#fetchSchedule` | connected | existing Spring schedule only; no AI generation |
| `GET /api/v1/trips/{tripId}/schedule-generations/{runId}` | `generations.ts#getGeneration` | deferred | feature flag OFF until BE/AI staging generation and apply verification |
| `GET /api/v1/trips/{tripId}/schedule-versions/{versionId}` | `generations.ts#getCandidateSchedule` | deferred | feature flag OFF until BE/AI staging generation and apply verification |
| `GET /api/v1/weather/forecast` | `weather.ts#fetchWeatherForecast` | connected | one public selector; optional session |
| `PATCH /api/v1/me` | `profile.ts#updateProfile` | connected | Supabase session |
| `PATCH /api/v1/me/notification-preferences` | `push.ts#updateNotificationPreference` | deferred | Supabase session |
| `PATCH /api/v1/me/saved-places/{placeId}` | `savedPlaces.ts#updateSavedPlace` | connected | session and list item strong ETag |
| `PATCH /api/v1/trips/{tripId}` | `trips.ts#updateTrip` | connected | session and latest trip ETag |
| `PATCH /api/v1/trips/{tripId}/accommodations/{accommodationId}` | `accommodations.ts#updateAccommodation` | deferred | session and latest trip ETag |
| `PATCH /api/v1/trips/{tripId}/schedule-items/{itemId}` | `scheduleItems.ts#updateScheduleItem` | connected | session, ETag, schedule version, Idempotency-Key |
| `POST /api/v1/me/saved-places` | `savedPlaces.ts#createSavedPlace` | connected | session, canonical placeId, durable Idempotency-Key |
| `POST /api/v1/trips` | `trips.ts#createTrip` | connected | session and Idempotency-Key |
| `POST /api/v1/trips/{tripId}/accommodations` | `accommodations.ts#createAccommodation` | deferred | session, ETag, Idempotency-Key |
| `POST /api/v1/trips/{tripId}/schedule-generations` | `generations.ts#startGeneration` | deferred | feature flag OFF until BE/AI staging generation and apply verification |
| `POST /api/v1/trips/{tripId}/schedule-generations/{runId}/candidates/{candidateId}/apply` | `generations.ts#applyCandidate` | deferred | feature flag OFF until BE/AI staging generation and apply verification |
| `POST /api/v1/trips/{tripId}/schedule-items` | `scheduleItems.ts#createScheduleItem` | connected | session, ETag, schedule version, Idempotency-Key |
| `POST /api/v1/trips/{tripId}/schedule-items/{itemId}/move` | `scheduleItems.ts#moveScheduleItem` | connected | session, ETag, schedule version, Idempotency-Key |
| `PUT /api/v1/me/consents` | `legal.ts#updateLegalConsents` | connected | Supabase session |
| `PUT /api/v1/me/profile-image` | `profileImage.ts#putProfileImage` | deferred | session, storage object, latest ETag, Idempotency-Key |
| `PUT /api/v1/me/push-devices/{deviceId}` | `push.ts#registerPushDevice` | connected | session and platform registration token |
| `PUT /api/v1/trips/{tripId}/day-activity-windows` | `trips.ts#replaceDayActivityWindows` | connected | 기존 활동 시간 입력 사용; 선행 BE 전체 검증·병합 후 반영 |
| `PUT /api/v1/trips/{tripId}/place-preferences` | `trips.ts#replaceTripPlacePreferences` | connected | calendar draft place flow, session, canonical placeId, latest trip ETag |
| `PUT /api/v1/trips/{tripId}/planner-conditions` | `trips.ts#replacePlannerConditions` | connected | trip-condition lodging/style inputs, session and latest trip ETag |
| `PUT /api/v1/trips/{tripId}/preferences` | `trips.ts#replaceTripPreferences` | deferred | session and latest trip ETag |
| `PUT /api/v1/trips/{tripId}/schedule-order` | `scheduleItems.ts#reorderSchedule` | connected | session, ETag, schedule version, Idempotency-Key |
| `PUT /api/v1/trips/{tripId}/transport-event` | `transportEvents.ts#putTransportEvent` | connected | trip-condition arrival/departure input, session and latest trip ETag |

화면 연결이 `deferred`인 항목은 wrapper가 있어도 실제 화면 invocation이 없거나 기능 gate가 닫혀 있다. 일정 생성·조회·적용 endpoint는 표에 포함하지만 `PLANNER_AVAILABLE=false` 동안 deferred로 유지한다.
