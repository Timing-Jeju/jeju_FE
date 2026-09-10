import { request, type ApiResponse } from './http';
import { createIdempotencyKey } from './idempotency';

/**
 * 프로필 이미지. 둘 다 인증 필수다.
 *
 * **파일 자체는 이 API로 보내지 않는다.** 업로드는 앱이 Supabase Storage로 직접 하고,
 * 백엔드에는 "어느 object를 쓸지"만 등록한다. 순서는 이렇다.
 *
 * 1. `supabase.storage.from(...).upload(objectKey, file)` 로 파일을 올린다
 * 2. `fetchProfileImage()` 로 현재 ETag를 얻는다
 * 3. `putProfileImage(objectKey, etag)` 로 그 key를 등록한다
 *
 * `objectKey`는 `<내 userId>/profile/<uuid>` 형식이어야 한다. 남의 userId로 만든 key는
 * 400으로 거절된다. 앞의 uuid는 Supabase 세션의 `user.id`, 뒤는 새로 만든 uuid를 쓴다.
 */

/**
 * 지금 프로필 이미지가 어디서 온 것인지.
 *
 * - `provider` — 소셜 로그인 공급자가 준 사진
 * - `storage` — 사용자가 직접 올린 사진
 * - `none` — 사진 없음
 */
export type ProfileImageSource = 'provider' | 'storage' | 'none';

export interface ProfileImage {
  /** 직접 올린 사진일 때만 값이 있다 */
  profileImageObjectKey: string | null;
  /** 화면에 그릴 URL. 사진이 없으면 null */
  profileImageUrl: string | null;
  profileImageSource: ProfileImageSource;
  /** 0부터. 바꿀 때마다 오른다 */
  profileImageVersion: number;
  updatedAt: string;
}

/**
 * 프로필 이미지 조회.
 *
 * **응답 ETag는 반드시 들고 있어야 한다.** `putProfileImage`가 If-Match로 요구하는데
 * 이 값을 얻을 곳이 여기뿐이다. 형식은 여행 ETag와 달리 `"profile-image-<version>"`이다.
 *
 * 오류 code: INVALID_REQUEST (400), PROFILE_DATA_UNAVAILABLE (503).
 */
export const fetchProfileImage = (): Promise<ApiResponse<ProfileImage>> =>
  request<ProfileImage>({
    method: 'GET',
    path: '/me/profile-image',
    auth: 'required',
  });

/**
 * 프로필 이미지 등록 / 교체 / 삭제.
 *
 * `objectKey`에 null을 주면 삭제다. Storage에 올려 둔 파일을 가리키는 key를 주면 교체다.
 *
 * **`etag`는 필수다.** 빠뜨리면 400 INVALID_PROFILE_IMAGE_REQUEST로 막힌다.
 * `fetchProfileImage()`의 ETag(`"profile-image-<version>"`)를 그대로 넘긴다.
 * 성공하면 version이 오르고 응답에 새 ETag가 오므로, 이어서 또 바꾼다면 그 값으로 갱신한다.
 *
 * 오류 code: INVALID_PROFILE_IMAGE_REQUEST (400) — key 형식이 틀렸거나 If-Match 누락,
 * PROFILE_IMAGE_NOT_FOUND (404) — Storage에 그 object가 없다,
 * PROFILE_IMAGE_VERSION_CONFLICT (409) — 그 사이 다른 곳에서 바뀌었다,
 * PROFILE_IMAGE_TOO_LARGE (413),
 * PROFILE_IMAGE_STORAGE_UNAVAILABLE (503) — Supabase Storage에 닿지 못했다.
 */
export const putProfileImage = (
  objectKey: string | null,
  etag: string,
  idempotencyKey: string = createIdempotencyKey(),
): Promise<ApiResponse<ProfileImage>> =>
  request<ProfileImage>({
    method: 'PUT',
    path: '/me/profile-image',
    auth: 'required',
    body: { profileImageObjectKey: objectKey },
    headers: { 'Idempotency-Key': idempotencyKey, 'If-Match': etag },
  });

/** 프로필 이미지 삭제 — `putProfileImage(null, etag)`과 같다 */
export const deleteProfileImage = (etag: string) => putProfileImage(null, etag);
