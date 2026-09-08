# 백엔드(Spring API) 연동

`services/api`는 Timing Jeju 백엔드의 공개 operation을 감싼 계층이다.
화면과 store는 `@/services/api` 하나만 import하면 된다.

```ts
import { fetchPlaces, hasCode, isApiError } from '@/services/api';
```

## 준비

`.env`에 서버 주소를 넣고 Metro를 다시 띄운다. (`npx expo start --clear`)

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:18080
```

주소를 코드에 고정하지 않는다. 값이 없으면 앱은 뜨되 호출만
`CLIENT_NOT_CONFIGURED`로 실패한다. (naverKeys와 같은 방침)

## 로그인은 백엔드가 아니라 Supabase가 한다

Spring에는 로그인·회원가입·비밀번호 재설정·token 갱신 API가 **없다.**
전부 Supabase Auth SDK가 담당하고, 백엔드는 Supabase가 발급한 access token을
검증만 한다.

`.env`에 두 값을 넣는다. (Dashboard → Project Settings → API)

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

anon key는 공개돼도 되는 값이다. `service_role` key는 앱에 넣지 않는다.

흐름은 이렇게 이어진다.

```
services/auth.ts        로그인 / 로그아웃 (화면은 이 파일만 쓴다)
      ↓ 세션 변화
hooks/useAuthSession    app/_layout.tsx에서 한 번 구독
      ↓
store/useUserStore      access token 보관 + GET /me 로 프로필 조회
      ↓ setAccessTokenProvider
services/api/session    백엔드 호출이 토큰을 읽어가는 지점
```

token이 자동 갱신될 때도 같은 경로로 새 토큰이 들어오므로,
백엔드 호출은 항상 유효한 토큰을 쓴다.

### 소셜 로그인 콜백 등록

`services/auth.ts`의 `AUTH_CALLBACK_URL`(= `tourist://auth/callback`)을
Supabase Dashboard → Authentication → URL Configuration → **Redirect URLs**에
정확히 등록해야 한다. 등록되지 않은 주소는 Supabase가 거부한다.

띄울 공급자는 백엔드 `GET /auth/social/providers`가 알려준 목록을 따른다.
다만 그 목록은 "구현 가능한 지원 목록"이지 Supabase Dashboard에서 실제로
켜져 있다는 뜻은 아니다. 공급자 활성화와 secret 입력은 Dashboard에서만 한다.

### 아직 세션이 저장되지 않는다

`services/supabase.ts`가 `persistSession: false`다. 저장소(AsyncStorage /
SecureStore)를 붙이면 `true`로 바꾼다. 지금은 앱을 끄면 로그인이 풀린다.

## 인증 모드

endpoint마다 인증 방식이 다르고, 이 값은 각 함수 안에 이미 지정돼 있다.

| 모드       | 뜻                                             | 해당 endpoint                  |
| ---------- | ---------------------------------------------- | ------------------------------ |
| `none`     | Authorization을 안 보낸다                      | 소셜 공급자 목록               |
| `optional` | 토큰이 있으면 붙이고 없으면 익명               | 법정문서, 장소 목록/상세, 날씨 |
| `required` | 토큰이 없으면 호출을 막는다                    | 나머지 전부                    |
| `naver`    | Supabase JWT가 **아니라** Naver provider token | Naver 프로필 조회              |

익명으로 호출하면 개인화 필드가 빈 값으로 내려온다.
(목록 `saved=false`, `memo=null`, `tags=[]`)

## 오류는 status가 아니라 code로 분기한다

모든 오류는 `ApiError`로 정규화된다. 서버 오류 body(Problem Details)의
`type` host가 지금 `.com`과 `.example`로 섞여 있어서 `type`으로 분기하면 깨진다.
HTTP status도 endpoint마다 다르게 붙는다. **안정적인 것은 `code`뿐이다.**

```ts
try {
  await createSavedPlace({ placeId });
} catch (error) {
  if (hasCode(error, 'SAVED_PLACE_ALREADY_EXISTS')) return;
  if (isApiError(error)) Alert.alert('실패', error.detail); // 한국어 안내 문구
}
```

- `error.detail` — 사용자에게 그대로 보여줄 수 있는 한국어 문구
- `error.fieldErrors` / `error.reasonOf('nickname')` — 입력값 검증 실패 사유
- `error.traceId` — 서버 로그 대조용 (`X-Trace-Id`와 같은 값)
- `error.code`가 `CLIENT_NETWORK_ERROR`, `CLIENT_NOT_CONFIGURED`면 서버에 닿지 못한 것이다

인증이 풀렸는지는 `isAuthError(error)`로 본다.

## 목록은 cursor로 넘긴다

`page.nextCursor`는 opaque다. 뜯어보거나 조합하지 말고 다음 요청의
`cursor`에 그대로 넣는다. cursor를 받은 뒤 filter/sort/size를 바꾸면
`CURSOR_CONTEXT_MISMATCH`가 나므로, 조건이 바뀌면 처음부터 다시 조회한다.

```ts
const first = await fetchPlaces({ query: '오름', size: 20 });
const next = first.page.hasNext
  ? await fetchPlaces({
      query: '오름',
      size: 20,
      cursor: first.page.nextCursor!,
    })
  : null;
```

## 찜 수정은 ETag가 필요하다

관심 장소만 낙관적 잠금을 쓴다. POST/PATCH 응답의 `ETag`를 들고 있다가
다음 PATCH의 `If-Match`에 **큰따옴표까지 그대로** 넘긴다.

```ts
const created = await createSavedPlace({ placeId, memo: '노을 시간 방문' });
// created.etag 를 저장해 둔다

await updateSavedPlace(placeId, { priority: 3 }, created.etag!);
// 409 SAVED_PLACE_VERSION_CONFLICT → 다시 조회한 뒤 재시도
```

## 생성은 Idempotency-Key로 중복을 막는다

찜 등록과 여행 생성은 key가 필수다. 넘기지 않으면 호출마다 새로 만든다.

중요한 것은 **timeout 뒤 재시도**다. 이때 새 key를 만들면 중복 생성이 되므로
같은 key와 같은 body로 다시 보내야 한다. 그래서 재시도할 계획이라면
호출부에서 key를 먼저 만들어 들고 있는다.

```ts
const key = createIdempotencyKey();
const trip = await createTrip({ title, startDate, endDate }, key);
// 실패해서 다시 보낼 때도 같은 key를 쓴다 → 원본 201이 replay된다
if (trip.idempotencyReplayed) {
  /* 이미 만들어져 있던 여행이다 */
}
```

TTL은 24시간이고 다른 body로 같은 key를 쓰면 409다.
(찜은 `IDEMPOTENCY_PAYLOAD_CONFLICT`, 여행은 `IDEMPOTENCY_KEY_REUSED` — code가 다르다)

## 생략과 null의 뜻이 다르다

응답에서 "필드가 항상 있다"와 "값이 null일 수 있다"는 별개다.
`nextCursor`, `activeScheduleVersionId`, `totalScore`, 날씨 category 값은
key는 항상 있고 값이 null일 수 있다.

요청에서는 필드를 **빼는 것**과 **null을 보내는 것**의 뜻이 다르다.

| 요청         | 생략                                           | null                                       |
| ------------ | ---------------------------------------------- | ------------------------------------------ |
| 프로필 PATCH | 기존 값 보존                                   | 거부 (400)                                 |
| 여행 POST    | 기본값 적용                                    | 거부 (400)                                 |
| 찜 POST      | memo→null, tags→[], priority→0, targetDay→null | 생략과 같다                                |
| 찜 PATCH     | 기존 값 보존                                   | memo/targetDay 비우기, tags→[], priority→0 |

배열은 부분 수정이 아니라 전체 교체다.

## 파일 구성

| 파일                                                                                                   | 내용                                 |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------ |
| `config.ts`                                                                                            | 서버 주소, 타임아웃                  |
| `problem.ts`                                                                                           | `ApiError`, `hasCode`, `isAuthError` |
| `session.ts`                                                                                           | access token 공급 지점               |
| `http.ts`                                                                                              | 인증 모드, 헤더, 오류 정규화         |
| `idempotency.ts`                                                                                       | 멱등성 키 생성                       |
| `category.ts`                                                                                          | `content-type:12` ↔ `관광지`         |
| `authSocial.ts` `profile.ts` `legal.ts` `places.ts` `savedPlaces.ts` `trips.ts` `weather.ts` `push.ts` | 도메인별 호출                        |
| `accommodations.ts` `transportEvents.ts` `scheduleItems.ts` `profileImage.ts`                          | 여행 편집·프로필 이미지 (아래 참고)  |

## 찜(관심 장소) 매핑 규칙

서버 `SavedPlace`와 화면 `FavoritePlace`의 모양이 달라서
`store/useFavoriteStore.ts`에서 아래 규칙으로 옮긴다.

| 화면 값                          | 서버 값                  | 규칙                                                        |
| -------------------------------- | ------------------------ | ----------------------------------------------------------- |
| `name` `memo` `tags` `targetDay` | 같은 이름                | 그대로 (`memo`는 없을 때 `''` ↔ `null`)                     |
| `stayMinutes`                    | `recommendedStayMinutes` | null이면 60분                                               |
| `category`                       | `category`               | `content-type:39` → 식당, 나머지는 표준 코드표              |
| `visitType`                      | `priority`               | 필수방문 → 5, 선택방문 → 0 / 읽을 때는 3 이상이면 필수방문  |
| `address` `coord`                | (없음)                   | `GET /places?savedOnly=true`를 같이 불러 `placeId`로 합친다 |
| `direction`                      | (없음)                   | 경도 126.55 기준 동쪽 / 서쪽                                |

`visitType`을 `tags`가 아니라 `priority`에 실은 이유: 필수/선택 방문은 사용자가
붙이는 이름표가 아니라 우선순위 진술이고, `tags`를 시스템이 쓰면 사용자가
직접 입력한 태그와 섞인다. 덤으로 서버 `sort=priority_desc`를 쓸 수 있다.

`address`와 `coord`는 찜 목록 API에 없다. 장소를 건별로 조회하면 N+1이 되므로
목록 두 개를 한 번씩 불러 `placeId`로 합친다.

### 목록만 불러온 뒤에는 ETag가 없다

찜 목록 API는 항목별 ETag를 주지 않고 단건 GET도 없다. 그래서 앱을 켜고
바로 메모를 고치려 하면 `If-Match`에 넣을 값이 없다.

계약의 이 규칙으로 현재 ETag를 읽는다.

> 다른 key지만 같은 owner/place와 현재 payload까지 동일: 200 current resource

즉 **지금 저장된 값 그대로** 새 키로 POST하면 아무것도 바꾸지 않고
현재 resource와 ETag가 돌아온다 (`readSavedPlaceEtag`).
들고 있던 값이 낡아서 409가 나면 목록을 다시 불러 한 번 재시도한다.

### 아직 안 되는 것

- `카페` 필터: 대응하는 TourAPI 분류 코드가 없어 항상 빈 목록이다.
- 홈 화면 지도 검색 → 장소 상세 경로는 `placeId`가 없어 찜할 수 없다.
  (외부 검색 결과라 백엔드 장소와 이어지지 않는다)

## 로컬에서 테스트하기

세 가지를 띄운다. 백엔드(Spring), Supabase, 앱.

### 1. Supabase

```bash
cd jeju_BE
supabase start      # Supabase CLI 2.110.0
supabase status     # API URL과 anon key를 여기서 확인한다
```

소셜 로그인을 쓰려면 `jeju_BE/supabase/config.toml`의
`[auth].additional_redirect_urls`에 앱 콜백을 추가하고 `supabase stop && supabase start`.

```toml
additional_redirect_urls = [
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3000/auth/callback",
  "tourist://auth/callback",
]
```

로컬은 `[auth.email].enable_confirmations = false`라 가입하면 바로 세션이 생긴다.
즉 회원가입 → 닉네임 저장 → 약관 동의 저장까지 한 번에 확인할 수 있다.

### 2. 백엔드

```bash
cd jeju_BE
cp .env.example .env
docker compose -f docker-compose.yml up -d
cd services/spring-api && ./gradlew bootRun
```

`http://localhost:8080/actuator/health`가 뜨면 준비된 것이다.
Swagger는 `http://localhost:8080/swagger-ui/index.html`.

### 3. 앱

`.env`를 채우고 Metro를 새로 띄운다. (`EXPO_PUBLIC_*`는 번들에 인라인되므로 재시작이 필요하다)

```
EXPO_PUBLIC_API_BASE_URL=http://localhost:8080
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<supabase status의 anon key>
```

```bash
npx expo start --clear
```

**주소 주의** — 기기에서 `localhost`는 기기 자신을 가리킨다.

| 실행 환경          | 주소                             |
| ------------------ | -------------------------------- |
| iOS 시뮬레이터     | `localhost` 그대로               |
| Android 에뮬레이터 | `10.0.2.2`                       |
| 실기기             | PC의 LAN IP (예: `192.168.0.10`) |

Supabase URL도 같은 규칙으로 바꿔야 한다. 다만 백엔드의 `SUPABASE_JWT_ISSUER`는
token에 박힌 값(`http://127.0.0.1:54321/auth/v1`)이므로 **바꾸지 않는다.**

### 무엇부터 확인하면 되는지

로그인 없이 되는 것부터 확인하면 원인을 좁히기 쉽다.

1. **로그인 전** — 일정 만들기 → 장소 검색. `GET /places`는 인증이 선택이라
   토큰 없이도 결과가 나온다. 여기서 목록이 뜨면 앱 ↔ 백엔드 연결은 정상이다.
2. **회원가입** — 약관 화면에 서버 문서 제목이 뜨는지(= `GET /legal-documents` 성공),
   '보기'로 문서가 열리는지 확인한다.
3. **로그인** — 가입한 이메일로 로그인. 마이페이지에 닉네임과 이메일이 보이면
   `GET /me`까지 도달한 것이다.
4. **찜** — 장소 상세에서 찜 → 관심장소 탭에서 목록/메모 수정/삭제.
   메모 수정이 되면 ETag 재조회까지 동작한 것이다.

### 잘 안 될 때

| 증상                                             | 원인                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `EXPO_PUBLIC_API_BASE_URL이 설정되지 않았습니다` | `.env` 누락 또는 Metro 재시작 안 함                                  |
| `서버에 연결하지 못했습니다`                     | 주소 문제 (위 표) 또는 백엔드 미기동                                 |
| `Supabase 설정이 없어 로그인할 수 없어요`        | Supabase URL / anon key 누락                                         |
| 로그인은 되는데 목록이 401                       | 백엔드의 `SUPABASE_JWT_ISSUER`가 token의 `iss`와 다름                |
| 소셜 로그인 창이 뜨고 되돌아오지 않음            | `tourist://auth/callback` 미등록, 또는 Dashboard에서 공급자 미활성화 |

서버 오류 화면에는 한국어 `detail`이 그대로 나온다. 더 파고들 때는
`ApiError.traceId`를 백엔드 로그의 `X-Trace-Id`와 대조한다.

## 여행을 바꾸는 호출은 ETag가 필요하다

찜만 낙관적 잠금을 쓰던 시절은 지났다. **여행과 그 하위 리소스를 바꾸는 호출은 전부
`If-Match`에 여행 ETag를 요구한다.** 형식은 `"trip-<tripId>-r<revision>"`이고 opaque하게
다룬다.

| 호출                                                           | If-Match | Idempotency-Key |
| -------------------------------------------------------------- | -------- | --------------- |
| `updateTrip` `deleteTrip`                                      | 필수     | -               |
| `replaceTripPreferences` `replaceTripPlacePreferences`          | 필수     | -               |
| `createAccommodation`                                          | 필수     | 필수            |
| `updateAccommodation` `deleteAccommodation`                    | 필수     | -               |
| `putTransportEvent` `deleteTransportEvent`                     | 필수     | -               |
| `createScheduleItem` `updateScheduleItem` `deleteScheduleItem` | 필수     | 필수            |
| `moveScheduleItem` `reorderSchedule`                           | 필수     | 필수            |
| `putProfileImage`                                              | 필수¹    | 필수            |

ETag는 `GET /trips/{tripId}` 또는 **직전 변경 응답**에서 가져온다. 변경할 때마다 값이
바뀌므로 응답의 새 `etag`로 갱신하지 않으면 다음 호출이 409다.

¹ 프로필 이미지만 ETag 계열이 다르다. 여행 ETag(`"trip-<id>-r<n>"`)가 아니라
`"profile-image-<version>"`이고, `fetchProfileImage()`로만 얻을 수 있다. If-Match를
빠뜨리면 409가 아니라 **400 INVALID_PROFILE_IMAGE_REQUEST**로 막힌다.

```ts
const { data, etag } = await createTrip({ title, startDate, endDate });

const updated = await updateTrip(data.tripId, { title: '제주 3박 4일' }, etag!);
// updated.etag 로 갱신해 두고 다음 변경에 쓴다
```

### 일정 편집은 잠금이 두 겹이다

`scheduleItems.ts`의 다섯 개만 `If-Match`와 `expectedActiveScheduleVersionId`를 **둘 다**
요구한다. 앞은 "여행이 안 바뀌었나", 뒤는 "보고 있던 일정 버전이 아직 유효한가"다.

편집이 성공하면 **새 일정 버전이 만들어진다.** 연속으로 편집할 때 두 값을 모두 갱신하지
않으면 409 `ACTIVE_SCHEDULE_VERSION_CONFLICT`가 난다.

```ts
let locks = { etag, expectedActiveScheduleVersionId: activeScheduleVersionId };

const first = await createScheduleItem(tripId, { ... }, locks);
locks = {
  etag: first.data.etag,
  expectedActiveScheduleVersionId: first.data.activeScheduleVersionId,
};
const second = await moveScheduleItem(tripId, itemId, { ... }, locks);
```

### 여행 조건에서 걸리기 쉬운 것 두 가지

`preferredCategories`는 화면 라벨이 아니라 **고정 코드**만 받는다. `"관광지"`를 보내면
422 `PREFERENCE_CONSTRAINT_VIOLATION`이다. 받는 값은 여덟 개뿐이다.

```
tourist_attraction  cultural_facility  festival  travel_course
leisure             restaurant         cafe      shopping
```

장소 선호(`replaceTripPlacePreferences`)는 **먼저 찜한 장소만** 넣을 수 있다. 서버가 내
`saved_places`를 조인해서 확인하므로, 찜하지 않은 `placeId`는 그 장소가 실제로 존재해도
404 `PLACE_NOT_FOUND`다. `createSavedPlace(placeId)`를 먼저 부른다.

### 하위 리소스 변경은 일정에 미치는 영향을 같이 알려준다

숙소·교통편·여행 조건 응답에는 `scheduleEffect`(`none` / `maintained` / `invalidated`)와
`regenerationRequired`가 함께 온다. `invalidated`면 확정 일정이 무효가 된 것이므로
화면에서 "일정을 다시 만들어야 한다"고 안내한다.

## 프로필 이미지는 파일을 백엔드로 보내지 않는다

업로드는 앱이 Supabase Storage로 직접 하고, 백엔드에는 object key만 등록한다.

```ts
const objectKey = `${session.user.id}/profile/${uuid()}`;
await supabase.storage.from('profile-images').upload(objectKey, file);
await putProfileImage(objectKey);
```

key는 반드시 `<내 userId>/profile/<uuid>` 형식이어야 하고, 남의 userId로 만들면 400이다.
`putProfileImage(null)`(= `deleteProfileImage()`)이 삭제다.
