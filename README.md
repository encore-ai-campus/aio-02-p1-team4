# 🎬 SubSync
<img width="1774" height="887" alt="subysync 로고" src="https://github.com/user-attachments/assets/ee3093f9-d849-47f2-8aca-4aa1c109c425" />


**YouTube를 보면서 자막, 단어 학습, AI Tutor까지 한 번에**

YouTube 영·한 이중자막과 AI Video Tutor를 결합한 Chrome Extension 기반 영어 학습 서비스

> 프로젝트: 엔코아 멀티 에이전트 AI 오케스트레이션 2기 · Team 4

3. [주요 기능](#-주요-기능) · [🧩 Frontend Repo](https://github.com/931njhthe-star/subsync-frontend) · [⚙️ Backend Repo](https://github.com/931njhthe-star/subsync-backend) · [📊 Dashboard Repo](https://github.com/931njhthe-star/subsync-dashboard)

---

## 🚩 목차

1. [프로젝트 소개](#-프로젝트-소개)
2. [기획 배경](#-기획-배경)
3. [주요 기능](#-주요-기능)
4. [AI Video Tutor](#-ai-video-tutor)
5. [서비스 이용 흐름](#-서비스-이용-흐름)
6. [기술 스택](#-기술-스택)
7. [시스템 아키텍처](#-시스템-아키텍처)
8. [프로젝트 구성](#-프로젝트-구성)
9. [관련 문서](#-관련-문서)

---

## ✨ 프로젝트 소개
<img width="800" height="188" alt="2026-09-10 20-57-17" src="https://github.com/user-attachments/assets/ecd65f9a-6c26-46a6-b6fc-2e388c5a9437" />


**SubSync**는 YouTube 영상을 시청하면서 영어를 학습할 수 있도록 만든 Chrome Extension 기반 영어 학습 서비스입니다.

사용자는 영·한 이중자막과 전체 Script를 확인하며 영상을 시청하고, 모르는 영어 단어를 마우스로 바로 조회하거나 저장할 수 있습니다. 또한 영상의 자막과 현재 재생 시점을 AI가 문맥으로 활용해 사용자가 영상 내용에 대해 질문하고 학습할 수 있는 **Video Tutor**를 제공합니다.

> **한 줄 소개**
> YouTube 영상 시청의 흐름을 끊지 않고 자막 → 단어 → AI 대화까지 연결하는 영어 학습 서비스

SubSync는 크게 세 개의 시스템으로 구성됩니다.

| 시스템 | 역할 |
|---|---|
| **Chrome Extension** | 이중자막, Script, 단어 학습, Video Tutor, 로그인, 학습 설정을 제공하는 사용자 화면 |
| **FastAPI Backend** | 인증, 단어 조회/저장, Tutor AI 호출, 학습 데이터 저장, 로그 수집, LLM 사용량 관리를 담당하는 REST API |
| **Streamlit Dashboard** | 사용자 활동, 저장 단어, Tutor 사용량, API 상태 및 LLM 사용량을 분석하는 내부 운영 화면 |

---

## 🧭 기획 배경

YouTube는 영어 학습에 활용할 수 있는 방대한 영상 콘텐츠를 제공하지만, 실제 학습 과정에서는 여러 서비스 사이를 이동해야 하는 문제가 있습니다.

```
YouTube 시청 → 모르는 단어 발견 → 영상 일시정지 → 사전 검색
     → 다시 YouTube → 영상 내용 질문 → 별도의 AI 서비스 이용
```

이 과정이 반복되면 영상 시청과 학습의 흐름이 끊어집니다. SubSync는 이를 하나의 흐름으로 연결하는 것을 목표로 합니다.

```
YouTube → 영·한 이중자막 → 단어 Hover/Click → 단어 저장 → Video Tutor → 학습 기록
```

**목표**
- YouTube 시청과 영어 학습의 자연스러운 결합
- 영상에서 바로 모르는 단어 확인 및 개인 단어장 저장
- 영상 문맥 기반 AI 질의응답
- 학습 행동 데이터 기록 및 분석

---

## 🌟 주요 기능

**영·한 이중자막**

YouTube 영상의 영어·한국어 자막을 함께 표시하고, 재생 위치에 맞춰 현재 문장을 강조 

**전체 Script**

영상 전체 자막을 검색하고, 타임스탬프 클릭으로 원하는 시점으로 이동 

**Mouse Hover 단어 조회**

자막·Script·Tutor 답변 속 영어 단어에 마우스를 올리면 즉시 간단한 뜻 확인 

**단어 상세 조회**

발음기호, 품사, 정의, 문맥 의미, 관련 표현까지 확인 가능한 상세 정보 

**개인 단어장**

학습 중 발견한 단어를 저장·관리, 중복 저장은 학습 기록으로 관리 

**Google 로그인**

Supabase Auth 기반 Google OAuth 로그인으로 학습 기록을 계정에 연결 

**Video Tutor**
<img width="800" height="1259" alt="ai 튜터" src="https://github.com/user-attachments/assets/1d9d8421-0fdb-4e0a-b640-a1ebc9f31c47" />

현재 영상 문맥을 활용한 AI 질의응답 (아래 상세 설명) 

**테마 · 설정**

다크/화이트/글라스 테마, 폰트, 이중자막·Hover·선제 질문 여부 등 개인화 설정 

---

## 🤖 AI Video Tutor

SubSync의 핵심 AI 학습 기능입니다. 일반적인 챗봇이 아니라 **현재 보고 있는 YouTube 영상의 문맥을 활용하는 Tutor**를 목표로 합니다.

```
사용자 질문 + Video ID + 현재 재생 시점 + 영상 Script/Subtitle Context + 사용자 학습 정보
                              ↓
                          AI Tutor
                              ↓
                     영상 문맥 기반 답변
```

예를 들어 "여기서 speaker가 왜 이 표현을 사용한 거야?"라고 질문하면, 현재 영상의 자막과 재생 위치를 바탕으로 답변합니다.

**주요 기능**
- Gemini 기반 질의응답 (영상 자막·재생 시점 문맥 활용)
- Tutor 대화 이력 저장 및 응답 피드백 기록
- Tutor 답변 속 영어 단어도 Mouse Interaction으로 조회 가능
- 선제 질문(Proactive Question) — 영상 흐름에 맞춰 AI가 먼저 질문
- **LLM Provider Fallback** — Gemini ↔ Groq ↔ stub 순서로 장애·사용량 제한에 대응
- 자막 속 문장이 Tutor의 시스템 규칙을 바꾸지 못하도록 시스템 지시와 사용자 질문/자막을 구조적으로 분리하여 방어

---

## 🔄 서비스 이용 흐름

1. Chrome Extension 설치
2. YouTube 영상 접속 및 SubSync 활성화
3. 영·한 이중자막으로 영상 시청
4. 모르는 단어 Hover → Click → 저장
5. Video Tutor에게 영상 내용 질문
6. 학습 기록 서버 저장
7. Dashboard에서 데이터 분석

---

## 🎥 이미지


| Login | Dual Subtitle | Word Hover & Click |
|---|---|---|
| <img width="660" height="395" alt="스크린샷 2026-09-10 222935" src="https://github.com/user-attachments/assets/91945885-4dd2-4794-b04e-cb8fd5740da6" /> | <img width="972" height="245" alt="스크린샷 2026-09-10 222816" src="https://github.com/user-attachments/assets/d8197261-6471-40b9-97e7-a02f8ff9e60b" /> | <img width="446" height="359" alt="스크린샷 2026-09-10 222858" src="https://github.com/user-attachments/assets/dacd7ecd-4f5a-45e8-8dd2-f1a3622b4cce" /> |

| Script | Video Tutor | Dashboard |
|---|---|---|
| <img width="516" height="610" alt="스크린샷 2026-09-10 223024" src="https://github.com/user-attachments/assets/0856d804-7e06-4d5d-9f1f-7530bd178fd3" /> | <img width="505" height="646" alt="스크린샷 2026-09-10 223142" src="https://github.com/user-attachments/assets/f83d73af-2640-4536-83e8-95a97b692013" /> | <img width="1114" height="851" alt="image" src="https://github.com/user-attachments/assets/db24019b-dd33-4aa3-8e35-866f857091be" />  |

---

## 🛠 기술 스택

**Frontend**
| 기술 | 용도 |
|---|---|
| Chrome Extension (Manifest V3) | YouTube 학습 UI |
| JavaScript / HTML / CSS | Extension 로직 및 UI |
| Chrome APIs | Extension 기능 및 인증 연동 |

**Backend**
| 기술 | 용도 |<img width="768" height="768" alt="bf3d371e7999ca5e" src="https://github.com/user-attachments/assets/a73975a3-34ec-4f3a-b9eb-9fb19ac3544c" />

|---|---|
| Python 3.11+ / FastAPI | REST API |
| Uvicorn | ASGI Server |
| Pydantic | API Schema |
| uv | 패키지 관리 |
| Pytest | 테스트 |

**AI**
| 기술 | 용도 |
|---|---|
| Google Gemini | Video Tutor |
| Groq | LLM Fallback |
| Prompt Engineering / Context Builder | 영상 기반 Tutor 응답 및 자막 문맥 구성 |

**Database / Auth**
| 기술 | 용도 |
|---|---|
| Supabase (PostgreSQL, Auth) | 데이터 저장 및 사용자 인증 |
| Google OAuth / JWT | 로그인 및 API 인증 |

**Cache / Dashboard / Deployment**
| 기술 | 용도 |
|---|---|
| Redis | 세션 및 단어 조회 캐시 |
| Streamlit + Pandas | 운영·분석 Dashboard |
| Render | Backend 배포 |
| Chrome Web Store | Extension 배포 |

---

## 🏗 시스템 아키텍처

```
┌───────────────────────────────────────────┐
│               User Browser                 │
│                YouTube Page                 │
│              Chrome Extension               │
│  ┌──────────────┬─────────┬──────────────┐ │
│  │Dual Subtitle │ Script  │ Video Tutor  │ │
│  └──────────────┴─────────┴──────────────┘ │
└──────────────────────┬──────────────────────┘
                        │ HTTPS REST API
                        ▼
┌───────────────────────────────────────────┐
│              FastAPI Backend               │
│   Auth / Dictionary / Words / Tutor / Logs  │
└───────┬──────────────┬──────────────┬───────┘
        ▼              ▼              ▼
  ┌──────────┐   ┌──────────┐  ┌──────────────┐
  │ Supabase │   │  Redis   │  │ Gemini/Groq  │
  │ Postgres │   │  Cache   │  │     LLM      │
  └────┬─────┘   └──────────┘  └──────────────┘
       ▼
┌────────────────────┐
│ Streamlit Dashboard │
│ User/Word/Tutor/LLM/API Analytics │
└────────────────────┘
```

---


## 📦 프로젝트 구성

SubSync는 기능별로 3개의 Repository로 분리되어 있습니다.

```
SubSync
├── subsync-frontend   → Chrome Extension
├── subsync-backend    → FastAPI REST API
└── subsync-dashboard  → Streamlit Analytics Dashboard
```

| Repository | 설명 | 링크 |
|---|---|---|
| **subsync-frontend** | Chrome Manifest V3 기반 무빌드 확장 프로그램 | [바로가기](https://github.com/931njhthe-star/subsync-frontend) |
| **subsync-backend** | FastAPI 기반 REST API 서버 | [바로가기](https://github.com/931njhthe-star/subsync-backend) |
| **subsync-dashboard** | Streamlit 기반 운영·분석 대시보드 | [바로가기](https://github.com/931njhthe-star/subsync-dashboard) |

---

## ☁️ 배포 확인

Backend는 Render에 배포되어 있습니다.

```
GET https://subsync-backend-4bmh.onrender.com/health
GET https://subsync-backend-4bmh.onrender.com/api/v1/dictionary/hover?word=honest
```

> `/health`는 프로세스 상태만 확인하므로, 외부 사전·번역·LLM Provider의 정상 여부까지 보장하지는 않습니다.

Frontend는 Streamlit cloud / Chrome Web store에 배포되어 있습니다.


-[Dashboard(streamlit)] (https://subsync-dashboard-5xicocfzxxf2lngqm4mj7s.streamlit.app)

-[Frontend(Chrome Extension)] (https://chromewebstore.google.com/detail/subsync/akckibdjhdhehbfjellpgododmcpfphc?authuser=0&hl=ko)


> Render 서버가 15분동안 사용이 없을시 서버가 잠드므로, 데이터 안나올시 몇분뒤 새로고침 하시면 됩니다.


---


## 📚 관련 문서
- [Project Dashboard](https://yleeylee.notion.site/Subsync-2102b0d658a68394bc070175f52809d0)
---
