# Spring API wrapper coverage

Backend: `Timing-Jeju/jeju_BE@36b507735e437cf0a2ff5b3965d0917f8108f011` (`feat/53-generation-run-intake`)

| Operation | Wrapper | 화면 연결 | 선행 조건 |
| --- | --- | --- | --- |
| `DELETE /api/v1/me/push-devices/{deviceId}` | `push.ts#deletePushDevice` | deferred | Supabase session |
| `DELETE /api/v1/me/saved-places/{placeId}` | `savedPlaces.ts#deleteSavedPlace` | connected | session and hydrated list item strong ETag |
| `DELETE /api/v1/trips/{tripId}` | `trips.ts#deleteTrip` | deferred | Supabase session |
| `DELETE /api/v1/trips/{tripId}/accommodations/{accommodationId}` | `accommodations.ts#deleteAccommodation` | deferred | session and latest trip ETag |
| `DELETE /api/v1/trips/{tripId}/schedule-items/{itemId}` | `scheduleItems.ts#deleteScheduleItem` | deferred | session, ETag, schedule version, Idempotency-Key |
| `DELETE /api/v1/trips/{tripId}/transport-event` | `transportEvents.ts#deleteTransportEvent` | deferred | session, eventType, latest trip ETag |
| `GET /api/v1/auth/social/naver/userinfo` | `authSocial.ts#fetchNaverUserInfo` | deferred | Naver provider token |
| `GET /api/v1/auth/social/providers` | `authSocial.ts#fetchSocialProviders` | deferred | provider configuration |
| `GET /api/v1/legal-documents` | `legal.ts#fetchLegalDocuments` | deferred | none; optional session |
| `GET /api/v1/me` | `profile.ts#fetchProfile` | deferred | Supabase session |
| `GET /api/v1/me/notification-preferences` | `push.ts#fetchNotificationPreference` | deferred | Supabase session |
| `GET /api/v1/me/profile-image` | `profileImage.ts#fetchProfileImage` | deferred | Supabase session |
| `GET /api/v1/me/saved-places` | `savedPlaces.ts#fetchSavedPlaces` | connected | active Supabase owner generation |
| `GET /api/v1/places` | `places.ts#fetchPlaces` | connected | existing canonical place flow preserved |
| `GET /api/v1/places/{placeId}` | `places.ts#fetchPlace` | connected | canonical placeId |
| `GET /api/v1/trips` | `trips.ts#fetchTrips` | deferred | Supabase session |
| `GET /api/v1/trips/{tripId}` | `trips.ts#fetchTrip` | deferred | Supabase session |
| `GET /api/v1/trips/{tripId}/schedule` | `schedule.ts#fetchSchedule` | deferred | existing Spring schedule only; no AI generation |
| `GET /api/v1/trips/{tripId}/schedule-generations/{runId}` | `generations.ts#getGeneration` | deferred | feature flag OFF until BE/AI staging generation and apply verification |
| `GET /api/v1/trips/{tripId}/schedule-versions/{versionId}` | `generations.ts#getCandidateSchedule` | deferred | feature flag OFF until BE/AI staging generation and apply verification |
| `GET /api/v1/weather/forecast` | `weather.ts#fetchWeatherForecast` | deferred | one public selector; optional session |
| `PATCH /api/v1/me` | `profile.ts#updateProfile` | deferred | Supabase session |
| `PATCH /api/v1/me/notification-preferences` | `push.ts#updateNotificationPreference` | deferred | Supabase session |
| `PATCH /api/v1/me/saved-places/{placeId}` | `savedPlaces.ts#updateSavedPlace` | connected | session and list item strong ETag |
| `PATCH /api/v1/trips/{tripId}` | `trips.ts#updateTrip` | deferred | session and latest trip ETag |
| `PATCH /api/v1/trips/{tripId}/accommodations/{accommodationId}` | `accommodations.ts#updateAccommodation` | deferred | session and latest trip ETag |
| `PATCH /api/v1/trips/{tripId}/schedule-items/{itemId}` | `scheduleItems.ts#updateScheduleItem` | deferred | session, ETag, schedule version, Idempotency-Key |
| `POST /api/v1/me/saved-places` | `savedPlaces.ts#createSavedPlace` | connected | session, canonical placeId, durable Idempotency-Key |
| `POST /api/v1/trips` | `trips.ts#createTrip` | deferred | session and Idempotency-Key |
| `POST /api/v1/trips/{tripId}/accommodations` | `accommodations.ts#createAccommodation` | deferred | session, ETag, Idempotency-Key |
| `POST /api/v1/trips/{tripId}/schedule-generations` | `generations.ts#startGeneration` | deferred | feature flag OFF until BE/AI staging generation and apply verification |
| `POST /api/v1/trips/{tripId}/schedule-generations/{runId}/candidates/{candidateId}/apply` | `generations.ts#applyCandidate` | deferred | feature flag OFF until BE/AI staging generation and apply verification |
| `POST /api/v1/trips/{tripId}/schedule-items` | `scheduleItems.ts#createScheduleItem` | deferred | session, ETag, schedule version, Idempotency-Key |
| `POST /api/v1/trips/{tripId}/schedule-items/{itemId}/move` | `scheduleItems.ts#moveScheduleItem` | deferred | session, ETag, schedule version, Idempotency-Key |
| `PUT /api/v1/me/consents` | `legal.ts#updateLegalConsents` | deferred | Supabase session |
| `PUT /api/v1/me/profile-image` | `profileImage.ts#putProfileImage` | deferred | session, storage object, latest ETag, Idempotency-Key |
| `PUT /api/v1/me/push-devices/{deviceId}` | `push.ts#registerPushDevice` | deferred | session and platform registration token |
| `PUT /api/v1/trips/{tripId}/day-activity-windows` | `trips.ts#replaceDayActivityWindows` | connected | 기존 활동 시간 입력 사용; 선행 BE 전체 검증·병합 후 반영 |
| `PUT /api/v1/trips/{tripId}/place-preferences` | `trips.ts#replaceTripPlacePreferences` | deferred | session, saved placeIds, latest trip ETag |
| `PUT /api/v1/trips/{tripId}/planner-conditions` | `trips.ts#replacePlannerConditions` | deferred | saved-input orchestration and staging verification |
| `PUT /api/v1/trips/{tripId}/preferences` | `trips.ts#replaceTripPreferences` | deferred | session and latest trip ETag |
| `PUT /api/v1/trips/{tripId}/schedule-order` | `scheduleItems.ts#reorderSchedule` | deferred | session, ETag, schedule version, Idempotency-Key |
| `PUT /api/v1/trips/{tripId}/transport-event` | `transportEvents.ts#putTransportEvent` | deferred | session and latest trip ETag |

화면 연결이 `deferred`인 항목은 이 이슈의 API 기반에는 포함되지만 후속 화면 연결이 필요하다. 공개 Spring endpoint가 없는 AI 생성·조회·적용은 이 표와 wrapper에 포함하지 않는다.
