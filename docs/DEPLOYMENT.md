# CoreDesk 서버 실행

## 1. 환경 파일 준비

```bash
cp .env.example .env
```

운영 서버에서는 `.env`의 아래 값을 실제 값으로 바꾼다.

```env
POSTGRES_PASSWORD=replace-with-strong-database-password
NEXTAUTH_URL=https://coredesk.example.com
NEXTAUTH_SECRET=replace-with-strong-auth-secret
FIELD_ENCRYPTION_KEY=base64:REPLACE_WITH_32_BYTE_BASE64_KEY
```

`NEXTAUTH_SECRET`와 `FIELD_ENCRYPTION_KEY`는 서로 다른 값으로 생성한다.

```bash
openssl rand -base64 32
```

`FIELD_ENCRYPTION_KEY`는 프로젝트 URL/계정/DB 비밀번호 복호화에 필요하므로 운영 중 변경하면 안 된다.

## 2. 서버 실행

> **릴리스 노트 (시스템관리 1단계 배포 전 필수):** 이 버전은 `User.isActive` 컬럼과 `Role` enum 변경을 포함한다.
> 그러나 `prisma/migrations/`는 PostgreSQL SQL이라 MySQL provider와 맞지 않고 해당 변경 마이그레이션도 없어서,
> `prisma migrate deploy`로는 스키마가 반영되지 않는다. 배포 전에 대상 DB에 대해 먼저 `npx prisma db push`를 실행해야 한다.
> 실행하지 않으면 로그인 시 알 수 없는 컬럼(`isActive`) 오류로 로그인이 실패한다.

> **릴리스 노트 (시스템관리 2단계 배포 전 필수):** 새 이미지를 롤아웃하기 **전에** 대상 DB에 `npx prisma db push`를 먼저 실행해야 한다.
> 실행하지 않으면 proxy가 요청마다 `Menu` 테이블을 읽으므로 인증이 필요한 모든 페이지가 500(Prisma P2021)이 된다. 자세한 절차는 §6.

```bash
docker compose up -d --build
```

실행 위치별 동작:

- 이미지 `CMD`는 `npm run start`(`next start`)뿐이며, 컨테이너 시작 시 Prisma 마이그레이션이나 `db push`를 실행하지 않는다.
- k8s(`k8s/30-deployment.yaml`)는 initContainer `migrate`에서 `prisma migrate deploy`를 실행한다. 다만 이 프로젝트의 `prisma/migrations/`는 PostgreSQL SQL이라 MySQL 스키마 변경(`isActive`, `Menu` 등)을 반영하지 못하므로, 스키마 반영은 별도로 `prisma db push`를 실행해야 한다.

## 3. 최고관리자 생성

최고관리자는 DB 마이그레이션이 성공하고 앱 컨테이너가 뜬 뒤, 서비스를 외부 사용자에게 열기 전에 1회 생성한다.

```bash
docker compose exec \
  -e ADMIN_EMAIL=admin@example.com \
  -e ADMIN_PASSWORD='replace-with-strong-admin-password' \
  -e ADMIN_NAME='최고관리자' \
  app npm run admin:create
```

같은 명령을 다시 실행하면 해당 이메일 계정을 `ADMIN`으로 승격하고 비밀번호를 갱신한다. 초기 생성 이후에는 `ADMIN_PASSWORD`를 `.env`에 저장하지 않는다.

## 4. 기존 비밀번호 암호화

기존 DB에 프로젝트 URL/계정/DB 비밀번호 평문 데이터가 있다면 아래 명령으로 1회 암호화한다.

```bash
docker compose exec app npm run secrets:encrypt
```

## 5. 업로드 저장소

업로드 파일은 컨테이너 내부 경로 `/app/uploads`에 Docker named volume `uploads_data`로 유지한다. 서버 이전이나 백업 시 `postgres_data`와 `uploads_data`를 함께 백업해야 한다.

## 6. 시스템관리 2단계 (메뉴관리·권한관리) 배포

사이드바가 DB 메뉴 기반으로 바뀌었으므로 배포 시 대상 DB에 대해 아래 순서로 실행한다.

```bash
# 개발 체크아웃 또는 CI 머신에서, DATABASE_URL을 대상 DB로 지정해 실행한다.
# 운영 이미지는 `npm ci --omit=dev`라 ts-node(devDependency)가 없어 menus:seed를 실행할 수 없다.
DATABASE_URL="<대상 DB URL>" npx prisma db push      # Menu, MenuPermission 테이블 반영 (이미지 롤아웃 전)
DATABASE_URL="<대상 DB URL>" npm run menus:seed      # 기본 메뉴와 권한 시드
```

- `menus:seed`는 멱등이며 데모 사용자를 만들지 않는다. (`db:seed`도 메뉴를 시드하지만 데모 사용자까지 만들므로 운영에는 쓰지 않는다.)
- `menus:seed`를 다시 실행하면 관리자가 삭제한 시드 메뉴가 다시 생성된다.
- `db push` 후 시드 전에 배포하면 사이드바가 비어 보일 뿐 페이지는 열리며, 시드를 실행하면 바로 복구된다. `db push` 없이 배포하면 모든 인증 페이지가 500이 된다.
- `src/middleware.ts`는 `src/proxy.ts`로 대체되었다(Next 16, Node 런타임). 요청마다 비활성 사용자와 숨김 처리된 메뉴 경로를 차단한다.

## 7. 시스템관리 3단계 (드라이브 폴더 공유) 배포

루트 폴더를 역할별로 공유할 수 있도록 변경되었으므로 배포 시 대상 DB에 대해 아래 순서로 실행한다.

```bash
# 개발 체크아웃 또는 CI 머신에서, DATABASE_URL을 대상 DB로 지정해 실행한다.
# 운영 이미지는 `npm ci --omit=dev`라 ts-node(devDependency)가 없어 drive:backfill-root를 실행할 수 없다.
DATABASE_URL="<대상 DB URL>" npx prisma db push              # DriveFolderPermission 테이블, DriveFolder.rootId 컬럼 반영 (이미지 롤아웃 전)
DATABASE_URL="<대상 DB URL>" npm run drive:backfill-root     # 기존 폴더의 rootId 채우기
```

- `drive:backfill-root`는 멱등이며 데모 데이터를 생성하지 않는다. 기존 폴더들의 계층 구조를 바탕으로 각 하위 폴더의 `rootId`를 최상위 루트 폴더 id로 채운다.
- `db push` 후 backfill 전에 배포하면 `rootId` 미설정 하위 폴더는 자기 자신을 루트로 취급해 비공개(소유자만 접근)로 동작하지만, 데이터 손실이나 노출은 없다. `npm run drive:backfill-root`를 실행하면 바로 복구된다.
- `db push` 없이 배포하면 드라이브 페이지 및 드라이브 액션·파일 API가 500 에러를 낸다. (`DriveFolder.rootId`/`DriveFolderPermission` 컬럼이 없기 때문) 다른 인증 페이지는 영향 없다.
