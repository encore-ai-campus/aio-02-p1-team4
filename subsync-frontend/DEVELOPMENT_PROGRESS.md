# SubSync Frontend 개발 진행 기록

## 2026-09-04
- 단어에 표시되는 Hover 뜻 창으로 마우스를 이동할 때 창이 사라지는 문제를 개선
- 자막, 퀵바, 앱 창을 드래그해서 이동할 수 있도록 개선
- 자막 드래그 시작 시 아래로 튀는 위치 점프 문제를 수정
- 비로그인 배지 제거, 퀵바 아이콘 변경, 메인 패널 8방향 리사이즈 및 하단 Script 병합
- YouTube 컨트롤 상태에 따른 자막 자동 이동을 제거하고 더블클릭 시 기본 위치로 복귀하도록 개선
- 메인 패널을 퀵바 아래에 배치하고 iOS/macOS 느낌의 펼침·접힘 애니메이션을 적용
- 버튼, 탭, Script, 자막, 툴팁, 팝업, 모달 및 동적 콘텐츠 전체에 공통 인터랙션 애니메이션을 적용

## 2026-09-05
- 메인 패널 세로 확장 시 Script와 AI Tutor 내부가 남는 높이를 채우도록 개선
- 최초 트랙 수신 전 잘못된 전체 transcript 요청과 자막 중복 빌드 경쟁 문제를 수정
- Script 모션 적용 후 긴 자막 행이 잘리는 문제를 수정
- 현재 자막 미리보기의 고정 높이 클리핑과 긴 문장 줄바꿈 문제를 수정
- 드래그 후 자막 문장 길이 변화로 가로 중심축이 이동하는 문제를 수정
- 영상학습의 중복 Script 열기 버튼을 제거하고 전체 Script 패널 접기·펼치기를 추가
- Script 헤더 중앙 접기 배치와 전용 돋보기·접기 SVG 아이콘을 적용
- 접기 아이콘을 예시처럼 투명 배경의 두꺼운 회색 V자 형태로 개선
- 접기 아이콘을 원형 테두리와 내부 chevron 조합의 중립 회색 스타일로 개선
- 접기 아이콘을 50% 축소하고 Script 카드 헤더 높이를 함께 줄임
- 검색·접기 아이콘을 약 20% 확대하고 접힌 카드 hover 준비 애니메이션을 Script 영역에 한정해 적용
- 기존에 잘못 적용된 Script 카드 focus 기반 준비 애니메이션을 제거하고 마우스 hover만 유지
- 접힌 카드 hover 시 카드 전체 이동 대신 헤더 아래 펼쳐질 Script 패널 상단 peek 영역이 아래로 확장되도록 교정
- 화이트·다크 테마 설정을 추가하고 저장값에 따라 전체 SubSync UI 색상을 전환
- 글라스 테마 옵션을 추가하고 반투명 tinted glass, radial gradient, blur, saturate, glow 테두리를 전체 패널에 적용
- 글라스 패널 중앙의 보라색 ambient radial light와 purple glow shadow를 제거하고 청록 tint·필요한 UI 강조색만 유지
- 테마 변경 시 SubSync UI 표면·텍스트·테두리·그림자가 280ms transition으로 전환되도록 개선
- 단어 호버 툴팁의 wheel 이벤트가 YouTube 문서로 전파되지 않도록 차단
- 재생 중에만 Script 자동 스크롤을 추적하고, 일시정지 중에는 현재 cue 포커스만 유지
- 현재 Script 행을 end_timestamp 구간으로 판별해 정지 위치에서도 정확히 강조
- Script 자동 추적 위치를 목록 중앙이 아닌 윗단 기준선(16px 아래)에 고정
- Coolicons를 참고한 오리지널 SVG 아이콘 6종을 추가하고 주요 기능 메뉴에 적용
- 고정 Rounded Background layer를 제거하고 Chromium SVG feTurbulence·feDisplacementMap 기반의 정적 배경 굴절 Glass 효과를 메인 및 내부 surface에 적용
- 글라스 필터의 자동 turbulence 애니메이션을 제거하고 정적 refraction만 유지
- 이미지 기준 블루 팔레트(#3F7FF5)를 다크·화이트·글라스 테마와 공통 액션·Tutor·자막·Script 스타일에 적용
- Glass 설정 카드만 어두운 청록 차콜 표면(rgba 0.78)으로 조정해 설명 텍스트 대비를 개선
- Glass Tutor·Script 패널에도 설정 카드와 동일한 어두운 표면·테두리·정적 굴절 계층을 적용
- Glass 메인 패널 외곽선을 제거하고 내부 경계선을 중성 회색으로 통일했으며 패널 청록 틴트를 중성 차콜·화이트 sheen으로 교체
- 영상 위와 패널 전역 이중자막 단어 좌우 여백을 줄여 가로 간격을 개선
- Tutor 마운트 호스트의 중복 `subsync-tutor-box` 클래스를 제거하고 실제 Tutor surface가 한 번만 렌더되도록 회귀 테스트를 추가
- 설정에 기본 시스템 폰트·GMarketSans 선택을 추가하고 Gmarket Sans Medium WOFF를 로컬 번들로 적용·저장하도록 구현
- subtitleView 렌더 캐시를 자막 내용·시간·영상 ID·표시 설정 기준으로 개선해 cue 변경과 clear 후 동일 자막 재표시를 보장
- 콘텐츠 스크립트의 page-relative GMarketSans 요청 오류를 chrome.runtime.getURL 기반 확장 URL 등록으로 수정하고 실제 Chrome 로딩을 검증
- Script 제목을 `Script`로 축약하고 접힌 카드 hover를 전체 `:hover` 기반으로 전환해 버튼·peek 이동 중 높이 피드백 루프를 제거했으며 헤더 아이콘·텍스트 수직 중심을 일치
- 접힌 Script hover 해제 시 패널 입장 애니메이션이 재실행되는 단발성 깜박임을 차단
- 화이트 테마 메인 패널의 투명도를 높여 배경이 은은하게 비치도록 개선
- 화이트 테마 영상 자막 한국어의 대비·크기·굵기·줄간격을 개선하고 메인 패널·자막 패널 투명도를 0.65로 조정

## 2026-09-06
- 메인패널 이중자막의 한국어 줄(`subsync-sub-known`)을 Bold 700으로 조정
- 단어 클릭·저장·시청 누적을 브라우저 기록 서비스로 분리하고 단어 기록·시청 기록·단어장 화면을 실제 데이터와 로컬 fallback에 연결
- 시청 기록 카드에 YouTube 제목·썸네일·영상 링크를 추가하고 제목과 썸네일 클릭으로 해당 영상에 이동하도록 개선
- Glass 단어 기록 카드를 어두운 표면으로 조정하고 영상·메인패널 한국어 텍스트를 밝은 청백색과 강화 그림자로 개선
- 시청 기록 화면에서 Video ID 직접 노출을 제거
- 메인 패널과 영상 자막을 더블클릭하면 기본 위치로 돌아가며 left/top 복귀 애니메이션을 적용
- 화이트 테마 설정 카드·단어 기록·시청 기록·영상학습 이중자막 패널에 밝은 surface, 중성 테두리, 그림자를 적용해 패널 구분을 개선
- 화이트 테마 AI Tutor 외곽 패널과 AI 답변 카드에도 동일한 surface·테두리·그림자 계층을 적용
- Script 카드 하단의 원형 chevron 펼치기 아이콘을 퀵바 패널 토글에도 재사용
- 탭 이동 시 현재 화면과 클릭한 탭의 순서를 기준으로 패널 폭만큼 좌우 슬라이드 애니메이션을 적용하고 Script 헤더 아이콘·텍스트 간격을 축소
- 상단 탭의 파란색 현재 위치 표시를 개별 버튼 배경이 아닌 단일 pill indicator의 위치 이동 애니메이션으로 변경
- 한국어 cue를 영어 cue 시간 구간에 한 번만 배정하고 동일 영어 cue의 여러 조각만 병합해 번역 중복·누락을 수정
- YouTube native captions module을 변경하지 않는 passive timedtext 관찰 방식으로 전환하고 URL 전달·회귀 테스트를 추가
- 설정창 내부 구분선에 다크·화이트·글라스 테마별 divider 토큰을 적용하고 공통 selector로 통일
- 퀵바 펼치기 아이콘을 Script 아이콘과 동일한 opacity로 맞추고 라이트 테마 돋보기 대비를 강화
- 동일 시간 구간의 중복 한국어 cue를 제거하고 영상 전환 시 이전 overlay·Script 자막을 즉시 clear하며 Script mount 이후 clear 순서를 보장
- 메인 패널 헤더에 refresh SVG와 SubSync 재초기화 버튼을 추가해 Chrome 새로고침 없이 현재 영상 자막·Script를 재빌드
- 자막 요청을 영상·요청 ID로 격리하고 갱신된 언어별 signed track URL 재사용, 빈 build 재시도, refresh 완료 대기 및 HTTP·빈 응답 오류 표시로 YouTube SPA 자막 lifecycle을 안정화
- native CC를 확장앱이 조작하지 않고 webRequest로 실제 YouTube PO/client 문맥을 탭·영상별 임시 relay해 CC 비활성 상태에서도 영어·한국어 timedtext를 요청하도록 보강
- 로컬 Video Tutor API(127.0.0.1:8000)의 ask·proactive·feedback 계약을 프론트 서비스·채팅 UI에 연결하고 자막 문맥·대화 ID·피드백 rating을 전달

## 2026-09-07
- 상단 `단어장`·`학습기록` 탭을 `저장소`로 통합하고 내부 `단어`·`문장`·`시청기록` 탭으로 재구성했으며 기존 wordHistory·savedWords·videoHistory 저장 구조는 유지
- Chrome 확장앱 표시 이름을 `SubSync - Interactive Dual Subtitle & Video Tutor`에서 `SubSync`로 변경
- AI Tutor 질문 대기 중 3개 점이 왼쪽에서 오른쪽으로 물결을 타며 움직이는 답변 준비 indicator를 추가
- 로그인 탭은 `로그인` 텍스트 버튼으로 복원하고, 로그인 팝업은 텍스트 없는 18px Google 멀티컬러 G 아이콘 버튼으로 변경했으며 기본 어두운 회색·hover 흰색 상태를 적용
- 오리지널 `star.svg`·`star-filled.svg`를 등록하고 Hover·상세 단어 팝업의 저장 버튼을 저장/취소 토글로 연결했으며 저장 시 노란색 filled star와 glow를 표시하고 문장 저장 버튼·저장 domain은 제외
- 저장소 단어 기록 카드에 공통 Hover 뜻 툴팁과 문맥 전달을 연결하고 회귀 테스트를 추가
- YouTube SPA 내비게이션 후 URL 반영 지연을 재시도해 새 영상 자막을 새로고침 없이 자동 로드하도록 개선
- YouTube SPA의 navigate-start/page-data-updated 이벤트와 최신 player response를 연결하고 현재 video ID 일치 검증으로 이전 영상 자막 메타데이터를 차단
- 자막 source 실패 시 레거시의 captions 모듈·tracklist·reload acquisition을 현재 영상별 warm-up에 이식하고 signed timedtext 확보 후 native caption 상태를 복구하도록 연결
- 저장소에서 문장 탭과 단어 타임스탬프를 제거하고, 저장소 단어 별 취소 시 record ID 기반 삭제·목록 즉시 갱신·Hover 팝업 종료를 보장
- Google OAuth 연결 준비: MV3 service worker PKCE OAuth flow, Supabase 공개 설정 파일, 세션 갱신·로그아웃, Google OAuth 설정 가이드를 추가
- Google 로그인 아이콘 로드 실패 시 확장 URL 대신 inline 멀티컬러 G fallback으로 교체해 깨진 이미지 표시를 방지
- AI Tutor 답변 준비 indicator를 일반 튜터 답변과 같은 왼쪽 시작점에 정렬하고 화이트 테마에서는 검정 점·glow로 표시
- 자막 HTTP 429 안내 문구를 잠시 후 새로고침 안내로 간소화
- 자막 로딩 상태에 기준 이미지와 같은 32px 12-bar radial spinner를 CSS로 추가하고 reduced-motion 대응 및 Chromium 렌더링·회귀 테스트를 검증
- 단어 mouseenter/mouseleave에 명시적 `subsync-word-hovered` 상태를 연결하고 외부 페이지 스타일 cascade에도 채움 배경이 유지되도록 영상·패널 자막 hover CSS와 회귀 테스트를 보강
- hover 툴팁 높이를 기준으로 단어 영역과 겹치지 않게 위·아래 위치를 계산하고 위치 회귀 테스트를 추가
- Glass 저장소 단어 탭의 저장 단어 카드를 어두운 차콜 표면으로 조정해 배경 영상 위 텍스트 대비를 개선
- Glass Script 타임스탬프를 한국어 자막과 동일한 `var(--subsync-text-muted)` 색으로 조정해 숫자 가독성을 개선

## 2026-09-08
- Supabase 프로젝트 공개 URL·anon key를 프론트 Auth 설정에 연결하고 Google PKCE 로그인 실사용 설정을 활성화
- 단어 저장 완료 후 열려 있는 저장소 단어 목록을 즉시 refresh하도록 수정하고 회귀 테스트 추가
- 설정 화면의 사용하지 않는 단어 저장 방식 옵션과 관련 기본 설정·이벤트를 제거
- 헤더·보호 화면·로그아웃 버튼이 공용 세션 snapshot을 사용하도록 동기화하고 storage 변경·지연 렌더 race를 차단

## 2026-09-09
- 설정창 About 섹션에 엔코아 멀티 에이전트 AI 오케스트레이션 2기 팀 정보와 팀원별 GitHub 링크, 공개 개인정보처리방침 링크를 추가
- About 팀 정보에서 역할 열을 제거하고 담당 영역을 PM, Frontend, Dashboard, Backend, AI로 표기

## 2026-09-10
- 저장소의 `단어`·`시청기록` 탭 전환에 렌더 세대 토큰과 현재 탭 marker를 적용하여 이전 비동기 응답이 현재 탭 DOM을 덮어쓰지 않도록 개선
- 단어 목록의 지연 API 응답과 단어 목록 refresh가 시청기록 탭에 반영되지 않도록 비동기 완료 시점의 유효성 검사를 보강
- 시청기록 → 단어, 단어 → 시청기록 전환 및 in-flight refresh race 회귀 테스트를 추가하고 전체 Node 테스트 198건을 통과
