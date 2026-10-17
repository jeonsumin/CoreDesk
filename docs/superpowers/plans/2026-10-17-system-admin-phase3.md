# 시스템관리 3단계 — 드라이브 폴더 접근권한 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 드라이브 루트 폴더를 역할별(`MANAGER/MEMBER/VIEWER` × `NONE/READ/WRITE`)로 공유하고, 하위 폴더·파일은 루트 권한을 상속한다.

**Architecture:** `DriveFolderPermission` 테이블 + `DriveFolder.rootId`. 권한 판정은 `src/lib/drive/access.ts` 순수 함수, DB 조회는 `src/lib/drive/context.ts` 한 곳. 액션·API·페이지는 모두 이 둘을 거친다.

**Tech Stack:** Next.js 16 App Router, Prisma 6 (MySQL, `db push`), Zod 3, shadcn/ui(base-ui), node:test + ts-node.

**Spec:** `docs/superpowers/specs/2026-10-17-system-admin-phase3-design.md`

## Global Constraints

- `any` 금지. TDD: 순수 함수는 테스트 먼저.
- 테스트: `tests/*.test.cjs`, 상단 `require('./_ts.cjs')`, `npm test`. 테스트 대상 파일은 prisma/next를 import하지 않는다.
- DB 명령(`prisma db push` 등)은 로컬 docker DB(`mysql://coredesk:coredesk@127.0.0.1:3306/coredesk`)에만. 호스트 `.env`의 `DATABASE_URL`로 실행 금지.
- 커밋은 파일을 명시해서 `git add`. `package-lock.json`, `PROJECT.md`, `graphify-out/`, `.playwright-mcp/` 스테이징 금지.
- 2단계 상수 재사용: `MENU_ACCESS`, `MenuAccessValue`, `PERMISSION_ROLES`, `PermissionRole`, `ACCESS_LABELS` (`src/lib/menu/menu-schema.ts`). 사용자: `getCurrentDbUser()`, `DbSessionUser` (`src/lib/admin.ts`). 메뉴: `getMenuAccess(path)`, `requireMenuWrite(path)` (`src/lib/menu/access.ts`).
- 권한 없음은 존재 비노출: 액션 `'폴더를 찾을 수 없습니다'`/`'파일을 찾을 수 없습니다'`, 페이지 `notFound()`, API 404.
- 클라이언트에는 권한 행 원본을 보내지 않고 서버 계산값(`canEdit`, `canManage`, 배지 문자열)만 보낸다.
- UI는 `DESIGN.md`와 기존 drive 컴포넌트 스타일을 따른다. 쓰기 불가 버튼은 숨김(에러 문구 노출 안 함).
- 검증 게이트: `npm test`, `npx tsc --noEmit`(stale `.next/types` 에러면 `npm run build` 후 재확인), 변경 파일 대상 `npx eslint <files>`.

## Review Focus

1. 존재하지 않거나 권한 없는 `?folderId=` → 크래시 없이 404 (Task 5 수동 확인).
2. READ 권한자가 `uploadFile`/`createFolder`를 직접 호출 → 거부 (Task 3 테스트 대상 `canWriteInto`).
3. `perms`에 같은 역할 중복·`ADMIN` 역할 → 거부 (Task 2 스키마 테스트).
4. 포트폴리오 폴더 권한 설정 → 거부 (Task 2 `canManageRoot` 테스트).
5. `rootId` 백필 전 하위 폴더 → 자기 자신을 루트로 판정해 비공개 (Task 1 `computeRootIds` 테스트 + spec 7.3).

---

### Task 1: 스키마 + rootId 백필

**Files:**
- Modify: `prisma/schema.prisma` (`DriveFolder`, `Role`/`MenuAccess` 재사용)
- Create: `src/lib/drive/root.ts`, `prisma/backfill-drive-root.ts`
- Modify: `package.json` (scripts)
- Test: `tests/drive-root.test.cjs`

**Interfaces:**
- Produces: `computeRootIds(folders: { id: string; parentId: string | null }[]): Map<string, string | null>` — 각 폴더 id → rootId(루트면 null). 부모를 못 찾는 고아는 null. 순환은 null로 처리(무한루프 금지).
- Produces: Prisma `DriveFolder.rootId String?` + `@@index([rootId])`, `DriveFolder.permissions DriveFolderPermission[]`, 모델 `DriveFolderPermission { folderId, role Role, access MenuAccess, @@id([folderId, role]), onDelete: Cascade }`.
- Produces: `npm run drive:backfill-root` (`menus:seed`와 같은 ts-node 형식).

- [ ] **Step 1: 실패 테스트**

```js
const { computeRootIds } = require('../src/lib/drive/root.ts')
test('루트는 null', () => assert.equal(computeRootIds([{ id: 'a', parentId: null }]).get('a'), null))
test('손자는 최상위', () => {
  const r = computeRootIds([{ id: 'a', parentId: null }, { id: 'b', parentId: 'a' }, { id: 'c', parentId: 'b' }])
  assert.equal(r.get('b'), 'a'); assert.equal(r.get('c'), 'a')
})
test('부모 누락 고아는 null', () => assert.equal(computeRootIds([{ id: 'x', parentId: 'gone' }]).get('x'), null))
test('순환은 null', () => {
  const r = computeRootIds([{ id: 'p', parentId: 'q' }, { id: 'q', parentId: 'p' }])
  assert.equal(r.get('p'), null)
})
```

- [ ] **Step 2:** `npm test` → `drive-root` FAIL.
- [ ] **Step 3:** `computeRootIds` 구현. 스키마 수정. `prisma/backfill-drive-root.ts`: 전체 폴더 `{id,parentId,rootId}` 조회 → `computeRootIds` → 값이 다른 행만 update, 변경 수 출력(멱등). `package.json`에 `"drive:backfill-root"` 추가.
- [ ] **Step 4:** `npm test` PASS. 로컬 docker DB에 `DATABASE_URL=mysql://coredesk:coredesk@127.0.0.1:3306/coredesk npx prisma db push`, 이어서 같은 URL로 `npm run drive:backfill-root` 두 번 실행 → 두 번째 "0" 변경.
- [ ] **Step 5:** 커밋 `feat: 드라이브 폴더 권한 스키마와 rootId 백필`

### Task 2: 권한 판정 순수 함수 + 권한 스키마

**Files:**
- Create: `src/lib/drive/access.ts`, `src/lib/drive/permission-schema.ts`
- Test: `tests/drive-access.test.cjs`

**Interfaces:**
- Consumes: `MenuAccessValue`, `PermissionRole`, `MENU_ACCESS`, `PERMISSION_ROLES`.
- Produces (`access.ts`, `Role = 'ADMIN' | 'MANAGER' | 'MEMBER' | 'VIEWER'` 문자열 타입 사용, prisma import 금지):
  - `folderAccess(i: { userId: string; role: Role; menuAccess: MenuAccessValue; rootOwnerId: string; rolePerm: MenuAccessValue | null }): MenuAccessValue`
  - `canModifyItem(i: { access: MenuAccessValue; userId: string; role: Role; creatorId: string; rootOwnerId: string }): boolean`
  - `canManageRoot(i: { userId: string; role: Role; rootOwnerId: string; isPortfolio: boolean }): boolean`
  - `canWriteInto(access: MenuAccessValue): boolean` — `access === 'WRITE'`
- Produces (`permission-schema.ts`):
  - `folderPermsSchema` — `z.array(z.object({ role: z.enum(PERMISSION_ROLES), access: z.enum(MENU_ACCESS) })).max(3)` + 역할 중복 `refine` (메시지 `'역할이 중복되었습니다'`)
  - `type FolderPerms = z.infer<typeof folderPermsSchema>`

- [ ] **Step 1: 실패 테스트** (spec 3절 + 6절 값 그대로)

```js
const base = { userId: 'u', rootOwnerId: 'o' }
test('ADMIN은 메뉴권한', () => assert.equal(folderAccess({ ...base, role: 'ADMIN', menuAccess: 'WRITE', rolePerm: null }), 'WRITE'))
test('소유자는 메뉴권한', () => assert.equal(folderAccess({ ...base, rootOwnerId: 'u', role: 'VIEWER', menuAccess: 'READ', rolePerm: null }), 'READ'))
test('행 없으면 NONE', () => assert.equal(folderAccess({ ...base, role: 'MEMBER', menuAccess: 'WRITE', rolePerm: null }), 'NONE'))
test('메뉴 READ + 폴더 WRITE → READ', () => assert.equal(folderAccess({ ...base, role: 'MEMBER', menuAccess: 'READ', rolePerm: 'WRITE' }), 'READ'))
test('메뉴 WRITE + 폴더 READ → READ', () => assert.equal(folderAccess({ ...base, role: 'MEMBER', menuAccess: 'WRITE', rolePerm: 'READ' }), 'READ'))
const mod = { userId: 'u', role: 'MEMBER', rootOwnerId: 'o' }
test('남의 항목 + WRITE → false', () => assert.equal(canModifyItem({ ...mod, access: 'WRITE', creatorId: 'x' }), false))
test('내 항목 + WRITE → true', () => assert.equal(canModifyItem({ ...mod, access: 'WRITE', creatorId: 'u' }), true))
test('루트 소유자 → true', () => assert.equal(canModifyItem({ ...mod, rootOwnerId: 'u', access: 'WRITE', creatorId: 'x' }), true))
test('ADMIN → true', () => assert.equal(canModifyItem({ ...mod, role: 'ADMIN', access: 'WRITE', creatorId: 'x' }), true))
test('READ → false', () => assert.equal(canModifyItem({ ...mod, access: 'READ', creatorId: 'u' }), false))
test('포트폴리오 → false', () => assert.equal(canManageRoot({ userId: 'u', role: 'ADMIN', rootOwnerId: 'u', isPortfolio: true }), false))
test('ADMIN → true', () => assert.equal(canManageRoot({ userId: 'u', role: 'ADMIN', rootOwnerId: 'o', isPortfolio: false }), true))
test('비소유자 → false', () => assert.equal(canManageRoot({ userId: 'u', role: 'MANAGER', rootOwnerId: 'o', isPortfolio: false }), false))
test('READ는 쓰기 불가', () => assert.equal(canWriteInto('READ'), false))
test('ADMIN 역할 거부', () => assert.equal(folderPermsSchema.safeParse([{ role: 'ADMIN', access: 'READ' }]).success, false))
test('역할 중복 거부', () => assert.equal(folderPermsSchema.safeParse([{ role: 'MEMBER', access: 'READ' }, { role: 'MEMBER', access: 'WRITE' }]).success, false))
test('잘못된 access 거부', () => assert.equal(folderPermsSchema.safeParse([{ role: 'MEMBER', access: 'ALL' }]).success, false))
test('빈 배열 허용(비공개)', () => assert.equal(folderPermsSchema.safeParse([]).success, true))
```

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** 구현. `min`은 `MENU_ACCESS.indexOf` 비교.
- [ ] **Step 4:** `npm test` PASS.
- [ ] **Step 5:** 커밋 `feat: 드라이브 폴더 권한 판정 함수`

### Task 3: 컨텍스트 로더 + 서버 액션

**Files:**
- Create: `src/lib/drive/context.ts`
- Modify: `src/app/(modules)/drive/_actions/drive.ts` (전 액션)

**Interfaces:**
- Consumes: Task 1 스키마, Task 2 전 함수, `getCurrentDbUser`, `getMenuAccess`, `requireMenuWrite`.
- Produces (`context.ts`):
  - `type FolderContext = { folder: DriveFolder; root: DriveFolder; access: MenuAccessValue; isPortfolio: boolean }`
  - `getFolderContext(folderId: string, user: DbSessionUser, menuAccess: MenuAccessValue): Promise<FolderContext | null>` — 폴더 조회 → `rootId ?? id`로 루트 조회(`permissions: { where: { role: user.role } }`, `portfolio: { select: { id: true } }`) → `folderAccess`. 없음/`NONE` → `null`. 폴더가 루트면 조회 1번으로 끝낸다.
- Produces (actions): 기존 시그니처 유지 + `createFolder(name: string, parentId: string | null, perms?: FolderPerms)`, 신규 `setFolderPermissions(rootId: string, perms: FolderPerms): Promise<ActionResult>`.

- [ ] **Step 1:** `context.ts` 구현.
- [ ] **Step 2:** 액션 공통 머리: `await requireMenuWrite('/drive')` → `const user = await getCurrentDbUser()`; 없으면 `'로그인이 필요합니다'`. `menuAccess`는 `requireMenuWrite` 통과 시 `'WRITE'`로 고정 전달.
- [ ] **Step 3:** spec 4.2 표대로 각 액션 수정:
  - `createFolder`: 루트면 `perms` → `folderPermsSchema` 검증 후 `$transaction`으로 폴더 + `NONE` 아닌 권한 행 생성. 하위면 `getFolderContext(parentId)` + `canWriteInto`, 실패 시 `'상위 폴더를 찾을 수 없습니다'`(READ도 동일 문구), `rootId = parent.rootId ?? parent.id`. 중복 검사: 루트는 `{ ownerId: user.id, parentId: null, name }`, 하위는 `{ parentId, name }`.
  - `renameFolder`: ctx + `canModifyItem({ creatorId: folder.ownerId, rootOwnerId: root.ownerId })`. 실패 시 ctx 없음이면 `'폴더를 찾을 수 없습니다'`, 있는데 불가면 `'권한이 없습니다'`.
  - `deleteFolder`: 루트면 `canManageRoot`(포트폴리오면 false → 현행처럼 비어있지 않음 규칙 이전에 `'권한이 없습니다'`), 하위면 `canModifyItem`. 비어있어야 삭제 유지.
  - `setFolderPermissions`: ctx, `ctx.folder.rootId === null` 아니면 거부, `canManageRoot`, `folderPermsSchema`, `$transaction([deleteMany, createMany(NONE 제외)])`.
  - `uploadFile`: `folderId` 있으면 ctx + `canWriteInto`, 실패 `'업로드할 폴더를 찾을 수 없습니다'`.
  - `renameFile`/`deleteFile`: `folderId` null → `uploaderId === user.id`만. 아니면 ctx + `canModifyItem({ creatorId: file.uploaderId })`.
  - 모든 성공 경로 `revalidatePath('/drive')` 유지.
- [ ] **Step 4:** `npx tsc --noEmit`, `npx eslint src/lib/drive src/app/(modules)/drive/_actions`, `npm test` 통과.
- [ ] **Step 5:** 커밋 `feat: 드라이브 액션에 폴더 권한 적용`

### Task 4: 파일 API 권한

**Files:**
- Modify: `src/app/api/drive/[id]/route.ts`

**Interfaces:**
- Consumes: `getCurrentDbUser`, `getMenuAccess`, `getFolderContext`.

- [ ] **Step 1:** `auth()` → `getCurrentDbUser()`(null → 401). `const menuAccess = await getMenuAccess('/drive')`; `'NONE'` → 404. `file.folderId` null → `uploaderId === user.id` 아니면 404. 있으면 `getFolderContext(file.folderId, user, menuAccess)` null → 404. 나머지 응답 로직 불변.
- [ ] **Step 2:** `npx tsc --noEmit`, eslint 통과.
- [ ] **Step 3:** 커밋 `fix: 드라이브 파일 API에 메뉴·폴더 권한 적용`

### Task 5: 드라이브 화면

**Files:**
- Create: `src/app/(modules)/drive/_components/FolderPermissionFields.tsx`, `src/app/(modules)/drive/_components/FolderPermissionDialog.tsx`
- Modify: `src/app/(modules)/drive/page.tsx`, `_components/DriveHeader.tsx`, `_components/DriveGrid.tsx`, `_components/FolderCard.tsx`, `_components/FileCard.tsx`, `src/types/index.ts`

**Interfaces:**
- Consumes: Task 2·3 함수, `ACCESS_LABELS`, `PERMISSION_ROLES`.
- Produces:
  - `src/types/index.ts`: `DriveFolderItem = DriveFolderWithCount & { canEdit: boolean; canManage: boolean; badge: string | null; perms: FolderPerms | null }` (`perms`는 `canManage`일 때만 채움 — 권한 설정 다이얼로그 초깃값), `DriveFileItem = DriveFile & { uploader: Pick<User, 'id' | 'name'>; canEdit: boolean }`. `uploader`는 `select { id, name }`으로 좁힌다(비밀번호 해시 비노출, 1단계 규칙). `FileCard`/`PreviewModal`/`DriveGrid`의 `DriveFileWithUploader` 사용처를 `DriveFileItem`으로 교체(포트폴리오 등 다른 사용처가 없으면 `DriveFileWithUploader` 삭제).
  - `FolderPermissionFields({ value: FolderPerms; onChange(v: FolderPerms): void })` — 라디오 `나만 보기`/`공유`; `공유` 전환 시 3역할 `READ` 기본, `나만 보기` 전환 시 `[]`.
  - `FolderPermissionDialog({ folderId, initial: FolderPerms, open, onOpenChange })` → `setFolderPermissions`, 결과 toast.
  - `DriveHeader({ folderId, canWrite: boolean })` — `canWrite` false면 업로드·새 폴더·드롭 영역 비활성(렌더 안 함). 루트 다이얼로그에 `FolderPermissionFields`(초기 `[]`), 하위에선 `'상위 폴더 권한을 따릅니다'`.
  - `DriveGrid({ files: DriveFileItem[]; folders: DriveFolderItem[]; sharedFolders?: DriveFolderItem[]; canWrite: boolean })` — `sharedFolders` 길이 > 0이면 `'내 폴더'`/`'공유 폴더'` 섹션 제목. 빈 상태 업로드 CTA는 `canWrite`일 때만.
- [ ] **Step 1:** 페이지 서버 로직:
  - `user = await getCurrentDbUser()`(없으면 `redirect('/login')`), `menuAccess = await getMenuAccess('/drive')`.
  - 루트: 내 폴더(`ownerId: user.id, parentId: null`) + 내 루트 파일 + 공유 폴더(`rootId: null`(=parentId null), `ownerId: { not: user.id }`, 비ADMIN은 `permissions: { some: { role: user.role, access: { in: ['READ','WRITE'] } } }`, ADMIN은 `permissions: { some: {} }`; `include owner select name`; 메뉴 READ면 배지 권한 min 적용). `canWrite = menuAccess === 'WRITE'`.
  - 하위: `getFolderContext` null → `notFound()`. 폴더 `{ parentId: folderId }`, 파일 `{ folderId }`. `canWrite = canWriteInto(ctx.access)`.
  - 항목별 `canEdit`/`canManage`/`badge`를 Task 2 함수로 계산해 매핑.
- [ ] **Step 2:** 컴포넌트 구현. `FolderCard` 드롭다운: `canManage` → `'권한 설정'`; 이름변경 `canEdit`; 삭제 = 루트면 `canManage`, 하위면 `canEdit`; 표시할 항목 없으면 드롭다운 자체 숨김. 배지: 내 공유 루트 `'공유'`, 남의 루트 `'${소유자명} · 읽기|쓰기'`. `FileCard`: `canEdit` false면 이름변경·삭제 숨김.
- [ ] **Step 3:** `npm run build`, `npx tsc --noEmit`, 변경 파일 eslint, `npm test`.
- [ ] **Step 4:** 수동 확인(docker compose, 로컬 DB): ADMIN이 루트 폴더를 `MEMBER: 쓰기, VIEWER: 읽기`로 생성 → MEMBER 로그인 시 공유 섹션에 보이고 업로드 가능, 남의 파일 메뉴 숨김 → VIEWER는 읽기만, 업로드 버튼 없음 → MANAGER는 공유 섹션에 안 보임, `?folderId=<그 폴더>` 직접 접근 404, `/api/drive/<파일id>` 404 → 존재하지 않는 `?folderId=xxx` 404.
- [ ] **Step 5:** 커밋 `feat: 드라이브 공유 폴더 화면과 권한 설정 폼`

### Task 6: 문서

**Files:**
- Modify: `docs/DEPLOYMENT.md` (77–83행 `menus:seed` 절 다음), `README.md` (2단계 시스템관리 절)

- [ ] **Step 1:** DEPLOYMENT.md: 3단계 절차 — `npx prisma db push` → `DATABASE_URL="<대상 DB URL>" npm run drive:backfill-root`(개발 체크아웃/CI, 멱등). 순서 어기면 하위 폴더가 비공개로 동작(노출 없음). README: 드라이브 폴더 공유 한 단락(루트 폴더만, 역할별, 메뉴 권한과 낮은 쪽 적용).
- [ ] **Step 2:** 커밋 `docs: 드라이브 폴더 권한 배포 절차`
