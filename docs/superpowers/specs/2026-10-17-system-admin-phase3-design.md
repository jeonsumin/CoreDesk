# 시스템관리 3단계 — 드라이브 폴더 접근권한 설계

- 작성일: 2026-10-17
- 선행: 1단계(역할 4종 `ADMIN/MANAGER/MEMBER/VIEWER`, `User.isActive`), 2단계(메뉴별 `NONE/READ/WRITE`, `getMenuAccess`, `requireMenuWrite`)
- 브랜치: `feature/system-admin-phase3` (phase2 위)

## 1. 목표

현재 드라이브는 완전 개인용(조회·수정 모두 `ownerId`/`uploaderId === 본인`)이다.
루트 폴더 생성 시 "나만 보기 / 역할별 공유"를 선택해 다른 역할에게 폴더를 공유할 수 있게 한다.

결정 사항:

| 항목 | 결정 |
|---|---|
| 공유 범위 | 개인 + 공유 혼합. 기본 비공개 |
| 권한 단위 | 역할(`MANAGER/MEMBER/VIEWER`) × `NONE/READ/WRITE` |
| 상속 | 루트 폴더에만 설정, 하위 폴더·파일은 루트 권한을 그대로 따름 |
| 쓰기 의미 | 업로드·하위 폴더 생성. 수정·삭제는 본인이 만든 것만 (루트 소유자·ADMIN은 전부) |
| 화면 | 드라이브 루트에 "내 폴더" / "공유 폴더" 두 섹션 |
| 구현 | 권한 테이블 + `DriveFolder.rootId` |

## 2. 데이터 모델

```prisma
model DriveFolder {
  // 기존 필드 유지
  rootId      String?                 // 루트면 null, 하위면 최상위 폴더 id
  permissions DriveFolderPermission[]
  @@index([rootId])
}

model DriveFolderPermission {
  folderId String      // 항상 루트 폴더 id
  role     Role        // MANAGER | MEMBER | VIEWER (ADMIN 행은 저장하지 않음)
  access   MenuAccess  // 2단계 enum 재사용
  folder   DriveFolder @relation(fields: [folderId], references: [id], onDelete: Cascade)
  @@id([folderId, role])
}
```

- 폴더의 루트 = `rootId ?? id`.
- 하위 폴더 생성 시 `rootId = parent.rootId ?? parent.id`. 폴더 이동 기능이 없으므로 `rootId`는 불변.
- 권한 행이 하나도 없거나 전부 `NONE`인 루트 = 비공개. `NONE` 행은 저장하지 않는다.
- 기존 데이터: `npm run drive:backfill-root` 스크립트가 하위 폴더의 `rootId`를 채운다(멱등). 권한 행이 없으므로 기존 폴더는 모두 비공개 유지.
- 루트 직속 파일(`folderId = null`)은 업로더 본인만 접근.
- 포트폴리오에 연결된 폴더(`portfolio != null`)는 권한 설정 대상이 아니다(항상 비공개).

## 3. 권한 판정 — `src/lib/drive/access.ts` (순수 함수)

```ts
folderAccess(input: {
  userId: string
  role: Role
  menuAccess: MenuAccess      // getMenuAccess('/drive')
  rootOwnerId: string
  rolePerm: MenuAccess | null // 루트의 해당 역할 권한 행
}): MenuAccess
```

1. `role === 'ADMIN'` → `menuAccess`
2. `userId === rootOwnerId` → `menuAccess`
3. 그 외 → `min(menuAccess, rolePerm ?? 'NONE')` (`NONE < READ < WRITE`)

```ts
canModifyItem(input: {
  access: MenuAccess
  userId: string
  role: Role
  creatorId: string     // 폴더 ownerId / 파일 uploaderId
  rootOwnerId: string
}): boolean
```

`access === 'WRITE'` 그리고 (`creatorId === userId` 또는 `rootOwnerId === userId` 또는 `role === 'ADMIN'`).

```ts
canManageRoot(input: { userId: string; role: Role; rootOwnerId: string; isPortfolio: boolean }): boolean
```

`!isPortfolio` 그리고 (`rootOwnerId === userId` 또는 `role === 'ADMIN'`). 권한 설정·루트 폴더 삭제에 사용.

판정 `NONE` → 존재를 노출하지 않는다(액션은 "찾을 수 없습니다", 페이지는 `notFound()`, API는 404).

## 4. 서버

### 4.1 공통 로더 — `src/lib/drive/context.ts`

`getFolderContext(folderId: string, user: DbSessionUser): Promise<FolderContext | null>`

- 폴더 + 루트(+ 해당 역할 권한 행, 포트폴리오 여부)를 조회하고 `folderAccess` 계산.
- 폴더 없음 또는 `access === 'NONE'` → `null`.
- 반환: `{ folder, root, access, isPortfolio }`.
- 사용자는 `getCurrentDbUser()`(DB 기준, 비활성 차단) 결과를 받는다.

### 4.2 액션 — `drive/_actions/drive.ts`

모든 액션 첫 줄: `await requireMenuWrite('/drive')` (메모 시범과 동일), 그다음 `getCurrentDbUser()`.

| 액션 | 규칙 |
|---|---|
| `createFolder(name, parentId, perms?)` | `parentId` 없음 → 내 루트 폴더 생성, `perms` 있으면 권한 행 함께 생성(트랜잭션). `parentId` 있음 → `getFolderContext` 후 `access === 'WRITE'` 필요, `ownerId = 본인`, `rootId` 설정, `perms` 무시 |
| 중복 이름 | 루트: 같은 소유자의 루트 중 중복 금지(현행). 하위: 같은 `parentId` 내 중복 금지(소유자 무관) |
| `renameFolder(id, name)` | `canModifyItem` |
| `deleteFolder(id)` | 루트 → `canManageRoot`, 하위 → `canModifyItem`. 비어 있어야 삭제(현행 유지) |
| `setFolderPermissions(rootId, perms)` **신규** | 루트만, `canManageRoot`. 트랜잭션으로 기존 행 삭제 후 `NONE` 아닌 행만 생성 |
| `uploadFile(formData)` | `folderId` 없음 → 내 루트, 있음 → `access === 'WRITE'` |
| `renameFile` / `deleteFile` | `canModifyItem` (creator = `uploaderId`). 루트 직속 파일은 업로더 본인만 |

`perms` 검증 — `src/lib/drive/permission-schema.ts`:

```ts
folderPermsSchema = z.array(z.object({
  role: z.enum(['MANAGER', 'MEMBER', 'VIEWER']),
  access: z.enum(['NONE', 'READ', 'WRITE']),
})).max(3)  // role 중복 거부
```

### 4.3 API — `GET /api/drive/[id]`

- `/api`는 proxy를 거치지 않으므로 직접 확인: `getCurrentDbUser()` 없음 → 401, `getMenuAccess('/drive') === 'NONE'` → 404.
- `folderId` 없음 → 업로더 본인만, 그 외 404.
- `folderId` 있음 → `getFolderContext` 가 `null` 이면 404.
- `/api/portfolio/images/[id]`는 범위 밖(포트폴리오 권한을 따름).

## 5. 화면

### 5.1 드라이브 페이지 `drive/page.tsx`

- **루트** (`folderId` 없음):
  - "내 폴더": 내 루트 폴더 + 내 루트 직속 파일 (현행 쿼리).
  - "공유 폴더": `rootId = null`, `ownerId ≠ 본인`, 내 역할 권한 행이 `READ/WRITE` 인 폴더. ADMIN은 권한 행이 하나라도 있는 남의 루트 전부. 소유자 이름순. 메뉴 권한 `NONE` 이면 페이지 자체가 proxy에서 404.
  - 공유 폴더 0개면 섹션 숨김.
- **하위** (`folderId` 있음): `getFolderContext` → `null` 이면 `notFound()`. 폴더·파일 목록은 소유자 조건 없이 `parentId`/`folderId` 로만 조회.
- 업로드·새 폴더 버튼: 루트에서는 `menuAccess === 'WRITE'`, 하위에서는 `access === 'WRITE'` 일 때만 표시.
- 브레드크럼: 현행 유지(루트까지 거슬러 올라감, 루트를 볼 수 있으면 하위도 볼 수 있음).

### 5.2 컴포넌트

- `FolderPermissionFields` (신규, client): 라디오 `나만 보기`(기본) / `공유`. `공유` 선택 시 MANAGER·MEMBER·VIEWER 각 행에 `숨김/읽기/쓰기` Select, 기본값 `읽기`.
- `DriveHeader` 새 폴더 다이얼로그: 루트에서만 `FolderPermissionFields` 표시. 하위에서는 "상위 폴더 권한을 따릅니다" 문구.
- `FolderCard`:
  - props에 서버 계산값 `canEdit`, `canManage`, `badge` 추가. 권한 행 원본은 클라이언트에 보내지 않는다.
  - `canManage` → 드롭다운에 "권한 설정" → 같은 필드 컴포넌트 다이얼로그 → `setFolderPermissions`.
  - `canEdit` 거짓이면 이름 변경 메뉴 숨김. 삭제는 루트면 `canManage`, 하위면 `canEdit`.
  - 배지: 내 공유 루트 → `공유`; 남의 루트 → `소유자명` + `읽기`/`쓰기`.
- `FileCard`: `canEdit` 기준으로 이름 변경·삭제 숨김.

## 6. 테스트 (TDD, `tests/*.test.cjs`)

- `folderAccess`: ADMIN, 소유자, 역할 행 없음(NONE), 메뉴 READ + 폴더 WRITE → READ, 메뉴 WRITE + 폴더 READ → READ.
- `canModifyItem`: 남의 파일 + WRITE → false, 내 파일 + WRITE → true, 루트 소유자 → true, READ → false.
- `canManageRoot`: 포트폴리오 폴더 → false, ADMIN → true, 비소유자 → false.
- `folderPermsSchema`: ADMIN 역할 거부, 역할 중복 거부, 잘못된 access 거부.
- 수동 확인: VIEWER가 `NONE` 폴더 파일을 `/api/drive/[id]` 로 요청 → 404.

## 7. 배포

1. 대상 DB에 `npx prisma db push` (새 테이블·컬럼).
2. `npm run drive:backfill-root` (개발 체크아웃 또는 CI에서 실행, 2단계 시드와 동일한 이유).
3. 순서를 어기면: `rootId` 미설정 하위 폴더는 자신을 루트로 판정 → 비공개로 동작(소유자만 접근). 데이터 손실·노출 없음.

`docs/DEPLOYMENT.md`, `README.md` 에 반영.

## 8. 범위 밖

사용자 단위 공유, 하위 폴더 권한 덮어쓰기, 폴더 이동, 감사 로그, 프로젝트 탭 ↔ 드라이브 연동, 포트폴리오 이미지 API.
