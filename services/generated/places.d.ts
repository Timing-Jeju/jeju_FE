export interface paths {
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
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        PlacesListResponse: {
            items?: components["schemas"]["PlaceListItem"][];
            page?: components["schemas"]["PlaceCursorPage"];
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
        PlaceDataFreshness: {
            provider?: string;
            /** Format: date-time */
            observedAt?: string;
            /** Format: date-time */
            expiresAt?: string;
            stale?: boolean;
        };
        PlaceCursorPage: {
            /** Format: int32 */
            size?: number;
            hasNext?: boolean;
            nextCursor?: null | string;
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
        SavedPlaceState: {
            value: boolean;
            memo: string | null;
            tags: string[];
        };
        Contact: {
            phone: string | null;
            /** Format: uri */
            homepageUrl: string | null;
        };
        Operations: {
            operatingHoursText: string | null;
            closedDaysText: string | null;
            parkingText: string | null;
            admissionFeeText: string | null;
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
    };
    responses: {
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
    parameters: never;
    requestBodies: never;
    headers: {
        /**
         * @description 서버가 요청 단위로 생성한 추적 식별자
         * @example 0123456789abcdef0123456789abcdef
         */
        TraceId: string;
    };
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
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
}
