# SubSync Frontend

YouTube에서 영어·한국어 이중자막을 보고, 자막 속 단어를 학습하며, 영상 문맥 기반 AI Tutor를 사용할 수 있는 Chrome 확장 프로그램입니다.

SubSync Frontend는 **Chrome Manifest V3 기반의 무빌드(unpacked) 확장 프로그램**입니다. 별도의 번들러나 `npm install` 과정 없이 저장소 루트의 `manifest.json`을 Chrome에 불러와 실행할 수 있습니다.

## 프로젝트 개요

| 항목 | 내용 |
| --- | --- |
| 제품명 | SubSync |
| 플랫폼 | Google Chrome / Manifest V3 |
| 현재 manifest 버전 | `1.0.0` |
| 주요 호스트 | `https://www.youtube.com/*` |
| UI 진입점 | YouTube 영상 페이지에 삽입되는 SubSync 패널 |
| 인증 | Chrome Identity API + Supabase Auth PKCE |
| 백엔드 기본 주소 | `https://subsync-backend-4bmh.onrender.com/api/v1` |
| 개인정보처리방침 | [privacy.html](privacy.html) / [공개 페이지](https://931njhthe-star.github.io/subsync-frontend/privacy.html) |

## 주요 기능

- **영·한 이중자막**: YouTube 자막을 영어·한국어로 함께 표시합니다.
- **현재 문장 추적**: 재생 위치에 맞춰 현재 자막 문장을 갱신하고 강조합니다.
- **Hover 단어 학습**: 영어 단어에 마우스를 올려 간단한 뜻을 확인합니다.
- **상세 단어 학습**: 단어의 발음기호, 품사, 정의, 문맥 의미 및 관련 표현을 확인합니다.
- **단어 저장**: 학습할 단어를 저장하고 필요할 때 저장을 취소합니다.
- **Script**: 전체 자막을 검색하고, 타임스탬프로 원하는 시점으로 이동합니다.
- **AI Tutor**: 현재 영상과 자막 문맥을 바탕으로 질문하고 답변을 받습니다.
- **Tutor 선제 질문**: 영상 학습 흐름에 맞춰 AI Tutor가 먼저 질문하도록 설정할 수 있습니다.
- **Tutor 피드백**: 답변이 도움이 되었는지 평가할 수 있습니다.
- **저장소**: 저장 단어와 시청기록을 확인합니다.
- **Google 로그인**: 계정 기반 기능을 위한 Supabase Auth PKCE 로그인을 지원합니다.
- **설정**: 이중자막, Hover 학습, Tutor 선제 질문, 테마 및 폰트를 설정합니다.
- **패널 조작**: 퀵바·메인 패널·영상 자막을 이동하고 크기를 조정할 수 있습니다.
- **테마·폰트**: 다크, 화이트, 글라스 테마와 기본 시스템 폰트, GMarketSans를 제공합니다.

## 실행 구조

```text
YouTube 영상 페이지
        │
        ├─ MAIN world: src/core/inject.js
        │              YouTube 페이지의 자막 요청·영상 문맥 관찰
        │
        ├─ Isolated content scripts
        │   ├─ src/core/              자막·플레이어·테마·폰트
        │   ├─ src/services/          API·인증·사전·Tutor·기록·설정
        │   ├─ src/interactive/        Hover·클릭·드래그·리사이즈
        │   └─ src/components/         패널·Script·Tutor·저장소·설정 UI
        │
        └─ MV3 service worker: src/background.js
                           자막 요청 relay 및 Google OAuth 처리
```

모든 파일은 `manifest.json`에 직접 등록됩니다. 파일을 추가하거나 이름을 변경할 때는 Manifest의 로드 순서와 경로를 함께 확인해야 합니다.

## 요구 사항

- Manifest V3를 지원하는 최신 Google Chrome
- 영어 또는 사용 가능한 자막 트랙이 있는 YouTube 영상
- 원격 API 기능을 사용할 경우 인터넷 연결
- 테스트 실행 시 Node.js
- Google 로그인을 사용할 경우 Supabase Auth·Google OAuth 설정

## 설치 방법

### 개발자 모드로 설치

1. 이 저장소를 내려받습니다.
2. Chrome 주소 표시줄에 `chrome://extensions`를 입력합니다.
3. 오른쪽 위에서 **개발자 모드**를 켭니다.
4. **압축해제된 확장 프로그램을 로드**를 선택합니다.
5. `manifest.json`이 최상위에 있는 다음 저장소 폴더를 선택합니다.
6. 확장 프로그램 목록에서 **SubSync**가 표시되는지 확인합니다.
7. YouTube 영상 탭을 새로고침합니다.
8. 영상 위에 `SubSync · ON` 퀵바와 메인 패널이 표시되는지 확인합니다.

정상적인 선택 폴더 구조는 다음과 같습니다.

```text
subsync-frontend/
├─ manifest.json
├─ popup.html
├─ privacy.html
├─ src/
├─ styles/
└─ assets/
```

Manifest, content script 또는 service worker를 수정한 뒤에는 다음 순서로 다시 적용합니다.

1. `chrome://extensions`에서 SubSync의 새로고침 아이콘을 선택합니다.
2. 열려 있는 YouTube 탭을 새로고침합니다.
3. 이전 content script context가 남아 있으면 YouTube 탭을 닫고 새 탭을 엽니다.

### Chrome Web Store 배포본

Chrome Web Store 주소가 확정된 배포본은 스토어의 **Chrome에 추가** 절차를 사용합니다. 현재 저장소의 설치·권한·문제 해결 기준은 [설치 가이드](docs/INSTALLATION_GUIDE_KO.md)를 확인하십시오.

## 개발 환경 설정

### API 설정

공통 API 클라이언트는 [src/services/api_client.js](src/services/api_client.js)에서 관리합니다. 현재 기본 API 주소는 다음과 같습니다.

```text
https://subsync-backend-4bmh.onrender.com/api/v1
```

로컬 백엔드를 사용할 때는 개발 환경에 맞는 주소로 API 클라이언트 설정을 변경하고, 백엔드의 CORS 설정과 Manifest의 `host_permissions`를 함께 확인해야 합니다. 운영 배포본에는 로컬 주소를 사용하지 않습니다.

프론트엔드가 사용하는 주요 API 기능은 다음과 같습니다.

- Tutor 질문: `/tutor/ask`
- Tutor 선제 질문: `/tutor/proactive`
- Tutor 피드백: `/tutor/feedback`
- 단어 뜻 Hover 조회: `/dictionary/hover`
- 단어 상세 조회: `/dictionary/detail`
- 단어 저장·삭제: `/words/*`

실제 운영 라우트, 인증 요구 사항, 오류 응답 및 사용자별 소유권 검사는 [배포 전 체크리스트](docs/RELEASE_CHECKLIST_KO.md)를 기준으로 확인하십시오.

### Google OAuth 설정

Supabase 공개 URL과 **publishable/anon key**는 [src/services/auth_config.js](src/services/auth_config.js)에서 관리합니다.

- `service_role` key, Supabase secret key, JWT secret을 프론트엔드에 넣지 않습니다.
- Google OAuth client secret은 Supabase Dashboard에만 보관합니다.
- 확장 프로그램 ID가 바뀌면 Supabase Redirect URL도 갱신합니다.
- callback 주소 형식은 `https://<extension-id>.chromiumapp.org/supabase`입니다.

자세한 설정 순서는 [Google OAuth 연결 가이드](GOOGLE_OAUTH_SETUP.md)를 확인하십시오.

## 저장 데이터와 개인정보

SubSync는 기능 제공을 위해 다음 정보에 접근하거나 처리할 수 있습니다.

- 현재 YouTube 영상의 URL, ID, 제목 및 자막 문맥
- 사용자가 입력한 AI Tutor 질문과 대화 문맥
- 저장 단어와 문맥 문장
- 브라우저 기반 시청기록
- 사용자가 선택한 설정값
- Google 로그인 사용자 요약 및 인증 세션

인증 세션과 설정·로컬 학습 기록은 Chrome 확장 프로그램 저장소를 사용할 수 있습니다. 원격 API를 이용하는 기능은 백엔드와 Supabase 설정에 따라 서버로 데이터를 전송할 수 있습니다.

사용자는 API key, 비밀번호, Google client secret, Supabase secret key 또는 자막 인증값을 입력하지 않습니다. 상세한 처리 목적과 보관·삭제 정책은 [개인정보처리방침](privacy.html)을 확인하십시오.

## Chrome 권한

| 권한 또는 접근 범위 | 사용 목적 |
| --- | --- |
| `storage` | 설정, 인증 세션, 로컬 단어 및 시청기록 저장 |
| `activeTab` | 현재 YouTube 탭에 학습 UI 표시 및 영상과 상호작용 |
| `webRequest` | YouTube 자막 요청을 관찰하고 현재 영상의 자막 문맥 처리 |
| `identity` | Google OAuth 로그인 창 실행 및 callback 처리 |
| `https://www.youtube.com/*` | 영상·자막·페이지 문맥 처리 및 UI 삽입 |
| 백엔드·Supabase 호스트 | 인증, Tutor, 사전 및 단어 저장 API 통신 |

확장 프로그램의 외부 접근 범위와 데이터 처리는 Chrome 권한 고지 및 개인정보처리방침과 일치해야 합니다.

## 디렉터리 구조

```text
subsync-frontend/
├─ assets/
│  ├─ fonts/                 # 로컬 UI 폰트
│  └─ icons/                 # 확장 프로그램 UI SVG 아이콘
├─ docs/
│  ├─ README.md              # 문서 인덱스 및 배포 문서 안내
│  ├─ INSTALLATION_GUIDE_KO.md
│  ├─ USER_GUIDE_KO.md
│  ├─ FEATURES_KO.md
│  ├─ RELEASE_CHECKLIST_KO.md
│  └─ images/                # 사용자 가이드용 이미지
├─ src/
│  ├─ background.js          # MV3 service worker
│  ├─ content_main.js        # 콘텐츠 스크립트 초기화 및 라이프사이클
│  ├─ core/                  # YouTube·자막·테마·폰트·플레이어 연동
│  ├─ services/              # API·인증·사전·Tutor·기록·설정
│  ├─ interactive/           # Hover·클릭·드래그·리사이즈
│  └─ components/            # 화면 컴포넌트
├─ styles/                   # UI별 CSS와 테마·모션
├─ manifest.json             # Chrome Manifest V3 설정
├─ popup.html                # 확장 프로그램 팝업 진입 화면
├─ privacy.html              # 개인정보처리방침
├─ GOOGLE_OAUTH_SETUP.md     # Google OAuth 설정
├─ THIRD_PARTY_NOTICES.md    # 폰트·아이콘 외부 리소스 고지
└─ DEVELOPMENT_PROGRESS.md   # 개발 진행 기록
```

## 테스트 및 검증

이 저장소는 별도 npm 빌드 없이 Node.js 내장 테스트 러너를 사용합니다. 저장소 루트에서 실행합니다.

```bash
# 전체 JavaScript 테스트
node --test

# 수정한 JavaScript 파일 문법 검사 예시
node --check src/background.js
node --check src/content_main.js
node --check src/services/api_client.js

# Manifest JSON 검사
python -m json.tool manifest.json

# Git 공백 검사
git diff --check
```

테스트 파일은 각 기능의 계약·상태·오류·DOM 동작을 검증합니다. 소스 테스트 통과만으로 실제 Chrome 확장 프로그램 설치, YouTube 자막 제공 여부, Google OAuth callback, 운영 API 및 provider 상태가 보장되는 것은 아니므로 별도의 수동 QA가 필요합니다.

## 배포 전 확인 사항

다음 항목은 공개 배포 전에 반드시 실제 환경에서 확인해야 합니다.

- `manifest.json`이 ZIP 파일의 최상위에 있는지 확인합니다.
- Manifest에 등록된 모든 JavaScript·CSS·asset 파일이 존재하는지 확인합니다.
- API 기본 주소가 HTTPS 운영 주소인지 확인합니다.
- 운영 백엔드의 CORS와 Manifest `host_permissions`가 일치하는지 확인합니다.
- Tutor·사전·단어 저장 API의 실제 라우트와 오류 응답을 확인합니다.
- Google provider, Supabase Redirect URL, Google callback, 확장 프로그램 ID가 일치하는지 확인합니다.
- 사용자 데이터에 대한 JWT 검증, RLS 및 서버 측 소유권 검사를 확인합니다.
- API key, secret key, JWT secret, refresh token, 비밀번호가 번들·로그·문서에 포함되지 않았는지 확인합니다.
- 자막이 없는 영상, 빈 응답, HTTP 429 및 네트워크 오류에서 재시도 안내가 표시되는지 확인합니다.
- 새 Chrome 프로필에서 설치·로그인·자막·Tutor·저장소·설정 기능을 수동 점검합니다.

공개 배포 판정 기준과 증거 기록 양식은 [배포 전 체크리스트](docs/RELEASE_CHECKLIST_KO.md)를 사용하십시오.

## 관련 문서

- [문서 인덱스](docs/README.md)
- [설치 가이드](docs/INSTALLATION_GUIDE_KO.md)
- [사용자 가이드](docs/USER_GUIDE_KO.md)
- [기능 설명서](docs/FEATURES_KO.md)
- [배포 전 체크리스트](docs/RELEASE_CHECKLIST_KO.md)
- [Google OAuth 연결 가이드](GOOGLE_OAUTH_SETUP.md)
- [개인정보처리방침](privacy.html)
- [외부 리소스 고지](THIRD_PARTY_NOTICES.md)
- [개발 진행 기록](DEVELOPMENT_PROGRESS.md)

## 팀 정보

설정 화면의 **About** 섹션에서 프로젝트 팀 정보와 담당 영역, GitHub 링크를 확인할 수 있습니다.

프로젝트: **엔코아 멀티 에이전트 AI 오케스트레이션 2기**

## 라이선스 및 외부 리소스

프로젝트에 포함된 Gmarket Sans와 Google G mark의 사용·저작권 고지는 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)를 확인하십시오. 외부 리소스의 라이선스와 상표 사용 조건을 검토한 뒤 배포하십시오.
