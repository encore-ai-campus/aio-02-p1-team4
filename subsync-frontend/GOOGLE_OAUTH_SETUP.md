# Google OAuth 연결 가이드

이 확장 프로그램은 `chrome.identity.launchWebAuthFlow`와 Supabase Auth의 PKCE 흐름을 사용합니다.
프론트에는 Supabase의 공개 URL과 publishable/anon key만 넣고, Google OAuth client secret은 Supabase Dashboard에만 보관합니다.

## 1. 프론트 공개 설정 입력

`src/services/auth_config.js`의 두 값을 실제 프로젝트 값으로 바꿉니다.

```javascript
const supabaseUrl = "https://YOUR_PROJECT_REF.supabase.co";
const supabasePublishableKey = "YOUR_SUPABASE_PUBLISHABLE_KEY";
```

`service_role` key, JWT secret, Google client secret은 이 파일에 넣지 않습니다.

## 2. Google Cloud OAuth Client 설정

Supabase Dashboard의 Google provider 안내에 따라 Google Cloud OAuth Client를 생성합니다.

Google Cloud의 Authorized redirect URI에는 다음 Supabase callback 주소를 등록합니다.

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Google client ID와 client secret은 Supabase Dashboard의 Authentication → Providers → Google에 입력합니다.

## 3. Supabase Redirect URL 설정

확장 프로그램 ID는 `chrome://extensions`에서 확인합니다. 이 확장 프로그램이 사용하는 callback 주소는 다음 형식입니다.

```text
https://<extension-id>.chromiumapp.org/supabase
```

Supabase Dashboard의 Authentication → URL Configuration → Redirect URLs에 이 주소를 추가합니다.

코드에서도 동일한 주소를 다음 API로 생성합니다.

```javascript
chrome.identity.getRedirectURL("supabase");
```

확장 프로그램 ID가 바뀌면 Redirect URL도 다시 등록해야 합니다.

## 4. 동작 순서

1. 로그인 모달에서 Google 아이콘 버튼을 클릭합니다.
2. YouTube content script가 service worker에 `AUTH_GOOGLE_LOGIN`을 보냅니다.
3. service worker가 PKCE verifier/challenge를 생성합니다.
4. `chrome.identity.launchWebAuthFlow`가 Google/Supabase 로그인 창을 엽니다.
5. Supabase가 extension callback으로 authorization code를 반환합니다.
6. service worker가 `/auth/v1/token?grant_type=pkce`로 code를 세션으로 교환합니다.
7. 전체 세션은 extension storage에 저장하고, content script에는 access token·사용자 요약만 반환합니다.
8. API 요청에는 `Authorization: Bearer <access_token>`이 자동으로 붙습니다.
9. access token이 만료되면 service worker가 refresh token으로 갱신합니다.

## 5. 백엔드 전제 조건

현재 백엔드 실제 `app/main.py`에는 Tutor router만 등록되어 있고 JWT 인증 dependency와 `/words`, `/auth` router는 아직 구현되지 않았습니다.
따라서 OAuth 브라우저 로그인 자체는 이 프론트 흐름으로 준비되지만, 사용자별 단어·기록 API를 운영하려면 백엔드에서 다음을 별도로 구현해야 합니다.

- Supabase JWT 서명·만료 검증 dependency
- 검증된 JWT `sub`를 사용자 ID로 사용하는 보호 API
- 사용자별 RLS와 서버 측 소유권 검사
- `public.users.hashed_password`를 사용하지 않는 Supabase `auth.users` 연계 구조

프론트에서 사용자 ID를 요청 body로 보내 인증을 대신하지 않습니다.

## 6. 로컬 확인

1. `auth_config.js`에 공개 URL/key 입력
2. `chrome://extensions`에서 확장 프로그램을 다시 로드
3. YouTube 탭을 새로고침
4. SubSync에서 로그인 버튼 클릭
5. Google 동의 후 SubSync 버튼이 `로그아웃`으로 바뀌는지 확인
6. API 요청의 Bearer header와 백엔드 JWT 검증 결과를 확인

실제 Google 계정 로그인은 OAuth provider·redirect 설정·네트워크가 필요하므로 자동 테스트에서는 실행하지 않고, PKCE URL 생성·callback 파싱·세션 교환·갱신·로그아웃을 fake provider로 검증합니다.
