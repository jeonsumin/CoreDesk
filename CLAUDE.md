# CoreDesk — Claude 작업 가이드

## 프로젝트 개요

**CoreDesk**는 IT/소프트웨어 회사를 위한 사내 ERP 시스템이다.
프로젝트·인력·자원 관리를 단일 플랫폼에서 처리해 업무 가시성을 높이는 것이 목표다.

**왜 만드는가:**  
IT 회사에서 프로젝트 현황이 Slack·이메일·스프레드시트에 파편화되어 있고, PM이 매일 수동으로 취합하고, 개발자는 우선순위를 모르고, 경영진은 보고 자료 준비에 2~3시간을 쓰는 문제를 해결한다.

**주요 사용자 (3개 역할):**
- **PM (김지훈)** — 4~5개 프로젝트 동시 관리. 대시보드로 전체 현황 파악, 태스크 배정이 핵심 행동
- **개발자 (이수민)** — 2~3개 프로젝트 참여. 내 태스크만 필터해서 빠르게 상태 업데이트
- **경영진 (박성호)** — 읽기 전용. 5분 안에 전체 현황과 리스크 파악

**현재 상태:**
- PRD 완성 (`docs/PRD.md`) — 유저 스토리 US-01~US-12, 플로우 4개, 빈 상태 정의 포함
- 아키텍처 문서 완성 (`docs/ARCHITECTURE.md`) — Prisma 스키마, 디렉토리 구조 포함
- **애플리케이션 코드 없음** — Next.js 프로젝트 초기화가 다음 단계

**모듈 로드맵 (점진적 추가):**
1. 프로젝트 관리 ← **현재 MVP**
2. 인사/HR
3. 회계/재무
4. 영업/CRM
5. 재고/구매

---

## 기술 스택 (최신 버전)

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 15.x |
| UI 라이브러리 | React | 19.x |
| 언어 | TypeScript strict | 5.x |
| 스타일 | Tailwind CSS | 4.x |
| 컴포넌트 | shadcn/ui | latest |
| ORM | Prisma | 6.x |
| DB | MySQL (Docker) | 8.4 |
| 인증 | Auth.js (NextAuth) | v5 |
| 유효성 검사 | Zod | 3.x |
| 폼 | react-hook-form | 7.x |
| 비밀번호 해시 | bcryptjs | 2.x |
| 런타임 | Node.js | 22 LTS |

> Tailwind v4는 `tailwind.config.js` 없이 CSS 파일에서 직접 설정한다. shadcn/ui도 Tailwind v4를 지원한다.

---

## 아키텍처 규칙

### CRITICAL — 반드시 지켜야 하는 규칙

1. **DB 접근은 서버에서만** — Prisma Client는 Server Components, Server Actions, API Route Handler에서만 호출한다. `"use client"` 컴포넌트에서 절대 호출하지 않는다.

2. **뮤테이션은 Server Actions 우선** — 데이터 생성·수정·삭제는 Server Actions로 처리한다. 외부 클라이언트(모바일 등)가 필요한 경우에만 API Route를 추가한다.

3. **모듈 독립성 유지** — 각 ERP 모듈은 `src/app/(modules)/{module-name}/` 아래 독립 폴더다. 한 모듈의 `_actions/`, `_components/`를 다른 모듈에서 직접 import하지 않는다. 공유 로직은 `src/lib/`로 추출한다.

4. **Server Components 기본** — `"use client"`는 폼 제출, 드롭다운, 모달, 상태 토글 등 인터랙션이 반드시 필요한 컴포넌트에만 붙인다. 데이터 패칭은 Server Component에서 직접 처리한다.

5. **전역 상태 관리자 금지** — Zustand, Redux, Jotai 등 전역 상태 라이브러리를 추가하지 않는다. URL 파라미터(`useSearchParams`)로 필터 상태를 관리하고, Server Component 리렌더로 서버 상태를 갱신한다.

### 인증 — OAuth 확장을 고려한 구조

지금은 이메일+비밀번호(Credentials)만 사용하지만, Google/MS OAuth를 나중에 **한 줄 추가**로 붙일 수 있게 설계한다.

```ts
// src/lib/auth.ts — providers 배열 구조를 유지할 것
export const authConfig = {
  providers: [
    CredentialsProvider({ ... }),         // 현재 사용 중
    // GoogleProvider({ ... }),           // 나중에 주석 해제만 하면 됨
    // MicrosoftEntraIDProvider({ ... }), // MS OAuth
  ],
  session: { strategy: "jwt" },
}
```

OAuth 추가 시 `session.strategy`를 `"database"`로 전환하고 Prisma Adapter를 연결하면 된다.

---

## 디렉토리 구조

```
src/
├── app/
│   ├── (auth)/                     # 인증 페이지 (사이드바 레이아웃 없음)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (modules)/                  # ERP 모듈 영역 (사이드바 + 헤더 포함)
│   │   ├── layout.tsx              ← 공통 레이아웃
│   │   ├── dashboard/page.tsx
│   │   └── projects/
│   │       ├── _actions/           ← Server Actions (이 모듈 전용)
│   │       │   ├── project.ts
│   │       │   └── task.ts
│   │       ├── _components/        ← 이 모듈 전용 컴포넌트
│   │       │   ├── ProjectCard.tsx
│   │       │   └── TaskRow.tsx
│   │       ├── page.tsx            ← 프로젝트 목록
│   │       └── [id]/
│   │           ├── page.tsx        ← 프로젝트 상세
│   │           ├── tasks/page.tsx
│   │           └── settings/page.tsx
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                         ← shadcn/ui 기본 컴포넌트 (건드리지 않음)
│   └── layout/
│       ├── Sidebar.tsx
│       └── Header.tsx
├── lib/
│   ├── prisma.ts                   ← Prisma singleton
│   ├── auth.ts                     ← Auth.js 설정
│   └── utils.ts                    ← shadcn cn() 유틸
├── types/
│   └── index.ts                    ← Prisma 기반 공유 타입
└── middleware.ts                   ← 인증 라우트 보호
```

**새 ERP 모듈 추가 패턴:**
`src/app/(modules)/hr/` 폴더를 위 구조와 동일하게 만들고 사이드바 메뉴 항목을 추가하면 된다.

---

## 데이터 모델 요약

```
User          id, name, email, password, role(ADMIN|MEMBER)
Project       id, name, description, status, startDate, endDate, ownerId
Task          id, projectId, title, description, status, priority, assigneeId, dueDate
Milestone     id, projectId, title, dueDate, isCompleted
ProjectMember projectId + userId (복합 PK), role(PM|DEVELOPER|VIEWER)
```

**진행률 계산:** `완료(DONE) 태스크 수 / 전체 태스크 수 × 100`  
**리스크 기준:** 마감 D-7 이하 + 진행률 50% 미만인 프로젝트

상세 Prisma 스키마는 `docs/ARCHITECTURE.md` 참조.

---

## 데이터 흐름

```
[Client Component (폼/버튼)]
    ↓  action={serverAction}
[Server Action]  ← 'use server'
    ↓
[Prisma → MySQL]
    ↓
revalidatePath('/projects')  또는  redirect()
    ↓
[Server Component 자동 리렌더]
```

상태 변경(태스크 완료 처리 등)은 `revalidatePath`로 해결하고, 별도 클라이언트 상태 동기화가 필요 없다.

---

## UX 규칙 (PRD에서 추출)

- **빈 상태마다 CTA** — 빈 목록은 빈 화면으로 두지 않는다. 안내 문구 + 다음 행동 버튼을 반드시 제공한다.
- **Viewer 권한** — 수정/삭제 버튼을 `hidden`으로 처리한다. 권한 에러 메시지를 노출하지 않는다.
- **상태 변경 즉시 반영** — 태스크 상태 변경 시 확인 팝업 없이 즉시 처리한다 (마찰 최소화).
- **D-day 배지** — D-3 이하: 경고(주황), 초과: 위험(빨강) + "D+N 초과" 텍스트.
- **마감 위기 배너** — 대시보드 상단에 미완료 임박 태스크 수를 표시하고, 클릭 시 필터 적용된 목록으로 이동.

---

## 개발 프로세스

- **TDD 필수** — 새 기능은 테스트 먼저 작성 → 통과하는 구현 순서로 진행
- **커밋 메시지** — conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- **타입 안전성** — `any` 사용 금지. Prisma가 생성한 타입을 `src/types/index.ts`에서 re-export해서 사용

---

## 명령어

```bash
# 개발
npm run dev              # 개발 서버 http://localhost:3000
npm run build            # 프로덕션 빌드
npm run lint             # ESLint
npm run test             # Jest 테스트

# DB (Docker 필요)
docker compose up -d     # MySQL 컨테이너 시작
docker compose down      # 컨테이너 중지

# Prisma
npx prisma migrate dev   # 마이그레이션 생성 및 적용
npx prisma generate      # Prisma Client 재생성
npx prisma studio        # DB GUI (http://localhost:5555)
npx prisma db seed       # 시드 데이터 삽입
```

---

## 참고 문서

- `docs/PRD.md` — 유저 스토리, 유저 플로우, 빈 상태 정의, 엣지 케이스
- `docs/ARCHITECTURE.md` — 상세 디렉토리 구조, 전체 Prisma 스키마, 사이드바 메뉴 구조
