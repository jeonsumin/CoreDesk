# 시스템관리 2단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사이드바 메뉴를 DB(`Menu`, `MenuPermission`)로 옮기고, ADMIN이 메뉴 CRUD·정렬과 메뉴×역할 `숨김/읽기/쓰기` 권한을 관리하게 한다. `src/proxy.ts`가 비활성 사용자와 숨김 메뉴 접근을 요청 단위로 차단하고, 메모 모듈에 읽기 전용을 시범 적용한다.

**Architecture:** 판정 로직(`resolveMenuAccess`, `filterVisibleMenus`, `buildMenuTree`, `canDeleteMenu`, `reorderSiblings`)과 입력 스키마는 순수 함수로 두고 TDD한다. proxy와 서버 헬퍼는 TTL 캐시된 메뉴 목록과 DB 사용자로 이 함수들을 호출한다. 화면은 1단계 `system` 모듈 패턴을 따른다.

**Tech Stack:** Next.js 16 App Router (`proxy.ts`, Node 런타임), Auth.js v5 JWT, Prisma 6 + MySQL, Zod 3, react-hook-form 7, shadcn/ui(base-ui), lucide-react, Node test runner + ts-node

**Spec:** `docs/superpowers/specs/2026-10-17-system-admin-phase2-design.md`

## Global Constraints

- 접근 값은 정확히 `NONE` / `READ` / `WRITE`이고, 화면 라벨은 `숨김` / `읽기` / `쓰기`(LINK는 `숨김` / `표시`)다. 메뉴 유형은 `GROUP` / `PAGE` / `LINK`, 상태는 `ACTIVE`(정상) / `PREPARING`(준비중)이다.
- ADMIN은 모든 메뉴에서 항상 `WRITE`이며 권한 행을 저장하지 않는다. 권한 행은 `MANAGER`, `MEMBER`, `VIEWER` 3개다.
- `isSystem` 메뉴는 ADMIN 전용이다. 생성·수정·삭제·정렬·권한 변경을 하지 않고, 부모로 지정할 수도 없다.
- 메뉴 깊이는 1단계다(GROUP → PAGE/LINK). 그룹 안에 그룹은 둘 수 없다.
- 등록된 메뉴에 걸리지 않는 경로는 허용한다(`WRITE`). 권한 행이 없으면 `NONE`이다.
- 새 메뉴의 기본 권한은 MANAGER `WRITE`, MEMBER `WRITE`, VIEWER `READ`다. 시드의 기존 메뉴 5개는 세 역할 모두 `WRITE`, `isSystem` 메뉴는 세 역할 모두 `NONE`이다.
- 메뉴 캐시 TTL은 30초다.
- 1단계 규칙을 유지한다:
  - Prisma는 서버에서만 호출한다.
  - Server Action을 우선한다.
  - 모듈 독립성: 다른 모듈의 `_actions`/`_components`는 import하지 않는다.
  - `any` 금지. Prisma 타입은 `src/types/index.ts`에서 re-export한다.
  - 필터 상태는 URL로 관리하고, 상태 변경은 확인 없이 즉시 반영한다. 단, 메뉴 삭제는 확인 Dialog를 거친다.
  - 빈 상태에는 CTA를 둔다.
- 순수 함수 파일(`src/lib/menu/resolve.ts`, `src/lib/menu/menu-schema.ts`, `src/lib/menu/icon-names.ts`)은 `@/` alias와 Prisma 런타임을 import하지 않는다. `import type`만 쓴다.
- system 모듈의 모든 Server Action은 첫 줄에서 `requireAdmin()`(1단계 `src/lib/admin.ts`)을 호출한다.
- 커밋은 conventional commits 형식, 한국어 메시지로 한다.
- **사전 조건:**
  - 로컬 DB는 docker compose `db`다. DB를 건드리는 prisma 명령은 `DATABASE_URL="mysql://coredesk:coredesk@localhost:3306/coredesk"`를 붙여 실행한다.
  - 호스트 `.env`의 `DATABASE_URL`로는 절대 실행하지 않는다.

## Review Focus

1. **시스템 경로를 덮는 일반 메뉴.** ADMIN이 PAGE `/system/x`나 `/system`을 만들면, 가장 긴 경로 일치 규칙 때문에 `isSystem` 보호가 뚫릴 수 있다. 스키마에서 `/system`, `/system/*`, `/api`, `/api/*`, `/login`, `/portfolio`, `/portfolio/*` 경로를 거부한다 (Task 1 테스트).
2. **정렬 값이 엉킨 경우.** sortOrder가 중복되거나 비어 있어도 ↑/↓ 한 번에 정확히 한 칸만 움직여야 한다. 그래서 이웃과 값을 맞바꾸지 않고, 형제 전체를 0..n-1로 다시 매긴다 (Task 2 `reorderSiblings` 테스트).
3. **정적 파일 요청.** `/next.svg` 같은 public 파일 요청마다 proxy가 DB를 조회하면 안 된다. matcher에서 확장자가 있는 경로를 제외한다 (Task 4 수동 확인).
4. **캐시 무효화.** proxy 번들과 앱 번들은 모듈 인스턴스가 따로일 수 있다. 같은 프로세스에서 `invalidateMenuCache()`가 proxy에도 바로 반영되도록 캐시를 `globalThis`에 둔다 (Task 3).
5. **메모 읽기 사용자의 빈 상태.** 메모가 없을 때 [새 메모] CTA 없이 "등록된 메모가 없습니다" 안내만 보여야 한다. 버튼을 눌러 404를 맞으면 안 된다 (Task 8).

---

## File Structure

| 파일 | 역할 |
| --- | --- |
| `prisma/schema.prisma` | `MenuType`, `MenuStatus`, `MenuAccess`, `Menu`, `MenuPermission` 추가 |
| `src/lib/menu/icon-names.ts` (새 파일) | `ICON_NAMES` 상수만 둔다(순수, 테스트용) |
| `src/lib/menu/icons.ts` (새 파일) | `ICON_NAMES` → lucide 컴포넌트 매핑(클라이언트·서버 공용) |
| `src/lib/menu/menu-schema.ts` (새 파일) | 메뉴 입력 Zod 스키마, 접근·유형 상수 |
| `src/lib/menu/resolve.ts` (새 파일) | `resolveMenuAccess`, `filterVisibleMenus`, `buildMenuTree`, `canDeleteMenu`, `reorderSiblings` |
| `src/lib/menu/cache.ts` (새 파일) | `getCachedMenus`, `invalidateMenuCache` |
| `src/lib/menu/access.ts` (새 파일) | `getMenuAccess`, `requireMenuWrite` |
| `prisma/seed-menus.ts` (새 파일), `prisma/seed.ts`, `package.json` | 메뉴 시드, `menus:seed` 스크립트 |
| `src/proxy.ts` (새 파일), `src/middleware.ts` (삭제) | 요청 단위 차단 |
| `src/app/(modules)/layout.tsx`, `src/components/layout/Sidebar.tsx`, `src/config/nav.ts` (삭제) | DB 기반 사이드바 |
| `src/app/(modules)/system/menus/**` (새 폴더) | 메뉴관리 |
| `src/app/(modules)/system/permissions/**` (새 폴더) | 권한관리 |
| `src/app/(modules)/memos/**` | 읽기 전용 시범 적용 |
| `docs/DEPLOYMENT.md`, `README.md` | 배포 순서, 기능 설명 |

---

### Task 1: 스키마 + 아이콘 목록 + 메뉴 입력 스키마

**Files:**
- Modify: `prisma/schema.prisma`, `src/types/index.ts`
- Create: `src/lib/menu/icon-names.ts`, `src/lib/menu/icons.ts`, `src/lib/menu/menu-schema.ts`
- Test: `tests/menu-schema.test.cjs`

**Interfaces:**
- Produces:
  ```ts
  // icon-names.ts
  export const ICON_NAMES = ['LayoutDashboard','FolderKanban','BriefcaseBusiness','NotepadText','HardDrive','Settings','Users','Menu','ShieldCheck','ListTodo','Link','FileText','Calendar','BarChart3','Folder'] as const
  export type IconName = typeof ICON_NAMES[number]
  // icons.ts
  export const MENU_ICONS: Record<IconName, LucideIcon>
  // menu-schema.ts
  export const MENU_TYPES = ['GROUP','PAGE','LINK'] as const;  export type MenuTypeValue
  export const MENU_STATUSES = ['ACTIVE','PREPARING'] as const; export type MenuStatusValue
  export const MENU_ACCESS = ['NONE','READ','WRITE'] as const;  export type MenuAccessValue
  export const PERMISSION_ROLES = ['MANAGER','MEMBER','VIEWER'] as const; export type PermissionRole
  export const DEFAULT_PERMISSIONS: Record<PermissionRole, MenuAccessValue>  // { MANAGER:'WRITE', MEMBER:'WRITE', VIEWER:'READ' }
  export const ACCESS_LABELS: Record<MenuAccessValue, string>               // { NONE:'숨김', READ:'읽기', WRITE:'쓰기' }
  export const menuInputSchema  // z object → { type, title, parentId: string|null, path: string|null, icon: IconName, status }
  export const menuCreateSchema // menuInputSchema + permissions: Record<PermissionRole, MenuAccessValue> (기본값 DEFAULT_PERMISSIONS)
  export type MenuInput, MenuCreateInput
  ```

- [ ] **Step 1: 스키마 수정**

- spec §3의 모델을 그대로 추가한다.
- `src/types/index.ts`에 `Menu`, `MenuPermission`, `MenuType`, `MenuStatus`, `MenuAccess` re-export를 추가한다.
- Run: `DATABASE_URL="mysql://coredesk:coredesk@localhost:3306/coredesk" npx prisma db push && npx prisma generate`
- Expected: `Your database is now in sync`

- [ ] **Step 2: 실패하는 테스트 작성** — `tests/menu-schema.test.cjs` (`require('./_ts.cjs')`, 1단계 하네스)

```js
const { menuInputSchema, menuCreateSchema } = require('../src/lib/menu/menu-schema.ts')
const page = { type: 'PAGE', title: '내 태스크', parentId: null, path: '/my-tasks', icon: 'ListTodo', status: 'ACTIVE' }
const ok = (v) => menuInputSchema.safeParse(v).success

test('PAGE 정상', () => assert.equal(ok(page), true))
test('PAGE: // 시작 거부', () => assert.equal(ok({ ...page, path: '//evil.com' }), false))
test('PAGE: http URL 거부', () => assert.equal(ok({ ...page, path: 'http://x.com' }), false))
test('PAGE: 끝 / 거부', () => assert.equal(ok({ ...page, path: '/my-tasks/' }), false))
test('PAGE: 공백·?·# 거부', () => {
  for (const p of ['/my tasks', '/a?b=1', '/a#b']) assert.equal(ok({ ...page, path: p }), false)
})
test('PAGE: 예약 경로 거부', () => {
  for (const p of ['/system', '/system/x', '/api', '/api/x', '/login', '/portfolio', '/portfolio/x'])
    assert.equal(ok({ ...page, path: p }), false, p)
})
test('PAGE: /systems 같은 유사 경로는 허용', () => assert.equal(ok({ ...page, path: '/systems' }), true))
test('LINK: https 허용', () => assert.equal(ok({ ...page, type: 'LINK', path: 'https://wiki.example.com/a' }), true))
test('LINK: javascript:/data: 거부', () => {
  for (const p of ['javascript:alert(1)', 'data:text/html,x']) assert.equal(ok({ ...page, type: 'LINK', path: p }), false)
})
test('GROUP: path는 null로 정규화되고 parentId 금지', () => {
  assert.equal(menuInputSchema.parse({ ...page, type: 'GROUP', path: '/whatever' }).path, null)
  assert.equal(ok({ ...page, type: 'GROUP', path: null, parentId: 'g1' }), false)
})
test('이름 trim, 0자·31자 거부', () => {
  assert.equal(menuInputSchema.parse({ ...page, title: '  메모  ' }).title, '메모')
  assert.equal(ok({ ...page, title: '   ' }), false)
  assert.equal(ok({ ...page, title: 'a'.repeat(31) }), false)
})
test('허용 목록 밖 아이콘 거부', () => assert.equal(ok({ ...page, icon: 'Skull' }), false))
test('create: permissions 기본값', () =>
  assert.deepEqual(menuCreateSchema.parse(page).permissions, { MANAGER: 'WRITE', MEMBER: 'WRITE', VIEWER: 'READ' }))
```

- [ ] **Step 3: 실패 확인**

Run: `npm run test`
Expected: FAIL, `Cannot find module '../src/lib/menu/menu-schema.ts'`

- [ ] **Step 4: 구현**

- `menu-schema.ts`의 검증은 `superRefine`으로 한다.
- PAGE 경로 정규식: `/^\/(?!\/)[^\s?#]*$/`. 끝 `/`는 거부하고, 예약 접두는 경로 구분 단위로 비교해 거부한다.
- LINK는 `new URL(v)`가 성공하고 `protocol`이 `http:` 또는 `https:`여야 한다.
- GROUP은 `transform`으로 `path`를 `null`로 바꾸고, `parentId`가 있으면 거부한다.
- 에러 메시지:
  - 경로: `'올바른 내부 경로를 입력해주세요'`
  - 예약 경로: `'시스템 예약 경로는 사용할 수 없습니다'`
  - 링크: `'http(s) URL을 입력해주세요'`
  - 이름: `'이름은 1~30자로 입력해주세요'`
- `icons.ts`는 `ICON_NAMES`의 각 이름을 같은 이름의 lucide 컴포넌트에 매핑한다.

- [ ] **Step 5: 통과 확인** — Run: `npm run test` → 전부 통과

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/types/index.ts src/lib/menu/icon-names.ts src/lib/menu/icons.ts src/lib/menu/menu-schema.ts tests/menu-schema.test.cjs
git commit -m "feat: 메뉴 스키마와 입력 검증 추가"
```

---

### Task 2: 판정·트리·정렬 순수 함수

**Files:**
- Create: `src/lib/menu/resolve.ts`
- Test: `tests/menu-resolve.test.cjs`

**Interfaces:**
- Consumes: `RoleValue` (`src/lib/system/user-schema.ts`), `MenuTypeValue`, `MenuStatusValue`, `MenuAccessValue`, `IconName` (Task 1)
- Produces:
  ```ts
  export type MenuRecord = { id: string; title: string; type: MenuTypeValue; path: string | null; icon: IconName | string;
    parentId: string | null; sortOrder: number; status: MenuStatusValue; isSystem: boolean;
    permissions: { role: RoleValue; access: MenuAccessValue }[] }
  export type MenuTreeNode = MenuRecord & { children: MenuTreeNode[] }
  export function resolveMenuAccess(menus: MenuRecord[], role: RoleValue, pathname: string): MenuAccessValue
  export function buildMenuTree(menus: MenuRecord[]): MenuTreeNode[]          // 루트·자식 모두 sortOrder 오름차순, 동률이면 title
  export function filterVisibleMenus(tree: MenuTreeNode[], role: RoleValue): MenuTreeNode[]
  export function canDeleteMenu(menu: { isSystem: boolean }, childCount: number): { ok: true } | { ok: false; error: string }
  export function reorderSiblings(siblings: { id: string; sortOrder: number }[], id: string, direction: 'up' | 'down'): { id: string; sortOrder: number }[]
  ```
  `reorderSiblings`는 현재 순서(sortOrder 오름차순, 동률이면 입력 순서)를 기준으로 대상 하나를 한 칸 옮긴다. 형제 전체에 0..n-1을 다시 매기고, 값이 바뀐 항목만 반환한다. 맨 앞에서 up, 맨 뒤에서 down이면 `[]`.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/menu-resolve.test.cjs`

```js
const m = (id, path, perms = {}, extra = {}) => ({ id, title: id, type: 'PAGE', path, icon: 'Folder', parentId: null,
  sortOrder: 0, status: 'ACTIVE', isSystem: false,
  permissions: Object.entries(perms).map(([role, access]) => ({ role, access })), ...extra })
const menus = [
  m('projects', '/projects', { MEMBER: 'READ', VIEWER: 'NONE' }),
  m('pdetail', '/projects/archive', { MEMBER: 'NONE' }),
  m('sys', '/system/users', {}, { isSystem: true }),
  m('ext', 'https://wiki.example.com', { MEMBER: 'READ' }, { type: 'LINK' }),
]
test('ADMIN은 항상 WRITE', () => assert.equal(resolveMenuAccess(menus, 'ADMIN', '/system/users'), 'WRITE'))
test('정확히 일치', () => assert.equal(resolveMenuAccess(menus, 'MEMBER', '/projects'), 'READ'))
test('하위 경로는 상위 메뉴를 따름', () => assert.equal(resolveMenuAccess(menus, 'MEMBER', '/projects/abc/settings'), 'READ'))
test('가장 긴 경로 우선', () => assert.equal(resolveMenuAccess(menus, 'MEMBER', '/projects/archive/1'), 'NONE'))
test('경로 구분 단위 매칭', () => assert.equal(resolveMenuAccess(menus, 'VIEWER', '/projectsx'), 'WRITE'))
test('미등록 경로는 WRITE', () => assert.equal(resolveMenuAccess(menus, 'VIEWER', '/my-tasks'), 'WRITE'))
test('isSystem은 비ADMIN NONE', () => assert.equal(resolveMenuAccess(menus, 'MANAGER', '/system/users'), 'NONE'))
test('권한 행 없으면 NONE', () => assert.equal(resolveMenuAccess(menus, 'MANAGER', '/projects'), 'NONE'))
test('LINK는 경로 매칭 대상 아님', () => assert.equal(resolveMenuAccess(menus, 'MEMBER', 'https://wiki.example.com'), 'WRITE'))

const g = m('grp', null, {}, { type: 'GROUP', sortOrder: 1 })
const tree = buildMenuTree([
  m('b', '/b', { MEMBER: 'WRITE' }, { sortOrder: 2 }),
  m('a', '/a', { MEMBER: 'NONE' }, { sortOrder: 0 }),
  g,
  m('c1', '/c1', { MEMBER: 'NONE' }, { parentId: 'grp', sortOrder: 0 }),
])
test('buildMenuTree 정렬·중첩', () => {
  assert.deepEqual(tree.map((n) => n.id), ['a', 'grp', 'b'])
  assert.deepEqual(tree[1].children.map((n) => n.id), ['c1'])
})
test('filterVisibleMenus: NONE 제거 + 빈 그룹 제거', () =>
  assert.deepEqual(filterVisibleMenus(tree, 'MEMBER').map((n) => n.id), ['b']))
test('filterVisibleMenus: ADMIN은 전부', () =>
  assert.deepEqual(filterVisibleMenus(tree, 'ADMIN').map((n) => n.id), ['a', 'grp', 'b']))
test('canDeleteMenu', () => {
  assert.deepEqual(canDeleteMenu({ isSystem: false }, 0), { ok: true })
  assert.deepEqual(canDeleteMenu({ isSystem: false }, 2), { ok: false, error: '하위 메뉴를 먼저 옮기거나 삭제하세요' })
  assert.deepEqual(canDeleteMenu({ isSystem: true }, 0), { ok: false, error: '시스템 메뉴는 삭제할 수 없습니다' })
})
test('reorderSiblings: 중복 sortOrder에서도 한 칸 이동', () => {
  const s = [{ id: 'x', sortOrder: 0 }, { id: 'y', sortOrder: 0 }, { id: 'z', sortOrder: 5 }]
  assert.deepEqual(reorderSiblings(s, 'z', 'up'), [{ id: 'y', sortOrder: 2 }, { id: 'z', sortOrder: 1 }])
})
test('reorderSiblings: 경계는 []', () => {
  const s = [{ id: 'x', sortOrder: 0 }, { id: 'y', sortOrder: 1 }]
  assert.deepEqual(reorderSiblings(s, 'x', 'up'), [])
  assert.deepEqual(reorderSiblings(s, 'y', 'down'), [])
})
```

- [ ] **Step 2: 실패 확인** — Run: `npm run test` → FAIL, `Cannot find module`
- [ ] **Step 3: `resolve.ts` 구현.** spec §4.1의 판정 순서를 그대로 따른다. `reorderSiblings`는 위 Interfaces의 정의대로 만들고, 반환 배열은 **id 오름차순**으로 정렬한다.
- [ ] **Step 4: 통과 확인** — Run: `npm run test` → 전부 통과
- [ ] **Step 5: Commit**

```bash
git add src/lib/menu/resolve.ts tests/menu-resolve.test.cjs
git commit -m "feat: 메뉴 권한 판정과 트리·정렬 함수 추가"
```

---

### Task 3: 메뉴 시드 + 캐시 + 서버 헬퍼

**Files:**
- Create: `prisma/seed-menus.ts`, `src/lib/menu/cache.ts`, `src/lib/menu/access.ts`
- Modify: `prisma/seed.ts` (main 끝에서 `seedMenus(prisma)` 호출), `package.json` (`"menus:seed"` 스크립트)

**Interfaces:**
- Consumes: `MenuRecord`, `resolveMenuAccess` (Task 2), `getCurrentDbUser` (1단계 `src/lib/admin.ts`)
- Produces:
  ```ts
  // prisma/seed-menus.ts
  export async function seedMenus(prisma: PrismaClient): Promise<void>   // 단독 실행 시 main 블록에서 자체 PrismaClient로 실행
  // src/lib/menu/cache.ts
  export async function getCachedMenus(): Promise<MenuRecord[]>   // permissions 포함, TTL 30초, globalThis.__coredeskMenuCache
  export function invalidateMenuCache(): void
  // src/lib/menu/access.ts
  export async function getMenuAccess(path: string): Promise<MenuAccessValue>   // DB 사용자 없으면 'NONE'
  export async function requireMenuWrite(path: string): Promise<void>           // WRITE 아니면 throw new Error('Forbidden')
  ```

- [ ] **Step 1: `seed-menus.ts` 작성**

- spec §3.1 표의 9개 메뉴를 넣는다. 권한도 표대로 넣는다(기존 5개는 세 역할 `WRITE`, isSystem은 `NONE`).
- PAGE upsert 키는 `path`이고 `update: {}`로 둔다. 이미 있으면 건드리지 않는다.
- 시스템관리 GROUP은 고정 id `menu-system`으로 upsert한다.
- sortOrder:
  - 루트: 대시보드 0, 프로젝트 관리 1, 포트폴리오 관리 2, 메모 3, 드라이브 4, 시스템관리 5
  - 시스템관리 하위: 사용자관리 0, 메뉴관리 1, 권한관리 2
- 권한 행도 `upsert`의 `update: {}`로 넣는다.
- `package.json`에 추가: `"menus:seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed-menus.ts"`

- [ ] **Step 2: 시드 실행 + 멱등성 확인**

- Run: `DATABASE_URL="mysql://coredesk:coredesk@localhost:3306/coredesk" npm run menus:seed`를 두 번 실행한다.
- Run: `docker compose exec db mysql -ucoredesk -pcoredesk coredesk -e "SELECT COUNT(*) FROM Menu; SELECT COUNT(*) FROM MenuPermission"`
- Expected: 두 번 실행한 뒤에도 Menu 9행, MenuPermission 24행 (PAGE 8개 × 3, GROUP은 0)

- [ ] **Step 3: `cache.ts`, `access.ts` 작성**

- `cache.ts`는 상태(`{ menus, loadedAt }`)를 `globalThis`의 키에 둔다. 30초가 지났거나 무효화되면 `prisma.menu.findMany({ include: { permissions: { select: { role, access } } } })`로 다시 읽는다.
- `// ponytail:` 주석을 단다. 멀티 인스턴스에서는 최대 30초 늦게 반영되고, 필요해지면 DB의 version 컬럼 확인이나 pub/sub으로 바꾼다.
- `access.ts`는 `getCurrentDbUser()`와 `getCachedMenus()`로 `resolveMenuAccess`를 호출한다.

- [ ] **Step 4: 확인**

- Run: `npx tsc --noEmit && npx eslint prisma/seed-menus.ts src/lib/menu && npm run test`
- Expected: 에러 없음

- [ ] **Step 5: Commit**

```bash
git add prisma/seed-menus.ts prisma/seed.ts package.json src/lib/menu/cache.ts src/lib/menu/access.ts
git commit -m "feat: 메뉴 시드, 캐시, 접근 헬퍼 추가"
```

---

### Task 4: `src/proxy.ts`로 요청 단위 차단

**Files:**
- Create: `src/proxy.ts`
- Delete: `src/middleware.ts`

**Interfaces:**
- Consumes: `auth` (`@/lib/auth`), `prisma` (`@/lib/prisma`), `getCachedMenus` (Task 3), `resolveMenuAccess` (Task 2)

- [ ] **Step 1: `proxy.ts` 작성**

- 기존 `middleware.ts`의 redirect 규칙을 그대로 옮긴다:
  - 비로그인 사용자가 `/login`·`/portfolio/`가 아닌 경로로 오면 `/login`
  - 로그인한 사용자가 `/login`으로 오면 `/dashboard`
- `export default auth(async (req) => …)` 형태로 만든다. 로그인한 상태이고 auth/public 페이지가 아니면 다음을 한다:
  1. `prisma.user.findUnique({ where: { id: req.auth.user.id }, select: { role: true, isActive: true } })`. 결과가 null이거나 비활성이면 `NextResponse.redirect(new URL('/api/logout', req.url))`
  2. `resolveMenuAccess(await getCachedMenus(), user.role, req.nextUrl.pathname) === 'NONE'`이면 `NextResponse.rewrite(new URL('/__forbidden', req.url))`. 이 경로는 존재하지 않으므로 not-found가 404로 렌더링된다.
- matcher: `['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)']`. 확장자가 있는 정적 파일은 제외한다.

- [ ] **Step 2: `src/middleware.ts` 삭제** — `git rm src/middleware.ts`

- [ ] **Step 3: 확인**

- Run: `npx tsc --noEmit && npx eslint src/proxy.ts && npm run build`
- Expected: 성공. build 출력에 Proxy가 인식된다.
- 수동 확인 (docker app, curl 또는 Playwright):
  - 비로그인 `/dashboard` → `/login`
  - 로그인한 dev1 `/login` → `/dashboard`
  - dev1 `/system/users` → 404 (isSystem)
  - DB에서 `/memos`의 MEMBER 권한을 `NONE`으로 바꾸면 dev1 `/memos`가 404이고, 원래대로 되돌리면 200 (캐시 때문에 최대 30초 대기하거나 앱 재시작)
  - 로그인 중인 dev1을 `isActive=0`으로 바꾼 뒤 사이드바 링크로 앱 안에서 이동해도 `/login`으로 감 (확인 후 되돌림)
  - `/next.svg` 요청이 proxy를 타지 않음

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts   # middleware.ts 삭제는 Step 2의 git rm으로 이미 staged
git commit -m "feat: proxy에서 비활성 사용자와 숨김 메뉴 접근 차단"
```

---

### Task 5: DB 기반 사이드바

**Files:**
- Modify: `src/app/(modules)/layout.tsx`, `src/components/layout/Sidebar.tsx`
- Delete: `src/config/nav.ts`

**Interfaces:**
- Consumes: `getCachedMenus` (Task 3), `buildMenuTree`, `filterVisibleMenus`, `MenuTreeNode` (Task 2), `MENU_ICONS` (Task 1)
- Produces: `Sidebar({ menus }: { menus: MenuTreeNode[] })`. `role` prop은 제거한다.

- [ ] **Step 1: `layout.tsx` 수정**

`const menus = filterVisibleMenus(buildMenuTree(await getCachedMenus()), user.role)`를 만들어 `<Sidebar menus={menus} />`로 넘긴다.

- [ ] **Step 2: `Sidebar` 수정**

- 1단계의 NavLink/NavGroup 스타일과 펼침 동작은 유지하고, 데이터만 `MenuTreeNode`로 바꾼다.
- 아이콘은 `MENU_ICONS[node.icon as IconName] ?? Folder`로 찾는다.
- `status === 'PREPARING'`이면 기존 disabled 스타일과 "예정" 표시를 쓴다.
- `type === 'LINK'`이면 `<a href target="_blank" rel="noopener noreferrer">`로 그린다.
- GROUP의 펼침 기준 경로는 자식 PAGE 경로 중 하나에 현재 경로가 속하는지로 판단한다.

- [ ] **Step 3: `nav.ts` 삭제**

`git rm src/config/nav.ts`. 다른 import가 없는지 `grep -rn "config/nav" src`로 확인한다. 결과가 없어야 한다.

- [ ] **Step 4: 확인**

- Run: `npx tsc --noEmit && npx eslint "src/app/(modules)/layout.tsx" src/components/layout/Sidebar.tsx && npm run test`
- 수동 확인:
  - admin과 dev1의 사이드바가 시드 직후 1단계와 같다. admin에게만 시스템관리(하위 3개)가 보이고, 메뉴관리·권한관리는 아직 404다.
  - DB에서 메뉴 하나를 `PREPARING`으로 바꾸면 "예정"으로 보인다(확인 후 되돌림).

- [ ] **Step 5: Commit**

```bash
git add "src/app/(modules)/layout.tsx" src/components/layout/Sidebar.tsx   # nav.ts 삭제는 git rm으로 이미 staged
git commit -m "feat: 사이드바를 DB 메뉴 기반으로 전환"
```

---

### Task 6: 메뉴관리 `/system/menus`

**Files:**
- Create:
  - `src/app/(modules)/system/menus/page.tsx`
  - `src/app/(modules)/system/menus/_actions/menu.ts`
  - `src/app/(modules)/system/menus/_components/MenuTable.tsx`
  - `src/app/(modules)/system/menus/_components/MenuFormDialog.tsx`
  - `src/app/(modules)/system/menus/_components/DeleteMenuDialog.tsx`

**Interfaces:**
- Consumes: `menuInputSchema`, `menuCreateSchema`, `MenuInput`, `MenuCreateInput`, `ICON_NAMES`, `ACCESS_LABELS`, `PERMISSION_ROLES` (Task 1), `buildMenuTree`, `canDeleteMenu`, `reorderSiblings` (Task 2), `invalidateMenuCache` (Task 3), `MENU_ICONS` (Task 1), `requireAdmin` (1단계)
- Produces:
  ```ts
  type ActionResult = { ok: true } | { error: string }
  createMenu(input: MenuCreateInput): Promise<ActionResult>
  updateMenu(id: string, input: MenuInput): Promise<ActionResult>   // type 변경 불가: 기존 type과 다르면 { error: '메뉴 유형은 변경할 수 없습니다' }
  deleteMenu(id: string): Promise<ActionResult>
  moveMenu(id: string, direction: 'up' | 'down'): Promise<ActionResult>
  ```

- [ ] **Step 1: 액션 작성** (`'use server'`)

- 공통:
  - 첫 줄에서 `requireAdmin()`을 호출한다.
  - 대상이 `isSystem`이면 `{ error: '시스템 메뉴는 변경할 수 없습니다' }`
  - 성공하면 `invalidateMenuCache()`와 `revalidatePath('/', 'layout')`를 호출한다.
- `parentId` 검증: 대상 메뉴가 존재하고 `type === 'GROUP' && !isSystem`이어야 한다. 아니면 `{ error: '올바르지 않은 상위 그룹입니다' }`
- 경로 중복(`findUnique({ where: { path } })`의 id가 다르면)과 Prisma P2002는 `{ error: '이미 사용 중인 경로입니다' }`
- `createMenu`:
  - `sortOrder`는 같은 부모 안 최댓값 + 1로 정한다.
  - 메뉴와 권한 3행을 `$transaction`으로 함께 만든다. GROUP이면 권한 행을 만들지 않는다.
- `updateMenu`: 부모가 바뀌면 새 부모 안에서 맨 뒤로 보낸다.
- `deleteMenu`: 하위 개수를 세서 `canDeleteMenu`로 판정한다.
- `moveMenu`:
  - 같은 부모의 형제를 조회해 `reorderSiblings`를 호출하고, 결과를 `$transaction`으로 반영한다.
  - 형제 목록에는 isSystem 메뉴(루트의 시스템관리 그룹)도 포함해서 다시 매긴다. isSystem 메뉴를 직접 옮기는 요청은 공통 규칙으로 거부한다.

- [ ] **Step 2: `page.tsx`**

- `prisma.menu.findMany({ include: { _count: { select: { children: true } } } })`로 메뉴를 읽고, `buildMenuTree`로 순서를 정해 평탄화한 행(들여쓰기 레벨 포함)을 `MenuTable`에 넘긴다.
- 빈 상태: "등록된 메뉴가 없습니다"와 [메뉴 추가]

- [ ] **Step 3: `MenuTable` (client)**

- 컬럼: 아이콘 / 이름 / 유형 / 경로 / 상태 / [↑][↓] / [수정] [삭제]
- 형제 중 처음이면 ↑, 마지막이면 ↓를 숨긴다.
- `isSystem` 행은 `Lock` 아이콘만 보여준다.
- 에러는 `toast.error`로 띄운다.

- [ ] **Step 4: `MenuFormDialog` (client)**

- react-hook-form + `zodResolver`(생성은 `menuCreateSchema`, 수정은 `menuInputSchema`)
- 유형: 생성할 때만 Select, 수정할 때는 텍스트로 표시
- GROUP이면 상위 그룹·경로·기본 권한 필드를 숨긴다.
- 상위 그룹 후보는 `isSystem`이 아닌 GROUP과 "(없음)"
- 아이콘 Select는 아이콘과 이름을 함께 보여준다.
- 기본 권한은 생성할 때만 보이고, 역할별로 `ACCESS_LABELS` Select를 둔다.
- 열 때마다 `reset(현재 값)`을 호출한다(1단계 교훈).

- [ ] **Step 5: `DeleteMenuDialog` (client)**

"「{title}」 메뉴를 삭제할까요? 권한 설정도 함께 삭제됩니다." 문구와 [취소] [삭제]

- [ ] **Step 6: 확인**

- Run: `npx tsc --noEmit && npx eslint "src/app/(modules)/system/menus" && npm run test`
- 수동 확인 (admin):
  - PAGE `/my-tasks`(아이콘 ListTodo)를 추가하면 사이드바에 나타나고 dev1에게도 보인다(권한 MEMBER WRITE)
  - 그룹 "외부 링크"를 만들고 그 아래에 LINK `https://example.com`을 추가하면 새 탭으로 열린다
  - ↑/↓가 사이드바 순서에 반영된다
  - 경로 `/system/x`는 예약 경로 에러, 중복 경로는 에러
  - 하위가 있는 그룹을 삭제하면 에러, 비우면 삭제된다
  - 시스템 행에는 버튼이 없다
  - 확인 후 추가한 메뉴를 모두 삭제한다

- [ ] **Step 7: Commit**

```bash
git add "src/app/(modules)/system/menus"
git commit -m "feat: 시스템관리 메뉴관리 CRUD와 정렬 구현"
```

---

### Task 7: 권한관리 `/system/permissions`

**Files:**
- Create:
  - `src/app/(modules)/system/permissions/page.tsx`
  - `src/app/(modules)/system/permissions/_actions/permission.ts`
  - `src/app/(modules)/system/permissions/_components/PermissionMatrix.tsx`

**Interfaces:**
- Consumes: `MENU_ACCESS`, `PERMISSION_ROLES`, `ACCESS_LABELS` (Task 1), `buildMenuTree` (Task 2), `invalidateMenuCache` (Task 3), `requireAdmin`
- Produces: `setMenuPermission(menuId: string, role: string, access: string): Promise<{ ok: true } | { error: string }>`

- [ ] **Step 1: 액션 작성**

- `requireAdmin()`을 먼저 호출한다.
- `role`이 `PERMISSION_ROLES`에 없거나 `access`가 `MENU_ACCESS`에 없으면 `{ error: '올바르지 않은 권한 값입니다' }`(ADMIN 거부도 여기서 처리됨)
- 메뉴가 없거나, `isSystem`이거나, `type === 'GROUP'`이면 `{ error: '권한을 설정할 수 없는 메뉴입니다' }`
- LINK에 `WRITE`가 오면 `READ`로 저장한다.
- `upsert`로 저장한 뒤 `invalidateMenuCache()`와 `revalidatePath('/', 'layout')`를 호출한다.

- [ ] **Step 2: `page.tsx`**

- 메뉴와 권한을 읽고 `buildMenuTree` 순서로 행을 만든다. GROUP은 헤더 행이다.
- 상단 안내문은 spec §5.3의 문구를 그대로 쓴다.

- [ ] **Step 3: `PermissionMatrix` (client)**

- 열: ADMIN(고정 "쓰기", 비활성 텍스트) / MANAGER / MEMBER / VIEWER
- PAGE 칸은 `숨김/읽기/쓰기` Select, LINK 칸은 `숨김/표시` Select(`표시` = READ)
- isSystem 행은 모든 칸에 "ADMIN 전용"
- 바꾸면 즉시 `setMenuPermission`을 호출하고, 실패하면 `toast.error`를 띄운다. Select 값은 서버 props로 제어해서 실패하면 원래 값으로 돌아오게 한다.

- [ ] **Step 4: 확인**

- Run: `npx tsc --noEmit && npx eslint "src/app/(modules)/system/permissions" && npm run test`
- 수동 확인:
  - 메모의 VIEWER를 `숨김`으로 바꾸면 ceo(VIEWER로 역할 변경 후)의 사이드바에서 메모가 빠지고 `/memos`가 404다
  - 되돌리면 다시 보인다
  - 확인 후 ceo 역할을 원래대로 되돌린다

- [ ] **Step 5: Commit**

```bash
git add "src/app/(modules)/system/permissions"
git commit -m "feat: 시스템관리 메뉴별 권한관리 구현"
```

---

### Task 8: 메모 모듈 읽기 전용 시범 적용

**Files:**
- Modify:
  - `src/app/(modules)/memos/_actions/memo.ts` (`createMemo`, `updateMemo`, `deleteMemo`, `deleteMemoFormAction`)
  - `src/app/(modules)/memos/page.tsx` (51, 90행 근처 [새 메모])
  - `src/app/(modules)/memos/[id]/page.tsx` (78행 [수정], 95행 삭제 form)
  - `src/app/(modules)/memos/new/page.tsx`
  - `src/app/(modules)/memos/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: `getMenuAccess`, `requireMenuWrite` (Task 3)

- [ ] **Step 1: 액션 4개 첫 줄에 `await requireMenuWrite('/memos')` 추가.** 기존 `ensureAuthenticated()`보다 먼저 호출한다.
- [ ] **Step 2: 목록 페이지**

- `const canWrite = (await getMenuAccess('/memos')) === 'WRITE'`
- `!canWrite`면 상단 [새 메모]를 렌더링하지 않는다.
- 빈 상태에서 [새 메모] CTA 대신 "등록된 메모가 없습니다" 안내만 보여준다(Review Focus 5).

- [ ] **Step 3: 상세 페이지** — `!canWrite`면 [수정] 링크와 삭제 form을 렌더링하지 않는다.
- [ ] **Step 4: 편집 경로** — `new/page.tsx`와 `[id]/edit/page.tsx` 시작 부분에서 `!canWrite`면 `notFound()`를 호출한다.
- [ ] **Step 5: 확인**

- Run: `npx tsc --noEmit && npx eslint "src/app/(modules)/memos" && npm run test`
- 수동 확인:
  - 권한관리에서 메모의 MEMBER를 `읽기`로 바꾸면 dev1에게 목록·상세의 버튼이 없다
  - `/memos/new`가 404다
  - 기존 메모 상세는 열린다
  - `쓰기`로 되돌리면 버튼이 돌아온다
  - 읽기 상태에서 액션 직접 호출이 거부되는지는, 가능하면 Playwright로 쓰기 상태에서 열어 둔 편집 폼을 권한을 바꾼 뒤 제출해서 확인한다. 안 되면 unverified로 남긴다.
  - 확인 후 권한을 `쓰기`로 되돌린다

- [ ] **Step 6: Commit**

```bash
git add "src/app/(modules)/memos"
git commit -m "feat: 메모 메뉴에 읽기 전용 권한 시범 적용"
```

---

### Task 9: 최종 검증 + 문서

**Files:**
- Modify: `docs/DEPLOYMENT.md`, `README.md`

- [ ] **Step 1: 전체 확인**

- Run: `npx tsc --noEmit && npm run test && npm run build`
- Run: `git diff --name-only master...HEAD`의 ts/tsx/cjs/mjs 파일에 `npx eslint`를 실행한다.
- Expected: 전부 성공, lint 에러 0

- [ ] **Step 2: spec §1 성공 기준 6개를 수동으로 재확인한다.** Task 4~8의 수동 확인을 한 번에 다시 돈다. 바꾼 데이터는 되돌린다.

- [ ] **Step 3: 문서**

- `DEPLOYMENT.md`에 2단계 배포 순서를 추가한다: `prisma db push` → `npm run menus:seed`
- 시드 전에 배포하면 사이드바가 빈다는 점을 적는다.
- `middleware.ts`가 `proxy.ts`로 바뀐 점을 적는다.
- README "주요 기능"의 시스템관리 줄에 메뉴관리와 메뉴별 권한(숨김/읽기/쓰기, 메모 시범 적용)을 추가한다.
- 커밋 메시지: `docs: 메뉴관리·권한관리 배포 절차와 README 반영`
