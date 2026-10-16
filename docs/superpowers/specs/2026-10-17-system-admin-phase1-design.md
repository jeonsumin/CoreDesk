# 시스템관리 1단계 설계 — 사용자관리 + 멤버관리 정비

- 작성일: 2026-10-17
- 상태: 리뷰 대기
- 범위: 3단계 중 1단계 (1. 사용자관리·멤버관리 → 2. 메뉴관리 → 3. 권한관리)

## 1. 목적

ADMIN 전용 `시스템관리` 메뉴를 만들고, 사내 사용자 계정을 ADMIN이 직접 관리한다. 프로젝트 `멤버 관리` 탭은 등록된 사용자를 골라 넣고 역할을 바꿀 수 있게 정비한다. 이 단계에서 만든 역할(`Role`)이 2·3단계 메뉴·폴더 권한의 기준이 된다.

### 성공 기준

- ADMIN만 사이드바에서 `시스템관리`를 보고 `/system/*`에 접근할 수 있다. 비ADMIN이 URL로 직접 들어가거나 Server Action을 직접 호출해도 거부된다.
- ADMIN이 사용자를 생성, 조회, 수정, 비활성화, 재활성화할 수 있다.
- 비활성 사용자는 로그인할 수 없고, 이미 로그인한 세션은 다음 페이지 이동 때 `/login`으로 보내진다.
- `/register`로 누구나 가입할 수 있는 경로가 없다.
- 프로젝트 ADMIN, 오너, PM이 활성 사용자를 선택해 멤버로 초대하고, 역할을 바꾸고, 제거할 수 있다.

## 2. 확정된 결정

| 항목 | 결정 |
| --- | --- |
| 권한 단위 | 시스템 역할(`Role` enum) 확장. 그룹 테이블이나 개별 지정은 쓰지 않는다 |
| 역할 | `ADMIN`(최고관리자), `MANAGER`, `MEMBER`, `VIEWER` |
| 계정 생성 | ADMIN만 생성한다. `/register`는 닫는다 |
| 사용자 삭제 | 비활성화(`isActive=false`)만 한다. 실제 삭제는 하지 않는다 |
| 프로젝트 역할 | `ProjectMember.role`(PM/DEVELOPER/VIEWER)은 기존 그대로 두고 시스템 역할과 분리한다 |

## 3. 데이터 모델

```prisma
enum Role {
  ADMIN
  MANAGER
  MEMBER
  VIEWER
}

model User {
  // 기존 필드 유지
  isActive Boolean @default(true)
}
```

- 새 테이블은 없다. 기존 ADMIN/MEMBER 데이터는 그대로 유지된다.
- 스키마 반영은 현재 개발 방식(`prisma db push`)을 따른다. 마이그레이션 이력 정리는 이 작업 범위가 아니다.

## 4. 접근 제어

### 4.1 ADMIN 게이트

- `src/lib/admin.ts`의 `requireAdmin()`은 세션 사용자의 **DB role**을 조회한다. ADMIN이 아니거나 비활성이면 에러를 던진다.
  - JWT의 role은 다시 로그인할 때까지 갱신되지 않는다. 그래서 권한 판단은 DB 값으로 한다.
- `src/app/(modules)/system/layout.tsx`는 같은 방식으로 확인하고, 실패하면 `notFound()`를 호출한다.
- `system` 모듈의 모든 Server Action은 첫 줄에서 `requireAdmin()`을 호출한다.
- 사이드바의 `시스템관리` 항목은 ADMIN에게만 렌더링한다. 이건 UX용이고 보안 경계는 위 두 겹이다.

### 4.2 비활성 사용자 차단

- `authorize()`(`src/lib/auth-config.ts`)는 `isActive=false`인 사용자의 로그인을 거부한다.
- `(modules)/layout.tsx`는 세션 사용자를 DB에서 조회한다. 사용자가 없거나 비활성이면 `/login`으로 redirect한다. 조회한 role은 `Sidebar`에 prop으로 넘긴다.
  - middleware는 Edge 런타임이라 Prisma를 쓸 수 없다. 그래서 레이아웃에서 검사한다. 세션 타임아웃(1시간)이 최대 노출 시간이다.

### 4.3 회원가입 차단

- `src/app/(auth)/register/page.tsx`는 `/login`으로 redirect만 하도록 바꾼다. 약관 콘텐츠(`content/`)와 마크다운 렌더러는 지우지 않고 그대로 둔다.
- `/api/register`는 이미 403을 반환하므로 그대로 둔다.
- middleware의 `isAuthPage`에서 `/register`를 뺀다.

## 5. 화면

### 5.1 사이드바

- `src/config/nav.ts`의 `NavItem`에 `children?: NavItem[]`, `adminOnly?: boolean`을 추가한다.
- `시스템관리`(아이콘 `Settings`, `adminOnly: true`)는 펼침형 그룹이다. 1단계 하위 항목은 `사용자관리`(`/system/users`) 하나다.
- 현재 경로가 그룹 하위면 그룹을 펼친 상태로 렌더링한다.
- 2단계에서 메뉴가 DB로 옮겨가면 `nav.ts`는 시드 데이터로 바뀐다.

### 5.2 라우트

```
src/app/(modules)/system/
├── layout.tsx              # ADMIN 게이트
├── page.tsx                # /system/users 로 redirect
└── users/
    ├── _actions/user.ts    # createUser, updateUser, setUserActive
    ├── _components/
    │   ├── UserTable.tsx
    │   └── UserFormDialog.tsx
    └── page.tsx
```

### 5.3 사용자 목록 `/system/users`

- 표 컬럼: 이름 / 이메일 / 역할 배지 / 상태(활성·비활성) / 가입일 / 액션([수정], [비활성화] 또는 [활성화])
- URL 필터:
  - `?q=`: 이름 또는 이메일 부분 일치
  - `?status=active|inactive|all`: 기본값 `active`
- 빈 상태:
  - 필터 결과가 없으면 "조건에 맞는 사용자가 없습니다"와 [필터 초기화]를 보여준다.
  - 전체가 비어 있으면 [사용자 추가]를 보여준다.

### 5.4 생성·수정 폼 (`UserFormDialog`, react-hook-form + Zod)

| 필드 | 생성 | 수정 |
| --- | --- | --- |
| 이름 | 필수, 1~50자 | 필수, 1~50자 |
| 이메일 | 필수, 이메일 형식 | 필수, 이메일 형식 |
| 역할 | 필수, 기본 `MEMBER` | 필수 |
| 비밀번호 | 필수, 6자 이상 | 선택. 비우면 유지, 입력하면 재설정 |

- 클라이언트와 서버가 같은 Zod 스키마(`src/lib/system/user-schema.ts`)를 쓴다.
- 비밀번호는 `bcryptjs`로 해시해서 저장한다.
- 이메일이 중복이면 `{ error: '이미 사용 중인 이메일입니다' }`를 반환한다.
- 저장이 끝나면 `revalidatePath('/system/users')`를 호출한다.

### 5.5 비활성화·활성화

- 확인 팝업 없이 즉시 처리한다. 되돌릴 수 있다.
- 비활성화된 사용자의 데이터(프로젝트, 태스크, 파일, 메모, 포트폴리오)는 그대로 둔다.

### 5.6 보호 규칙 (`canChangeUser`)

서버가 강제하고, UI는 해당 컨트롤을 숨긴다.

1. 자기 자신을 비활성화할 수 없다.
2. 자기 자신의 역할을 ADMIN이 아닌 역할로 바꿀 수 없다.
3. 변경 후 활성 ADMIN이 0명이 되는 변경(비활성화, 역할 강등)은 거부한다.

## 6. 프로젝트 멤버관리 정비

### 6.1 권한 통일

- `src/lib/project-access.ts`의 `canManageProject({ userRole, isOwner, memberRole })`는 ADMIN, 오너, PM일 때 `true`를 반환한다.
- 상세 페이지의 `canManage`와 `inviteMember`, `updateMemberRole`, `removeMember`가 모두 이 함수를 쓴다.
  - 지금은 액션이 PM 멤버만 허용한다. 그래서 PM 멤버가 아닌 오너나 ADMIN이 초대할 수 없다. 이 문제를 고친다.
- 액션에서 쓰는 role은 4.1과 같이 DB에서 조회한다.

### 6.2 초대

- 이메일 입력 대신 `Select`로 사용자를 고른다. 대상은 활성 사용자 중 현재 멤버가 아닌 사람이고, 표시는 "이름 (이메일)" 형식이다.
- 선택할 사람이 없으면 "초대할 수 있는 사용자가 없습니다"를 보여준다. ADMIN에게는 [사용자관리로 이동] 링크도 보여준다.
- 서버는 대상 사용자가 존재하는지, 활성인지, 이미 멤버가 아닌지 다시 검사한다.
- `removeMember`의 소유 프로젝트 조회처럼 기존 동작은 유지한다.

### 6.3 멤버 목록

- 역할 배지 자리에 역할 `Select`를 둔다. 바꾸면 즉시 `updateMemberRole`을 호출한다.
- 오너의 역할은 바꿀 수 없다. 오너 행은 배지로 표시한다.
- 제거 버튼은 `canManage`일 때 보인다. 오너와 자기 자신은 제거할 수 없다.
- 비활성 사용자에게는 "비활성" 배지를 붙인다. 자동으로 제거하지 않는다.
- 각 액션이 끝나면 `revalidatePath(`/projects/${projectId}`)`를 호출한다. 기존 `/settings` 경로도 유지한다.

## 7. 테스트

TDD로 진행한다. 순수 함수를 먼저 테스트하고 구현한다.

| 대상 | 위치 | 검증할 내용 |
| --- | --- | --- |
| `canChangeUser` | `src/lib/system/user-rules.ts` | 자기 비활성화 금지, 자기 강등 금지, 마지막 ADMIN 보호, 정상 변경 허용 |
| 사용자 Zod 스키마 | `src/lib/system/user-schema.ts` | 생성 시 비밀번호 필수, 수정 시 빈 비밀번호 허용, 이메일 형식, 역할 enum |
| `canManageProject` | `src/lib/project-access.ts` | ADMIN, 오너, PM은 허용. DEVELOPER, VIEWER, 비멤버는 거부 |

- 테스트 파일은 `tests/*.test.cjs`이고 `npm run test`(Node test runner)로 돌린다. TS 모듈은 `ts-node`로 불러온다.
- `tests/` 디렉토리는 현재 master에 없으므로 새로 만든다.
- 수동으로 확인할 것:
  - ADMIN 계정으로 시스템관리 메뉴가 보이고 CRUD가 동작하는지
  - MEMBER 계정에서 메뉴가 안 보이고 `/system/users`가 404인지
  - 비활성화한 계정이 로그인할 수 없는지
  - 로그인 중에 비활성화된 계정이 다음 이동 때 로그아웃되는지
  - 오너가 PM 멤버가 아닌 프로젝트에서도 멤버를 초대할 수 있는지
- 최종 확인은 `npm run lint`, `npx tsc --noEmit`, `npm run test`가 통과하는 것이다.

## 8. 범위 밖

- 메뉴관리(2단계), 메뉴별·드라이브 폴더별 권한(3단계)
- 비밀번호 찾기·셀프 변경, 감사 로그, 사용자 일괄 등록
- 사용자 실제 삭제와 데이터 이관
- `MANAGER`·`VIEWER` 역할별 실제 권한 차이. 1단계에서는 ADMIN 여부만 의미가 있고, 차이는 3단계에서 정의한다.
