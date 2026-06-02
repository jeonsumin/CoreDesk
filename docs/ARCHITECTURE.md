# 아키텍처: CoreDesk

## 디렉토리 구조
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (modules)/
│   │   ├── layout.tsx          # 사이드바 + 헤더 포함 공통 레이아웃
│   │   ├── dashboard/page.tsx
│   │   ├── projects/
│   │   │   ├── page.tsx        # 프로젝트 목록
│   │   │   ├── new/page.tsx    # 프로젝트 생성
│   │   │   └── [id]/
│   │   │       ├── page.tsx    # 프로젝트 상세
│   │   │       ├── tasks/      # 태스크 목록
│   │   │       └── settings/   # 멤버·설정
│   │   ├── hr/                 # 인사 모듈 (Phase 2)
│   │   └── ...
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── projects/
│   │       ├── route.ts        # GET(목록), POST(생성)
│   │       └── [id]/
│   │           ├── route.ts    # GET, PATCH, DELETE
│   │           └── tasks/route.ts
│   └── layout.tsx              # 루트 레이아웃
├── components/
│   ├── ui/                     # shadcn/ui 기본 컴포넌트
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── Breadcrumb.tsx
│   └── modules/
│       └── projects/
│           ├── ProjectCard.tsx
│           ├── TaskList.tsx
│           └── MilestoneItem.tsx
├── types/
│   ├── project.ts
│   ├── task.ts
│   └── user.ts
├── lib/
│   ├── prisma.ts               # Prisma 클라이언트 singleton
│   └── auth.ts                 # NextAuth 설정
└── services/                   # 외부 API 래퍼 (향후 사용)
```

## 패턴

- **Server Components 기본**: 데이터 패칭은 Server Component에서 직접 처리
- **Client Component 최소화**: 인터랙션(폼, 버튼, 상태 토글)이 필요한 곳만 `"use client"` 선언
- **API Routes**: 외부에서 호출되는 API 또는 Server Actions로 처리하기 어려운 경우에만 사용
- **Server Actions**: 폼 제출·뮤테이션은 Server Actions 우선

## 데이터 흐름
```
[Client Component]
    → fetch('/api/projects') or Server Action
    → API Route Handler / Server Action
    → Prisma Client
    → PostgreSQL
    → 응답 → UI 업데이트
```

## 상태 관리

- **서버 상태**: Server Components + `revalidatePath()`/`revalidateTag()`로 캐시 무효화
- **클라이언트 UI 상태**: `useState` / `useReducer` (전역 상태 라이브러리 불필요)
- **폼 상태**: `react-hook-form` + `zod` 유효성 검사

## 데이터 모델 (Prisma Schema)

```prisma
model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  password  String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())

  ownedProjects   Project[]       @relation("ProjectOwner")
  projectMembers  ProjectMember[]
  assignedTasks   Task[]          @relation("TaskAssignee")
}

model Project {
  id          String        @id @default(cuid())
  name        String
  description String?
  status      ProjectStatus @default(IN_PROGRESS)
  startDate   DateTime?
  endDate     DateTime?
  ownerId     String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  owner       User            @relation("ProjectOwner", fields: [ownerId], references: [id])
  members     ProjectMember[]
  tasks       Task[]
  milestones  Milestone[]
}

model ProjectMember {
  projectId String
  userId    String
  role      MemberRole @default(DEVELOPER)
  joinedAt  DateTime   @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id])

  @@id([projectId, userId])
}

model Task {
  id         String     @id @default(cuid())
  projectId  String
  title      String
  description String?
  status     TaskStatus @default(TODO)
  priority   Priority   @default(MEDIUM)
  assigneeId String?
  dueDate    DateTime?
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  project  Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee User?   @relation("TaskAssignee", fields: [assigneeId], references: [id])
}

model Milestone {
  id          String    @id @default(cuid())
  projectId   String
  title       String
  dueDate     DateTime
  isCompleted Boolean   @default(false)
  createdAt   DateTime  @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}

enum Role          { ADMIN MEMBER }
enum MemberRole    { PM DEVELOPER VIEWER }
enum ProjectStatus { IN_PROGRESS COMPLETED ON_HOLD CANCELLED }
enum TaskStatus    { TODO IN_PROGRESS REVIEW DONE }
enum Priority      { HIGH MEDIUM LOW }
```

## 사이드바 메뉴 구조

```
CoreDesk
├── 대시보드          /dashboard
├── 프로젝트 관리      /projects        ← Phase 1 (MVP)
│   ├── 전체 프로젝트  /projects
│   └── 내 태스크      /projects/my-tasks
├── 인사/HR           /hr              ← Phase 2
├── 회계/재무         /finance         ← Phase 3
├── 영업/CRM          /crm             ← Phase 4
└── 설정             /settings
```
