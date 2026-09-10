import { requestData } from './http';
import { ApiError } from './problem';

/** 약관 / 개인정보 / 위치기반 서비스 동의 문서 */
export type LegalDocumentType = 'terms' | 'privacy' | 'location';

export interface LegalDocument {
  documentId: string;
  type: LegalDocumentType;
  version: string;
  title: string;
  /** 본문을 띄울 HTTPS 주소 */
  contentUrl: string;
  /** 필수 동의 항목인지 */
  required: boolean;
  effectiveAt: string;
}

export interface LegalDocumentsResponse {
  evaluatedAt: string;
  locale: string;
  /** 비어 있을 수 있다 */
  items: LegalDocument[];
}

export const isSafeLegalContentUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      !!url.hostname
    );
  } catch {
    return false;
  }
};

/**
 * 현재 시행 중인 법정 문서 목록. 인증 선택.
 *
 * 회원가입 약관 동의 화면이 이 목록으로 항목을 그린다.
 * locale은 생략하면 ko-KR이고, 지금은 ko-KR만 허용한다.
 *
 * 오류 code: INVALID_PROFILE_LEGAL_REQUEST (400), INVALID_ACCESS_TOKEN (401),
 * PROFILE_DATA_UNAVAILABLE (503).
 */
export const fetchLegalDocuments = (locale?: string) =>
  requestData<LegalDocumentsResponse>({
    method: 'GET',
    path: '/legal-documents',
    auth: 'optional',
    params: { locale },
  });

export interface LegalConsent {
  documentId: string;
  agreed: boolean;
}

export interface LegalConsentsResponse {
  /** 필수 문서에 모두 동의했는지 */
  requiredConsentsSatisfied: boolean;
  updatedAt: string;
}

/**
 * 동의 상태 저장. 인증 필수.
 *
 * 1..20개, documentId 중복 금지. 현재 active version에 원자적으로 반영한다.
 *
 * 오류 code: INVALID_PROFILE_LEGAL_REQUEST (400), PROFILE_CONFLICT (409),
 * LEGAL_CONSENT_REQUIRED (422 — 필수 동의가 빠졌을 때), PROFILE_DATA_UNAVAILABLE (503).
 */
export const updateLegalConsents = (
  consents: LegalConsent[],
  authContextIsCurrent?: () => boolean,
) => {
  if (consents.length === 0) {
    return Promise.reject(
      new ApiError({ status: 422, code: 'LEGAL_CONSENT_REQUIRED' }),
    );
  }
  const documentIds = new Set(consents.map(({ documentId }) => documentId));
  if (
    consents.length > 20 ||
    documentIds.size !== consents.length ||
    consents.some(
      ({ documentId, agreed }) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          documentId,
        ) || typeof agreed !== 'boolean',
    )
  ) {
    return Promise.reject(
      new ApiError({
        status: 400,
        code: 'INVALID_PROFILE_LEGAL_REQUEST',
      }),
    );
  }
  return requestData<LegalConsentsResponse>({
    method: 'PUT',
    path: '/me/consents',
    auth: 'required',
    body: { consents },
    ...(authContextIsCurrent ? { authContextIsCurrent } : {}),
  });
};
