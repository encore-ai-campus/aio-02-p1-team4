# SubSync 배포 전 체크리스트

이 문서는 Chrome Web Store 또는 내부 배포를 시작하기 전에 개발·운영 담당자가 확인하는 출시 기준입니다.

> 하나라도 `BLOCKED` 또는 미확인 상태인 항목이 있으면 공개 배포를 완료된 것으로 판단하지 않습니다.

## 1. 판정 기준

| 상태 | 의미 |
| --- | --- |
| `PASS` | 실제 실행 또는 읽기 검증으로 확인됨 |
| `VERIFY` | 배포 환경에서 담당자가 확인해야 함 |
| `BLOCKED` | 현재 저장소 기준으로 공개 배포를 막는 문제 또는 미구현 경계 |
| `N/A` | 해당 배포 방식에 적용되지 않음 |

## 2. 현재 저장소 기준 핵심 확인 결과

| 항목 | 현재 상태 | 근거·조치 |
| --- | --- | --- |
| Manifest V3 | `PASS` | `manifest.json`에 `manifest_version: 3`이 선언되어 있음 |
| YouTube 콘텐츠 스크립트 | `VERIFY` | `https://www.youtube.com/*`에서 새 설치·새로고침·SPA 영상 전환 확인 |
| 운영 API 주소 | `BLOCKED` | `src/services/api_client.js`의 기본 주소가 `http://127.0.0.1:8000/api/v1`임. HTTPS 운영 주소로 교체 필요 |
| Tutor API | `VERIFY` | 백엔드 `/tutor/ask`, `/tutor/proactive`, `/tutor/feedback` 실제 배포 확인 |
| 사전 API | `BLOCKED` | 프론트가 `/dictionary/hover`, `/dictionary/detail`을 호출하므로 운영 라우트·인증·오류 응답 필요 |
| 단어 API | `BLOCKED` | 프론트가 `/words/list`, `/words/save`, `/words/{id}`를 호출하므로 운영 라우트·RLS·소유권 검사 필요 |
| 이벤트 로그 API | `BLOCKED` | 프론트 호출부와 백엔드 제공 여부를 대조하고, 사용할 경우 `/logs/event` 계약을 확정해야 함 |
| Google OAuth | `VERIFY` | Supabase provider, Google Cloud callback, Supabase redirect URL, 확장 ID 대조 필요 |
| 비밀값 보호 | `VERIFY` | 공개용 key만 번들에 포함되었는지 scan하고 secret/service-role/JWT secret은 제외 |
| Chrome Web Store 개인정보 고지 | `VERIFY` | `privacy.html`, 스토어 Data disclosure, 권한 설명을 실제 동작과 대조 |
| 외부 라이선스 고지 | `PASS` | `THIRD_PARTY_NOTICES.md`에 Gmarket Sans 및 Google G mark 고지 있음 |
| 단어 저장 방식 | `VERIFY` | 자동 저장/수동 저장 선택지가 배포 동작과 일치하는지 수동 확인 |
| 시청기록 | `VERIFY` | 재생 중 누적, 일시정지 중 정지, 새로고침 후 목록 유지 여부 확인 |

## 3. 배포 산출물 확인

### 3.1 확장 프로그램 패키지

- [ ] 최종 배포 브랜치 또는 태그를 확정했습니다.
- [ ] `manifest.json`의 `version`을 실제 배포 버전으로 갱신했습니다.
- [ ] `manifest.json`이 ZIP 최상위에 있습니다.
- [ ] `popup.html`, 서비스 워커, 콘텐츠 스크립트가 모두 패키지에 포함되어 있습니다.
- [ ] `src/`, `styles/`, `assets/` 경로의 모든 참조 파일이 존재합니다.
- [ ] 개발용 파일, 테스트 fixture, 임시 파일, 로컬 secret 파일이 패키지에 포함되지 않았습니다.
- [ ] 배포 ZIP을 새 Chrome 프로필에서 개발자 모드로 불러오는 데 성공했습니다.
- [ ] 확장 프로그램 ID가 OAuth redirect 설정에 등록된 ID와 일치합니다.

### 3.2 버전·스토어 정보

- [ ] 스토어 이름: `SubSync`
- [ ] 짧은 설명을 최종 문구로 확정했습니다.
- [ ] 상세 설명에 영·한 이중자막, 단어 학습, Script, AI Tutor, 저장소를 설명했습니다.
- [ ] 지원 URL을 입력했습니다: `[고객지원 URL]`
- [ ] 개인정보처리방침 URL을 입력했습니다: `[개인정보처리방침 URL]`
- [ ] 스크린샷을 실제 배포 버전으로 다시 촬영했습니다.
- [ ] 아이콘과 스토어 이미지에 권리 문제가 없는지 확인했습니다.
- [ ] Gmarket Sans 및 Google G mark의 고지와 사용 조건을 검토했습니다.

## 4. 백엔드·인증 확인

### 4.1 운영 API

- [ ] 프론트엔드 `BASE_URL`이 로컬 주소가 아닌 HTTPS 운영 주소입니다.
- [ ] 운영 API의 TLS 인증서가 유효합니다.
- [ ] Chrome Manifest `host_permissions`에 운영 API 호스트가 등록되어 있습니다.
- [ ] 운영 API CORS에 YouTube 페이지 및 확장 프로그램 요청이 허용되어 있습니다.
- [ ] `GET /health`가 정상 응답합니다.
- [ ] `/api/v1/tutor/ask`가 정상 질문에 답변합니다.
- [ ] `/api/v1/tutor/proactive`가 영상 문맥에 따라 응답합니다.
- [ ] `/api/v1/tutor/feedback`가 message ID와 conversation ID를 검증합니다.
- [ ] provider 장애·429·timeout 시 fallback 또는 사용자 오류가 정상 동작합니다.
- [ ] 요청 본문, 자막 원문, 사용자 질문, 인증 토큰이 로그에 평문으로 남지 않습니다.

### 4.2 사전·단어·기록 API

프론트엔드가 호출하는 아래 API는 백엔드에 실제로 등록되어 있어야 합니다.

- [ ] `GET /api/v1/dictionary/hover`
- [ ] `GET /api/v1/dictionary/detail`
- [ ] `GET /api/v1/words/list`
- [ ] `POST /api/v1/words/save`
- [ ] `DELETE /api/v1/words/{id}`
- [ ] `POST /api/v1/logs/event` 또는 해당 호출 제거·대체 정책

각 API에 대해 다음을 확인합니다.

- [ ] 인증 없는 요청의 응답이 정책에 맞습니다.
- [ ] 사용자는 자신의 단어와 기록만 조회·삭제할 수 있습니다.
- [ ] JWT의 `sub`를 사용자 ID로 사용하며 요청 body의 임의 `user_id`를 신뢰하지 않습니다.
- [ ] Supabase RLS 및 서버 측 소유권 검사가 적용되어 있습니다.
- [ ] 401, 403, 404, 422, 429, 500 오류가 사용자에게 이해 가능한 상태로 전달됩니다.
- [ ] 페이지네이션 또는 목록 상한이 적용되어 무제한 데이터가 내려오지 않습니다.

### 4.3 Supabase·Google OAuth

- [ ] Supabase URL이 운영 프로젝트 URL과 일치합니다.
- [ ] 프론트엔드에 포함되는 key가 publishable/anon key인지 확인했습니다.
- [ ] `service_role`, secret key, JWT secret, Google client secret이 프론트 번들에 없습니다.
- [ ] Supabase Authentication → Providers → Google 설정이 활성화되어 있습니다.
- [ ] Google Cloud Authorized redirect URI가 Supabase callback 주소와 일치합니다.
- [ ] Supabase Redirect URLs에 다음 형식의 확장 프로그램 callback이 등록되어 있습니다.

```text
https://<extension-id>.chromiumapp.org/supabase
```

- [ ] 로그인 성공 후 버튼이 `로그아웃`으로 변경됩니다.
- [ ] access token 만료 시 세션 갱신이 동작합니다.
- [ ] 로그아웃 후 세션과 인증 관련 로컬 값이 제거됩니다.
- [ ] 확장 프로그램 ID 변경 시 redirect URL을 함께 변경했습니다.

## 5. 기능 QA

### 5.1 신규 설치·기본 흐름

- [ ] Chrome Web Store 또는 개발자 모드로 신규 설치했습니다.
- [ ] YouTube 영상 페이지를 처음 열었을 때 패널이 표시됩니다.
- [ ] 이미 열려 있는 탭을 새로고침했을 때 패널이 표시됩니다.
- [ ] 퀵바의 ON/OFF가 자막 표시 상태와 일치합니다.
- [ ] 패널 열기·닫기가 정상 동작합니다.
- [ ] 새로고침 버튼이 현재 영상만 다시 불러옵니다.
- [ ] YouTube SPA에서 다른 영상으로 이동하면 이전 영상 자막이 남지 않습니다.

### 5.2 자막·Script

- [ ] 영어와 한국어 자막이 함께 있는 영상에서 이중자막이 표시됩니다.
- [ ] 한국어 자막이 없는 영상에서 영어만 표시되거나 경고가 표시됩니다.
- [ ] 자막이 전혀 없는 영상에서 빈 화면 대신 안내가 표시됩니다.
- [ ] 자막 응답이 비어 있을 때 재시도 안내가 표시됩니다.
- [ ] 자막 요청 HTTP 429에서 사용자가 다시 시도할 수 있습니다.
- [ ] 영어 자막 단어 Hover 시 뜻 툴팁이 표시됩니다.
- [ ] 툴팁이 단어를 가리지 않는 위치에 표시됩니다.
- [ ] 단어 클릭 시 상세 팝업이 표시됩니다.
- [ ] 상세 팝업의 `×`와 `Esc` 닫기가 동작합니다.
- [ ] Script의 시간 버튼을 선택하면 올바른 시점으로 이동합니다.
- [ ] Script 검색·접기·닫기·재열기가 동작합니다.
- [ ] 재생 중 현재 문장 강조와 자동 스크롤이 동작합니다.

### 5.3 Tutor

- [ ] Tutor 탭이 정상 표시됩니다.
- [ ] 질문 전송과 Enter 전송이 모두 동작합니다.
- [ ] 질문 대기 indicator가 표시되고 요청 완료 후 제거됩니다.
- [ ] 현재 영상과 최근 자막 문맥이 Tutor 요청에 포함됩니다.
- [ ] Tutor 답변이 표시됩니다.
- [ ] Tutor provider 오류·timeout·429 안내가 표시됩니다.
- [ ] 선제 질문 ON/OFF가 실제 동작과 일치합니다.
- [ ] 답변의 `👍`·`👎` 피드백이 한 번만 전송됩니다.
- [ ] 피드백에 conversation ID와 message ID가 사용됩니다.

### 5.4 저장소·기록

- [ ] 로그인 전 저장소 접근 시 로그인 안내가 표시됩니다.
- [ ] Google 로그인 후 저장소를 다시 불러옵니다.
- [ ] 단어를 저장하면 단어 탭 목록에 나타납니다.
- [ ] 저장 단어의 뜻과 문맥 문장이 보입니다.
- [ ] 저장 단어 삭제 후 목록이 즉시 갱신됩니다.
- [ ] 원격 API 실패 시 로컬 fallback 정책이 의도대로 동작합니다.
- [ ] 영상을 10초 이상 재생하면 시청 시간이 누적됩니다.
- [ ] 일시정지 중에는 시청 시간이 누적되지 않습니다.
- [ ] 시청기록에 제목·썸네일·누적 시간·마지막 시각이 표시됩니다.
- [ ] 영상 제목·썸네일 클릭으로 올바른 YouTube 영상이 새 탭에서 열립니다.
- [ ] 브라우저 저장공간 삭제 시 로컬 데이터 삭제 정책이 문서와 일치합니다.

### 5.5 설정·레이아웃

- [ ] 이중자막 토글이 즉시 반영됩니다.
- [ ] Hover 단어 학습 토글이 즉시 반영됩니다.
- [ ] Tutor 선제 질문 토글이 즉시 반영됩니다.
- [ ] 자동 저장/수동 저장 설정이 실제 동작과 일치합니다.
- [ ] 다크·화이트·글라스 테마가 정상 전환됩니다.
- [ ] 시스템 폰트·GMarketSans 전환이 정상 동작합니다.
- [ ] 퀵바와 메인 패널을 이동할 수 있습니다.
- [ ] 영상 자막을 이동할 수 있습니다.
- [ ] 더블클릭 시 각 UI가 기본 위치로 돌아옵니다.
- [ ] 창 크기를 변경해도 패널이 화면 밖으로 사라지지 않습니다.

## 6. 오류·보안 QA

- [ ] API가 꺼진 상태에서 확장 프로그램 기본 UI가 멈추지 않습니다.
- [ ] API 오류가 발생해도 토큰, 비밀번호, 자막 원문이 alert나 콘솔에 노출되지 않습니다.
- [ ] 외부 입력이 HTML 또는 실행 코드로 삽입되지 않습니다.
- [ ] 알 수 없는 backend route로 요청을 전달하지 않습니다.
- [ ] 허용되지 않은 YouTube 자막 URL을 처리하지 않습니다.
- [ ] 다른 영상의 자막 요청이 현재 영상에 섞이지 않습니다.
- [ ] 다른 사용자의 단어·기록을 조회할 수 없습니다.
- [ ] 개인정보처리방침에 실제 수집·전송 범위가 반영되어 있습니다.

## 7. 테스트 증거 기록

배포 승인 시 다음 정보를 함께 기록합니다.

```text
배포 버전:
Git commit/tag:
검증 날짜:
검증 Chrome 버전:
검증 OS:
운영 API 주소(비밀값 제외):
OAuth redirect 확인:
자동 테스트 명령과 결과:
수동 QA 영상 URL 또는 fixture:
미검증 항목:
승인자:
```

API key, access token, refresh token, 비밀번호 및 client secret은 증거 기록에 포함하지 않습니다.

## 8. Go / No-Go 기준

### Go

- [ ] 핵심 기능의 모든 `BLOCKED` 항목이 해소되었습니다.
- [ ] 운영 API 주소와 인증 구성이 공개 배포본에 반영되었습니다.
- [ ] Tutor·사전·단어·기록 API의 실제 라우트와 소유권 검사가 검증되었습니다.
- [ ] 신규 설치, YouTube 영상 전환, 자막 실패, 로그인, Tutor, 저장소, 설정 QA가 통과했습니다.
- [ ] 개인정보처리방침과 Chrome Web Store 데이터 고지가 실제 동작과 일치합니다.

### No-Go

다음 중 하나라도 해당하면 공개 배포를 보류합니다.

- 프론트엔드가 `127.0.0.1` 또는 개발용 API를 호출합니다.
- 운영 백엔드에 프론트 호출 API가 없습니다.
- OAuth redirect 또는 확장 프로그램 ID가 불일치합니다.
- service-role/secret/JWT secret이 클라이언트 번들에 포함됩니다.
- 사용자별 데이터에 RLS 또는 서버 측 소유권 검사가 없습니다.
- 자막·AI 오류 상태에서 사용자가 복구할 방법이 없습니다.
- 현재 구현되지 않은 기능을 스토어 설명에서 완료된 기능처럼 안내합니다.
