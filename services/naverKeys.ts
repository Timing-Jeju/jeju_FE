/**
 * 네이버 API 키 — 프로젝트 루트의 .env 파일에서 읽는다.
 *
 * .env 예시:
 *   EXPO_PUBLIC_NCP_MAPS_CLIENT_ID=...        (네이버 클라우드 > Maps: 지도 SDK + Geocoding + Directions 5)
 *   EXPO_PUBLIC_NCP_MAPS_CLIENT_SECRET=...
 *   EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID=...    (네이버 개발자 센터 > 검색 API — NCP 키와 다른 별도 키!)
 *   EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET=...
 *
 * - EXPO_PUBLIC_ 접두사가 붙은 변수만 앱 코드에 인라인된다.
 * - .env 수정 후에는 Metro를 재시작해야 반영된다. (npx expo start --clear)
 * - 지도 SDK용 Client ID는 app.config.js가 같은 변수를 읽어 네이티브 설정에 주입한다.
 *
 * 주의: EXPO_PUBLIC_ 변수는 번들에 포함되어 노출된다.
 * 배포 시에는 백엔드 프록시를 통해 호출하는 것을 권장한다.
 */

// 네이버 클라우드 플랫폼 (지도 SDK + Geocoding + Directions 5)
export const NCP_MAPS_CLIENT_ID =
  process.env.EXPO_PUBLIC_NCP_MAPS_CLIENT_ID ?? '';
export const NCP_MAPS_CLIENT_SECRET =
  process.env.EXPO_PUBLIC_NCP_MAPS_CLIENT_SECRET ?? '';

// 네이버 개발자 센터 (검색 > 지역 API) — developers.naver.com에서 발급
export const NAVER_SEARCH_CLIENT_ID =
  process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_ID ?? '';
export const NAVER_SEARCH_CLIENT_SECRET =
  process.env.EXPO_PUBLIC_NAVER_SEARCH_CLIENT_SECRET ?? '';

export const isKeyConfigured = (key: string) =>
  key.length > 0 && !key.startsWith('YOUR_');
