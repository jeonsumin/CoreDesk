# CoreDesk 서버 실행

## 1. 환경 파일 준비

```bash
cp .env.example .env
```

운영 서버에서는 `.env`의 아래 값을 실제 값으로 바꾼다.

```env
DATABASE_URL=mysql://coredesk:replace-with-strong-database-password@db:3306/coredesk
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

```bash
docker compose up -d --build
```

앱 컨테이너는 시작 시 `prisma migrate deploy`를 실행한 뒤 `next start`로 기동한다.

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

업로드 파일은 컨테이너 내부 경로 `/app/uploads`에 Docker named volume `uploads_data`로 유지한다. 서버 이전이나 백업 시 `mysql_data`와 `uploads_data`를 함께 백업해야 한다.
