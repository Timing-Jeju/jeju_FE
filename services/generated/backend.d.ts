export interface paths {
    "/api/v1/trips/{tripId}/transport-event": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * 여행 항공·선박 이벤트 저장
         * @description 도착 또는 출발 이벤트 한 건을 완전 교체하고 일정 stale 정책을 원자 적용합니다.
         */
        put: operations["tripTransportEventsUpdate"];
        post?: never;
        /**
         * 여행 항공·선박 이벤트 삭제
         * @description query로 선택한 도착 또는 출발 이벤트만 삭제하고 일정 stale 정책을 반환합니다.
         */
        delete: operations["tripTransportEventsDelete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/schedule-order": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * 일정 순서 변경
         * @description 활성 일정을 불변 복제하고 검증된 새 user_edit 버전을 원자적으로 활성화합니다.
         */
        put: operations["tripScheduleOrderUpdate"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * 여행 선호 조건 전체 교체
         * @description persisted trip revision strong If-Match로 선호 조건과 이동수단을 원자 교체합니다.
         */
        put: operations["tripPreferencesUpdate"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/place-preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * 여행 희망·회피 장소 전체 교체
         * @description 현재 사용자가 저장한 유효 장소만 사용해 희망·회피 목록을 원자적으로 전체 교체합니다.
         */
        put: operations["tripPlacePreferencesUpdate"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/push-devices/{deviceId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * 현재 사용자 푸시 기기 등록
         * @description FCM token을 응답에 노출하지 않고 기기를 멱등 등록·회전합니다.
         */
        put: operations["pushDevicesUpdate"];
        post?: never;
        /**
         * 현재 사용자 푸시 기기 해제
         * @description 로그아웃 단일 기기 해제이며 회원 탈퇴 전체 차단 boundary와 구분됩니다.
         */
        delete: operations["pushDevicesDelete"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/profile-image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 현재 프로필 이미지 조회
         * @description 현재 이미지 상태와 strong ETag를 조회합니다.
         */
        get: operations["profileImageRead"];
        /**
         * 프로필 이미지 확정 또는 해제
         * @description immutable Storage generation을 확정하거나 해제합니다.
         */
        put: operations["profileImageUpdate"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/consents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * 현재 사용자 법정 문서 동의 저장
         * @description canonical JWT sub에 최신 문서 동의를 원자적으로 저장합니다.
         */
        put: operations["legalConsentsUpdate"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 내 여행 목록 조회
         * @description 소유자 범위에서 updatedAt 내림차순 keyset cursor로 조회합니다.
         */
        get: operations["tripsList"];
        put?: never;
        /**
         * 여행 생성
         * @description 여행과 날짜별 Day를 하나의 트랜잭션으로 생성합니다.
         */
        post: operations["tripsCreate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/schedule-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 일정 항목 추가 버전 생성
         * @description 활성 일정을 불변 복제하고 검증된 새 user_edit 버전을 원자적으로 활성화합니다.
         */
        post: operations["tripScheduleItemCreate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/schedule-items/{itemId}/move": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 일정 항목 Day 이동
         * @description 활성 일정을 불변 복제하고 검증된 새 user_edit 버전을 원자적으로 활성화합니다.
         */
        post: operations["tripScheduleItemMoveUpdate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/accommodations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * 여행 숙소 추가
         * @description 여행 ETag를 검사하고 날짜순 sequence를 같은 transaction에서 재구성합니다.
         */
        post: operations["tripAccommodationsCreate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me/saved-places": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 관심 장소 목록
         * @description 인증 사용자 범위의 안정적인 keyset cursor 목록입니다.
         */
        get: operations["savedPlacesList"];
        put?: never;
        /**
         * 관심 장소 저장
         * @description Idempotency-Key로 중복 생성을 방지하며, 같은 key와 같은 payload는 기존 결과를 replay합니다.
         */
        post: operations["savedPlacesCreate"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 여행 상세 조회
         * @description 소유자 조건을 SQL에 포함해 IDOR를 차단합니다.
         */
        get: operations["tripsRead"];
        put?: never;
        post?: never;
        /**
         * 여행 삭제
         * @description 실행 중 일정이나 비동기 run이 없는 소유 여행을 삭제합니다.
         */
        delete: operations["tripsDelete"];
        options?: never;
        head?: never;
        /**
         * 여행 수정
         * @description strong If-Match revision을 사용해 여행을 원자 수정합니다.
         */
        patch: operations["tripsUpdate"];
        trace?: never;
    };
    "/api/v1/trips/{tripId}/schedule-items/{itemId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * 일정 항목 삭제
         * @description 활성 일정을 불변 복제하고 검증된 새 user_edit 버전을 원자적으로 활성화합니다.
         */
        delete: operations["tripScheduleItemDelete"];
        options?: never;
        head?: never;
        /**
         * 일정 항목 수정
         * @description 활성 일정을 불변 복제하고 검증된 새 user_edit 버전을 원자적으로 활성화합니다.
         */
        patch: operations["tripScheduleItemPatch"];
        trace?: never;
    };
    "/api/v1/trips/{tripId}/accommodations/{accommodationId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * 여행 숙소 삭제
         * @description 활성 일정이 없고 남은 숙소에 내부 공백이 없을 때 삭제합니다.
         */
        delete: operations["tripAccommodationsDelete"];
        options?: never;
        head?: never;
        /**
         * 여행 숙소 수정
         * @description presence semantics와 canonical no-op을 보존해 숙소를 수정합니다.
         */
        patch: operations["tripAccommodationsUpdate"];
        trace?: never;
    };
    "/api/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 현재 사용자 프로필 조회
         * @description canonical JWT sub의 프로필을 생성 보장한 뒤 조회합니다.
         */
        get: operations["profileRead"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * 현재 사용자 프로필 수정
         * @description nickname과 locale만 canonical JWT sub의 프로필에 반영합니다.
         */
        patch: operations["profileUpdate"];
        trace?: never;
    };
    "/api/v1/me/saved-places/{placeId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * 관심 장소 삭제
         * @description 관심 장소를 삭제합니다. request body와 성공 response content는 없습니다.
         */
        delete: operations["savedPlacesDelete"];
        options?: never;
        head?: never;
        /**
         * 관심 장소 수정
         * @description If-Match strong ETag로 원자 비교 갱신합니다.
         */
        patch: operations["savedPlacesUpdate"];
        trace?: never;
    };
    "/api/v1/me/notification-preferences": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 현재 사용자 출발 알림 설정 조회
         * @description 명시적 opt-in 전 기본 비활성화와 safety buffer 10분을 반환합니다.
         */
        get: operations["notificationPreferencesRead"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * 현재 사용자 출발 알림 설정 변경
         * @description 출발 알림 opt-in과 0..120분 safety buffer를 부분 변경합니다.
         */
        patch: operations["notificationPreferencesUpdate"];
        trace?: never;
    };
    "/api/v1/weather/forecast": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 날씨 예보 공개 조회
         * @description 저장된 KMA 정규화 예보를 제주 격자·발표 base·freshness 계약으로 조회합니다.
         */
        get: operations["weatherForecastRead"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/schedule": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 활성 또는 명시 일정 버전 조회
         * @description 소유자 범위의 불변 일정 버전과 Day·item·leg·진행 상태를 조회합니다.
         */
        get: operations["tripScheduleRead"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/places": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 관광지 검색·필터 목록
         * @description 정규화된 제주 관광지 read model을 안정적인 HMAC keyset cursor로 조회합니다.
         */
        get: operations["placesList"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/places/{placeId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 관광지 상세·운영정보 조회
         * @description active 정규화 장소의 상세, 이미지, 운영정보와 저장 상태를 조회합니다.
         */
        get: operations["placesRead"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/legal-documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 현재 법정 문서 조회
         * @description 요청 locale별 현재 시행 중인 최신 문서를 한 평가 시각으로 조회합니다.
         */
        get: operations["legalDocumentsList"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/social/providers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * 소셜 로그인 공급자 조회
         * @description 프론트엔드는 반환한 id를 Supabase signInWithOAuth provider로 사용합니다. secret과 token은 반환하지 않습니다.
         */
        get: operations["authSocialProvidersList"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/auth/social/naver/userinfo": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Naver Custom OAuth UserInfo 변환
         * @description Supabase Auth custom:naver provider만 호출하는 공개 adapter입니다. Naver provider access token을 고정 Naver UserInfo endpoint로 전달하고 표준 UserInfo만 반환합니다.
         */
        get: operations["authNaverUserInfoRead"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        TransportEventRequest: {
            /** @enum {string} */
            eventType: "arrival" | "departure";
            /** @enum {string} */
            transportType: "flight" | "ferry";
            /** Format: uuid */
            terminalPlaceId: string | null;
            customTerminalName: string | null;
            /**
             * Format: date-time
             * @example 2026-09-01T09:00:00+09:00
             */
            scheduledAt: string;
            transportNumber: string | null;
            note: string | null;
        };
        TransportEvent: {
            eventType?: string;
            transportType?: string;
            /** Format: uuid */
            terminalPlaceId?: string | null;
            customTerminalName?: string | null;
            /** Format: date-time */
            scheduledAt?: string;
            transportNumber?: string | null;
            note?: string | null;
        };
        TransportEventMutationResponse: {
            /** Format: uuid */
            tripId?: string;
            scheduleEffect?: string;
            regenerationRequired?: boolean;
            /** Format: uuid */
            activeScheduleVersionId?: string | null;
            tripStatus?: string;
            /** Format: date-time */
            updatedAt?: string;
            eventType?: string;
            deleted?: boolean;
            event?: components["schemas"]["TransportEvent"];
        };
        /** @description Timing Jeju 공개 API 공통 오류 응답 */
        ApiProblemDetails: {
            /** Format: uri */
            type: string;
            title: string;
            /** Format: int32 */
            status: number;
            detail: string;
            /** Format: uri-reference */
            instance: string;
            code: string;
            /** @description 서버가 요청 단위로 생성한 추적 식별자 */
            traceId: string;
            fieldErrors: components["schemas"]["FieldErrorDetail"][];
        };
        /** @description 검증에 실패한 필드와 안전한 사용자 안내 */
        FieldErrorDetail: {
            field: string;
            detail: string;
        };
        DayOrderRequest: {
            /** Format: int32 */
            dayNo?: number;
            orderedItemIds?: string[];
        };
        ReorderScheduleRequest: {
            /** Format: uuid */
            expectedActiveScheduleVersionId?: string;
            days?: components["schemas"]["DayOrderRequest"][];
        };
        ScheduleMutationResponse: {
            /** Format: uuid */
            tripId: string;
            /** Format: uuid */
            previousScheduleVersionId: string;
            /** Format: uuid */
            activeScheduleVersionId: string;
            /** Format: int32 */
            versionNo: number;
            /** @enum {string} */
            sourceType: "user_edit";
            /** @constant */
            feasibilityStale: true;
            changedItemIds: string[];
            etag: string;
            /** Format: date-time */
            updatedAt: string;
        };
        PreferenceTransportMode: {
            /** @enum {string} */
            mode: "public_transit" | "rental_car" | "taxi";
            /** Format: int32 */
            priority: number;
            primary: boolean;
        };
        ReplaceTripPreferencesRequest: {
            preferredCategories: string[];
            arrivalRegionCode: string;
            departureRegionCode: string;
            preferredRegionCodes: string[];
            /** Format: uuid */
            startPlaceId: string | null;
            /** Format: uuid */
            endPlaceId: string | null;
            transportModes: components["schemas"]["PreferenceTransportMode"][];
        };
        TransportMode: {
            /** @enum {string} */
            mode: "public_transit" | "rental_car" | "taxi";
            /** Format: int32 */
            priority: number;
            primary: boolean;
        };
        PreferencesResponse: {
            /** Format: uuid */
            tripId: string;
            /** @enum {string} */
            scheduleEffect: "none" | "maintained" | "invalidated";
            regenerationRequired: boolean;
            /** Format: uuid */
            activeScheduleVersionId: string | null;
            tripStatus: string;
            /** Format: date-time */
            updatedAt: string;
            preferences: components["schemas"]["TripPreferences"];
        };
        TripPreferences: {
            preferredCategories: string[];
            arrivalRegionCode: string;
            departureRegionCode: string;
            preferredRegionCodes: string[];
            /** Format: uuid */
            startPlaceId: string | null;
            /** Format: uuid */
            endPlaceId: string | null;
            transportModes: components["schemas"]["TransportMode"][];
        };
        PlacePreferenceItem: {
            /** Format: uuid */
            placeId: string;
            /** @enum {string} */
            type: "must_visit" | "avoid";
            /** Format: int32 */
            targetDayNo: number | null;
            /** Format: int32 */
            priority: number;
        };
        PlacePreferencesRequest: {
            items: components["schemas"]["PlacePreferenceItem"][];
        };
        PlacePreferencesResponse: {
            /** Format: uuid */
            tripId: string;
            /** @enum {string} */
            scheduleEffect: "none" | "maintained" | "invalidated";
            regenerationRequired: boolean;
            /** Format: uuid */
            activeScheduleVersionId: string | null;
            /** @enum {string} */
            tripStatus: "draft" | "generating" | "planned" | "live";
            /** Format: date-time */
            updatedAt: string;
            items: components["schemas"]["PlacePreferenceItem"][];
        };
        PushDeviceRegistrationRequest: {
            /** @enum {string} */
            platform: "IOS" | "ANDROID";
            /** @description FCM-compatible printable ASCII token; UTF-8 기준 최대 4096 bytes */
            registrationToken: string;
            /** @enum {string} */
            permissionStatus: "GRANTED" | "DENIED" | "NOT_DETERMINED";
            appVersion: string;
            /**
             * @description canonical BCP 47 locale; 2..35 characters
             * @example en-US-u-ca-gregory
             */
            locale: string;
            /** @example Asia/Seoul */
            timeZone: string;
        };
        PushDeviceResponse: {
            /** Format: uuid */
            deviceId: string;
            /** @enum {string} */
            platform: "IOS" | "ANDROID";
            /** @enum {string} */
            permissionStatus: "GRANTED" | "DENIED" | "NOT_DETERMINED";
            active: boolean;
            /** Format: date-time */
            updatedAt: string;
        };
        ProfileImageRequest: {
            /** Format: profile-image-object-key */
            profileImageObjectKey: string | null;
        };
        ProfileImageResponse: {
            /** Format: profile-image-object-key */
            profileImageObjectKey?: string | null;
            /** Format: uri */
            profileImageUrl?: string | null;
            /** @enum {string} */
            profileImageSource?: "provider" | "storage" | "none";
            /** Format: int64 */
            profileImageVersion?: number;
            /** Format: date-time */
            updatedAt?: string;
        };
        UserConsentItemRequest: {
            /** Format: uuid */
            documentId: string;
            agreed: boolean;
        };
        UserConsentsRequest: {
            consents: components["schemas"]["UserConsentItemRequest"][];
        };
        UserConsentsResponse: {
            requiredConsentsSatisfied?: boolean;
            /** Format: date-time */
            updatedAt?: string;
        };
        CreateTripRequest: {
            /** Format: date */
            startDate: string;
            /** Format: date */
            endDate: string;
            title: string;
            /**
             * @default Asia/Seoul
             * @enum {string}
             */
            timezone: "Asia/Seoul";
            /**
             * @default normal
             * @enum {string}
             */
            userPace: "slow" | "normal" | "fast";
            /**
             * @default [
             *       {
             *         "mode": "public_transit",
             *         "priority": 1,
             *         "primary": true
             *       }
             *     ]
             */
            transportModes: components["schemas"]["TransportMode"][];
        };
        TripDay: {
            /** Format: uuid */
            dayId: string;
            /** Format: int32 */
            dayNo: number;
            /** Format: date */
            date: string;
        };
        ScoreProvenance: {
            /** @enum {string} */
            source: "feasibility_run";
            /** Format: uuid */
            runId: string;
            /** Format: uuid */
            scheduleVersionId: string;
            /** Format: date-time */
            calculatedAt: string;
            /** Format: date-time */
            observedAt: string;
            /** Format: date-time */
            expiresAt: string;
            stale: boolean;
        };
        TripDetail: {
            /** Format: uuid */
            tripId: string;
            title: string;
            /** @enum {string} */
            status: "draft" | "generating" | "planned" | "live" | "completed" | "cancelled" | "failed";
            /** Format: date */
            startDate: string;
            /** Format: date */
            endDate: string;
            /** @enum {string} */
            timezone: "Asia/Seoul";
            /** @enum {string} */
            userPace: "slow" | "normal" | "fast";
            transportModes: components["schemas"]["TransportMode"][];
            days: components["schemas"]["TripDay"][];
            /** Format: uuid */
            activeScheduleVersionId: string | null;
            /** Format: int32 */
            totalScore: number | null;
            scoreProvenance: components["schemas"]["ScoreProvenance"];
            /** @enum {string} */
            scheduleEffect: "none" | "maintained" | "invalidated";
            regenerationRequired: boolean;
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        CreateScheduleItemRequest: {
            /** Format: uuid */
            expectedActiveScheduleVersionId: string;
            /** Format: int32 */
            dayNo: number;
            /** Format: int32 */
            sequenceNo: number;
            /** @enum {string} */
            itemType: "place_visit" | "meal" | "accommodation" | "arrival" | "departure" | "free_time" | "custom";
            /** Format: uuid */
            placeId?: string;
            /** Format: uuid */
            accommodationId?: string;
            /** Format: uuid */
            transportEventId?: string;
            title?: string;
            /** Format: date-time */
            plannedStartAt: string;
            /** Format: int32 */
            stayMinutes: number;
            /** Format: int32 */
            bufferAfterMinutes?: number;
            required?: boolean;
            memo?: string | null;
        };
        MoveScheduleItemRequest: {
            /** Format: uuid */
            expectedActiveScheduleVersionId?: string;
            /** Format: int32 */
            targetDayNo?: number;
            /** Format: int32 */
            targetSequenceNo?: number;
            plannedStartAt?: string;
        };
        CreateAccommodationRequest: {
            /** Format: uuid */
            placeId: string | null;
            customName: string | null;
            /**
             * Format: date
             * @example 2026-09-01
             */
            checkInDate: string;
            /**
             * Format: date
             * @example 2026-09-02
             */
            checkOutDate: string;
            /** @example 15:00 */
            checkInTime: string;
            /** @example 11:00 */
            checkOutTime: string;
        };
        AccommodationMutationPayload: {
            /** Format: uuid */
            tripId?: string;
            /** Format: uuid */
            accommodationId?: string;
            accommodation?: components["schemas"]["AccommodationPayload"];
            scheduleEffect?: string;
            regenerationRequired?: boolean;
            /** Format: uuid */
            activeScheduleVersionId?: string | null;
            tripStatus?: string;
            etag?: string;
            /** Format: date-time */
            createdAt?: string;
            /** Format: date-time */
            updatedAt?: string;
        };
        AccommodationPayload: {
            /** Format: uuid */
            accommodationId?: string;
            /** Format: uuid */
            placeId?: string | null;
            customName?: string | null;
            name?: string;
            /** Format: date */
            checkInDate?: string;
            /** Format: date */
            checkOutDate?: string;
            checkInTime?: string;
            checkOutTime?: string;
            /** Format: int32 */
            sequenceNo?: number;
        };
        CreateSavedPlaceRequest: {
            /** Format: uuid */
            placeId: string;
            memo?: string;
            tags?: string[];
            /** Format: int32 */
            priority?: number;
            /** Format: int32 */
            targetDay?: number;
        };
        SavedPlaceResponse: {
            /** Format: uuid */
            placeId?: string;
            name?: string;
            category?: string;
            regionLabel?: string;
            thumbnailUrl?: string;
            /** Format: int32 */
            recommendedStayMinutes?: number;
            memo?: string;
            tags?: string[];
            /** Format: int32 */
            priority?: number;
            /** Format: int32 */
            targetDay?: number;
            /** Format: date-time */
            savedAt?: string;
            /** Format: date-time */
            updatedAt?: string;
        };
        PatchTripRequest: {
            title?: unknown;
            startDate?: unknown;
            endDate?: unknown;
            timezone?: unknown;
            userPace?: unknown;
            transportModes?: components["schemas"]["TransportMode"][];
        };
        PatchScheduleItemRequest: {
            /** Format: uuid */
            expectedActiveScheduleVersionId?: string;
            /** Format: uuid */
            placeId?: string;
            /** Format: uuid */
            accommodationId?: string;
            /** Format: uuid */
            transportEventId?: string;
            title?: string;
            plannedStartAt?: string;
            /** Format: int32 */
            stayMinutes?: number;
            /** Format: int32 */
            bufferAfterMinutes?: number;
            required?: boolean;
            memo?: string | null;
        };
        PatchAccommodationRequest: {
            /** Format: uuid */
            placeId?: string | null;
            customName?: string | null;
            /**
             * Format: date
             * @example 2026-09-01
             */
            checkInDate?: string;
            /**
             * Format: date
             * @example 2026-09-02
             */
            checkOutDate?: string;
            /** @example 15:00 */
            checkInTime?: string;
            /** @example 11:00 */
            checkOutTime?: string;
        };
        CurrentUserProfilePatchRequest: {
            nickname?: string;
            /** @enum {string} */
            locale?: "ko-KR";
        };
        CurrentUserProfileResponse: {
            /** Format: uuid */
            readonly userId?: string;
            readonly email?: string | null;
            nickname?: string | null;
            readonly profileImageUrl?: string | null;
            locale?: string;
            readonly providers?: string[];
            readonly onboardingCompleted?: boolean;
            /** Format: date-time */
            readonly updatedAt?: string;
        };
        PatchSavedPlaceRequest: {
            memo?: string;
            tags?: string[];
            /** Format: int32 */
            priority?: number;
            /** Format: int32 */
            targetDay?: number;
        };
        NotificationPreferencePatchRequest: {
            /** Format: int32 */
            safetyBufferMinutes?: number;
            nextDestinationDepartureEnabled?: boolean;
        };
        NotificationPreferenceResponse: {
            /** @default false */
            nextDestinationDepartureEnabled: boolean;
            /**
             * Format: int32
             * @default 10
             */
            safetyBufferMinutes: number;
            /** Format: date-time */
            updatedAt: string | null;
        };
        WeatherForecastResponse: {
            /** @enum {string} */
            contractVersion: "2.0.0";
            grid: components["schemas"]["WeatherGrid"];
            /** @enum {string} */
            provider: "KMA";
            /** @enum {string} */
            providerApiVersion: "VilageFcstInfoService_2.0";
            /** @enum {string} */
            forecastType: "ultra_short" | "village";
            /** Format: date */
            baseDate: string;
            baseTime: string;
            /** Format: date-time */
            forecastedAt: string;
            /** Format: date-time */
            validAt: string;
            temperatureC: number | null;
            /** Format: int32 */
            precipitationProbabilityPercent: number | null;
            precipitationAmountMm: number | null;
            /** @enum {string|null} */
            precipitationType: "none" | "rain" | "rain_snow" | "snow" | "shower" | "raindrop" | "raindrop_snowflake" | "snowflake" | null;
            /** @enum {string|null} */
            skyCode: "clear" | "mostly_cloudy" | "cloudy" | null;
            /** Format: int32 */
            humidityPercent: number | null;
            windSpeedMps: number | null;
            /** Format: date-time */
            observedAt: string;
            /** Format: date-time */
            expiresAt: string;
            stale: boolean;
            fallbackUsed: boolean;
        };
        WeatherGrid: {
            /** Format: int32 */
            nx: number;
            /** Format: int32 */
            ny: number;
            regionName: string | null;
        };
        TripSummary: {
            /** Format: uuid */
            tripId: string;
            title: string;
            /** @enum {string} */
            status: "draft" | "generating" | "planned" | "live" | "completed" | "cancelled" | "failed";
            /** Format: date */
            startDate: string;
            /** Format: date */
            endDate: string;
            /** @enum {string} */
            timezone: "Asia/Seoul";
            /** Format: uuid */
            activeScheduleVersionId: string | null;
            /** Format: int32 */
            totalScore: number | null;
            scoreProvenance: components["schemas"]["ScoreProvenance"];
            /** Format: date-time */
            createdAt: string;
            /** Format: date-time */
            updatedAt: string;
        };
        CursorPage: {
            /** Format: int32 */
            size?: number;
            hasNext?: boolean;
            nextCursor?: string | null;
        };
        TripsListResponse: {
            items: components["schemas"]["TripSummary"][];
            page: components["schemas"]["CursorPage"];
        };
        ItemProgress: {
            /** @enum {string} */
            status: "planned" | "active" | "arrived" | "completed" | "skipped" | "missed";
            /** Format: date-time */
            actualStartedAt: string | null;
            /** Format: date-time */
            actualArrivedAt: string | null;
            /** Format: date-time */
            actualCompletedAt: string | null;
            /** Format: date-time */
            updatedAt: string;
        };
        ScheduleItem: {
            /** Format: uuid */
            itemId: string;
            /** Format: int32 */
            sequenceNo: number;
            /** @enum {string} */
            itemType: "place_visit" | "meal" | "accommodation" | "arrival" | "departure" | "free_time" | "custom";
            /** Format: uuid */
            placeId: string | null;
            title: string;
            /** Format: date-time */
            plannedStartAt: string;
            /** Format: date-time */
            plannedEndAt: string;
            /** Format: int32 */
            stayMinutes: number;
            /** Format: int32 */
            bufferAfterMinutes: number;
            required: boolean;
            memo: string | null;
            progress: components["schemas"]["ItemProgress"];
        };
        ScheduleLeg: {
            /** Format: uuid */
            legId: string;
            /** Format: int32 */
            sequenceNo: number;
            /** Format: uuid */
            fromItemId: string;
            /** Format: uuid */
            toItemId: string;
            /** @enum {string} */
            transportMode: "walk" | "public_transit" | "rental_car" | "taxi";
            /** Format: date-time */
            plannedDepartureAt: string;
            /** Format: date-time */
            plannedArrivalAt: string;
            /** Format: int32 */
            walkMinutes: number;
            /** Format: int32 */
            waitMinutes: number;
            /** Format: int32 */
            rideMinutes: number;
            /** Format: int32 */
            transferMinutes: number;
            /** Format: int32 */
            durationMinutes: number;
            /** Format: int32 */
            bufferMinutes: number;
            /** Format: int32 */
            distanceMeters: number | null;
            /** Format: int32 */
            estimatedFareKrw: number | null;
            /** Format: int32 */
            riskScore: number | null;
        };
        ScheduleDay: {
            /** Format: uuid */
            dayId: string;
            /** Format: int32 */
            dayNo: number;
            /** Format: date */
            date: string;
            items: components["schemas"]["ScheduleItem"][];
            legs: components["schemas"]["ScheduleLeg"][];
        };
        ScheduleResponse: {
            /** Format: uuid */
            tripId: string;
            scheduleVersion: components["schemas"]["ScheduleVersion"];
            days: components["schemas"]["ScheduleDay"][];
        };
        ScheduleVersion: {
            /** Format: uuid */
            scheduleVersionId: string;
            /** Format: int32 */
            versionNo: number;
            /** @enum {string} */
            status: "draft" | "candidate" | "active" | "superseded" | "rejected";
            /** @enum {string} */
            sourceType: "initial" | "user_edit" | "ai_generation" | "recovery" | "live_recalculation";
            /** Format: uuid */
            baseScheduleVersionId: string | null;
            /** Format: int32 */
            score: number | null;
            feasibilityStale: boolean;
        };
        PlaceCursorPage: {
            /** Format: int32 */
            size?: number;
            hasNext?: boolean;
            nextCursor?: string | null;
        };
        PlaceDataFreshness: {
            provider?: string;
            /** Format: date-time */
            observedAt?: string;
            /** Format: date-time */
            expiresAt?: string;
            stale?: boolean;
        };
        PlaceListItem: {
            /** Format: uuid */
            placeId?: string;
            contentId?: string;
            name?: string;
            category?: string;
            regionCode?: string;
            regionLabel?: string;
            address?: string;
            location?: components["schemas"]["PlaceLocation"];
            thumbnailUrl?: string;
            /** Format: int32 */
            recommendedStayMinutes?: number;
            recommendedStaySource?: string;
            recommendedStayPolicyVersion?: string;
            /** Format: date-time */
            recommendedStayEffectiveAt?: string;
            /** Format: date-time */
            recommendedStayUpdatedAt?: string;
            operationsSummary?: string;
            dataFreshness?: components["schemas"]["PlaceDataFreshness"];
            saved?: boolean;
            memo?: string;
            tags?: string[];
        };
        PlaceLocation: {
            /** Format: double */
            lat?: number;
            /** Format: double */
            lng?: number;
        };
        PlacesListResponse: {
            items?: components["schemas"]["PlaceListItem"][];
            page?: components["schemas"]["PlaceCursorPage"];
        };
        Contact: {
            phone: string | null;
            /** Format: uri */
            homepageUrl: string | null;
        };
        NearbyStop: {
            /** Format: uuid */
            stopId: string;
            stopName: string;
            /** Format: int64 */
            distanceMeters: number;
            /** Format: int32 */
            walkMinutes: number | null;
            /** @enum {string} */
            linkMethod: "spatial_radius" | "fixture" | "manual" | "api_nearby";
            provider: string;
            /** Format: date-time */
            observedAt: string;
            /** Format: date-time */
            expiresAt: string;
            stale: boolean;
        };
        Operations: {
            operatingHoursText: string | null;
            closedDaysText: string | null;
            parkingText: string | null;
            admissionFeeText: string | null;
        };
        PlaceDetailResponse: {
            /** Format: uuid */
            placeId: string;
            contentId: string;
            name: string;
            category: string;
            regionCode: string;
            regionLabel: string | null;
            address: string | null;
            location: components["schemas"]["PlaceLocation"];
            /** Format: uri */
            thumbnailUrl: string | null;
            /** Format: int32 */
            recommendedStayMinutes: number | null;
            recommendedStaySource: string;
            recommendedStayPolicyVersion: string | null;
            /** Format: date-time */
            recommendedStayEffectiveAt: string | null;
            /** Format: date-time */
            recommendedStayUpdatedAt: string | null;
            operationsSummary: string | null;
            saved: components["schemas"]["SavedPlaceState"];
            overview: string | null;
            contact: components["schemas"]["Contact"];
            operations: components["schemas"]["Operations"];
            images: components["schemas"]["PlaceImage"][];
            nearbyStops: components["schemas"]["NearbyStop"][];
        };
        PlaceImage: {
            /** Format: uri */
            url: string;
            /** Format: uri */
            thumbnailUrl: string | null;
            provider: string;
            /** Format: date-time */
            observedAt: string;
            /** Format: date-time */
            expiresAt: string | null;
            stale: boolean;
        };
        SavedPlaceState: {
            value: boolean;
            memo: string | null;
            tags: string[];
        };
        SavedPlacesListResponse: {
            items?: components["schemas"]["SavedPlaceResponse"][];
            page?: components["schemas"]["CursorPage"];
        };
        LegalDocumentItemResponse: {
            /** Format: uuid */
            documentId?: string;
            /** @enum {string} */
            type?: "terms" | "privacy" | "location";
            version?: string;
            title?: string;
            contentUrl?: string;
            required?: boolean;
            /** Format: date-time */
            effectiveAt?: string;
        };
        LegalDocumentsResponse: {
            /** Format: date-time */
            evaluatedAt?: string;
            /** @enum {string} */
            locale?: "ko-KR";
            items?: components["schemas"]["LegalDocumentItemResponse"][];
        };
        SocialLoginProviderResponse: {
            id?: string;
            displayName?: string;
        };
        SocialLoginProvidersResponse: {
            providers?: components["schemas"]["SocialLoginProviderResponse"][];
        };
        NaverUserInfoResponse: {
            sub?: string;
            email?: string;
            name?: string;
            preferred_username?: string;
            picture?: string;
        };
    };
    responses: {
        /** @description 요청 값 검증 실패 */
        ValidationProblem: {
            headers: {
                "X-Trace-Id": components["headers"]["TraceId"];
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://api.timing-jeju.example/problems/validation-failed",
                 *       "title": "요청 값이 올바르지 않습니다.",
                 *       "status": 400,
                 *       "detail": "입력값을 확인해 주세요.",
                 *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                 *       "code": "VALIDATION_FAILED",
                 *       "traceId": "0123456789abcdef0123456789abcdef",
                 *       "fieldErrors": []
                 *     }
                 */
                "application/problem+json": components["schemas"]["ApiProblemDetails"];
            };
        };
        /** @description 인증 실패 */
        AuthenticationProblem: {
            headers: {
                "X-Trace-Id": components["headers"]["TraceId"];
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                 *       "title": "인증이 필요합니다",
                 *       "status": 401,
                 *       "detail": "로그인 후 다시 요청해 주세요.",
                 *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                 *       "code": "AUTHENTICATION_REQUIRED",
                 *       "traceId": "0123456789abcdef0123456789abcdef",
                 *       "fieldErrors": []
                 *     }
                 */
                "application/problem+json": components["schemas"]["ApiProblemDetails"];
            };
        };
        /** @description 접근 거부 */
        AccessDeniedProblem: {
            headers: {
                "X-Trace-Id": components["headers"]["TraceId"];
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                 *       "title": "접근이 거부되었습니다.",
                 *       "status": 403,
                 *       "detail": "접근 권한이 없습니다.",
                 *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                 *       "code": "AUTH_ACCESS_DENIED",
                 *       "traceId": "0123456789abcdef0123456789abcdef",
                 *       "fieldErrors": []
                 *     }
                 */
                "application/problem+json": components["schemas"]["ApiProblemDetails"];
            };
        };
        /** @description 리소스를 찾을 수 없음 */
        NotFoundProblem: {
            headers: {
                "X-Trace-Id": components["headers"]["TraceId"];
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://api.timing-jeju.example/problems/resource-not-found",
                 *       "title": "요청한 리소스를 찾을 수 없습니다.",
                 *       "status": 404,
                 *       "detail": "요청한 리소스가 존재하지 않습니다.",
                 *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                 *       "code": "RESOURCE_NOT_FOUND",
                 *       "traceId": "0123456789abcdef0123456789abcdef",
                 *       "fieldErrors": []
                 *     }
                 */
                "application/problem+json": components["schemas"]["ApiProblemDetails"];
            };
        };
        /** @description 현재 상태와 충돌 */
        ConflictProblem: {
            headers: {
                "X-Trace-Id": components["headers"]["TraceId"];
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://api.timing-jeju.example/problems/conflict",
                 *       "title": "요청이 현재 상태와 충돌합니다.",
                 *       "status": 409,
                 *       "detail": "최신 상태를 확인한 뒤 다시 시도해 주세요.",
                 *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                 *       "code": "CONFLICT",
                 *       "traceId": "0123456789abcdef0123456789abcdef",
                 *       "fieldErrors": []
                 *     }
                 */
                "application/problem+json": components["schemas"]["ApiProblemDetails"];
            };
        };
        /** @description 외부 서비스 오류 */
        UpstreamProblem: {
            headers: {
                "X-Trace-Id": components["headers"]["TraceId"];
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://api.timing-jeju.example/problems/service-unavailable",
                 *       "title": "서비스를 일시적으로 사용할 수 없습니다.",
                 *       "status": 503,
                 *       "detail": "잠시 후 다시 시도해 주세요.",
                 *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                 *       "code": "SERVICE_UNAVAILABLE",
                 *       "traceId": "0123456789abcdef0123456789abcdef",
                 *       "fieldErrors": []
                 *     }
                 */
                "application/problem+json": components["schemas"]["ApiProblemDetails"];
            };
        };
        /** @description 안전한 내부 서버 오류 */
        InternalServerProblem: {
            headers: {
                "X-Trace-Id": components["headers"]["TraceId"];
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                 *       "title": "내부 서버 오류가 발생했습니다.",
                 *       "status": 500,
                 *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                 *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                 *       "code": "INTERNAL_SERVER_ERROR",
                 *       "traceId": "0123456789abcdef0123456789abcdef",
                 *       "fieldErrors": []
                 *     }
                 */
                "application/problem+json": components["schemas"]["ApiProblemDetails"];
            };
        };
    };
    parameters: {
        /**
         * @description 직전 응답 ETag를 큰따옴표까지 그대로 전달
         * @example "resource.v1"
         */
        "If-Match": string;
        /**
         * @description 생성 요청 replay를 식별하는 공개 가능한 key
         * @example 44000000-0000-4000-8000-000000000044
         */
        "Idempotency-Key": string;
    };
    requestBodies: never;
    headers: {
        /**
         * @description 서버가 요청 단위로 생성한 추적 식별자
         * @example 0123456789abcdef0123456789abcdef
         */
        TraceId: string;
        /**
         * @description 생성한 리소스의 상대 URI
         * @example /api/v1/trips/44000000-0000-4000-8000-000000000044
         */
        Location: string;
        /**
         * @description 큰따옴표를 포함한 strong opaque validator
         * @example "resource.v1"
         */
        ETag: string;
        /**
         * @description 동일 요청의 저장된 응답 replay 여부
         * @example false
         */
        "Idempotency-Replayed": boolean;
    };
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    tripTransportEventsUpdate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 여행 aggregate의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-47000000-0000-4000-8000-000000000047-r1"
                 */
                "If-Match": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "eventType": "arrival",
                 *       "transportType": "flight",
                 *       "terminalPlaceId": "47000000-0000-4000-8000-000000000048",
                 *       "customTerminalName": null,
                 *       "scheduledAt": "2026-09-01T09:00:00+09:00",
                 *       "transportNumber": "KE1001",
                 *       "note": null
                 *     }
                 */
                "application/json": components["schemas"]["TransportEventRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "47000000-0000-4000-8000-000000000047",
                     *       "scheduleEffect": "none",
                     *       "regenerationRequired": false,
                     *       "activeScheduleVersionId": null,
                     *       "tripStatus": "draft",
                     *       "updatedAt": "2026-09-01T09:00:00+09:00",
                     *       "eventType": "arrival",
                     *       "deleted": false,
                     *       "event": {
                     *         "eventType": "arrival",
                     *         "transportType": "flight",
                     *         "terminalPlaceId": "47000000-0000-4000-8000-000000000048",
                     *         "customTerminalName": null,
                     *         "scheduledAt": "2026-09-01T09:00:00+09:00",
                     *         "transportNumber": "KE1001",
                     *         "note": null
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["TransportEventMutationResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "필수값, 형식과 If-Match를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-not-found",
                     *       "title": "여행을 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 여행이 없거나 접근할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-version-conflict",
                     *       "title": "여행 조건이 이미 변경되었습니다",
                     *       "status": 409,
                     *       "detail": "최신 여행과 ETag를 조회한 뒤 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_VERSION_CONFLICT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/transport-event-constraint-violation",
                     *       "title": "교통 이벤트를 처리할 수 없습니다",
                     *       "status": 422,
                     *       "detail": "날짜, +09:00 시간대와 터미널 입력을 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRANSPORT_EVENT_CONSTRAINT_VIOLATION",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
        };
    };
    tripTransportEventsDelete: {
        parameters: {
            query: {
                /**
                 * @description 삭제할 교통 이벤트 종류. arrival 또는 departure
                 * @example arrival
                 */
                eventType: "arrival" | "departure";
            };
            header: {
                /**
                 * @description 직전 여행 aggregate의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-47000000-0000-4000-8000-000000000047-r1"
                 */
                "If-Match": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "47000000-0000-4000-8000-000000000047",
                     *       "scheduleEffect": "none",
                     *       "regenerationRequired": false,
                     *       "activeScheduleVersionId": null,
                     *       "tripStatus": "draft",
                     *       "updatedAt": "2026-09-01T09:00:00+09:00",
                     *       "eventType": "departure",
                     *       "deleted": true,
                     *       "event": null
                     *     }
                     */
                    "application/json": components["schemas"]["TransportEventMutationResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "필수값, 형식과 If-Match를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/transport-event-not-found",
                     *       "title": "교통 이벤트를 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "삭제할 도착 또는 출발 교통 이벤트가 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRANSPORT_EVENT_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-version-conflict",
                     *       "title": "여행 조건이 이미 변경되었습니다",
                     *       "status": 409,
                     *       "detail": "최신 여행과 ETag를 조회한 뒤 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_VERSION_CONFLICT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/transport-event-constraint-violation",
                     *       "title": "교통 이벤트를 처리할 수 없습니다",
                     *       "status": 422,
                     *       "detail": "날짜, +09:00 시간대와 터미널 입력을 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRANSPORT_EVENT_CONSTRAINT_VIOLATION",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
        };
    };
    tripScheduleOrderUpdate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 여행 상세 응답의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-50000000-0000-4000-8000-000000000001-r1"
                 */
                "If-Match": string;
                /**
                 * @description 일정 항목 추가 요청을 24시간 식별하는 1~128자 printable ASCII 값입니다.
                 * @example schedule-item-create-20260906-001
                 */
                "Idempotency-Key": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "expectedActiveScheduleVersionId": "60000000-0000-4000-8000-000000000001",
                 *       "days": [
                 *         {
                 *           "dayNo": 1,
                 *           "orderedItemIds": [
                 *             "61000000-0000-4000-8000-000000000001"
                 *           ]
                 *         }
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["ReorderScheduleRequest"];
            };
        };
        responses: {
            /** @description 순서가 반영된 새 일정 버전 */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    ETag: components["headers"]["ETag"];
                    "Idempotency-Replayed": components["headers"]["Idempotency-Replayed"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "50000000-0000-4000-8000-000000000001",
                     *       "previousScheduleVersionId": "60000000-0000-4000-8000-000000000001",
                     *       "activeScheduleVersionId": "60000000-0000-4000-8000-000000000002",
                     *       "versionNo": 2,
                     *       "sourceType": "user_edit",
                     *       "feasibilityStale": true,
                     *       "changedItemIds": [
                     *         "61000000-0000-4000-8000-000000000003"
                     *       ],
                     *       "etag": "\"trip-50000000-0000-4000-8000-000000000001-r2\"",
                     *       "updatedAt": "2026-10-01T09:30:00+09:00"
                     *     }
                     */
                    "application/json": components["schemas"]["ScheduleMutationResponse"];
                };
            };
            /** @description INVALID_REQUEST 오류 */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description AUTHENTICATION_REQUIRED 오류 */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description null 오류 */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                     *       "title": "접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "접근 권한이 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTH_ACCESS_DENIED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description SCHEDULE_ITEM_NOT_FOUND 오류 */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description ACTIVE_SCHEDULE_VERSION_CONFLICT 오류 */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    /** @description 동일 payload가 처리 중인 IDEMPOTENCY_KEY_REUSED 응답에만 재시도 대기 초를 제공합니다. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description SCHEDULE_ITEM_INVALID 오류 */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description INTERNAL_SERVER_ERROR 오류 */
            500: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                     *       "title": "내부 서버 오류가 발생했습니다.",
                     *       "status": 500,
                     *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INTERNAL_SERVER_ERROR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripPreferencesUpdate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 여행 상세 응답의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-44000000-0000-4000-8000-000000000044-r1"
                 */
                "If-Match": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "preferredCategories": [
                 *         "tourist_attraction",
                 *         "cafe"
                 *       ],
                 *       "arrivalRegionCode": "jeju-si",
                 *       "departureRegionCode": "jeju-si",
                 *       "preferredRegionCodes": [
                 *         "seongsan"
                 *       ],
                 *       "startPlaceId": "20000000-0000-4000-8000-000000000086",
                 *       "endPlaceId": null,
                 *       "transportModes": [
                 *         {
                 *           "mode": "public_transit",
                 *           "priority": 1,
                 *           "primary": true
                 *         },
                 *         {
                 *           "mode": "taxi",
                 *           "priority": 2,
                 *           "primary": false
                 *         }
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["ReplaceTripPreferencesRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "50000000-0000-4000-8000-000000000086",
                     *       "preferences": {
                     *         "preferredCategories": [
                     *           "tourist_attraction",
                     *           "cafe"
                     *         ],
                     *         "arrivalRegionCode": "jeju-si",
                     *         "departureRegionCode": "jeju-si",
                     *         "preferredRegionCodes": [
                     *           "seongsan"
                     *         ],
                     *         "startPlaceId": "20000000-0000-4000-8000-000000000086",
                     *         "endPlaceId": null,
                     *         "transportModes": [
                     *           {
                     *             "mode": "public_transit",
                     *             "priority": 1,
                     *             "primary": true
                     *           },
                     *           {
                     *             "mode": "taxi",
                     *             "priority": 2,
                     *             "primary": false
                     *           }
                     *         ]
                     *       },
                     *       "scheduleEffect": "invalidated",
                     *       "regenerationRequired": true,
                     *       "activeScheduleVersionId": null,
                     *       "tripStatus": "draft",
                     *       "updatedAt": "2026-08-15T10:00:00+09:00"
                     *     }
                     */
                    "application/json": components["schemas"]["PreferencesResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Forbidden */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                     *       "title": "접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "접근 권한이 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTH_ACCESS_DENIED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Internal Server Error */
            500: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                     *       "title": "내부 서버 오류가 발생했습니다.",
                     *       "status": 500,
                     *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INTERNAL_SERVER_ERROR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Service Unavailable */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-data-unavailable",
                     *       "title": "여행 데이터를 사용할 수 없습니다",
                     *       "status": 503,
                     *       "detail": "잠시 후 다시 시도해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripPlacePreferencesUpdate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 여행 상세 응답의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-44000000-0000-4000-8000-000000000044-r1"
                 */
                "If-Match": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "items": [
                 *         {
                 *           "placeId": "48000000-0000-4000-8000-000000000010",
                 *           "type": "must_visit",
                 *           "targetDayNo": 2,
                 *           "priority": 90
                 *         },
                 *         {
                 *           "placeId": "48000000-0000-4000-8000-000000000011",
                 *           "type": "avoid",
                 *           "targetDayNo": null,
                 *           "priority": 10
                 *         }
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["PlacePreferencesRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "48000000-0000-4000-8000-000000000002",
                     *       "scheduleEffect": "none",
                     *       "regenerationRequired": false,
                     *       "activeScheduleVersionId": null,
                     *       "tripStatus": "draft",
                     *       "updatedAt": "2026-09-01T03:04:05.123456Z",
                     *       "items": [
                     *         {
                     *           "placeId": "48000000-0000-4000-8000-000000000010",
                     *           "type": "must_visit",
                     *           "targetDayNo": 2,
                     *           "priority": 90
                     *         },
                     *         {
                     *           "placeId": "48000000-0000-4000-8000-000000000011",
                     *           "type": "avoid",
                     *           "targetDayNo": null,
                     *           "priority": 10
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["PlacePreferencesResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description TRIP_DATA_UNAVAILABLE 오류 */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    pushDevicesUpdate: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description application-generated lowercase canonical UUID; hardware/advertising ID 금지
                 * @example 11300000-0000-4000-8000-000000000101
                 */
                deviceId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "platform": "IOS",
                 *       "registrationToken": "__REDACTED_REGISTRATION_TOKEN__",
                 *       "permissionStatus": "GRANTED",
                 *       "appVersion": "1.2.3",
                 *       "locale": "ko-KR",
                 *       "timeZone": "Asia/Seoul"
                 *     }
                 */
                "application/json": components["schemas"]["PushDeviceRegistrationRequest"];
            };
        };
        responses: {
            /** @description 200 PushDeviceResponse */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "deviceId": "11300000-0000-4000-8000-000000000101",
                     *       "platform": "IOS",
                     *       "permissionStatus": "GRANTED",
                     *       "active": true,
                     *       "updatedAt": "2026-08-25T00:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["PushDeviceResponse"];
                };
            };
            /** @description INVALID_PUSH_NOTIFICATION_REQUEST */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/invalid-push-notification-request",
                     *       "title": "푸시 알림 요청 오류",
                     *       "status": 400,
                     *       "detail": "푸시 알림 요청 값이 올바르지 않습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_PUSH_NOTIFICATION_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Authorization 누락은 AUTHENTICATION_REQUIRED, 제공된 인증 정보 실패는 INVALID_ACCESS_TOKEN */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description AUTH_ACCESS_DENIED */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                     *       "title": "접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "접근 권한이 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTH_ACCESS_DENIED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description INTERNAL_SERVER_ERROR */
            500: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                     *       "title": "내부 서버 오류가 발생했습니다.",
                     *       "status": 500,
                     *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INTERNAL_SERVER_ERROR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description PUSH_NOTIFICATION_DATA_UNAVAILABLE */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/push-notification-data-unavailable",
                     *       "title": "푸시 알림 데이터 조회 불가",
                     *       "status": 503,
                     *       "detail": "푸시 알림 데이터를 처리할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PUSH_NOTIFICATION_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    pushDevicesDelete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description application-generated lowercase canonical UUID; hardware/advertising ID 금지
                 * @example 11300000-0000-4000-8000-000000000101
                 */
                deviceId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 204 No Content; response body forbidden */
            204: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description INVALID_PUSH_NOTIFICATION_REQUEST */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/invalid-push-notification-request",
                     *       "title": "푸시 알림 요청 오류",
                     *       "status": 400,
                     *       "detail": "푸시 알림 요청 값이 올바르지 않습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_PUSH_NOTIFICATION_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Authorization 누락은 AUTHENTICATION_REQUIRED, 제공된 인증 정보 실패는 INVALID_ACCESS_TOKEN */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description AUTH_ACCESS_DENIED */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                     *       "title": "접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "접근 권한이 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTH_ACCESS_DENIED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description INTERNAL_SERVER_ERROR */
            500: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                     *       "title": "내부 서버 오류가 발생했습니다.",
                     *       "status": 500,
                     *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INTERNAL_SERVER_ERROR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description PUSH_NOTIFICATION_DATA_UNAVAILABLE */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/push-notification-data-unavailable",
                     *       "title": "푸시 알림 데이터 조회 불가",
                     *       "status": 503,
                     *       "detail": "푸시 알림 데이터를 처리할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PUSH_NOTIFICATION_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    profileImageRead: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    /**
                     * @description 프로필 이미지 version을 나타내는 strong ETag
                     * @example "profile-image-0"
                     */
                    ETag: string;
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "profileImageObjectKey": null,
                     *       "profileImageUrl": "https://provider.example/avatar",
                     *       "profileImageSource": "provider",
                     *       "profileImageVersion": 0,
                     *       "updatedAt": "2026-08-25T10:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["ProfileImageResponse"];
                };
            };
            /** @description AUTHENTICATION_REQUIRED, INVALID_ACCESS_TOKEN */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            500: components["responses"]["InternalServerProblem"];
            /** @description PROFILE_DATA_UNAVAILABLE */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    profileImageUpdate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 프로필 이미지 확정 또는 해제 요청을 식별하는 1~128자 printable ASCII 값입니다.
                 * @example profile-image-confirm-78
                 */
                "Idempotency-Key": string;
                /**
                 * @description 직전 프로필 이미지 응답의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "profile-image-0"
                 */
                "If-Match": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "profileImageObjectKey": "18000000-0000-4000-8000-000000000018/profile/78000000-0000-4000-8000-000000000078"
                 *     }
                 */
                "application/json": components["schemas"]["ProfileImageRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    /**
                     * @description 동일 요청의 저장된 응답 replay 여부
                     * @example false
                     */
                    "Idempotency-Replayed": boolean;
                    /**
                     * @description 프로필 이미지 version을 나타내는 strong ETag
                     * @example "profile-image-1"
                     */
                    ETag: string;
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "profileImageObjectKey": "18000000-0000-4000-8000-000000000018/profile/78000000-0000-4000-8000-000000000078",
                     *       "profileImageUrl": "https://example.supabase.co/storage/v1/object/public/profile-images/18000000-0000-4000-8000-000000000018/profile/78000000-0000-4000-8000-000000000078",
                     *       "profileImageSource": "storage",
                     *       "profileImageVersion": 1,
                     *       "updatedAt": "2026-08-25T10:05:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["ProfileImageResponse"];
                };
            };
            /** @description INVALID_PROFILE_IMAGE_REQUEST */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description AUTHENTICATION_REQUIRED, INVALID_ACCESS_TOKEN */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description PROFILE_IMAGE_NOT_FOUND */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description PROFILE_IMAGE_VERSION_CONFLICT, IDEMPOTENCY_PAYLOAD_CONFLICT, IDEMPOTENCY_REQUEST_IN_PROGRESS */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description PROFILE_IMAGE_TOO_LARGE */
            413: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description PROFILE_IMAGE_MEDIA_TYPE_UNSUPPORTED */
            415: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description PROFILE_IMAGE_STORAGE_UNAVAILABLE */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    legalConsentsUpdate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "consents": [
                 *         {
                 *           "documentId": "19000000-0000-4000-8000-000000000019",
                 *           "agreed": true
                 *         }
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["UserConsentsRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "requiredConsentsSatisfied": true,
                     *       "updatedAt": "2026-08-25T00:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["UserConsentsResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/invalid-profile-legal-request",
                     *       "title": "요청 형식 오류",
                     *       "status": 400,
                     *       "detail": "프로필 수정 요청 형식이 올바르지 않습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_PROFILE_LEGAL_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/profile-conflict",
                     *       "title": "프로필 연결 충돌",
                     *       "status": 409,
                     *       "detail": "인증 프로필을 현재 사용자에게 안전하게 연결할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PROFILE_CONFLICT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/legal-consent-required",
                     *       "title": "필수 동의 필요",
                     *       "status": 422,
                     *       "detail": "현재 시행 중인 필수 법정 문서에 모두 동의해야 합니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "LEGAL_CONSENT_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description Service Unavailable */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/profile-data-unavailable",
                     *       "title": "프로필 조회 불가",
                     *       "status": 503,
                     *       "detail": "프로필 데이터를 불러올 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PROFILE_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripsList: {
        parameters: {
            query?: {
                /**
                 * @description status 요청 조건
                 * @example draft
                 */
                status?: "draft" | "generating" | "planned" | "live" | "completed" | "cancelled" | "failed";
                /**
                 * @description sort 요청 조건
                 * @example updated_at_desc
                 */
                sort?: "updated_at_desc";
                /**
                 * @description 직전 응답 nextCursor를 해석하지 않고 그대로 전달하는 opaque cursor
                 * @example eyJvZmZzZXQiOjIwfQ
                 */
                cursor?: string;
                /**
                 * @description 한 page의 최대 item 수
                 * @example 20
                 */
                size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [
                     *         {
                     *           "tripId": "44000000-0000-4000-8000-000000000044",
                     *           "title": "제주 3박 4일",
                     *           "status": "draft",
                     *           "startDate": "2026-09-10",
                     *           "endDate": "2026-09-13",
                     *           "timezone": "Asia/Seoul",
                     *           "activeScheduleVersionId": null,
                     *           "totalScore": null,
                     *           "scoreProvenance": null,
                     *           "createdAt": "2026-08-25T00:00:00Z",
                     *           "updatedAt": "2026-08-25T00:00:00Z"
                     *         }
                     *       ],
                     *       "page": {
                     *         "size": 20,
                     *         "hasNext": false,
                     *         "nextCursor": null
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["TripsListResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-query-parameter",
                     *       "title": "요청 검색 조건이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "검색 조건의 형식과 범위를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_QUERY_PARAMETER",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            500: components["responses"]["InternalServerProblem"];
            /** @description Service Unavailable */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-data-unavailable",
                     *       "title": "여행 데이터를 사용할 수 없습니다",
                     *       "status": 503,
                     *       "detail": "잠시 후 다시 시도해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripsCreate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 여행 생성 요청을 24시간 동안 식별하는 lowercase canonical UUID입니다.
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "title": "제주 3박 4일",
                 *       "startDate": "2026-09-10",
                 *       "endDate": "2026-09-13",
                 *       "timezone": "Asia/Seoul",
                 *       "userPace": "normal",
                 *       "transportModes": [
                 *         {
                 *           "mode": "public_transit",
                 *           "priority": 1,
                 *           "primary": true
                 *         }
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["CreateTripRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    "Idempotency-Replayed": components["headers"]["Idempotency-Replayed"];
                    ETag: components["headers"]["ETag"];
                    Location: components["headers"]["Location"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "44000000-0000-4000-8000-000000000044",
                     *       "title": "제주 3박 4일",
                     *       "status": "draft",
                     *       "startDate": "2026-09-10",
                     *       "endDate": "2026-09-13",
                     *       "timezone": "Asia/Seoul",
                     *       "userPace": "normal",
                     *       "transportModes": [
                     *         {
                     *           "mode": "public_transit",
                     *           "priority": 1,
                     *           "primary": true
                     *         }
                     *       ],
                     *       "days": [
                     *         {
                     *           "dayId": "44000000-0000-4000-8001-000000000044",
                     *           "dayNo": 1,
                     *           "date": "2026-09-10"
                     *         },
                     *         {
                     *           "dayId": "44000000-0000-4000-8002-000000000044",
                     *           "dayNo": 2,
                     *           "date": "2026-09-11"
                     *         },
                     *         {
                     *           "dayId": "44000000-0000-4000-8003-000000000044",
                     *           "dayNo": 3,
                     *           "date": "2026-09-12"
                     *         },
                     *         {
                     *           "dayId": "44000000-0000-4000-8004-000000000044",
                     *           "dayNo": 4,
                     *           "date": "2026-09-13"
                     *         }
                     *       ],
                     *       "activeScheduleVersionId": null,
                     *       "totalScore": null,
                     *       "scoreProvenance": null,
                     *       "scheduleEffect": "none",
                     *       "regenerationRequired": false,
                     *       "createdAt": "2026-08-25T00:00:00Z",
                     *       "updatedAt": "2026-08-25T00:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["TripDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "여행 제목, 날짜, timezone과 교통 우선순위를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/idempotency-key-reused",
                     *       "title": "멱등성 키를 재사용할 수 없습니다.",
                     *       "status": 409,
                     *       "detail": "새 Idempotency-Key로 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "IDEMPOTENCY_KEY_REUSED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-constraint-violation",
                     *       "title": "여행 조건을 처리할 수 없습니다",
                     *       "status": 422,
                     *       "detail": "여행은 1일부터 30일까지이며 날짜와 교통 우선순위가 일관되어야 합니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_CONSTRAINT_VIOLATION",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description Service Unavailable */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-data-unavailable",
                     *       "title": "여행 데이터를 사용할 수 없습니다",
                     *       "status": 503,
                     *       "detail": "잠시 후 다시 시도해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripScheduleItemCreate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 여행 상세 응답의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-50000000-0000-4000-8000-000000000001-r1"
                 */
                "If-Match": string;
                /**
                 * @description 일정 항목 추가 요청을 24시간 식별하는 1~128자 printable ASCII 값입니다.
                 * @example schedule-item-create-20260906-001
                 */
                "Idempotency-Key": string;
            };
            path: {
                /**
                 * @description 일정을 편집할 소유 여행의 lowercase canonical UUID
                 * @example 50000000-0000-4000-8000-000000000001
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "expectedActiveScheduleVersionId": "60000000-0000-4000-8000-000000000001",
                 *       "dayNo": 1,
                 *       "sequenceNo": 2,
                 *       "itemType": "place_visit",
                 *       "placeId": "20000000-0000-4000-8000-000000000001",
                 *       "accommodationId": "70000000-0000-4000-8000-000000000001",
                 *       "transportEventId": "71000000-0000-4000-8000-000000000001",
                 *       "title": "성산일출봉 방문",
                 *       "plannedStartAt": "2026-10-01T11:00:00+09:00",
                 *       "stayMinutes": 60,
                 *       "bufferAfterMinutes": 10,
                 *       "required": true,
                 *       "memo": "정상 도착 후 입장"
                 *     }
                 */
                "application/json": components["schemas"]["CreateScheduleItemRequest"];
            };
        };
        responses: {
            /** @description 새 user_edit 일정 버전 생성 완료 */
            201: {
                headers: {
                    "Idempotency-Replayed": components["headers"]["Idempotency-Replayed"];
                    ETag: components["headers"]["ETag"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "50000000-0000-4000-8000-000000000001",
                     *       "previousScheduleVersionId": "60000000-0000-4000-8000-000000000001",
                     *       "activeScheduleVersionId": "60000000-0000-4000-8000-000000000002",
                     *       "versionNo": 2,
                     *       "sourceType": "user_edit",
                     *       "feasibilityStale": true,
                     *       "changedItemIds": [
                     *         "61000000-0000-4000-8000-000000000002"
                     *       ],
                     *       "etag": "\"trip-50000000-0000-4000-8000-000000000001-r2\"",
                     *       "updatedAt": "2026-10-01T09:30:00+09:00"
                     *     }
                     */
                    "application/json": components["schemas"]["ScheduleMutationResponse"];
                };
            };
            /** @description INVALID_REQUEST */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description AUTHENTICATION_REQUIRED */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description null 오류 */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                     *       "title": "접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "접근 권한이 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTH_ACCESS_DENIED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description SCHEDULE_VERSION_NOT_FOUND */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description ACTIVE_SCHEDULE_VERSION_CONFLICT */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    /** @description 동일 payload가 처리 중인 IDEMPOTENCY_KEY_REUSED 응답에만 재시도 대기 초를 제공합니다. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description SCHEDULE_ITEM_INVALID */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description INTERNAL_SERVER_ERROR 오류 */
            500: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                     *       "title": "내부 서버 오류가 발생했습니다.",
                     *       "status": 500,
                     *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INTERNAL_SERVER_ERROR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripScheduleItemMoveUpdate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 여행 상세 응답의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-50000000-0000-4000-8000-000000000001-r1"
                 */
                "If-Match": string;
                /**
                 * @description 일정 항목 추가 요청을 24시간 식별하는 1~128자 printable ASCII 값입니다.
                 * @example schedule-item-create-20260906-001
                 */
                "Idempotency-Key": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
                /**
                 * @description itemId 요청 조건
                 * @example 61000000-0000-4000-8000-000000000003
                 */
                itemId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "expectedActiveScheduleVersionId": "60000000-0000-4000-8000-000000000001",
                 *       "targetDayNo": 2,
                 *       "targetSequenceNo": 1,
                 *       "plannedStartAt": "2026-10-02T10:20:00+09:00"
                 *     }
                 */
                "application/json": components["schemas"]["MoveScheduleItemRequest"];
            };
        };
        responses: {
            /** @description Day 이동이 반영된 새 일정 버전 */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    ETag: components["headers"]["ETag"];
                    "Idempotency-Replayed": components["headers"]["Idempotency-Replayed"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "50000000-0000-4000-8000-000000000001",
                     *       "previousScheduleVersionId": "60000000-0000-4000-8000-000000000001",
                     *       "activeScheduleVersionId": "60000000-0000-4000-8000-000000000002",
                     *       "versionNo": 2,
                     *       "sourceType": "user_edit",
                     *       "feasibilityStale": true,
                     *       "changedItemIds": [
                     *         "61000000-0000-4000-8000-000000000003"
                     *       ],
                     *       "etag": "\"trip-50000000-0000-4000-8000-000000000001-r2\"",
                     *       "updatedAt": "2026-10-01T09:30:00+09:00"
                     *     }
                     */
                    "application/json": components["schemas"]["ScheduleMutationResponse"];
                };
            };
            /** @description INVALID_REQUEST 오류 */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description AUTHENTICATION_REQUIRED 오류 */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description null 오류 */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                     *       "title": "접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "접근 권한이 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTH_ACCESS_DENIED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description SCHEDULE_ITEM_NOT_FOUND 오류 */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description ACTIVE_SCHEDULE_VERSION_CONFLICT 오류 */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    /** @description 동일 payload가 처리 중인 IDEMPOTENCY_KEY_REUSED 응답에만 재시도 대기 초를 제공합니다. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description SCHEDULE_ITEM_INVALID 오류 */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description INTERNAL_SERVER_ERROR 오류 */
            500: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                     *       "title": "내부 서버 오류가 발생했습니다.",
                     *       "status": 500,
                     *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INTERNAL_SERVER_ERROR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripAccommodationsCreate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 숙소 생성 요청을 여행과 사용자 범위에서 24시간 식별하는 1~128자 printable ASCII 값입니다.
                 * @example accommodation-create-68
                 */
                "Idempotency-Key": string;
                /**
                 * @description 직전 여행 aggregate의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-68000000-0000-4000-8000-000000000068-r1"
                 */
                "If-Match": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "placeId": null,
                 *       "customName": "제주알호텔",
                 *       "checkInDate": "2026-09-10",
                 *       "checkOutDate": "2026-09-12",
                 *       "checkInTime": "15:00",
                 *       "checkOutTime": "11:00"
                 *     }
                 */
                "application/json": components["schemas"]["CreateAccommodationRequest"];
            };
        };
        responses: {
            /** @description Created */
            201: {
                headers: {
                    "Idempotency-Replayed": components["headers"]["Idempotency-Replayed"];
                    ETag: components["headers"]["ETag"];
                    Location: components["headers"]["Location"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "68000000-0000-4000-8000-000000000068",
                     *       "accommodationId": "68000000-0000-4000-8000-000000000069",
                     *       "accommodation": {
                     *         "accommodationId": "68000000-0000-4000-8000-000000000069",
                     *         "placeId": null,
                     *         "customName": "제주알호텔",
                     *         "name": "제주알호텔",
                     *         "checkInDate": "2026-09-10",
                     *         "checkOutDate": "2026-09-12",
                     *         "checkInTime": "15:00",
                     *         "checkOutTime": "11:00",
                     *         "sequenceNo": 1
                     *       },
                     *       "scheduleEffect": "none",
                     *       "regenerationRequired": false,
                     *       "activeScheduleVersionId": null,
                     *       "tripStatus": "draft",
                     *       "etag": "\"trip-68000000-0000-4000-8000-000000000068-r2\"",
                     *       "createdAt": "2026-09-01T14:00:00+09:00",
                     *       "updatedAt": "2026-09-01T14:00:00+09:00"
                     *     }
                     */
                    "application/json": components["schemas"]["AccommodationMutationPayload"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "필수값, 형식, XOR, Idempotency-Key와 If-Match를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-not-found",
                     *       "title": "여행을 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 여행이 없거나 접근할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/idempotency-key-reused",
                     *       "title": "멱등성 키가 다른 요청에 사용되었습니다",
                     *       "status": 409,
                     *       "detail": "새 Idempotency-Key로 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "IDEMPOTENCY_KEY_REUSED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/accommodation-date-gap-or-overlap",
                     *       "title": "숙소 날짜를 적용할 수 없습니다",
                     *       "status": 422,
                     *       "detail": "여행 기간 안에서 숙소 날짜의 공백과 중복 없이 순서를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "ACCOMMODATION_DATE_GAP_OR_OVERLAP",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
        };
    };
    savedPlacesList: {
        parameters: {
            query?: {
                /**
                 * @description tag 요청 조건
                 * @example 오름
                 */
                tag?: string;
                /**
                 * @description 공개 canonical 장소 category
                 * @example content-type:12
                 */
                category?: string;
                /**
                 * @description 정규화 제주 지역 code
                 * @example jeju-seogwipo
                 */
                regionCode?: string;
                /**
                 * @description sort 요청 조건
                 * @example saved_at_desc
                 */
                sort?: string;
                /**
                 * @description 직전 응답 nextCursor를 해석하지 않고 그대로 전달하는 opaque cursor
                 * @example eyJvZmZzZXQiOjIwfQ
                 */
                cursor?: string;
                /**
                 * @description 한 page의 최대 item 수
                 * @example 20
                 */
                size?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [
                     *         {
                     *           "placeId": "34000000-0000-4000-8000-000000000034",
                     *           "name": "새별오름",
                     *           "category": "content-type:12",
                     *           "regionLabel": "제주시",
                     *           "thumbnailUrl": "https://example.invalid/place.jpg",
                     *           "recommendedStayMinutes": 90,
                     *           "memo": "노을 시간 방문",
                     *           "tags": [
                     *             "노을",
                     *             "오름"
                     *           ],
                     *           "priority": 5,
                     *           "targetDay": 2,
                     *           "savedAt": "2026-08-25T00:00:00Z",
                     *           "updatedAt": "2026-08-25T00:00:00Z"
                     *         }
                     *       ],
                     *       "page": {
                     *         "size": 20,
                     *         "hasNext": false,
                     *         "nextCursor": null
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["SavedPlacesListResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-query-parameter",
                     *       "title": "조회 조건이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "관심 장소 조회 조건을 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_QUERY_PARAMETER",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            401: components["responses"]["AuthenticationProblem"];
            403: components["responses"]["AccessDeniedProblem"];
            500: components["responses"]["InternalServerProblem"];
        };
    };
    savedPlacesCreate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 관심 장소 생성 요청 replay를 식별하는 공개 가능한 key
                 * @example saved-place-create-34
                 */
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "placeId": "34000000-0000-4000-8000-000000000034",
                 *       "memo": "노을 시간 방문",
                 *       "tags": [
                 *         "오름",
                 *         "노을"
                 *       ],
                 *       "priority": 5,
                 *       "targetDay": 2
                 *     }
                 */
                "application/json": components["schemas"]["CreateSavedPlaceRequest"];
            };
        };
        responses: {
            /** @description 동일 요청 replay 또는 동일한 현재 resource */
            200: {
                headers: {
                    "Idempotency-Replayed": components["headers"]["Idempotency-Replayed"];
                    ETag: components["headers"]["ETag"];
                    Location: components["headers"]["Location"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "placeId": "34000000-0000-4000-8000-000000000034",
                     *       "name": "새별오름",
                     *       "category": "content-type:12",
                     *       "regionLabel": "제주시",
                     *       "thumbnailUrl": "https://example.invalid/place.jpg",
                     *       "recommendedStayMinutes": 90,
                     *       "memo": "노을 시간 방문",
                     *       "tags": [
                     *         "노을",
                     *         "오름"
                     *       ],
                     *       "priority": 5,
                     *       "targetDay": 2,
                     *       "savedAt": "2026-08-25T00:00:00Z",
                     *       "updatedAt": "2026-08-25T00:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["SavedPlaceResponse"];
                };
            };
            /** @description Created */
            201: {
                headers: {
                    "Idempotency-Replayed": components["headers"]["Idempotency-Replayed"];
                    ETag: components["headers"]["ETag"];
                    Location: components["headers"]["Location"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "placeId": "34000000-0000-4000-8000-000000000034",
                     *       "name": "새별오름",
                     *       "category": "content-type:12",
                     *       "regionLabel": "제주시",
                     *       "thumbnailUrl": "https://example.invalid/place.jpg",
                     *       "recommendedStayMinutes": 90,
                     *       "memo": "노을 시간 방문",
                     *       "tags": [
                     *         "노을",
                     *         "오름"
                     *       ],
                     *       "priority": 5,
                     *       "targetDay": 2,
                     *       "savedAt": "2026-08-25T00:00:00Z",
                     *       "updatedAt": "2026-08-25T00:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["SavedPlaceResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "관심 장소 요청 값을 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            401: components["responses"]["AuthenticationProblem"];
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/place-not-found",
                     *       "title": "장소를 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "저장하려는 장소 정보가 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PLACE_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/idempotency-payload-conflict",
                     *       "title": "같은 멱등성 키의 요청 내용이 다릅니다",
                     *       "status": 409,
                     *       "detail": "새 Idempotency-Key로 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "IDEMPOTENCY_PAYLOAD_CONFLICT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/saved-place-constraint-violation",
                     *       "title": "관심 장소 값을 처리할 수 없습니다",
                     *       "status": 422,
                     *       "detail": "메모, 태그, 우선순위 또는 희망 Day 값을 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SAVED_PLACE_CONSTRAINT_VIOLATION",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
        };
    };
    tripsRead: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "44000000-0000-4000-8000-000000000044",
                     *       "title": "제주 3박 4일",
                     *       "status": "draft",
                     *       "startDate": "2026-09-10",
                     *       "endDate": "2026-09-13",
                     *       "timezone": "Asia/Seoul",
                     *       "userPace": "normal",
                     *       "transportModes": [
                     *         {
                     *           "mode": "public_transit",
                     *           "priority": 1,
                     *           "primary": true
                     *         }
                     *       ],
                     *       "days": [
                     *         {
                     *           "dayId": "44000000-0000-4000-8001-000000000044",
                     *           "dayNo": 1,
                     *           "date": "2026-09-10"
                     *         },
                     *         {
                     *           "dayId": "44000000-0000-4000-8002-000000000044",
                     *           "dayNo": 2,
                     *           "date": "2026-09-11"
                     *         },
                     *         {
                     *           "dayId": "44000000-0000-4000-8003-000000000044",
                     *           "dayNo": 3,
                     *           "date": "2026-09-12"
                     *         },
                     *         {
                     *           "dayId": "44000000-0000-4000-8004-000000000044",
                     *           "dayNo": 4,
                     *           "date": "2026-09-13"
                     *         }
                     *       ],
                     *       "activeScheduleVersionId": null,
                     *       "totalScore": null,
                     *       "scoreProvenance": null,
                     *       "scheduleEffect": "none",
                     *       "regenerationRequired": false,
                     *       "createdAt": "2026-08-25T00:00:00Z",
                     *       "updatedAt": "2026-08-25T00:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["TripDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "여행 제목, 날짜, timezone과 교통 우선순위를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-not-found",
                     *       "title": "여행을 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 여행이 없거나 접근할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description Service Unavailable */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-data-unavailable",
                     *       "title": "여행 데이터를 사용할 수 없습니다",
                     *       "status": 503,
                     *       "detail": "잠시 후 다시 시도해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripsDelete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "여행 제목, 날짜, timezone과 교통 우선순위를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-not-found",
                     *       "title": "여행을 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 여행이 없거나 접근할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-delete-conflict",
                     *       "title": "여행을 삭제할 수 없습니다",
                     *       "status": 409,
                     *       "detail": "라이브 일정 또는 처리 중인 비동기 작업이 끝난 뒤 다시 시도해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_DELETE_CONFLICT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description Service Unavailable */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-data-unavailable",
                     *       "title": "여행 데이터를 사용할 수 없습니다",
                     *       "status": 503,
                     *       "detail": "잠시 후 다시 시도해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripsUpdate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 여행 상세 응답의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-44000000-0000-4000-8000-000000000044-r1"
                 */
                "If-Match": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "title": "제주 가족 여행",
                 *       "startDate": "2026-09-10",
                 *       "endDate": "2026-09-13",
                 *       "timezone": "Asia/Seoul",
                 *       "userPace": "slow",
                 *       "transportModes": [
                 *         {
                 *           "mode": "public_transit",
                 *           "priority": 1,
                 *           "primary": true
                 *         }
                 *       ]
                 *     }
                 */
                "application/json": components["schemas"]["PatchTripRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "44000000-0000-4000-8000-000000000044",
                     *       "title": "제주 3박 4일",
                     *       "status": "draft",
                     *       "startDate": "2026-09-10",
                     *       "endDate": "2026-09-13",
                     *       "timezone": "Asia/Seoul",
                     *       "userPace": "normal",
                     *       "transportModes": [
                     *         {
                     *           "mode": "public_transit",
                     *           "priority": 1,
                     *           "primary": true
                     *         }
                     *       ],
                     *       "days": [
                     *         {
                     *           "dayId": "44000000-0000-4000-8001-000000000044",
                     *           "dayNo": 1,
                     *           "date": "2026-09-10"
                     *         },
                     *         {
                     *           "dayId": "44000000-0000-4000-8002-000000000044",
                     *           "dayNo": 2,
                     *           "date": "2026-09-11"
                     *         },
                     *         {
                     *           "dayId": "44000000-0000-4000-8003-000000000044",
                     *           "dayNo": 3,
                     *           "date": "2026-09-12"
                     *         },
                     *         {
                     *           "dayId": "44000000-0000-4000-8004-000000000044",
                     *           "dayNo": 4,
                     *           "date": "2026-09-13"
                     *         }
                     *       ],
                     *       "activeScheduleVersionId": null,
                     *       "totalScore": null,
                     *       "scoreProvenance": null,
                     *       "scheduleEffect": "maintained",
                     *       "regenerationRequired": false,
                     *       "createdAt": "2026-08-25T00:00:00Z",
                     *       "updatedAt": "2026-08-25T00:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["TripDetail"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/if-match-required",
                     *       "title": "If-Match가 필요합니다",
                     *       "status": 400,
                     *       "detail": "현재 여행 ETag를 If-Match로 보내 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "IF_MATCH_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-not-found",
                     *       "title": "여행을 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 여행이 없거나 접근할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-version-conflict",
                     *       "title": "여행이 이미 변경되었습니다",
                     *       "status": 409,
                     *       "detail": "최신 여행과 ETag를 조회한 뒤 다시 수정해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_VERSION_CONFLICT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-constraint-violation",
                     *       "title": "여행 조건을 처리할 수 없습니다",
                     *       "status": 422,
                     *       "detail": "여행은 1일부터 30일까지이며 날짜와 교통 우선순위가 일관되어야 합니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_CONSTRAINT_VIOLATION",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description Service Unavailable */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-data-unavailable",
                     *       "title": "여행 데이터를 사용할 수 없습니다",
                     *       "status": 503,
                     *       "detail": "잠시 후 다시 시도해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripScheduleItemDelete: {
        parameters: {
            query?: {
                /**
                 * @description expectedActiveScheduleVersionId 요청 조건
                 * @example 60000000-0000-4000-8000-000000000001
                 */
                expectedActiveScheduleVersionId?: string;
            };
            header: {
                /**
                 * @description 직전 여행 상세 응답의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-50000000-0000-4000-8000-000000000001-r1"
                 */
                "If-Match": string;
                /**
                 * @description 일정 항목 추가 요청을 24시간 식별하는 1~128자 printable ASCII 값입니다.
                 * @example schedule-item-create-20260906-001
                 */
                "Idempotency-Key": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
                /**
                 * @description itemId 요청 조건
                 * @example 61000000-0000-4000-8000-000000000003
                 */
                itemId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 삭제가 반영된 새 일정 버전 */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    ETag: components["headers"]["ETag"];
                    "Idempotency-Replayed": components["headers"]["Idempotency-Replayed"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "50000000-0000-4000-8000-000000000001",
                     *       "previousScheduleVersionId": "60000000-0000-4000-8000-000000000001",
                     *       "activeScheduleVersionId": "60000000-0000-4000-8000-000000000002",
                     *       "versionNo": 2,
                     *       "sourceType": "user_edit",
                     *       "feasibilityStale": true,
                     *       "changedItemIds": [],
                     *       "etag": "\"trip-50000000-0000-4000-8000-000000000001-r2\"",
                     *       "updatedAt": "2026-10-01T09:30:00+09:00"
                     *     }
                     */
                    "application/json": components["schemas"]["ScheduleMutationResponse"];
                };
            };
            /** @description INVALID_REQUEST 오류 */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description AUTHENTICATION_REQUIRED 오류 */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description null 오류 */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                     *       "title": "접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "접근 권한이 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTH_ACCESS_DENIED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description SCHEDULE_ITEM_NOT_FOUND 오류 */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description ACTIVE_SCHEDULE_VERSION_CONFLICT 오류 */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    /** @description 동일 payload가 처리 중인 IDEMPOTENCY_KEY_REUSED 응답에만 재시도 대기 초를 제공합니다. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description SCHEDULE_ITEM_INVALID 오류 */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description INTERNAL_SERVER_ERROR 오류 */
            500: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                     *       "title": "내부 서버 오류가 발생했습니다.",
                     *       "status": 500,
                     *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INTERNAL_SERVER_ERROR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripScheduleItemPatch: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 여행 상세 응답의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-50000000-0000-4000-8000-000000000001-r1"
                 */
                "If-Match": string;
                /**
                 * @description 일정 항목 추가 요청을 24시간 식별하는 1~128자 printable ASCII 값입니다.
                 * @example schedule-item-create-20260906-001
                 */
                "Idempotency-Key": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
                /**
                 * @description itemId 요청 조건
                 * @example 61000000-0000-4000-8000-000000000003
                 */
                itemId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "expectedActiveScheduleVersionId": "60000000-0000-4000-8000-000000000001",
                 *       "placeId": "20000000-0000-4000-8000-000000000001",
                 *       "title": "성산일출봉 방문",
                 *       "plannedStartAt": "2026-10-01T11:00:00+09:00",
                 *       "stayMinutes": 45,
                 *       "bufferAfterMinutes": 10,
                 *       "required": true,
                 *       "memo": null
                 *     }
                 */
                "application/json": components["schemas"]["PatchScheduleItemRequest"];
            };
        };
        responses: {
            /** @description 수정된 새 일정 버전 */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    ETag: components["headers"]["ETag"];
                    "Idempotency-Replayed": components["headers"]["Idempotency-Replayed"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "50000000-0000-4000-8000-000000000001",
                     *       "previousScheduleVersionId": "60000000-0000-4000-8000-000000000001",
                     *       "activeScheduleVersionId": "60000000-0000-4000-8000-000000000002",
                     *       "versionNo": 2,
                     *       "sourceType": "user_edit",
                     *       "feasibilityStale": true,
                     *       "changedItemIds": [
                     *         "61000000-0000-4000-8000-000000000003"
                     *       ],
                     *       "etag": "\"trip-50000000-0000-4000-8000-000000000001-r2\"",
                     *       "updatedAt": "2026-10-01T09:30:00+09:00"
                     *     }
                     */
                    "application/json": components["schemas"]["ScheduleMutationResponse"];
                };
            };
            /** @description INVALID_REQUEST 오류 */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description AUTHENTICATION_REQUIRED 오류 */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description null 오류 */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                     *       "title": "접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "접근 권한이 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTH_ACCESS_DENIED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description SCHEDULE_ITEM_NOT_FOUND 오류 */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description ACTIVE_SCHEDULE_VERSION_CONFLICT 오류 */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    /** @description 동일 payload가 처리 중인 IDEMPOTENCY_KEY_REUSED 응답에만 재시도 대기 초를 제공합니다. */
                    "Retry-After"?: number;
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description SCHEDULE_ITEM_INVALID 오류 */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description INTERNAL_SERVER_ERROR 오류 */
            500: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                     *       "title": "내부 서버 오류가 발생했습니다.",
                     *       "status": 500,
                     *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INTERNAL_SERVER_ERROR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripAccommodationsDelete: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 여행 aggregate의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-68000000-0000-4000-8000-000000000068-r1"
                 */
                "If-Match": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
                /**
                 * @description 여행에 속한 숙소의 lowercase canonical UUID
                 * @example 68000000-0000-4000-8000-000000000068
                 */
                accommodationId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description No Content */
            204: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "필수값, 형식, XOR, Idempotency-Key와 If-Match를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/accommodation-not-found",
                     *       "title": "숙소를 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 숙소가 없거나 해당 여행에 속하지 않습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "ACCOMMODATION_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-version-conflict",
                     *       "title": "여행 조건이 이미 변경되었습니다",
                     *       "status": 409,
                     *       "detail": "최신 여행과 ETag를 조회한 뒤 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_VERSION_CONFLICT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/accommodation-in-use-by-active-schedule",
                     *       "title": "활성 일정에서 사용하는 숙소는 삭제할 수 없습니다",
                     *       "status": 422,
                     *       "detail": "일정을 재생성하거나 활성 일정을 해제한 뒤 숙소를 삭제해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "ACCOMMODATION_IN_USE_BY_ACTIVE_SCHEDULE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
        };
    };
    tripAccommodationsUpdate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 여행 aggregate의 strong ETag를 큰따옴표까지 그대로 전달합니다.
                 * @example "trip-68000000-0000-4000-8000-000000000068-r1"
                 */
                "If-Match": string;
            };
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
                /**
                 * @description 여행에 속한 숙소의 lowercase canonical UUID
                 * @example 68000000-0000-4000-8000-000000000068
                 */
                accommodationId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "placeId": "68000000-0000-4000-8000-000000000070",
                 *       "customName": null,
                 *       "checkInDate": "2026-09-10",
                 *       "checkOutDate": "2026-09-12",
                 *       "checkInTime": "16:00",
                 *       "checkOutTime": "11:00"
                 *     }
                 */
                "application/json": components["schemas"]["PatchAccommodationRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "68000000-0000-4000-8000-000000000068",
                     *       "accommodationId": "68000000-0000-4000-8000-000000000069",
                     *       "accommodation": {
                     *         "accommodationId": "68000000-0000-4000-8000-000000000069",
                     *         "placeId": null,
                     *         "customName": "제주알호텔",
                     *         "name": "제주알호텔",
                     *         "checkInDate": "2026-09-10",
                     *         "checkOutDate": "2026-09-12",
                     *         "checkInTime": "15:00",
                     *         "checkOutTime": "11:00",
                     *         "sequenceNo": 1
                     *       },
                     *       "scheduleEffect": "invalidated",
                     *       "regenerationRequired": true,
                     *       "activeScheduleVersionId": null,
                     *       "tripStatus": "draft",
                     *       "etag": "\"trip-68000000-0000-4000-8000-000000000068-r2\"",
                     *       "createdAt": "2026-09-01T14:00:00+09:00",
                     *       "updatedAt": "2026-09-01T14:00:00+09:00"
                     *     }
                     */
                    "application/json": components["schemas"]["AccommodationMutationPayload"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "필수값, 형식, XOR, Idempotency-Key와 If-Match를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/accommodation-not-found",
                     *       "title": "숙소를 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 숙소가 없거나 해당 여행에 속하지 않습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "ACCOMMODATION_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/trip-version-conflict",
                     *       "title": "여행 조건이 이미 변경되었습니다",
                     *       "status": 409,
                     *       "detail": "최신 여행과 ETag를 조회한 뒤 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "TRIP_VERSION_CONFLICT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/accommodation-date-gap-or-overlap",
                     *       "title": "숙소 날짜를 적용할 수 없습니다",
                     *       "status": 422,
                     *       "detail": "여행 기간 안에서 숙소 날짜의 공백과 중복 없이 순서를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "ACCOMMODATION_DATE_GAP_OR_OVERLAP",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
        };
    };
    profileRead: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "userId": "18000000-0000-4000-8000-000000000018",
                     *       "email": "user@example.invalid",
                     *       "nickname": "제주 여행자",
                     *       "profileImageUrl": null,
                     *       "locale": "ko-KR",
                     *       "providers": [
                     *         "google"
                     *       ],
                     *       "onboardingCompleted": true,
                     *       "updatedAt": "2026-08-25T00:00:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["CurrentUserProfileResponse"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            500: components["responses"]["InternalServerProblem"];
            /** @description Service Unavailable */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/profile-data-unavailable",
                     *       "title": "프로필 조회 불가",
                     *       "status": 503,
                     *       "detail": "프로필 데이터를 불러올 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PROFILE_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    profileUpdate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "nickname": "제주 산책자",
                 *       "locale": "ko-KR"
                 *     }
                 */
                "application/json": components["schemas"]["CurrentUserProfilePatchRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "userId": "18000000-0000-4000-8000-000000000018",
                     *       "email": "user@example.invalid",
                     *       "nickname": "제주 산책자",
                     *       "profileImageUrl": null,
                     *       "locale": "ko-KR",
                     *       "providers": [
                     *         "google"
                     *       ],
                     *       "onboardingCompleted": true,
                     *       "updatedAt": "2026-08-25T00:05:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["CurrentUserProfileResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/invalid-profile-legal-request",
                     *       "title": "요청 형식 오류",
                     *       "status": 400,
                     *       "detail": "프로필 수정 요청 형식이 올바르지 않습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_PROFILE_LEGAL_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description PROFILE_CONFLICT 오류 */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/profile-conflict",
                     *       "title": "프로필 연결 충돌",
                     *       "status": 409,
                     *       "detail": "인증 프로필을 현재 사용자에게 안전하게 연결할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PROFILE_CONFLICT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description Service Unavailable */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/profile-data-unavailable",
                     *       "title": "프로필 조회 불가",
                     *       "status": 503,
                     *       "detail": "프로필 데이터를 불러올 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PROFILE_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    savedPlacesDelete: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description lowercase canonical UUID 장소 식별자
                 * @example 34000000-0000-4000-8000-000000000034
                 */
                placeId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 삭제 완료 */
            204: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "관심 장소 요청 값을 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            401: components["responses"]["AuthenticationProblem"];
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/saved-place-not-found",
                     *       "title": "관심 장소를 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 관심 장소가 없거나 접근할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SAVED_PLACE_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
        };
    };
    savedPlacesUpdate: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description 직전 관심 장소 응답 ETag를 큰따옴표까지 그대로 전달
                 * @example "saved-place.34.v1"
                 */
                "If-Match": string;
            };
            path: {
                /**
                 * @description lowercase canonical UUID 장소 식별자
                 * @example 34000000-0000-4000-8000-000000000034
                 */
                placeId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "memo": "노을 시간 방문",
                 *       "tags": [
                 *         "오름"
                 *       ],
                 *       "priority": 3,
                 *       "targetDay": 2
                 *     }
                 */
                "application/json": components["schemas"]["PatchSavedPlaceRequest"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    ETag: components["headers"]["ETag"];
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "placeId": "34000000-0000-4000-8000-000000000034",
                     *       "name": "새별오름",
                     *       "category": "content-type:12",
                     *       "regionLabel": "제주시",
                     *       "thumbnailUrl": "https://example.invalid/place.jpg",
                     *       "recommendedStayMinutes": 90,
                     *       "memo": "노을 시간 방문",
                     *       "tags": [
                     *         "오름"
                     *       ],
                     *       "priority": 3,
                     *       "targetDay": 2,
                     *       "savedAt": "2026-08-25T00:00:00Z",
                     *       "updatedAt": "2026-08-25T00:05:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["SavedPlaceResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "관심 장소 요청 값을 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            401: components["responses"]["AuthenticationProblem"];
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/saved-place-not-found",
                     *       "title": "관심 장소를 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 관심 장소가 없거나 접근할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SAVED_PLACE_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Conflict */
            409: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/saved-place-version-conflict",
                     *       "title": "관심 장소가 이미 변경되었습니다",
                     *       "status": 409,
                     *       "detail": "최신 관심 장소를 조회한 뒤 다시 수정해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SAVED_PLACE_VERSION_CONFLICT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unprocessable Content */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/saved-place-constraint-violation",
                     *       "title": "관심 장소 값을 처리할 수 없습니다",
                     *       "status": 422,
                     *       "detail": "메모, 태그, 우선순위 또는 희망 Day 값을 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SAVED_PLACE_CONSTRAINT_VIOLATION",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
        };
    };
    notificationPreferencesRead: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 200 NotificationPreferenceResponse */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "nextDestinationDepartureEnabled": false,
                     *       "safetyBufferMinutes": 10,
                     *       "updatedAt": null
                     *     }
                     */
                    "application/json": components["schemas"]["NotificationPreferenceResponse"];
                };
            };
            /** @description Authorization 누락은 AUTHENTICATION_REQUIRED, 제공된 인증 정보 실패는 INVALID_ACCESS_TOKEN */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description AUTH_ACCESS_DENIED */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                     *       "title": "접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "접근 권한이 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTH_ACCESS_DENIED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description INTERNAL_SERVER_ERROR */
            500: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                     *       "title": "내부 서버 오류가 발생했습니다.",
                     *       "status": 500,
                     *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INTERNAL_SERVER_ERROR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description PUSH_NOTIFICATION_DATA_UNAVAILABLE */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/push-notification-data-unavailable",
                     *       "title": "푸시 알림 데이터 조회 불가",
                     *       "status": 503,
                     *       "detail": "푸시 알림 데이터를 처리할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PUSH_NOTIFICATION_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    notificationPreferencesUpdate: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                /**
                 * @example {
                 *       "nextDestinationDepartureEnabled": true,
                 *       "safetyBufferMinutes": 10
                 *     }
                 */
                "application/json": components["schemas"]["NotificationPreferencePatchRequest"];
            };
        };
        responses: {
            /** @description 200 NotificationPreferenceResponse */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "nextDestinationDepartureEnabled": true,
                     *       "safetyBufferMinutes": 10,
                     *       "updatedAt": "2026-08-25T00:05:00Z"
                     *     }
                     */
                    "application/json": components["schemas"]["NotificationPreferenceResponse"];
                };
            };
            /** @description INVALID_PUSH_NOTIFICATION_REQUEST */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/invalid-push-notification-request",
                     *       "title": "푸시 알림 요청 오류",
                     *       "status": 400,
                     *       "detail": "푸시 알림 요청 값이 올바르지 않습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_PUSH_NOTIFICATION_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Authorization 누락은 AUTHENTICATION_REQUIRED, 제공된 인증 정보 실패는 INVALID_ACCESS_TOKEN */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description AUTH_ACCESS_DENIED */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/auth-access-denied",
                     *       "title": "접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "접근 권한이 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTH_ACCESS_DENIED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description INTERNAL_SERVER_ERROR */
            500: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/internal-server-error",
                     *       "title": "내부 서버 오류가 발생했습니다.",
                     *       "status": 500,
                     *       "detail": "요청을 처리하는 중 내부 오류가 발생했습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INTERNAL_SERVER_ERROR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description PUSH_NOTIFICATION_DATA_UNAVAILABLE */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/push-notification-data-unavailable",
                     *       "title": "푸시 알림 데이터 조회 불가",
                     *       "status": 503,
                     *       "detail": "푸시 알림 데이터를 처리할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PUSH_NOTIFICATION_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    weatherForecastRead: {
        parameters: {
            query: {
                /**
                 * @description 명시 선택한 공개 지역. 세 selector 중 정확히 하나만 입력합니다.
                 * @example jeju-seogwipo
                 */
                regionCode?: string;
                /**
                 * @description 명시 선택한 공개 장소 canonical UUID
                 * @example 34000000-0000-4000-8000-000000000034
                 */
                placeId?: string;
                /**
                 * @description 인증 사용자가 소유한 계획 항목 canonical UUID
                 * @example 50000000-0000-4000-8000-000000000005
                 */
                tripItemId?: string;
                /**
                 * @description Asia/Seoul 정시를 +09:00 offset으로 표현한 예보 시각
                 * @example 2026-08-25T12:00:00+09:00
                 */
                dateTime: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 날씨 예보 */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "contractVersion": "2.0.0",
                     *       "grid": {
                     *         "nx": 53,
                     *         "ny": 38,
                     *         "regionName": "제주시"
                     *       },
                     *       "provider": "KMA",
                     *       "providerApiVersion": "VilageFcstInfoService_2.0",
                     *       "forecastType": "village",
                     *       "baseDate": "2026-08-25",
                     *       "baseTime": "05:00",
                     *       "forecastedAt": "2026-08-25T05:00:00+09:00",
                     *       "validAt": "2026-08-25T12:00:00+09:00",
                     *       "temperatureC": 27.5,
                     *       "precipitationProbabilityPercent": 20,
                     *       "precipitationAmountMm": null,
                     *       "precipitationType": "none",
                     *       "skyCode": "mostly_cloudy",
                     *       "humidityPercent": 72,
                     *       "windSpeedMps": 3.4,
                     *       "observedAt": "2026-08-25T05:10:00+09:00",
                     *       "expiresAt": "2026-08-25T08:00:00+09:00",
                     *       "stale": false,
                     *       "fallbackUsed": false
                     *     }
                     */
                    "application/json": components["schemas"]["WeatherForecastResponse"];
                };
            };
            /** @description 선택자 개수·형식 또는 제주 현지 예보 시각 오류 */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-weather-selector",
                     *       "title": "날씨 조회 조건이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "지역, 장소 또는 계획 항목 하나와 제주 예보 시각을 올바르게 입력해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_WEATHER_SELECTOR",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description 계획 항목 인증 누락 또는 유효하지 않은 token */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-access-token",
                     *       "title": "인증 정보가 올바르지 않습니다",
                     *       "status": 401,
                     *       "detail": "유효한 인증 정보로 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_ACCESS_TOKEN",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description 공개 장소 또는 소유 계획 항목을 찾을 수 없음 */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/weather-reference-not-found",
                     *       "title": "계획 목적지를 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 목적지가 없거나 조회할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "WEATHER_REFERENCE_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description 지원하지 않는 제주 위치 또는 예보 기간 */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/weather-forecast-horizon-not-supported",
                     *       "title": "지원하지 않는 예보 기간입니다",
                     *       "status": 422,
                     *       "detail": "현재 정시부터 10일 이내의 제주 현지 시각을 입력해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "WEATHER_FORECAST_HORIZON_NOT_SUPPORTED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description 최신·직전 정규화 예보를 사용할 수 없음 */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/weather-forecast-unavailable",
                     *       "title": "날씨 예보를 불러올 수 없습니다",
                     *       "status": 503,
                     *       "detail": "최신 예보와 직전 예보를 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "WEATHER_FORECAST_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    tripScheduleRead: {
        parameters: {
            query?: {
                /**
                 * @description 같은 여행에 속한 lowercase canonical UUID 일정 버전. 생략하면 active 버전을 조회합니다.
                 * @example 49000000-0000-4000-8000-000000000002
                 */
                versionId?: string;
            };
            header?: never;
            path: {
                /**
                 * @description tripId 요청 조건
                 * @example 44000000-0000-4000-8000-000000000044
                 */
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "tripId": "49000000-0000-4000-8000-000000000001",
                     *       "scheduleVersion": {
                     *         "scheduleVersionId": "49000000-0000-4000-8000-000000000002",
                     *         "versionNo": 1,
                     *         "status": "active",
                     *         "sourceType": "initial",
                     *         "baseScheduleVersionId": null,
                     *         "score": 81,
                     *         "feasibilityStale": false
                     *       },
                     *       "days": [
                     *         {
                     *           "dayId": "49000000-0000-4000-8000-000000000003",
                     *           "dayNo": 1,
                     *           "date": "2026-09-01",
                     *           "items": [
                     *             {
                     *               "itemId": "49000000-0000-4000-8000-000000000004",
                     *               "sequenceNo": 1,
                     *               "itemType": "custom",
                     *               "placeId": null,
                     *               "title": "공항 도착",
                     *               "plannedStartAt": "2026-09-01T09:00:00+09:00",
                     *               "plannedEndAt": "2026-09-01T10:00:00+09:00",
                     *               "stayMinutes": 60,
                     *               "bufferAfterMinutes": 0,
                     *               "required": true,
                     *               "memo": null,
                     *               "progress": null
                     *             }
                     *           ],
                     *           "legs": []
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["ScheduleResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-request",
                     *       "title": "요청 값이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "여행 제목, 날짜, timezone과 교통 우선순위를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/authentication-required",
                     *       "title": "인증이 필요합니다",
                     *       "status": 401,
                     *       "detail": "로그인 후 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "AUTHENTICATION_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            403: components["responses"]["AccessDeniedProblem"];
            /** @description Not Found */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/schedule-version-not-found",
                     *       "title": "일정 버전을 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "요청한 일정 버전이 없거나 해당 여행에 속하지 않습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SCHEDULE_VERSION_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
        };
    };
    placesList: {
        parameters: {
            query?: {
                /**
                 * @description trim 적용 검색어
                 * @example 성산일출봉
                 */
                query?: string;
                /**
                 * @description 공개 canonical 장소 category
                 * @example content-type:12
                 */
                category?: string;
                /**
                 * @description 정규화 제주 지역 code
                 * @example jeju-seogwipo
                 */
                regionCode?: string;
                /**
                 * @description 직전 응답 nextCursor를 해석하지 않고 그대로 전달하는 opaque cursor
                 * @example plc2.cHVibGljLWN1cnNvci1leGFtcGxl
                 */
                cursor?: string;
                /**
                 * @description 한 page의 최대 item 수
                 * @example 20
                 */
                size?: number;
                /**
                 * @description 인증 사용자의 저장 장소만 조회할지 여부
                 * @example false
                 */
                savedOnly?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 관광지 cursor page */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "items": [],
                     *       "page": {
                     *         "size": 20,
                     *         "hasNext": false,
                     *         "nextCursor": null
                     *       }
                     *     }
                     */
                    "application/json": components["schemas"]["PlacesListResponse"];
                };
            };
            /** @description 검색·cursor 조건 오류 */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-query-parameter",
                     *       "title": "요청 검색 조건이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "검색 조건의 형식과 범위를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_QUERY_PARAMETER",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description 유효하지 않은 token 또는 익명 savedOnly 요청 */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-access-token",
                     *       "title": "인증 정보가 올바르지 않습니다",
                     *       "status": 401,
                     *       "detail": "유효한 인증 정보로 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_ACCESS_TOKEN",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description 검색 도메인 제약 위반 */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/place-query-constraint-violation",
                     *       "title": "검색 조건을 처리할 수 없습니다",
                     *       "status": 422,
                     *       "detail": "검색 조건 조합을 변경해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PLACE_QUERY_CONSTRAINT_VIOLATION",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description 안전한 정규화 장소 데이터 사용 불가 */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/place-data-unavailable",
                     *       "title": "장소 데이터를 사용할 수 없습니다",
                     *       "status": 503,
                     *       "detail": "잠시 후 다시 시도해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PLACE_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    placesRead: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /**
                 * @description lowercase canonical UUID 장소 식별자
                 * @example 34000000-0000-4000-8000-000000000034
                 */
                placeId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 관광지 상세 */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "placeId": "34000000-0000-4000-8000-000000000034",
                     *       "contentId": "126508",
                     *       "name": "성산일출봉",
                     *       "category": "content-type:12",
                     *       "regionCode": "jeju-seogwipo",
                     *       "regionLabel": "서귀포시",
                     *       "address": "제주특별자치도 서귀포시 성산읍",
                     *       "location": {
                     *         "lat": 33.458,
                     *         "lng": 126.942
                     *       },
                     *       "thumbnailUrl": null,
                     *       "recommendedStayMinutes": 90,
                     *       "recommendedStaySource": "policy",
                     *       "recommendedStayPolicyVersion": null,
                     *       "recommendedStayEffectiveAt": null,
                     *       "recommendedStayUpdatedAt": null,
                     *       "operationsSummary": null,
                     *       "saved": {
                     *         "value": false,
                     *         "memo": null,
                     *         "tags": []
                     *       },
                     *       "overview": "제주의 대표 오름",
                     *       "contact": {
                     *         "phone": null,
                     *         "homepageUrl": null
                     *       },
                     *       "operations": {
                     *         "operatingHoursText": null,
                     *         "closedDaysText": null,
                     *         "parkingText": null,
                     *         "admissionFeeText": null
                     *       },
                     *       "images": [],
                     *       "nearbyStops": []
                     *     }
                     */
                    "application/json": components["schemas"]["PlaceDetailResponse"];
                };
            };
            /** @description canonical UUID 형식 오류 */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-query-parameter",
                     *       "title": "요청 검색 조건이 올바르지 않습니다",
                     *       "status": 400,
                     *       "detail": "검색 조건의 형식과 범위를 확인해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_QUERY_PARAMETER",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description 유효하지 않은 token */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-access-token",
                     *       "title": "인증 정보가 올바르지 않습니다",
                     *       "status": 401,
                     *       "detail": "유효한 인증 정보로 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_ACCESS_TOKEN",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description 장소가 없거나 공개할 수 없음 */
            404: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/place-not-found",
                     *       "title": "장소를 찾을 수 없습니다",
                     *       "status": 404,
                     *       "detail": "장소가 없거나 공개할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PLACE_NOT_FOUND",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description 안전한 정규화 장소 상세 사용 불가 */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/place-data-unavailable",
                     *       "title": "장소 데이터를 사용할 수 없습니다",
                     *       "status": 503,
                     *       "detail": "잠시 후 다시 시도해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PLACE_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    legalDocumentsList: {
        parameters: {
            query?: {
                /**
                 * @description 법정 문서 locale. 생략 기본값은 ko-KR
                 * @example ko-KR
                 */
                locale?: "ko-KR";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "evaluatedAt": "2026-08-25T00:00:00Z",
                     *       "locale": "ko-KR",
                     *       "items": [
                     *         {
                     *           "documentId": "19000000-0000-4000-8000-000000000019",
                     *           "type": "terms",
                     *           "version": "1.0.0",
                     *           "title": "서비스 이용약관",
                     *           "contentUrl": "https://example.invalid/legal/terms",
                     *           "required": true,
                     *           "effectiveAt": "2026-08-01T00:00:00Z"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["LegalDocumentsResponse"];
                };
            };
            /** @description Bad Request */
            400: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/invalid-profile-legal-request",
                     *       "title": "요청 형식 오류",
                     *       "status": 400,
                     *       "detail": "프로필 수정 요청 형식이 올바르지 않습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_PROFILE_LEGAL_REQUEST",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Unauthorized */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.com/problems/invalid-access-token",
                     *       "title": "인증 정보가 올바르지 않습니다",
                     *       "status": 401,
                     *       "detail": "유효한 인증 정보로 다시 요청해 주세요.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "INVALID_ACCESS_TOKEN",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description Service Unavailable */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/profile-data-unavailable",
                     *       "title": "프로필 조회 불가",
                     *       "status": 503,
                     *       "detail": "프로필 데이터를 불러올 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "PROFILE_DATA_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
    authSocialProvidersList: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "providers": [
                     *         {
                     *           "id": "google",
                     *           "displayName": "Google"
                     *         },
                     *         {
                     *           "id": "kakao",
                     *           "displayName": "Kakao"
                     *         },
                     *         {
                     *           "id": "custom:naver",
                     *           "displayName": "Naver"
                     *         }
                     *       ]
                     *     }
                     */
                    "application/json": components["schemas"]["SocialLoginProvidersResponse"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
        };
    };
    authNaverUserInfoRead: {
        parameters: {
            query?: never;
            header: {
                /**
                 * @description Naver OAuth provider access token. Supabase JWT가 아닙니다.
                 * @example Bearer <naver-provider-access-token>
                 */
                Authorization: string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 표준 UserInfo */
            200: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "sub": "naver-public-subject-example",
                     *       "email": "naver-example@example.invalid",
                     *       "name": "제주 사용자",
                     *       "preferred_username": "제주 사용자",
                     *       "picture": "https://example.invalid/profile.png"
                     *     }
                     */
                    "application/json": components["schemas"]["NaverUserInfoResponse"];
                };
            };
            /** @description Bearer 형식 또는 Naver token이 유효하지 않음 */
            401: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/social-naver-token-invalid",
                     *       "title": "인증에 실패했습니다.",
                     *       "status": 401,
                     *       "detail": "네이버 인증 정보를 확인할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SOCIAL_NAVER_TOKEN_INVALID",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Naver 사용자 정보 접근 거부 */
            403: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/social-naver-upstream-forbidden",
                     *       "title": "외부 서비스 접근이 거부되었습니다.",
                     *       "status": 403,
                     *       "detail": "네이버 사용자 정보 접근이 거부되었습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SOCIAL_NAVER_UPSTREAM_FORBIDDEN",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Naver email 동의가 없음 */
            422: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/social-naver-email-required",
                     *       "title": "필수 정보가 누락되었습니다.",
                     *       "status": 422,
                     *       "detail": "이메일 제공 동의가 필요합니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SOCIAL_NAVER_EMAIL_REQUIRED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Spring API 요청 제한 */
            429: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/social-naver-rate-limited",
                     *       "title": "요청이 너무 많습니다.",
                     *       "status": 429,
                     *       "detail": "네이버 로그인 요청이 너무 많습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SOCIAL_NAVER_RATE_LIMITED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            500: components["responses"]["InternalServerProblem"];
            /** @description Naver 응답 오류 */
            502: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/social-naver-upstream-unavailable",
                     *       "title": "외부 서비스 요청을 완료하지 못했습니다.",
                     *       "status": 502,
                     *       "detail": "네이버 로그인 서비스를 일시적으로 사용할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SOCIAL_NAVER_UPSTREAM_UNAVAILABLE",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Naver rate limit 또는 Spring API 동시 처리 상한 */
            503: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/social-naver-overloaded",
                     *       "title": "서비스를 일시적으로 사용할 수 없습니다.",
                     *       "status": 503,
                     *       "detail": "네이버 로그인 서비스를 일시적으로 사용할 수 없습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SOCIAL_NAVER_OVERLOADED",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
            /** @description Naver 응답 시간 초과 */
            504: {
                headers: {
                    "X-Trace-Id": components["headers"]["TraceId"];
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "type": "https://api.timing-jeju.example/problems/social-naver-upstream-timeout",
                     *       "title": "외부 서비스 요청을 완료하지 못했습니다.",
                     *       "status": 504,
                     *       "detail": "네이버 로그인 응답 시간이 초과되었습니다.",
                     *       "instance": "urn:timing-jeju:problem:0123456789abcdef0123456789abcdef",
                     *       "code": "SOCIAL_NAVER_UPSTREAM_TIMEOUT",
                     *       "traceId": "0123456789abcdef0123456789abcdef",
                     *       "fieldErrors": []
                     *     }
                     */
                    "application/problem+json": components["schemas"]["ApiProblemDetails"];
                };
            };
        };
    };
}
