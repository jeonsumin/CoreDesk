# 시스템관리 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ADMIN 전용 시스템관리 > 사용자관리(CRUD + 비활성화)를 만들고, 프로젝트 멤버관리를 "활성 사용자 선택 초대 + 역할 변경" 방식으로 정비한다.

**Architecture:** 권한 판단 규칙은 `src/lib/system/`, `src/lib/project-access.ts`의 순수 함수로 두고 Node test runner로 TDD한다. 화면과 액션은 `(modules)/system/` 독립 모듈에 둔다. 권한은 JWT가 아닌 DB에서 조회한 role/isActive로 판단한다.

**Tech Stack:** Next.js 16 App Router, React 19, Auth.js v5 (JWT), Prisma 6 + MySQL, Zod 3, react-hook-form 7, shadcn/ui, Node test runner + ts-node

**Spec:** `docs/superpowers/specs/2026-10-17-system-admin-phase1-design.md`

## Global Constraints

- 역할은 정확히 `ADMIN`, `MANAGER`, `MEMBER`, `VIEWER`. 화면 라벨은 `최고관리자`, `매니저`, `멤버`, `열람자`.
- 사용자 삭제 없음. `isActive=false`로 비활성화만 한다.
- Prisma 호출은 Server Component, Server Action, Route Handler에서만 한다.
- 뮤테이션은 Server Action으로 하고, 끝나면 `revalidatePath`를 호출한다.
- `any` 금지. Prisma 타입은 `src/types/index.ts`에서 re-export해서 쓴다.
- 필터 상태는 URL 파라미터로 둔다. 전역 상태 라이브러리는 쓰지 않는다.
- 상태 변경(비활성화, 역할 변경)은 확인 팝업 없이 즉시 반영한다.
- 빈 목록에는 안내 문구와 CTA 버튼을 둔다.
- 커밋은 conventional commits 형식으로 하고 메시지는 한국어로 쓴다.
- 순수 함수 파일(`src/lib/system/*`, `src/lib/project-access.ts`)은 `@/` alias와 Prisma 런타임을 import하지 않는다. ts-node 테스트에서 불러와야 하기 때문이다. `import type`만 쓴다.
- **사전 조건:** DB가 실행 중이어야 한다(`docker compose up -d db`). 스키마 반영은 `npx prisma db push`로 한다.

## Review Focus

1. 이메일 대소문자·공백: `" Admin@X.com"`도 `admin@x.com`과 같은 사용자로 취급해야 한다. 스키마에서 trim + lowercase 처리 (Task 1 테스트).
2. 조작된 폼 값: 존재하지 않는 role 문자열이나 공백뿐인 이름은 서버에서 거부해야 한다 (Task 1 테스트).
3. 로그인 중에 비활성화된 사용자: 유효한 JWT가 남아 있으면 `/login` → middleware → `/dashboard`로 도는 redirect 루프가 생긴다. 그래서 세션을 끊는 `/api/logout`을 거쳐야 한다 (Task 3 수동 확인).
4. 비활성 멤버가 태스크 담당자 선택 목록에 계속 보이면 안 된다. 기존 담당 표시는 유지한다 (Task 7).
5. 마지막 ADMIN이 자기가 아닌 다른 ADMIN을 강등하거나 비활성화하는 경우: 활성 ADMIN 수가 기준이다 (Task 2 테스트).

---

## File Structure

| 파일 | 역할 |
| --- | --- |
| `tests/_ts.cjs` (새 파일) | ts-node register (CommonJS로 강제) |
| `src/lib/system/user-schema.ts` (새 파일) | `ROLES`, `ROLE_LABELS`, 생성·수정 Zod 스키마 |
| `src/lib/system/user-rules.ts` (새 파일) | `canChangeUser` |
| `src/lib/project-access.ts` (새 파일) | `canManageProject` |
| `src/lib/admin.ts` (새 파일) | `getCurrentDbUser`, `requireAdmin` (Prisma 사용) |
| `src/app/api/logout/route.ts` (새 파일) | 세션 종료 후 `/login`으로 보냄 |
| `src/app/(modules)/system/**` (새 폴더) | 시스템관리 모듈 |
| `prisma/schema.prisma` | `Role` enum 확장, `User.isActive` 추가 |
| `src/lib/auth-config.ts` | 비활성 사용자 로그인 거부 |
| `src/app/(modules)/layout.tsx` | DB에서 사용자 조회, 비활성이면 차단, Sidebar에 role 전달 |
| `src/config/nav.ts`, `src/components/layout/Sidebar.tsx` | 그룹 메뉴, `adminOnly` |
| `src/app/(auth)/register/page.tsx`, `src/middleware.ts` | 회원가입 닫기 |
| `src/app/(modules)/projects/_actions/member.ts`, `_components/MemberList.tsx`, `[id]/page.tsx`, `[id]/settings/page.tsx` | 멤버관리 정비 |

---

### Task 1: 테스트 하네스 + 사용자 Zod 스키마

**Files:**
- Create: `tests/_ts.cjs`, `src/lib/system/user-schema.ts`
- Test: `tests/user-schema.test.cjs`

**Interfaces:**
- Produces:
  - `ROLES: readonly ['ADMIN','MANAGER','MEMBER','VIEWER']`
  - `type RoleValue = typeof ROLES[number]`
  - `ROLE_LABELS: Record<RoleValue, string>`
  - `createUserSchema`, `updateUserSchema` (zod object: `name`, `email`, `role`, `password`)
  - `type CreateUserInput`, `type UpdateUserInput` (`z.infer`)

- [ ] **Step 1: 하네스 작성**

`tests/_ts.cjs`:
```js
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: { module: 'commonjs', moduleResolution: 'node' },
})
```

- [ ] **Step 2: 실패하는 테스트 작성** — `tests/user-schema.test.cjs`

```js
require('./_ts.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { createUserSchema, updateUserSchema, ROLES } = require('../src/lib/system/user-schema.ts')

const base = { name: '홍길동', email: 'a@b.com', role: 'MEMBER', password: 'secret1' }

test('ROLES는 4개 역할', () => assert.deepEqual([...ROLES], ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']))
test('생성: 정상 입력 통과', () => assert.equal(createUserSchema.safeParse(base).success, true))
test('생성: 비밀번호 6자 미만 거부', () =>
  assert.equal(createUserSchema.safeParse({ ...base, password: '12345' }).success, false))
test('생성: 이메일 trim + 소문자', () =>
  assert.equal(createUserSchema.parse({ ...base, email: '  Admin@X.com ' }).email, 'admin@x.com'))
test('생성: 공백뿐인 이름 거부', () =>
  assert.equal(createUserSchema.safeParse({ ...base, name: '   ' }).success, false))
test('생성: 이름 51자 거부', () =>
  assert.equal(createUserSchema.safeParse({ ...base, name: 'a'.repeat(51) }).success, false))
test('생성: 없는 역할 거부', () =>
  assert.equal(createUserSchema.safeParse({ ...base, role: 'ROOT' }).success, false))
test('수정: 빈 비밀번호 허용', () =>
  assert.equal(updateUserSchema.safeParse({ ...base, password: '' }).success, true))
test('수정: 1~5자 비밀번호 거부', () =>
  assert.equal(updateUserSchema.safeParse({ ...base, password: 'abc' }).success, false))
```

- [ ] **Step 3: 실패 확인**

Run: `npm run test`
Expected: FAIL, `Cannot find module '../src/lib/system/user-schema.ts'`.
`tests/**/*.test.cjs` glob이 `tests/` 바로 아래 파일을 못 잡으면 `package.json`의 test 스크립트를 `node --test tests/*.test.cjs`로 고치고 이 Task에 포함한다.

- [ ] **Step 4: `src/lib/system/user-schema.ts` 구현**

- `name`: `z.string().trim().min(1).max(50)`
- `email`: `z.string().trim().toLowerCase().email()`
- `role`: `z.enum(ROLES)`
- 생성 `password`: `z.string().min(6)`
- 수정 `password`: `z.string().refine(v => v === '' || v.length >= 6)`
- 에러 메시지:
  - 이름: `'이름은 1~50자로 입력해주세요'`
  - 이메일: `'올바른 이메일을 입력해주세요'`
  - 비밀번호: `'비밀번호는 6자 이상이어야 합니다'`
- `ROLE_LABELS = { ADMIN: '최고관리자', MANAGER: '매니저', MEMBER: '멤버', VIEWER: '열람자' }`

- [ ] **Step 5: 통과 확인**

Run: `npm run test`
Expected: 9 tests pass.

- [ ] **Step 6: Commit**

```bash
git add tests/_ts.cjs tests/user-schema.test.cjs src/lib/system/user-schema.ts package.json
git commit -m "test: 사용자 Zod 스키마와 테스트 하네스 추가"
```

---

### Task 2: `canChangeUser` 보호 규칙

**Files:**
- Create: `src/lib/system/user-rules.ts`
- Test: `tests/user-rules.test.cjs`

**Interfaces:**
- Consumes: `RoleValue` (Task 1)
- Produces:
  ```ts
  type UserState = { id: string; role: RoleValue; isActive: boolean }
  type UserPatch = { role?: RoleValue; isActive?: boolean }
  type RuleResult = { ok: true } | { ok: false; error: string }
  function canChangeUser(actorId: string, target: UserState, patch: UserPatch, activeAdminCount: number): RuleResult
  ```
  `activeAdminCount`는 변경 전 활성 ADMIN 수이며 target 자신을 포함한다.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/user-rules.test.cjs`

```js
require('./_ts.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { canChangeUser } = require('../src/lib/system/user-rules.ts')

const admin = { id: 'a1', role: 'ADMIN', isActive: true }
const member = { id: 'm1', role: 'MEMBER', isActive: true }

test('자기 비활성화 거부', () =>
  assert.deepEqual(canChangeUser('a1', admin, { isActive: false }, 2),
    { ok: false, error: '자기 자신은 비활성화할 수 없습니다' }))
test('자기 강등 거부', () =>
  assert.deepEqual(canChangeUser('a1', admin, { role: 'MEMBER' }, 2),
    { ok: false, error: '자기 자신의 관리자 권한은 해제할 수 없습니다' }))
test('마지막 활성 ADMIN을 다른 ADMIN이 강등하면 거부', () =>
  assert.deepEqual(canChangeUser('x', { ...admin, id: 'a2' }, { role: 'MANAGER' }, 1),
    { ok: false, error: '활성 관리자가 최소 1명 필요합니다' }))
test('마지막 활성 ADMIN 비활성화 거부', () =>
  assert.equal(canChangeUser('x', { ...admin, id: 'a2' }, { isActive: false }, 1).ok, false))
test('ADMIN이 2명 이상이면 다른 ADMIN 강등 허용', () =>
  assert.deepEqual(canChangeUser('a1', { ...admin, id: 'a2' }, { role: 'MEMBER' }, 2), { ok: true }))
test('일반 사용자 비활성화 허용', () =>
  assert.deepEqual(canChangeUser('a1', member, { isActive: false }, 1), { ok: true }))
test('비활성 ADMIN 재활성화는 개수와 무관하게 허용', () =>
  assert.deepEqual(canChangeUser('a1', { ...admin, id: 'a2', isActive: false }, { isActive: true }, 1), { ok: true }))
test('자기 이름만 바꾸는 패치(빈 patch) 허용', () =>
  assert.deepEqual(canChangeUser('a1', admin, {}, 1), { ok: true }))
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test`
Expected: FAIL, `Cannot find module '../src/lib/system/user-rules.ts'`

- [ ] **Step 3: `canChangeUser` 구현**

판정 순서:
1. self + `isActive === false`이면 거부
2. self + role이 ADMIN이 아닌 값으로 바뀌면 거부
3. target이 활성 ADMIN이고 patch 적용 후 "활성 ADMIN"이 아니게 되며 `activeAdminCount <= 1`이면 거부
4. 그 외는 허용

- [ ] **Step 4: 통과 확인**

Run: `npm run test`
Expected: 모든 테스트 통과 (Task 1의 9개 + 이번 8개)

- [ ] **Step 5: Commit**

```bash
git add src/lib/system/user-rules.ts tests/user-rules.test.cjs
git commit -m "feat: 사용자 변경 보호 규칙 canChangeUser 추가"
```

---

### Task 3: 스키마 확장 + DB 기반 ADMIN 게이트 + 비활성 차단 + 회원가입 닫기

**Files:**
- Modify: `prisma/schema.prisma` (`enum Role`, `model User`)
- Modify: `src/lib/auth-config.ts` (`authorize`)
- Modify: `src/app/(modules)/layout.tsx`
- Modify: `src/app/(auth)/register/page.tsx`, `src/middleware.ts`
- Create: `src/lib/admin.ts`, `src/app/api/logout/route.ts`

**Interfaces:**
- Produces:
  ```ts
  // src/lib/admin.ts
  type DbSessionUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'isActive'>
  async function getCurrentDbUser(): Promise<DbSessionUser | null>   // 세션 없음, DB에 없음, 비활성 → null
  async function requireAdmin(): Promise<DbSessionUser>              // ADMIN 아니면 throw new Error('Forbidden')
  ```
  `GET /api/logout`: 세션 쿠키를 지우고 `/login`으로 보낸다.

- [ ] **Step 1: 스키마 수정**

- `enum Role`에 `MANAGER`, `VIEWER`를 추가한다.
- `User`에 `isActive Boolean @default(true)`를 추가한다.
- Run: `npx prisma db push && npx prisma generate`
- Expected: `Your database is now in sync`

- [ ] **Step 2: `src/lib/admin.ts` 작성**

- `getCurrentDbUser`: `auth()`로 세션 id를 얻고, `prisma.user.findUnique`로 위 필드를 select한다.
- `requireAdmin`: `getCurrentDbUser()` 결과가 null이거나 `role !== 'ADMIN'`이면 `Forbidden`을 throw한다.

- [ ] **Step 3: `authorize`에 비활성 검사 추가**

`if (!user || !user.isActive) return null`

- [ ] **Step 4: `/api/logout` 작성**

`export async function GET() { await signOut({ redirectTo: '/login' }) }` (`@/lib/auth`)
- middleware matcher가 `api`를 제외하므로 redirect 루프가 생기지 않는다.

- [ ] **Step 5: `(modules)/layout.tsx`를 async로 바꾸기**

- `getCurrentDbUser()`가 null이면 `redirect('/api/logout')`
- 사용자가 있으면 `<Sidebar role={user.role} />`로 role을 넘긴다.
- Sidebar의 prop 수용은 Task 4에서 한다. 이 Task에서는 `Sidebar`에 `role: string` prop만 추가해 타입을 맞춘다.

- [ ] **Step 6: 회원가입 닫기**

- `register/page.tsx`의 본문을 `redirect('/login')`으로 바꾼다.
- `register/index.tsx`와 `content/`는 그대로 둔다.
- `middleware.ts`의 `isAuthPage`에서 `/register` 조건을 뺀다.

- [ ] **Step 7: 확인**

- Run: `npx tsc --noEmit && npm run lint && npm run test`
- Expected: 에러 없음
- 수동 확인 (`npm run dev`):
  - `/register` 접속 → `/login`으로 감
  - DB에서 `dev1@coredesk.com`의 `isActive=false`로 바꾸면 로그인 시 실패 메시지가 뜸
  - 로그인한 채로 같은 처리를 하면 다음 페이지 이동 때 `/login`으로 가고 루프가 없음
  - 확인 후 `isActive=true`로 되돌림

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma src/lib/admin.ts src/lib/auth-config.ts src/app/api/logout/route.ts "src/app/(modules)/layout.tsx" "src/app/(auth)/register/page.tsx" src/middleware.ts src/components/layout/Sidebar.tsx
git commit -m "feat: 역할 확장, 비활성 사용자 차단, 회원가입 비활성화"
```

---

### Task 4: 시스템관리 메뉴 + ADMIN 레이아웃

**Files:**
- Modify: `src/config/nav.ts`, `src/components/layout/Sidebar.tsx`
- Create: `src/app/(modules)/system/layout.tsx`, `src/app/(modules)/system/page.tsx`

**Interfaces:**
- Consumes: `getCurrentDbUser` (Task 3)
- Produces: `NavItem`에 `children?: NavItem[]`, `adminOnly?: boolean` 추가

- [ ] **Step 1: `nav.ts`에 시스템관리 그룹 추가**

```ts
{ title: '시스템관리', href: '/system', icon: Settings, phase: 1, adminOnly: true,
  children: [{ title: '사용자관리', href: '/system/users', icon: Users, phase: 1 }] }
```

- [ ] **Step 2: `Sidebar` 수정**

- `role !== 'ADMIN'`이면 `adminOnly` 항목을 거른다.
- `children`이 있는 항목은 그룹 헤더(Link 아님)와 들여쓴 하위 Link로 렌더링한다.
- 현재 경로가 `item.href + '/'`로 시작하면 펼친다. 그 외에는 `useState`로 접고 펼친다.

- [ ] **Step 3: `system/layout.tsx`, `system/page.tsx` 작성**

- layout: `getCurrentDbUser()`의 role이 ADMIN이 아니면 `notFound()`
- page: `redirect('/system/users')`

- [ ] **Step 4: 확인**

- Run: `npx tsc --noEmit && npm run lint`
- Expected: 에러 없음
- 수동 확인:
  - `admin@coredesk.com` → 메뉴가 보이고 `/system/users`는 아직 404 (Task 5에서 만듦)
  - `dev1@coredesk.com` → 메뉴가 안 보이고 `/system`은 404

- [ ] **Step 5: Commit**

```bash
git add src/config/nav.ts src/components/layout/Sidebar.tsx "src/app/(modules)/system"
git commit -m "feat: ADMIN 전용 시스템관리 메뉴와 레이아웃 추가"
```

---

### Task 5: 사용자관리 페이지 + 액션

**Files:**
- Create:
  - `src/app/(modules)/system/users/page.tsx`
  - `src/app/(modules)/system/users/_actions/user.ts`
  - `src/app/(modules)/system/users/_components/UserTable.tsx`
  - `src/app/(modules)/system/users/_components/UserFormDialog.tsx`
  - `src/app/(modules)/system/users/_components/UserFilters.tsx`
- Modify: `src/types/index.ts` (`Role` 타입 re-export)

**Interfaces:**
- Consumes: `createUserSchema`, `updateUserSchema`, `ROLE_LABELS` (Task 1), `canChangeUser` (Task 2), `requireAdmin` (Task 3)
- Produces:
  ```ts
  type ActionResult = { ok: true } | { error: string }
  createUser(input: CreateUserInput): Promise<ActionResult>
  updateUser(id: string, input: UpdateUserInput): Promise<ActionResult>
  setUserActive(id: string, isActive: boolean): Promise<ActionResult>
  ```

- [ ] **Step 1: 액션 작성** (`_actions/user.ts`, `'use server'`)

모든 액션 공통:
- 첫 줄에서 `requireAdmin()`을 호출한다.
- 입력은 스키마로 `safeParse`하고, 실패하면 첫 이슈 메시지를 반환한다.
- 끝나면 `revalidatePath('/system/users')`를 호출한다.

액션별:
- 이메일 중복(`findUnique` 결과가 있고 id가 다름)이면 `{ error: '이미 사용 중인 이메일입니다' }`
- 비밀번호는 `bcrypt.hash(pw, 10)`. `updateUser`는 `password === ''`이면 비밀번호 필드를 제외한다.
- `updateUser`, `setUserActive`:
  - 대상이 없으면 `{ error: '사용자를 찾을 수 없습니다' }`
  - `prisma.user.count({ where: { role: 'ADMIN', isActive: true } })`로 개수를 세서 `canChangeUser`를 호출하고, 실패하면 `{ error }`를 반환한다.

- [ ] **Step 2: `page.tsx` (Server Component)**

- `searchParams`의 `q`, `status`(기본 `active`)로 where 조건을 만든다:
  - `OR: [{ name: { contains: q } }, { email: { contains: q } }]`
  - `isActive`는 status에 따라 정한다.
- 정렬은 `createdAt desc`.
- select: id, name, email, role, isActive, createdAt
- 현재 ADMIN의 id를 `UserTable`에 넘긴다.
- 빈 상태:
  - 필터를 썼으면 "조건에 맞는 사용자가 없습니다"와 [필터 초기화](`/system/users`)
  - 아니면 [사용자 추가]

- [ ] **Step 3: `UserFilters` (client)**

- 검색 Input과 상태 Select. 바뀌면 `router.replace`로 URL 파라미터를 갱신한다.
- 다른 모듈의 `ProjectFilters.tsx`는 import하지 않는다. 모듈 독립 규칙 때문에 패턴만 따른다.

- [ ] **Step 4: `UserTable` (client)**

- 컬럼: 이름 / 이메일 / 역할(`ROLE_LABELS` 배지) / 상태 배지 / 가입일(`YYYY-MM-DD`) / [수정] [비활성화|활성화]
- 자기 자신 행에서는 [비활성화]를 숨긴다.
- 비활성화·활성화는 `setUserActive`를 즉시 호출한다. 에러는 `sonner`의 `toast.error`로 띄운다.

- [ ] **Step 5: `UserFormDialog` (client)**

- `mode: 'create' | 'edit'`. react-hook-form + `zodResolver`로 생성·수정 스키마를 쓴다.
- 수정 모드:
  - 비밀번호 placeholder는 `'변경할 때만 입력'`
  - 자기 자신이면 역할 Select를 disabled로 한다.
- 성공하면 닫고 `toast.success`를 띄운다. 서버 에러는 폼 하단에 표시한다.

- [ ] **Step 6: 확인**

- Run: `npx tsc --noEmit && npm run lint && npm run test`
- Expected: 에러 없음
- 수동 확인 (admin 로그인):
  - 사용자 생성 → 목록에 보임 → 새 계정으로 로그인됨
  - 이메일 `ADMIN@coredesk.com`으로 생성 시 중복 에러
  - 수정에서 비밀번호를 비우면 기존 비밀번호가 유지됨
  - 비활성화 → `?status=inactive`에서 보임 → 활성화
  - 자기 행에는 비활성화 버튼이 없음
  - ADMIN이 1명일 때 다른 사용자의 역할 변경은 정상 동작함

- [ ] **Step 7: Commit**

```bash
git add "src/app/(modules)/system/users" src/types/index.ts
git commit -m "feat: 시스템관리 사용자관리 CRUD 구현"
```

---

### Task 6: `canManageProject` + 멤버 액션 정비

**Files:**
- Create: `src/lib/project-access.ts`
- Modify: `src/app/(modules)/projects/_actions/member.ts`
- Test: `tests/project-access.test.cjs`

**Interfaces:**
- Consumes: `getCurrentDbUser` (Task 3)
- Produces:
  ```ts
  canManageProject(p: { userRole: string; isOwner: boolean; memberRole?: 'PM' | 'DEVELOPER' | 'VIEWER' | null }): boolean
  inviteMember(projectId: string, userId: string, role: 'PM' | 'DEVELOPER' | 'VIEWER'): Promise<{ ok: true } | { error: string }>
  updateMemberRole(projectId: string, userId: string, role: 'PM' | 'DEVELOPER' | 'VIEWER'): Promise<{ ok: true } | { error: string }>
  removeMember(projectId: string, userId: string): Promise<{ ok: true } | { error: string }>
  ```
  `inviteMember`의 인자가 FormData(email)에서 userId로 바뀐다.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/project-access.test.cjs`

```js
require('./_ts.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const { canManageProject } = require('../src/lib/project-access.ts')

test('ADMIN은 비멤버여도 허용', () => assert.equal(canManageProject({ userRole: 'ADMIN', isOwner: false, memberRole: null }), true))
test('오너는 PM이 아니어도 허용', () => assert.equal(canManageProject({ userRole: 'MEMBER', isOwner: true, memberRole: 'DEVELOPER' }), true))
test('PM 허용', () => assert.equal(canManageProject({ userRole: 'MEMBER', isOwner: false, memberRole: 'PM' }), true))
test('DEVELOPER 거부', () => assert.equal(canManageProject({ userRole: 'MANAGER', isOwner: false, memberRole: 'DEVELOPER' }), false))
test('VIEWER 거부', () => assert.equal(canManageProject({ userRole: 'MEMBER', isOwner: false, memberRole: 'VIEWER' }), false))
test('비멤버 거부', () => assert.equal(canManageProject({ userRole: 'MEMBER', isOwner: false }), false))
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test`
Expected: FAIL, `Cannot find module`

- [ ] **Step 3: `canManageProject` 구현**

`userRole === 'ADMIN' || isOwner || memberRole === 'PM'`

- [ ] **Step 4: 통과 확인**

Run: `npm run test`
Expected: 모두 통과

- [ ] **Step 5: `member.ts` 정비**

- 공통 private 헬퍼 `assertCanManage(projectId)`:
  - `getCurrentDbUser()`, project(ownerId), 요청자의 ProjectMember를 조회한다.
  - `canManageProject`가 false면 `{ error: '권한이 없습니다' }`
- `inviteMember`:
  - 대상 사용자가 없거나 비활성이면 `{ error: '초대할 수 없는 사용자입니다' }`
  - 이미 멤버면 `'이미 프로젝트 멤버입니다'`
- `updateMemberRole`: 대상이 오너면 `{ error: '프로젝트 오너의 역할은 변경할 수 없습니다' }`
- `removeMember`: 기존 오너 보호와 태스크 미배정 처리를 유지한다. 자기 자신 제거는 `{ error: '자기 자신은 제거할 수 없습니다' }`
- 세 액션 모두 `revalidatePath(`/projects/${projectId}`)`와 기존 `/settings`를 호출한다.

- [ ] **Step 6: 확인**

Run: `npx tsc --noEmit`
Expected: `MemberList.tsx`의 `inviteMember` 호출부에서만 타입 에러가 남음 (Task 7에서 해결)

- [ ] **Step 7: Commit** (Task 7과 함께 커밋해도 됨. 타입 에러를 남기지 않으려면 Task 7 Step 3 이후에 커밋)

```bash
git add src/lib/project-access.ts tests/project-access.test.cjs "src/app/(modules)/projects/_actions/member.ts"
git commit -m "feat: 프로젝트 관리 권한을 canManageProject로 통일"
```

---

### Task 7: 멤버관리 UI + 담당자 목록에서 비활성 제외

**Files:**
- Modify: `src/app/(modules)/projects/_components/MemberList.tsx`
- Modify: `src/app/(modules)/projects/[id]/page.tsx` (`canManage` 계산, line 83 `members`, MemberList props)
- Modify: `src/app/(modules)/projects/[id]/settings/page.tsx` (MemberList props)

**Interfaces:**
- Consumes: `canManageProject`, `inviteMember(projectId, userId, role)`, `updateMemberRole`, `removeMember` (Task 6)
- Produces:
  ```ts
  type MemberListProps = {
    projectId: string
    ownerId: string
    members: (ProjectMember & { user: User })[]
    candidates: Pick<User, 'id' | 'name' | 'email'>[]   // 활성 && 비멤버
    currentUserId: string
    canManage: boolean
    isAdmin: boolean
  }
  ```

- [ ] **Step 1: 페이지 수정**

- `[id]/page.tsx`:
  - `canManage = canManageProject({ userRole: sessionUser.role, isOwner, memberRole: currentMember?.role })`
  - `candidates`는 `prisma.user.findMany({ where: { isActive: true, projectMembers: { none: { projectId: id } } }, select: { id, name, email }, orderBy: { name: 'asc' } })`로 조회한다. 멤버 탭이 활성일 때만 조회한다.
  - line 83: `project.members.filter((m) => m.user.isActive).map((m) => m.user)`. 담당자 선택 목록에서 비활성을 빼는 것이다. 기존 태스크의 담당자 표시는 `task.assignee`라 영향 없다.
- `settings/page.tsx`: 같은 props를 넘긴다.

- [ ] **Step 2: `MemberList` 수정**

- 각 행:
  - 오너면 `오너` 배지
  - 오너가 아니고 `canManage`면 역할 `Select`. 바꾸면 `updateMemberRole`을 즉시 호출한다.
  - 그 외에는 역할 배지
  - `!m.user.isActive`면 `비활성` 배지
- 제거 버튼은 `canManage && m.userId !== ownerId && m.userId !== currentUserId`일 때만 보인다.
- 초대 폼(`canManage`일 때만):
  - 사용자 Select(`이름 (이메일)`), 역할 Select(기본 DEVELOPER), [초대]
  - `candidates`가 비어 있으면 "초대할 수 있는 사용자가 없습니다"를 띄우고, `isAdmin`이면 `/system/users` 링크도 보여준다.
- 액션 에러는 기존처럼 폼 아래 `text-destructive`로 표시한다.

- [ ] **Step 3: 확인**

- Run: `npx tsc --noEmit && npm run lint && npm run test`
- Expected: 에러 없음
- 수동 확인:
  - 오너가 PM 멤버가 아닌 프로젝트에서 오너 계정으로 초대가 됨
  - ADMIN이 비멤버 프로젝트에서 초대가 됨
  - 역할 Select로 바꾸면 즉시 반영됨
  - 오너 행에는 Select와 제거 버튼이 없음
  - 사용자를 비활성화하면 멤버 목록에 `비활성` 배지가 붙고, 태스크 담당자 선택과 초대 후보에서 사라짐

- [ ] **Step 4: Commit**

```bash
git add "src/app/(modules)/projects"
git commit -m "feat: 멤버관리 사용자 선택 초대와 역할 변경 UI 구현"
```

---

### Task 8: 최종 검증

- [ ] **Step 1: 전체 확인**

Run: `npx tsc --noEmit && npm run lint && npm run test && npm run build`
Expected: 전부 성공

- [ ] **Step 2: spec 성공 기준 5개를 수동으로 재확인**

spec §1. Task 3~7의 수동 확인을 한 번에 다시 돈다.

- [ ] **Step 3: 문서 갱신**

- README "주요 기능"의 인증 줄에서 회원가입을 빼고 "시스템관리: 사용자관리(ADMIN)"를 추가한다.
- 커밋 메시지: `docs: 시스템관리 사용자관리 README 반영`
