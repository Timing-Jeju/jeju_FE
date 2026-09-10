import type { components } from '../generated/backend';
import { request, requestData } from './http';
import { ApiError } from './problem';

/**
 * 푸시 기기 등록과 알림 설정. 네 개 모두 인증 필수다.
 *
 * `deviceId`는 서버가 아니라 앱이 만드는 canonical UUID이고,
 * 이 기기를 계속 같은 값으로 식별해야 하므로 로컬에 저장해 재사용한다.
 * registration token은 로그나 오류 리포트에 남기지 않는다.
 */

export type PushDeviceRegistrationRequest =
  components['schemas']['PushDeviceRegistrationRequest'];
export type PushDevice = components['schemas']['PushDeviceResponse'];
export type PushPlatform = PushDeviceRegistrationRequest['platform'];
export type PushPermissionStatus =
  PushDeviceRegistrationRequest['permissionStatus'];

const CANONICAL_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const invalidPushRequest = (): never => {
  throw new ApiError({
    status: 400,
    code: 'INVALID_PUSH_NOTIFICATION_REQUEST',
  });
};

const assertDeviceId = (deviceId: string) => {
  if (!CANONICAL_UUID.test(deviceId)) invalidPushRequest();
};

const assertRegistration = (body: PushDeviceRegistrationRequest) => {
  if (
    !['IOS', 'ANDROID'].includes(body.platform) ||
    !['GRANTED', 'DENIED', 'NOT_DETERMINED'].includes(body.permissionStatus) ||
    !/^[\x21-\x7e]{1,4096}$/.test(body.registrationToken) ||
    typeof body.appVersion !== 'string' ||
    body.appVersion.length < 1 ||
    body.appVersion.length > 50 ||
    !/^[A-Za-z0-9-]{2,35}$/.test(body.locale) ||
    !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(body.timeZone)
  ) {
    invalidPushRequest();
  }
};

/**
 * 기기 등록 / 갱신 (upsert). 토큰이 바뀌면 같은 deviceId로 다시 호출한다.
 *
 * 오류 code: INVALID_PUSH_NOTIFICATION_REQUEST (400),
 * PUSH_NOTIFICATION_DATA_UNAVAILABLE (503).
 */
export const registerPushDevice = async (
  deviceId: string,
  body: PushDeviceRegistrationRequest,
) => {
  assertDeviceId(deviceId);
  assertRegistration(body);
  return requestData<PushDevice>({
    method: 'PUT',
    path: `/me/push-devices/${encodeURIComponent(deviceId)}`,
    auth: 'required',
    body,
  });
};

/** 기기 해제 (로그아웃 시). 성공은 204다. */
export const deletePushDevice = async (deviceId: string): Promise<void> => {
  assertDeviceId(deviceId);
  await request<void>({
    method: 'DELETE',
    path: `/me/push-devices/${encodeURIComponent(deviceId)}`,
    auth: 'required',
  });
};

export type NotificationPreference =
  components['schemas']['NotificationPreferenceResponse'];
export type NotificationPreferencePatch =
  components['schemas']['NotificationPreferencePatchRequest'];

/** 알림 설정 조회 */
export const fetchNotificationPreference = () =>
  requestData<NotificationPreference>({
    method: 'GET',
    path: '/me/notification-preferences',
    auth: 'required',
  });

/** 알림 설정 수정 — 최소 한 필드가 필요하다 */
export const updateNotificationPreference = async (
  body: NotificationPreferencePatch,
) => {
  const keys = Object.keys(body);
  if (
    keys.length === 0 ||
    keys.some(
      (key) =>
        key !== 'nextDestinationDepartureEnabled' &&
        key !== 'safetyBufferMinutes',
    ) ||
    (body.nextDestinationDepartureEnabled !== undefined &&
      typeof body.nextDestinationDepartureEnabled !== 'boolean') ||
    (body.safetyBufferMinutes !== undefined &&
      (!Number.isInteger(body.safetyBufferMinutes) ||
        body.safetyBufferMinutes < 0 ||
        body.safetyBufferMinutes > 120))
  ) {
    invalidPushRequest();
  }
  return requestData<NotificationPreference>({
    method: 'PATCH',
    path: '/me/notification-preferences',
    auth: 'required',
    body,
  });
};
