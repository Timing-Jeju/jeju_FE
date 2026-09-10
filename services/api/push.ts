import { request, requestData } from './http';

/**
 * 푸시 기기 등록과 알림 설정. 네 개 모두 인증 필수다.
 *
 * `deviceId`는 서버가 아니라 앱이 만드는 canonical UUID이고,
 * 이 기기를 계속 같은 값으로 식별해야 하므로 로컬에 저장해 재사용한다.
 * registration token은 로그나 오류 리포트에 남기지 않는다.
 */

export type PushPlatform = 'IOS' | 'ANDROID';
export type PushPermissionStatus = 'GRANTED' | 'DENIED' | 'NOT_DETERMINED';

export interface PushDeviceRegistrationRequest {
  platform: PushPlatform;
  /** FCM registration token (printable ASCII, 1..4096자) */
  registrationToken: string;
  permissionStatus: PushPermissionStatus;
  /** 1..50자 */
  appVersion: string;
  /** BCP 47 (예: ko-KR) */
  locale: string;
  /** IANA time zone (예: Asia/Seoul) */
  timeZone: string;
}

export interface PushDevice {
  deviceId: string;
  platform: PushPlatform;
  permissionStatus: PushPermissionStatus;
  active: boolean;
  updatedAt: string;
}

/**
 * 기기 등록 / 갱신 (upsert). 토큰이 바뀌면 같은 deviceId로 다시 호출한다.
 *
 * 오류 code: INVALID_PUSH_NOTIFICATION_REQUEST (400),
 * PUSH_NOTIFICATION_DATA_UNAVAILABLE (503).
 */
export const registerPushDevice = (
  deviceId: string,
  body: PushDeviceRegistrationRequest,
) =>
  requestData<PushDevice>({
    method: 'PUT',
    path: `/me/push-devices/${encodeURIComponent(deviceId)}`,
    auth: 'required',
    body,
  });

/** 기기 해제 (로그아웃 시). 성공은 204다. */
export const deletePushDevice = async (deviceId: string): Promise<void> => {
  await request<void>({
    method: 'DELETE',
    path: `/me/push-devices/${encodeURIComponent(deviceId)}`,
    auth: 'required',
  });
};

export interface NotificationPreference {
  /** 다음 목적지 출발 알림을 받을지 */
  nextDestinationDepartureEnabled: boolean;
  /** 0..120, 기본 10 — 출발 알림을 얼마나 먼저 받을지 */
  safetyBufferMinutes: number;
  updatedAt: string | null;
}

/** 알림 설정 조회 */
export const fetchNotificationPreference = () =>
  requestData<NotificationPreference>({
    method: 'GET',
    path: '/me/notification-preferences',
    auth: 'required',
  });

/** 알림 설정 수정 — 최소 한 필드가 필요하다 */
export const updateNotificationPreference = (
  body: Partial<
    Pick<
      NotificationPreference,
      'nextDestinationDepartureEnabled' | 'safetyBufferMinutes'
    >
  >,
) =>
  requestData<NotificationPreference>({
    method: 'PATCH',
    path: '/me/notification-preferences',
    auth: 'required',
    body,
  });
