# InnoERP — Claude 작업 가이드

## 프로젝트 개요

**InnoERP**는 IT/소프트웨어 회사를 위한 사내 ERP 시스템이다.
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
- Next.js App Router 기반 애플리케이션 구현 진행 중
- 인증, 대시보드, 프로젝트 관리, 내 태스크, 드라이브, 포트폴리오 관리, 메모 모듈 구현됨
- Drive 파일 업로드/미리보기/폴더 기능 구현됨
- 포트폴리오 생성 시 같은 이름의 Drive 폴더가 자동 생성되고, 썸네일/스크린샷 파일은 해당 Drive 폴더에 업로드됨
- 메모는 Markdown 입력/미리보기를 지원하며, 선택적으로 프로젝트와 연결할 수 있음
- 프로젝트 상세 페이지는 `?tab=memos` 메모 탭에서 해당 프로젝트에 연결된 메모 목록을 보여줌
- `DESIGN.md`의 Wanted 계열 디자인 방향을 전역 토큰, 공통 UI, 레이아웃에 1차 적용함

**모듈 로드맵 (점진적 추가):**
1. 프로젝트 관리
2. 드라이브
3. 포트폴리오 관리
4. 메모 ← **현재 추가 구현됨**
5. 인사/HR
6. 회계/재무
7. 영업/CRM
8. 재고/구매

---

## 기술 스택 (최신 버전)

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.2.6 |
| UI 라이브러리 | React | 19.2.4 |
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
> 현재 테스트는 Node 기본 test runner(`node --test`)와 `ts-node` 브릿지를 사용한다.

---

## 아키텍처 규칙

### CRITICAL — 반드시 지켜야 하는 규칙

1. **DB 접근은 서버에서만** — Prisma Client는 Server Components, Server Actions, API Route Handler에서만 호출한다. `"use client"` 컴포넌트에서 절대 호출하지 않는다.

2. **뮤테이션은 Server Actions 우선** — 데이터 생성·수정·삭제는 Server Actions로 처리한다. 외부 클라이언트(모바일 등)가 필요한 경우에만 API Route를 추가한다.

3. **모듈 독립성 유지** — 각 ERP 모듈은 `src/app/(modules)/{module-name}/` 아래 독립 폴더다. 한 모듈의 `_actions/`, `_components/`를 다른 모듈에서 직접 import하지 않는다. 공유 로직은 `src/lib/`로 추출한다.

4. **Server Components 기본** — `"use client"`는 폼 제출, 드롭다운, 모달, 상태 토글 등 인터랙션이 반드시 필요한 컴포넌트에만 붙인다. 데이터 패칭은 Server Component에서 직접 처리한다.

5. **전역 상태 관리자 금지** — Zustand, Redux, Jotai 등 전역 상태 라이브러리를 추가하지 않는다. URL 파라미터(`useSearchParams`)로 필터 상태를 관리하고, Server Component 리렌더로 서버 상태를 갱신한다.

6. **파일 저장은 Drive 모델 재사용** — 포트폴리오 이미지처럼 파일이 필요한 기능은 별도 파일 테이블을 만들지 말고 `DriveFolder`/`DriveFile`을 우선 재사용한다. 파일 시스템 저장 로직은 `src/lib/drive-storage.ts`의 공유 헬퍼를 사용한다.

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
│   │   ├── drive/
│   │   │   ├── _actions/drive.ts
│   │   │   ├── _components/
│   │   │   └── page.tsx
│   │   ├── memos/
│   │   │   ├── _actions/memo.ts
│   │   │   ├── _components/
│   │   │   ├── page.tsx            ← 메모 목록/검색/생성
│   │   │   └── [id]/page.tsx       ← 메모 상세/수정
│   │   ├── portfolios/
│   │   │   ├── _actions/portfolio.ts
│   │   │   ├── _components/
│   │   │   ├── page.tsx            ← 포트폴리오 목록
│   │   │   ├── new/page.tsx        ← 포트폴리오 생성
│   │   │   └── [id]/
│   │   │       ├── page.tsx        ← 포트폴리오 상세
│   │   │       └── edit/page.tsx   ← 포트폴리오 수정
│   │   └── projects/
│   │       ├── _actions/           ← Server Actions (이 모듈 전용)
│   │       │   ├── project.ts
│   │       │   └── task.ts
│   │       ├── _components/        ← 이 모듈 전용 컴포넌트
│   │       │   ├── ProjectCard.tsx
│   │       │   ├── ProjectMemoList.tsx
│   │       │   └── TaskRow.tsx
│   │       ├── page.tsx            ← 프로젝트 목록
│   │       └── [id]/
│   │           ├── page.tsx        ← 프로젝트 상세 (정보/태스크/마일스톤/메모/멤버 탭)
│   │           ├── tasks/page.tsx
│   │           └── settings/page.tsx
│   ├── api/
│   │   └── auth/[...nextauth]/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                         ← shadcn/ui 기반 공통 컴포넌트
│   ├── form/
│   │   └── TagInput.tsx            ← 공유 태그 입력
│   ├── memo/
│   │   └── MarkdownPreview.tsx      ← 메모 Markdown 렌더링
│   └── layout/
│       ├── Sidebar.tsx
│       └── Header.tsx
├── lib/
│   ├── prisma.ts                   ← Prisma singleton
│   ├── auth.ts                     ← Auth.js 설정
│   ├── drive-storage.ts            ← Drive 파일/폴더 저장 공유 헬퍼
│   ├── memo/
│   │   ├── markdown.ts             ← Markdown 블록/인라인 파서
│   │   └── validation.ts           ← 메모 폼/검색 검증
│   ├── portfolio/validation.ts     ← 포트폴리오 폼 검증/정규화
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
DriveFolder   id, name, ownerId, parentId
DriveFile     id, name, originalName, mimeType, size, storagePath, uploaderId, folderId
Portfolio     id, title, description, techSpecs, ownerId, driveFolderId, thumbnailFileId
PortfolioLink portfolioId, type(GITHUB|PRODUCTION|OTHER), label, url, sortOrder
PortfolioImage portfolioId, fileId, sortOrder
Memo          id, title, content, ownerId, projectId, createdAt, updatedAt
```

**진행률 계산:** `완료(DONE) 태스크 수 / 전체 태스크 수 × 100`  
**리스크 기준:** 마감 D-7 이하 + 진행률 50% 미만인 프로젝트

**메모 연결:** `Memo.projectId`는 선택값이며, 프로젝트 삭제 시 `SET NULL`로 메모를 보존한다.

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

포트폴리오 이미지 업로드 흐름:

```
[PortfolioForm(Client)]
    ↓  썸네일/스크린샷 선택, 100x100 미리보기, 스크린샷 누적 선택
[createPortfolio/updatePortfolio(Server Action)]
    ↓
[createUniqueDriveFolder + uploadDriveFile]
    ↓
[DriveFolder/DriveFile + Portfolio/PortfolioImage 연결]
    ↓
revalidatePath('/portfolios'), revalidatePath('/drive'), redirect()
```

포트폴리오 생성 시 Drive 루트에 포트폴리오 제목 기반 폴더를 만든다. 같은 이름이 있으면 `이름 (2)` 형식으로 충돌을 피한다.

메모 작성/연동 흐름:

```
[MemoForm(Client)]
    ↓  제목, Markdown 내용, 선택 프로젝트 입력
[createMemo/updateMemo(Server Action)]
    ↓
[Memo + optional Project 연결]
    ↓
revalidatePath('/memos'), revalidatePath('/projects/{id}'), redirect()
```

메모 목록은 제목 검색만 URL 쿼리 `q`로 처리한다. 프로젝트 상세의 메모 탭은 `/projects/[id]?tab=memos`이며, 새 메모 작성 CTA는 `/memos?projectId={id}`로 연결한다.

---

## UX 규칙 (PRD에서 추출)

- **빈 상태마다 CTA** — 빈 목록은 빈 화면으로 두지 않는다. 안내 문구 + 다음 행동 버튼을 반드시 제공한다.
- **Viewer 권한** — 수정/삭제 버튼을 `hidden`으로 처리한다. 권한 에러 메시지를 노출하지 않는다.
- **상태 변경 즉시 반영** — 태스크 상태 변경 시 확인 팝업 없이 즉시 처리한다 (마찰 최소화).
- **D-day 배지** — D-3 이하: 경고(주황), 초과: 위험(빨강) + "D+N 초과" 텍스트.
- **마감 위기 배너** — 대시보드 상단에 미완료 임박 태스크 수를 표시하고, 클릭 시 필터 적용된 목록으로 이동.
- **포트폴리오 이미지 선택** — 썸네일/스크린샷은 파일 인풋을 직접 노출하지 않고 버튼으로 선택한다. 선택한 이미지는 100x100 미리보기와 파일명/용량을 표시한다.
- **스크린샷 누적 선택** — 프로젝트 스크린샷은 여러 번 개별 선택해도 배열에 누적되어야 한다. 저장 전 개별 삭제가 가능해야 한다.
- **URI 제한** — 포트폴리오 URI는 최대 3개까지 등록한다. 유형은 GitHub, 운영 URL, 기타를 지원한다.
- **메모 Markdown** — 메모 내용은 Markdown 형식으로 작성하고 즉시 미리보기 탭을 제공한다. 기본 지원 범위는 제목, 문단, 순서/비순서 목록, 인용, 코드블록, 강조, 링크다.
- **메모 검색** — `/memos` 목록은 제목 검색 폼을 제공한다. 검색 결과가 없을 때도 빈 상태 CTA를 유지한다.
- **프로젝트 연동 메모** — 메모 작성 시 참여 중인 프로젝트를 선택할 수 있다. 프로젝트 상세 메모 탭은 연결된 메모 리스트와 새 메모 작성 CTA를 제공한다.

---

## 디자인 시스템 적용 기준

`DESIGN.md`의 Wanted 계열 디자인을 우선 기준으로 삼는다.

- 브랜드 인터랙션 컬러는 `#0066FF`를 사용한다.
- 배경은 흰색, 보조 표면은 `#F7F7F8`, 본문 텍스트는 `#171719`/`#333333` 계열을 사용한다.
- 제품 UI 폰트는 Pretendard 계열 fallback을 사용한다. Google Font 의존을 피한다.
- 공통 버튼은 8px radius, 32px 기본 높이, 14px 텍스트를 기준으로 한다.
- 카드 표면은 12px radius와 부드러운 1px border/ring을 기준으로 한다.
- 배지/태그는 pill 형태를 기본으로 한다.
- `src/app/globals.css`, `src/components/ui/*`, `src/components/layout/*`에 1차 적용되어 있으므로 새 화면은 이 토큰과 공통 컴포넌트를 우선 사용한다.

---

## 개발 프로세스

- **TDD 필수** — 새 기능은 테스트 먼저 작성 → 통과하는 구현 순서로 진행
- **커밋 메시지** — conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- **타입 안전성** — `any` 사용 금지. Prisma가 생성한 타입을 `src/types/index.ts`에서 re-export해서 사용
- **검증 기본 세트** — 변경 후 `npm run test`, `npx tsc --noEmit`, `npm run lint`를 실행한다.
- **빌드 검증** — 가능하면 `npm run build`까지 실행한다. 이전 환경에서는 Turbopack이 샌드박스 포트 바인딩 제한으로 실패한 적이 있으나, Google Fonts 의존은 제거되어 있다.

---

## 명령어

```bash
# 개발
npm run dev              # 개발 서버 http://localhost:3000
npm run build            # 프로덕션 빌드
npm run lint             # ESLint
npm run test             # Node test runner 기반 테스트
npm run admin:create     # 관리자 계정 생성 스크립트
npm run secrets:encrypt  # 기존 프로젝트 정보 비밀값 암호화

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
