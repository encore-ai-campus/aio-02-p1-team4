# SubSync 배포 문서

SubSync Chrome 확장 프로그램을 배포할 때 사용하는 설치 가이드, 사용자 매뉴얼, 기능 설명 및 출시 전 점검 문서입니다.

> 기준 버전: Manifest V3 / 현재 manifest 버전 `1.0.0`
>
> 문서 기준일: 2026-09-08

## 문서 목록

| 문서 | 대상 | 내용 |
| --- | --- | --- |
| [설치 가이드](INSTALLATION_GUIDE_KO.md) | 일반 사용자·테스터 | Chrome Web Store 설치, 개발자 모드 설치, 권한, 업데이트·삭제 |
| [사용자 가이드](USER_GUIDE_KO.md) | 일반 사용자 | 처음 실행, 영상학습, AI Tutor, 저장소, 설정 사용법 |
| [기능 설명서](FEATURES_KO.md) | 사용자·기획·스토어 심사 담당자 | 기능 목록, 동작 방식, 데이터 처리, 제한사항 |
| [배포 전 체크리스트](RELEASE_CHECKLIST_KO.md) | 개발·운영 담당자 | 백엔드, OAuth, API, Chrome Web Store, QA 확인 항목 |

## 화면 이미지

문서에서 사용하는 화면 이미지는 다음 위치에 있습니다.

- `images/01-video-learning.png` — 영상학습 및 이중자막
- `images/02-ai-tutor.png` — AI Tutor
- `images/03-storage-words.png` — 저장소의 단어 탭
- `images/04-storage-history.png` — 저장소의 시청기록 탭
- `images/05-settings.png` — 설정

## 배포 전 반드시 확인할 사항

현재 프론트엔드 코드와 백엔드 문서를 대조한 결과, 다음 항목은 공개 배포 전에 운영 환경 기준으로 확인해야 합니다.

1. 프론트엔드 API 기본 주소가 현재 `http://127.0.0.1:8000/api/v1`로 설정되어 있습니다. 공개 배포 시 HTTPS 운영 백엔드 주소로 교체하고 CORS와 호스트 권한을 함께 확인해야 합니다.
2. 현재 백엔드에 등록된 Tutor 라우터는 `/tutor/ask`, `/tutor/proactive`, `/tutor/feedback`, `/tutor/usage`입니다. 프론트엔드가 호출하는 사전·단어·로그 API(`/dictionary/*`, `/words/*`, `/logs/event`)는 운영 백엔드에 실제로 등록되어 있는지 별도로 확인해야 합니다.
3. Google OAuth는 Supabase URL, 공개용 publishable/anon key, Google provider, Supabase redirect URL, 확장 프로그램 ID가 모두 일치해야 합니다.
4. `service_role` 키, JWT secret, Google client secret, refresh token 및 기타 비밀값은 확장 프로그램 코드나 문서에 넣지 않아야 합니다.
5. YouTube 자막이 없는 영상, 자막 요청 제한(예: HTTP 429), 언어 트랙 누락 상태에서 사용자가 이해할 수 있는 안내와 재시도 동작이 제공되는지 확인해야 합니다.

상세한 판정 기준은 [배포 전 체크리스트](RELEASE_CHECKLIST_KO.md)를 기준으로 합니다.

## 문서 작성 원칙

- 실제 구현된 동작과 배포 예정 동작을 구분합니다.
- 화면에 표시되지 않는 기능을 완료된 기능처럼 안내하지 않습니다.
- 자막과 AI Tutor에 전송될 수 있는 정보의 범위를 개인정보처리방침과 일치시킵니다.
- 배포 버전, 스토어 URL, 고객지원 URL, 개인정보처리방침 URL이 확정되면 대괄호로 표시된 자리표시자를 교체합니다.
- 외부 라이선스 고지는 프로젝트의 [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)를 기준으로 합니다.

## 관련 문서

- [개인정보처리방침](../privacy.html)
- [Google OAuth 설정 가이드](../GOOGLE_OAUTH_SETUP.md)
- [외부 리소스 고지](../THIRD_PARTY_NOTICES.md)
- [개발 진행 기록](../DEVELOPMENT_PROGRESS.md)
