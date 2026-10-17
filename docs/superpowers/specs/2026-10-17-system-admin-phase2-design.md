# 시스템관리 2단계 설계: 메뉴관리 + 메뉴별 권한관리

- 작성일: 2026-10-17
- 상태: 리뷰 대기
- 선행: 1단계 (`2026-10-17-system-admin-phase1-design.md`, 브랜치 `feature/system-admin-phase1`)
- 범위 조정: 1단계 spec에서는 메뉴별 권한이 3단계였는데, 이 2단계로 당겨 온다. 3단계에는 드라이브 폴더 권한만 남는다.

## 1. 목적

사이드바 메뉴를 코드(`src/config/nav.ts`)가 아니라 DB로 관리한다. ADMIN이 메뉴를 추가, 수정, 삭제하고 순서를 바꾼다. 메뉴마다 역할별로 `숨김 / 읽기 / 쓰기` 권한을 설정한다. 메뉴가 가리키는 페이지 콘텐츠는 별도로 추가 개발하며, 이번 작업 범위가 아니다.

### 성공 기준

- ADMIN은 `/system/menus`에서 메뉴를 생성, 조회, 수정, 삭제하고 순서를 바꿀 수 있으며, 결과가 사이드바에 반영된다.
- ADMIN은 `/system/permissions`에서 메뉴×역할 권한을 바꿀 수 있고, 바꾸는 즉시 저장된다.
- 역할이 `숨김`인 메뉴는 그 역할의 사이드바에 나타나지 않는다. URL로 직접 들어와도 404가 나고, 그 메뉴 경로의 Server Action도 차단된다.
- 메모 메뉴가 `읽기`인 역할은 메모를 조회만 할 수 있다. 생성, 수정, 삭제 버튼이 보이지 않고, 해당 액션을 직접 호출해도 거부된다.
- 로그인한 상태에서 비활성화된 사용자는 다음 요청(페이지 이동 또는 액션) 때 바로 로그아웃된다. 1단계에 남아 있던 최대 1시간 문제를 해결한다.
- 시드를 실행한 직후 기존 사용자가 보는 화면과 권한은 지금과 같다.

## 2. 확정된 결정

| 항목 | 결정 |
| --- | --- |
| 메뉴 "생성"의 의미 | 이미 있는 내부 경로, 외부 링크, 그룹을 사이드바에 추가한다. 페이지를 자동으로 만들지는 않는다 |
| 페이지가 아직 없는 메뉴 | `준비중` 상태로 만든다. 사이드바에 회색 "예정"으로 보이고 클릭되지 않는다 |
| 권한 단위 | 메뉴 × 시스템 역할(`MANAGER`, `MEMBER`, `VIEWER`) → `NONE / READ / WRITE` |
| ADMIN | 모든 메뉴에서 항상 `WRITE`이며 저장하지 않는다. 시스템관리 그룹은 ADMIN 전용으로 고정한다 |
| 읽기 전용 적용 범위 | 공통 헬퍼를 만들고 메모 모듈에 시범 적용한다. 나머지 기존 모듈은 이후 하나씩 적용한다 |
| URL 차단 위치 | `src/proxy.ts`. Next 16에서는 Node 런타임으로만 동작하므로 Prisma를 쓸 수 있다 |

## 3. 데이터 모델

```prisma
enum MenuType   { GROUP PAGE LINK }
enum MenuStatus { ACTIVE PREPARING }
enum MenuAccess { NONE READ WRITE }

model Menu {
  id        String     @id @default(cuid())
  title     String
  type      MenuType
  path      String?    @unique
  icon      String
  parentId  String?
  sortOrder Int
  status    MenuStatus @default(ACTIVE)
  isSystem  Boolean    @default(false)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  parent      Menu?            @relation("MenuTree", fields: [parentId], references: [id])
  children    Menu[]           @relation("MenuTree")
  permissions MenuPermission[]
}

model MenuPermission {
  menuId String
  role   Role
  access MenuAccess
  menu   Menu @relation(fields: [menuId], references: [id], onDelete: Cascade)

  @@id([menuId, role])
}
```

- `path`의 의미는 유형마다 다르다.
  - `PAGE`: 내부 경로, 예: `/my-tasks`
  - `LINK`: `http(s)://` URL
  - `GROUP`: `null`
- 깊이는 1단계까지만이다. `GROUP` 아래에 `PAGE`나 `LINK`가 온다. 그룹 안에 그룹은 둘 수 없고, `parentId`는 `GROUP` 메뉴만 가리킬 수 있다.
- `GROUP`에는 권한 행이 없다. 보이는 하위 메뉴가 하나라도 있으면 그룹을 보여준다.
- 권한 행은 `MANAGER`, `MEMBER`, `VIEWER` 3개다. `ADMIN` 행은 만들지 않는다.
- `icon`은 `src/lib/menu/icons.ts`의 허용 목록 중 하나의 이름이다. 이 파일이 이름과 lucide 컴포넌트를 짝지어 둔다.

### 3.1 초기 데이터 (시드)

`prisma/seed.ts`에 몇 번을 실행해도 결과가 같은 upsert를 추가한다. upsert 키는 `path`다. 그룹은 시드 전용 고정 id를 쓴다.

| 메뉴 | 유형 | 경로 | 아이콘 | isSystem |
| --- | --- | --- | --- | --- |
| 대시보드 | PAGE | `/dashboard` | `LayoutDashboard` | false |
| 프로젝트 관리 | PAGE | `/projects` | `FolderKanban` | false |
| 포트폴리오 관리 | PAGE | `/portfolios` | `BriefcaseBusiness` | false |
| 메모 | PAGE | `/memos` | `NotepadText` | false |
| 드라이브 | PAGE | `/drive` | `HardDrive` | false |
| 시스템관리 | GROUP | — | `Settings` | true |
| └ 사용자관리 | PAGE | `/system/users` | `Users` | true |
| └ 메뉴관리 | PAGE | `/system/menus` | `Menu` | true |
| └ 권한관리 | PAGE | `/system/permissions` | `ShieldCheck` | true |

- 기존 메뉴 5개의 권한은 세 역할 모두 `WRITE`다. 지금과 동작이 같게 하기 위해서다.
- `isSystem` 메뉴의 권한은 세 역할 모두 `NONE`이다.
- 시드가 다시 실행돼도 ADMIN이 바꾼 제목, 순서, 권한을 덮어쓰지 않는다. upsert의 `update`는 비워 두고, 없을 때만 생성한다.
- `src/config/nav.ts`는 삭제한다.

## 4. 권한 판정

### 4.1 순수 함수 `src/lib/menu/resolve.ts`

```ts
type MenuNode = {
  id: string; type: 'GROUP' | 'PAGE' | 'LINK'; path: string | null
  isSystem: boolean; permissions: { role: RoleValue; access: 'NONE' | 'READ' | 'WRITE' }[]
}
resolveMenuAccess(menus: MenuNode[], role: RoleValue, pathname: string): 'NONE' | 'READ' | 'WRITE'
filterVisibleMenus(tree: MenuTreeNode[], role: RoleValue): MenuTreeNode[]
```

`resolveMenuAccess` 판정 순서:

1. `role === 'ADMIN'`이면 `WRITE`.
2. `PAGE` 메뉴 중 `pathname === path`이거나 `pathname`이 `path + '/'`로 시작하는 것을 고른다. 여러 개면 `path`가 가장 긴 것을 쓴다. 고를 게 없으면 `WRITE`. 메뉴에 등록되지 않은 경로는 허용한다.
3. 고른 메뉴가 `isSystem`이면 `NONE`.
4. 그 역할의 권한 행 값을 쓴다. 행이 없으면 `NONE`.

`filterVisibleMenus` 규칙:

- `PAGE`와 `LINK`는 그 역할의 권한이 `NONE`이 아닐 때만 남긴다. ADMIN은 전부 남긴다.
- 남은 하위 메뉴가 없는 `GROUP`은 제거한다.

### 4.2 `src/proxy.ts` (`src/middleware.ts`를 대체)

- Auth.js의 `auth()` 래퍼를 default export한다. 기존 matcher(`api`, `_next/static`, `_next/image`, `favicon.ico` 제외)와 기존 redirect 규칙은 그대로 둔다.
  - 비로그인 사용자가 보호 경로로 오면 `/login`으로 보낸다.
  - 로그인한 사용자가 `/login`으로 오면 `/dashboard`로 보낸다.
  - `/portfolio/` 공개 경로는 허용한다.
- 로그인한 사용자가 보호 경로로 오면 다음을 순서대로 한다.
  1. DB에서 `id`, `role`, `isActive`를 조회한다. 사용자가 없거나 비활성이면 `/api/logout`으로 redirect한다.
  2. `resolveMenuAccess(menus, role, pathname)`이 `NONE`이면 존재하지 않는 내부 경로로 rewrite한다. 그러면 not-found 페이지가 404 상태로 렌더링된다.
- Server Action 요청은 페이지 경로로 가는 POST이므로 proxy를 거친다. 따라서 위 1과 2가 액션에도 적용된다.
- 메뉴 목록은 `src/lib/menu/cache.ts`에 모듈 메모리 캐시로 둔다. TTL은 30초다.
  - 메뉴나 권한을 바꾸는 액션은 `invalidateMenuCache()`를 호출한다.
  - `// ponytail:` 주석을 단다. 인스턴스가 여러 개면 다른 인스턴스에는 최대 30초 늦게 반영된다. 필요해지면 DB의 version 컬럼 확인이나 pub/sub으로 바꾼다.
- 메뉴 조회와 사용자 조회는 Prisma Client(`src/lib/prisma.ts`)를 그대로 쓴다.

### 4.3 서버 헬퍼 `src/lib/menu/access.ts`

- `getMenuAccess(path: string): Promise<'NONE' | 'READ' | 'WRITE'>`: 현재 DB 사용자와 캐시된 메뉴로 판정한다. 사용자가 없으면 `NONE`.
- `requireMenuWrite(path: string): Promise<void>`: 결과가 `WRITE`가 아니면 `Error('Forbidden')`를 던진다.

## 5. 화면

시스템관리 하위 메뉴는 사용자관리, 메뉴관리, 권한관리이며 모두 시드로 들어간다. 모든 액션은 첫 줄에서 `requireAdmin()`을 호출한다(1단계 헬퍼).

### 5.1 사이드바

- `(modules)/layout.tsx`가 메뉴 트리를 조회하고, `filterVisibleMenus`로 거른 결과를 `Sidebar`에 넘긴다.
- `Sidebar`는 `@/config/nav`를 import하지 않고 넘겨받은 트리만 렌더링한다. 아이콘은 `icons.ts`로 찾는다.
- 정렬은 `sortOrder` 오름차순이다.
- `PREPARING` 메뉴는 기존의 "예정" 비활성 스타일로 그린다.
- `LINK` 메뉴는 `target="_blank" rel="noopener noreferrer"`로 연다.

### 5.2 메뉴관리 `/system/menus`

**목록**
- 사이드바 순서대로 보여주고, 하위 메뉴는 들여쓴다.
- 컬럼: 아이콘 / 이름 / 유형 / 경로 / 상태 / 순서 [↑][↓] / [수정] [삭제]
- 순서 변경: 같은 부모 안에서 이웃 메뉴와 `sortOrder`를 맞바꾼다. 처음과 끝에서는 해당 버튼을 숨긴다.
- `isSystem` 행에는 잠금 아이콘만 보이고 버튼은 없다.
- 빈 상태: "등록된 메뉴가 없습니다"와 [메뉴 추가]를 보여준다.

**생성·수정 Dialog** (react-hook-form + Zod, 클라이언트와 서버가 같은 스키마 `src/lib/menu/menu-schema.ts`를 쓴다)

| 필드 | 규칙 |
| --- | --- |
| 유형 | GROUP / PAGE / LINK. 수정할 때는 바꿀 수 없다 |
| 이름 | trim 후 1~30자 |
| 상위 그룹 | PAGE·LINK만 선택할 수 있고 비워 둘 수 있다. 후보는 `isSystem`이 아닌 GROUP |
| 경로 | PAGE: `/`로 시작하고 `//`로 시작하지 않으며 공백이 없고 끝에 `/`가 없다(루트 `/` 제외). LINK: `http:` 또는 `https:` 프로토콜의 유효한 URL. GROUP: 입력하지 않는다(`null`). 중복이면 "이미 사용 중인 경로입니다" |
| 아이콘 | `icons.ts` 허용 목록 Select |
| 상태 | 정상 / 준비중 |
| 기본 권한 | 생성할 때만 보인다. MANAGER·MEMBER·VIEWER 각각, 기본값 `WRITE` / `WRITE` / `READ`. GROUP이면 숨긴다 |

- 생성할 때 `sortOrder`는 같은 부모 안 최댓값 + 1이다.
- 수정할 때 부모가 바뀌면 새 부모 안에서 맨 뒤로 간다.
- 서버는 다음 경우를 거부한다: `isSystem` 메뉴를 대상으로 하는 생성·수정·삭제·정렬, `isSystem` 그룹을 부모로 지정하는 것, GROUP이 아닌 메뉴를 부모로 지정하는 것.

**삭제**
- 확인 Dialog를 거친다. 되돌릴 수 없으므로 즉시 반영 원칙의 예외다.
- `canDeleteMenu`가 하위 메뉴가 있으면 "하위 메뉴를 먼저 옮기거나 삭제하세요"로, `isSystem`이면 거부한다.
- 권한 행은 Cascade로 함께 삭제된다.

모든 변경 액션이 끝나면 `invalidateMenuCache()`를 호출하고 `revalidatePath('/', 'layout')`로 사이드바를 갱신한다.

### 5.3 권한관리 `/system/permissions`

- 행렬 표: 행은 `PAGE`·`LINK` 메뉴이고, 그룹은 헤더 행으로 묶는다. 열은 ADMIN / MANAGER / MEMBER / VIEWER다.
  - ADMIN 열은 "쓰기"로 고정되고 바꿀 수 없다.
  - `isSystem` 행은 모든 칸이 "ADMIN 전용"으로 잠긴다.
  - PAGE 칸은 `숨김 / 읽기 / 쓰기` Select이고, 바꾸는 즉시 `setMenuPermission(menuId, role, access)`가 실행된다. 확인 팝업은 없다.
  - LINK 칸은 `숨김 / 표시` Select다. 저장할 때 `표시`는 `READ`가 된다.
- 상단 안내: "읽기 전용은 현재 메모 메뉴에 적용되어 있으며, 다른 기존 메뉴는 순차 적용 예정입니다. 해당 메뉴에서 '읽기'는 '쓰기'와 같이 동작합니다."
- 서버는 다음 경우를 거부한다: `isSystem` 메뉴, GROUP 메뉴, ADMIN 역할, 허용되지 않은 access 값.
- 저장 후 `invalidateMenuCache()`와 `revalidatePath('/', 'layout')`를 호출한다.

### 5.4 메모 모듈 읽기 전용 시범 적용

- `src/app/(modules)/memos/_actions/*`의 생성·수정·삭제 Server Action 첫 줄에서 `requireMenuWrite('/memos')`를 호출한다.
- 메모 목록과 상세 페이지는 `getMenuAccess('/memos')`를 호출한다. 결과가 `WRITE`가 아니면 [새 메모], [수정], [삭제] 버튼을 렌더링하지 않는다. 권한 에러 문구는 보여주지 않는다(Viewer 규칙).
- 읽기 권한인 사용자가 `/memos/new`나 `/memos/[id]/edit` 같은 편집 경로로 직접 들어오면 `notFound()`를 호출한다.
- 프로젝트 상세의 메모 탭은 이번 시범 범위가 아니다. 프로젝트 모듈은 순차 적용 대상이다.

## 6. 테스트

TDD로 진행한다. `tests/*.test.cjs`(Node test runner + ts-node, 1단계 하네스).

| 대상 | 검증할 내용 |
| --- | --- |
| `resolveMenuAccess` | ADMIN은 항상 WRITE / 가장 긴 경로가 이긴다(`/system`과 `/system/users`) / 경로 구분 단위로 매칭한다(`/projectsx`는 `/projects`에 안 걸림) / 정확히 일치 / 일치하는 메뉴가 없으면 WRITE / isSystem은 비ADMIN에게 NONE / 권한 행이 없으면 NONE / GROUP·LINK는 매칭 대상이 아니다 |
| `filterVisibleMenus` | NONE인 메뉴 제거 / 하위가 모두 제거된 GROUP 제거 / ADMIN은 전부 보임 / 순서 유지 |
| 메뉴 Zod 스키마 | PAGE 경로 규칙(`//evil`, `http://x`, 끝 `/`, 공백 거부) / LINK의 `javascript:`·`data:` 거부, `https://` 허용 / GROUP 경로 무시·null / 이름 trim·길이 |
| `canDeleteMenu` | 하위가 있으면 거부 / isSystem이면 거부 / 그 외 허용 |

수동으로 확인할 것:
- 시드 후 기존 계정으로 본 사이드바와 페이지가 지금과 같다.
- ADMIN이 메뉴를 추가, 수정, 정렬, 삭제하면 사이드바에 반영된다.
- VIEWER에게 숨김으로 설정한 메뉴는 사이드바에 없고, URL로 들어가면 404다.
- 메모가 `읽기`인 계정에서는 버튼이 숨겨지고, 편집 URL은 404이며, 액션을 직접 호출하면 거부된다.
- 로그인한 상태에서 비활성화되면 다음 이동 때 로그아웃된다(앱 안 이동 포함).
- `LINK` 메뉴는 새 탭으로 열린다. `준비중` 메뉴는 클릭되지 않는다.

최종 확인: `npx tsc --noEmit`, 이 브랜치에서 바꾼 파일의 eslint, `npm run test`, `npm run build`.

## 7. 배포

- 스키마 반영: 운영 DB에 `prisma db push`를 실행한 뒤 `npm run db:seed`로 메뉴 시드를 넣는다. 시드는 반복해서 실행해도 안전하다.
- 시드에는 데모 사용자 upsert도 들어 있다. 운영에서 데모 계정을 만들지 않으려면 메뉴 시드를 `prisma/seed-menus.ts`로 분리하고 `npm run menus:seed`로 실행한다. `db:seed`는 사용자와 메뉴를 모두 넣는다.
- `docs/DEPLOYMENT.md`에 이 순서를 추가한다.
- 시드를 넣기 전에 배포하면 메뉴 테이블이 비어 사이드바가 빈다. 그 사이에도 `resolveMenuAccess`는 등록된 메뉴가 없는 경로를 허용하므로 페이지는 열린다.

## 8. 범위 밖

- 드라이브 폴더별 권한(3단계)
- 대시보드, 프로젝트, 포트폴리오, 드라이브 모듈의 읽기 전용 적용(순차 진행)
- 2단계 이상의 메뉴 깊이, 드래그 정렬, 메뉴 다국어, 메뉴 변경 이력
- 메뉴를 추가할 때 페이지를 자동으로 만드는 기능
