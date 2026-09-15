## 1. 문서 정보

| 항목 | 내용 |
| --- | --- |
| API 형식 | REST, JSON, UTF-8 |
| 구현 기술 | FastAPI, Pydantic v2, OpenAPI 3.1 |
| 기본 경로 | `/api/v1` (`/health` 제외) |
| 배포 Swagger UI | https://subsync-backend-4bmh.onrender.com/docs |
| 배포 ReDoc | https://subsync-backend-4bmh.onrender.com/redoc |
| OpenAPI 원본 | https://subsync-backend-4bmh.onrender.com/openapi.json |

Swagger UI와 ReDoc은 별도 명세가 아니라 FastAPI가 생성한 같은 `openapi.json`을
각각 실행·열람에 맞게 표현한다. 평가 제출 시 ReDoc을 읽기용 설계서, Swagger UI를
실행 검증 자료, `openapi.json`을 원본 계약으로 함께 제시한다.

## 2. URL 및 HTTP Method 설계 원칙

- URL은 동사 대신 복수형 또는 의미가 분명한 명사형 리소스를 사용한다.
- `GET`은 조회만 수행하고 서버 리소스를 변경하지 않는다.
- `POST`는 메시지·세션·피드백 등 새 리소스를 생성한다.
- `DELETE`는 식별된 리소스 또는 현재 세션을 종료·삭제한다.
- 모든 기능 API는 `/api/v1` 아래에 두어 하위 호환성을 관리한다.
- 경로 변수는 `{word_id}`처럼 리소스 식별자를 나타내고, 조회 조건은 query parameter로
전달한다.

### 2.1 공개 API 목록

| 영역 | Method | Endpoint | 리소스 및 동작 | 성공 상태 |
| --- | --- | --- | --- | --- |
| System | `GET` | `/health` | 서버 상태 조회 | `200` |
| Auth | `POST` | `/api/v1/auth/sessions` | 로그인 세션 및 앱 사용자 동기화 | `200` |
| Auth | `DELETE` | `/api/v1/auth/sessions/current` | 현재 로그인 세션 종료 | `200` |
| Dictionary | `GET` | `/api/v1/dictionary/meanings` | 단어의 대표 의미 조회 | `200` |
| Dictionary | `GET` | `/api/v1/dictionary/entries` | 단어의 상세 사전 항목 조회 | `200` |
| Video Tutor | `POST` | `/api/v1/tutor/messages` | 자막 문맥 기반 Tutor 메시지 생성 | `200` |
| Video Tutor | `POST` | `/api/v1/tutor/proactive-questions` | 자막 기반 선제 질문 생성 | `200` |
| Video Tutor | `POST` | `/api/v1/tutor/feedback` | Tutor 답변 평가 생성 | `201` |
| Saved Words | `POST` | `/api/v1/words` | 저장 단어 생성 | `201` 또는 기존 값 `200` |
| Saved Words | `GET` | `/api/v1/words` | 저장 단어 목록 조회 | `200` |
| Saved Words | `DELETE` | `/api/v1/words/{word_id}` | 저장 단어 삭제 | `204` |
| Dashboard | `GET` | `/api/v1/dashboard/overview` | 운영 KPI 개요 조회 | `200` |
| Dashboard | `GET` | `/api/v1/dashboard/usage` | LLM 사용량 통계 조회 | `200` |
| Dashboard | `GET` | `/api/v1/dashboard/api-calls` | API 호출 통계 조회 | `200` |

기존 Extension과의 호환을 위해 `/auth/me`, `/auth/logout`, `/dictionary/hover`,
`/dictionary/detail`, `/tutor/ask`, `/tutor/proactive`도 당분간 동작하지만 신규
OpenAPI 문서에서는 숨긴다. 신규 연동은 위의 리소스 중심 URL을 사용한다.

## 3. 표준 오류 응답

모든 4xx·5xx 응답은 `ApiErrorResponse` 모델을 사용한다.

```json
{
  "status_code": 422,
  "error_code": "VALIDATION_ERROR",
  "message": "요청 값이 올바르지 않습니다.",
  "details": [
    {
      "location": "body.video_id",
      "reason": "문자열의 길이는 1자 이상이어야 합니다.",
      "error_type": "string_too_short"
    }
  ],
  "request_id": "8e0d7ee7f4734f18b84706f79e499e18",
  "detail": "요청 값이 올바르지 않습니다."
}
```

- `status_code`: 실제 HTTP 상태 코드와 같은 값
- `error_code`: 클라이언트 분기 처리에 사용하는 안정적인 코드
- `message`: 내부 정보가 제거된 사용자용 메시지
- `details`: 잘못된 필드·원인·오류 유형 목록, 상세가 없으면 빈 배열
- `request_id`: 응답 헤더 `X-Request-ID`와 같은 서버 추적 ID
- `detail`: 기존 v1 클라이언트 호환 필드이며 신규 클라이언트는 `message`를 사용

### 3.1 상태 코드와 처리 규칙

| 상태 | 에러 코드 | 적용 규칙 |
| --- | --- | --- |
| `400` | `BAD_REQUEST` | 라우터가 명시적으로 거부한 일반 요청 |
| `401` | `AUTHENTICATION_REQUIRED` | Bearer Token 누락·만료·검증 실패 |
| `403` | `FORBIDDEN` | 인증됐지만 리소스 접근 권한이 없음 |
| `404` | `RESOURCE_NOT_FOUND` | 단어, 대화, 메시지 등 대상 리소스가 없음 |
| `405` | `METHOD_NOT_ALLOWED` | 정의되지 않은 HTTP Method 사용 |
| `409` | `RESOURCE_CONFLICT` | 중복 피드백 또는 대화·영상 상태 충돌 |
| `422` | `VALIDATION_ERROR` | JSON 해석 또는 Pydantic 타입·길이·범위·필수값 검증 실패 |
| `429` | `RATE_LIMIT_EXCEEDED` | Tutor 요청 빈도 또는 사용량 한도 초과 |
| `500` | `INTERNAL_SERVER_ERROR` | 처리되지 않은 서버 오류; 원문은 응답에 노출하지 않음 |
| `502` | `UPSTREAM_SERVICE_ERROR` | 외부 서비스 응답 처리 실패 |
| `503` | `SERVICE_UNAVAILABLE` | Supabase·사전·사용량 저장소 일시 장애 또는 설정 누락 |

검증 오류는 FastAPI의 `RequestValidationError`를 필드별 `details`로 변환한다. 라우터의
`HTTPException`과 존재하지 않는 경로·Method 오류도 같은 포맷으로 변환한다. 처리되지
않은 예외는 서버 로그에 stack trace와 `request_id`를 남기고 클라이언트에는 일반화한
500 메시지만 반환한다. 질문, 자막, Access Token과 Provider 원문은 오류 로그에 남기지
않는다.

## 4. Pydantic 요청·응답 모델 원칙

- 기본값이 없는 필드는 `required`로 OpenAPI에 표시한다.
- 선택 필드는 `T | None`과 `default=None`으로 선언한다.
- 문자열 길이, 숫자 범위, 배열 최대 개수는 `Field` 또는 `Query`로 제한한다.
- 자막, 대화 이력, 학습 신호, 토큰 사용량과 피드백은 별도 nested 모델로 정의하고
OpenAPI의 `$ref`로 재사용한다.
- 최상위 요청·응답과 nested 모델에는 실제 형식의 `examples`를 제공한다.
- 응답 모델은 내부 DB 행이나 Provider 원문 대신 외부에 공개하기로 한 필드만 포함한다.

### 4.1 AI Tutor 모델 구조

```
TutorAskRequest
├── recent_subtitles[]: SubtitleInput
├── learner_signals: LearnerSignalsInput
│   └── saved_words[]: SavedWordInput
└── conversation_history[]: ConversationTurnInput

TutorAskResponse
├── usage: TutorUsageResponse
└── proactive_feedback: ProactiveAnswerFeedbackResponse | null
```

### 4.2 AI Tutor 요청 예시

```json
{
  "video_id": "XFhY4Vy3IHc",
  "timestamp": 36.8,
  "user_message": "inconsistent는 여기서 어떤 뜻인가요?",
  "recent_subtitles": [
    {
      "time": 36.8,
      "en": "English spelling is famously inconsistent.",
      "ko": "영어 철자는 유난히 일관성이 없습니다."
    }
  ],
  "learner_signals": {
    "saved_words": [{"word": "spelling"}],
    "saved_word_count": 24,
    "quiz_accuracy": 0.78,
    "average_response_time_ms": 4200,
    "quiz_attempts": 12
  },
  "conversation_history": [],
  "focus_word": "inconsistent"
}
```

### 4.3 AI Tutor 응답 예시

```json
{
  "conversation_id": "conv_7d15f2c891ab",
  "message_id": "msg_b946af19d34e",
  "reply": "여기서 inconsistent는 ‘일관성이 없는’이라는 뜻이에요.",
  "suggested_questions": [],
  "provider": "gemini",
  "model": "gemini-2.5-flash",
  "usage": {
    "input_tokens": 428,
    "output_tokens": 74,
    "total_tokens": 502
  },
  "learner_level": "B1",
  "tutor_difficulty": "conversational",
  "profile_confidence": 0.82,
  "context_subtitle_count": 1,
  "proactive_feedback": null
}
```

실제 Provider 호출은 Gemini를 먼저 시도하고 실패하면 Groq로 전환한다. 두 외부
Provider를 사용할 수 없으면 네트워크 없는 Rule-based Stub이 최소 안내 응답을
반환하며, 실제로 선택된 Provider와 모델은 응답의 `provider`, `model`에 기록한다.

##