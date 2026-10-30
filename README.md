# CoreDesk

CoreDesk는 IT/소프트웨어 회사를 위한 사내 ERP 시스템입니다. 프로젝트, 태스크, 일정, 산출물, 메모를 한곳에서 관리해 PM, 개발자, 경영진이 같은 기준으로 업무 현황과 리스크를 확인할 수 있게 합니다.

## 주요 기능

- 인증: Auth.js v5 기반 이메일/비밀번호 로그인, 관리자 계정 생성 스크립트 (회원가입 없음, 계정은 ADMIN이 생성)
- 시스템관리: 사용자관리(ADMIN 전용) — 사용자 생성·수정·비활성화
  - 메뉴관리: 사이드바 메뉴 추가·정렬, 준비중/외부 링크 지원
  - 메뉴별 권한: 역할별 숨김/읽기/쓰기 설정 (읽기 전용은 메모부터 적용)
  - 드라이브 폴더 공유: 루트 폴더를 역할별로 공유, 메뉴 권한과 폴더 권한의 낮은 쪽 적용 (하위 폴더·파일은 루트 권한을 상속, 권한 관리는 폴더 소유자·ADMIN 전용, 포트폴리오 폴더는 항상 비공개)
- 대시보드: 프로젝트 요약, 오늘 마감 태스크, 마감 위기 배너
- 프로젝트 관리: 프로젝트 생성/수정/삭제, 멤버 역할 관리, 진행률 계산
- 태스크 관리: 상태별 칸반 보드, 목록 뷰, 담당자/우선순위/마감일 관리
- 마일스톤: 시작일/마감일 기반 일정 관리, WBS 타임라인
- 프로젝트 정보: URL, 서버 계정, DB 접속 정보 저장 및 민감 정보 암호화
- 포트폴리오: 프로젝트 산출물, 기술 스택, 링크, 이미지 관리
- 메모: 개인 메모 작성, 마크다운 미리보기, 프로젝트 연결
- 드라이브: 폴더/파일 업로드, 미리보기, 포트폴리오 이미지 연동

## 기술 스택

| 영역 | 기술 |
| --- | --- |
| 프레임워크 | Next.js App Router |
| UI | React, Tailwind CSS, shadcn/ui, lucide-react |
| 언어 | TypeScript strict |
| 인증 | Auth.js v5 |
| ORM/DB | Prisma, MySQL |
| 폼/검증 | react-hook-form, Zod |
| 테스트 | Node.js test runner |
| 배포 | Docker, Docker Compose |

현재 정확한 패키지 버전은 [package.json](./package.json)을 기준으로 확인하세요.

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 준비

```bash
cp .env.example .env
```

로컬 개발용 기본값은 `.env.example`을 참고합니다. `NEXTAUTH_SECRET`와 `FIELD_ENCRYPTION_KEY`는 서로 다른 32바이트 이상 난수로 설정하세요.

```bash
openssl rand -base64 32
```

`FIELD_ENCRYPTION_KEY`는 프로젝트 URL/계정/DB 비밀번호 암호화에 사용되므로 운영 중 변경하면 기존 값을 복호화할 수 없습니다.

### 3. DB 실행

개발 환경에서 DB(MySQL)만 Docker로 실행하려면:

```bash
docker compose up -d db
```

이때 `.env`의 `DATABASE_URL`은 `mysql://coredesk:coredesk@localhost:3306/coredesk`로 설정합니다.

### 4. Prisma 마이그레이션 및 시드

```bash
npx prisma db push
npm run db:seed
```

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 관리자 계정 생성

마이그레이션 이후 관리자 계정을 생성하거나 기존 계정을 관리자로 승격할 수 있습니다.

```bash
ADMIN_EMAIL=admin@example.com \
ADMIN_PASSWORD='replace-with-strong-admin-password' \
ADMIN_NAME='최고관리자' \
npm run admin:create
```

운영 환경에서는 관리자 생성 후 비밀번호를 `.env`에 남기지 않습니다.

## 자주 쓰는 명령어

```bash
npm run dev              # 개발 서버 실행
npm run build            # 프로덕션 빌드
npm run start            # 빌드 결과 실행
npm run lint             # ESLint 검사
npm run test             # 테스트 실행
npm run db:seed          # 시드 데이터 삽입
npm run admin:create     # 관리자 계정 생성/승격
npm run secrets:encrypt  # 기존 민감 정보 암호화
```

## Docker 실행

`docker-compose.yml`은 개발용입니다. DB와 개발 서버(`next dev`)를 함께 띄웁니다.

```bash
docker compose up -d              # db + app 실행
docker compose logs -f app        # 기동 로그 (첫 실행은 npm install로 몇 분 걸림)
docker compose exec app npm run db:seed   # 시드 데이터 삽입
docker compose down               # 중지 (데이터 유지)
docker compose down -v            # 중지 + DB/node_modules 볼륨 삭제
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

| 서비스 | 내용 |
| --- | --- |
| `db` | MySQL 8.4, `localhost:3306`, 계정 `coredesk` / `coredesk`(로컬 전용), 데이터는 `mysql_data` 볼륨 |
| `app` | `node:22`, 소스를 bind mount해 핫리로드, 시작 시 `npm install` → `prisma db push` → `prisma generate` → `npm run dev` |

- `.env`는 `env_file`로 읽고 `DATABASE_URL`, `NEXTAUTH_URL`은 compose에서 로컬 값으로 덮어씁니다. `.env`가 다른 DB를 가리켜도 개발 컨테이너는 로컬 `db`에 연결됩니다.
- `node_modules`는 `node_modules` 볼륨으로 분리합니다. 호스트(macOS)용 sharp/prisma 바이너리와 섞이지 않게 하기 위해서입니다. 의존성이 꼬이면 `docker compose down -v` 후 다시 실행합니다.
- `prisma/migrations/`는 PostgreSQL SQL이라 MySQL에 `migrate deploy`를 쓸 수 없어 `db push`로 스키마를 맞춥니다.

자세한 운영 절차는 [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)를 참고하세요.

## 운영 DB 반영: 권한 그룹 전환

사용자 역할이 `ADMIN/MANAGER/MEMBER/VIEWER` 4개에서 **사용자 / 최고 관리자** 2개로 바뀌고, 메뉴 권한은 관리자가 만드는 **권한 그룹**(읽기·쓰기·수정·삭제)으로 관리합니다. 드라이브 폴더 공유는 역할이 아니라 **사용자별**(읽기·쓰기)로 바뀝니다.

DB 구조가 바뀌므로 기존 데이터가 있는 DB에는 아래 순서를 반드시 지킵니다.

> **이관 스크립트보다 먼저 `prisma db push`를 실행하지 마세요.** 기존 역할 값 때문에 실패하거나, 성공하더라도 기존 메뉴·폴더 권한이 사라집니다.
> k8s 배포의 init 컨테이너(`prisma migrate deploy`)는 이 변경을 반영하지 않습니다. 이관은 아래 스크립트로만 합니다.

### 1. DB 백업

```bash
mysqldump -h <host> -u <user> -p --single-transaction --no-tablespaces <db> > coredesk-before-permission-groups.sql
```

### 2. 앱 중지

이전 버전 앱은 새 구조의 DB에서 오류가 나고, 이관 중 쓰기가 섞이면 안 되므로 먼저 멈춥니다.

```bash
kubectl -n coredesk scale deployment coredesk --replicas=0   # k8s
pm2 stop next-app                                            # pm2
```

### 3. 이관 스크립트 실행

새 버전 코드에서 의존성을 설치한 뒤, 운영 DB 주소를 **명시적으로** 넘겨 실행합니다.

```bash
npm ci
DATABASE_URL="mysql://<user>:<password>@<host>:3306/<db>" npm run migrate:permission-groups
```

스크립트가 하는 일:

1. 기존 역할별 메뉴·폴더 권한과 사용자 역할을 백업 파일(JSON, 경로는 실행 로그에 출력)로 저장
2. 최고 관리자(`ADMIN`)를 뺀 사용자 역할을 `USER`로 변경
3. `prisma db push`로 새 구조 반영, `prisma generate`
4. 권한 그룹을 만들고 데이터를 옮김

| 기존 | 이관 후 |
| --- | --- |
| 역할 `ADMIN` | 최고 관리자 (그룹 없음, 모든 메뉴) |
| 역할 `MANAGER` / `MEMBER` / `VIEWER` | 사용자 + 권한 그룹 `매니저` / `멤버` / `열람자` |
| 메뉴 권한 `쓰기` | 읽기·쓰기·수정·삭제 모두 |
| 메뉴 권한 `읽기` | 읽기만 |
| 메뉴 권한 `숨김` | 권한 없음 |
| 역할별 폴더 공유 (`읽기`/`쓰기`) | 그 역할이던 사용자 각각에게 같은 권한 (폴더 소유자 제외) |

실행 로그 마지막 줄이 `그룹 3개, 메뉴 권한 N건, 폴더 권한 N건 이관 완료`이면 성공입니다. 중간에 실패해도 같은 명령을 다시 실행하면 됩니다(이미 옮긴 데이터는 덮어쓰기만 합니다).

### 4. 새 버전 배포·기동

```bash
kubectl -n coredesk scale deployment coredesk --replicas=1   # k8s (새 이미지 배포 후)
pm2 start next-app                                           # pm2 (새 버전 빌드 후)
```

### 5. 확인

- 최고 관리자로 로그인 → 시스템관리 > 권한관리에서 `매니저`·`멤버`·`열람자` 그룹과 소속 사용자, 메뉴 권한이 이전과 같은지 확인
- 일반 사용자로 로그인 → 사이드바에 권한 있는 메뉴만 보이고 시스템관리가 없는지 확인

### 되돌리기

1번에서 받은 백업을 복원하고 이전 버전을 배포합니다.

```bash
mysql -h <host> -u <user> -p <db> < coredesk-before-permission-groups.sql
```

## 프로젝트 구조

```text
src/
├── app/
│   ├── (auth)/                 # 로그인
│   ├── (modules)/              # 인증 후 사용하는 ERP 모듈
│   │   ├── dashboard/
│   │   ├── projects/
│   │   ├── portfolios/
│   │   ├── memos/
│   │   └── drive/
│   └── api/                    # Auth.js, 파일 다운로드 API
├── components/
│   ├── layout/                 # 사이드바, 헤더
│   └── ui/                     # shadcn/ui 기반 공통 컴포넌트
├── config/                     # 내비게이션 설정
├── lib/                        # Prisma, 인증, 도메인 유틸
├── middleware.ts               # 인증 라우트 보호
└── types/                      # 공유 타입

prisma/
├── schema.prisma
├── seed.ts
└── migrations/

tests/
└── *.test.cjs
```

## 개발 규칙

- Prisma Client는 Server Component, Server Action, Route Handler에서만 사용합니다.
- 데이터 생성/수정/삭제는 Server Actions를 우선 사용합니다.
- Client Component는 폼, 드롭다운, 모달, 상태 토글처럼 인터랙션이 필요한 곳에만 둡니다.
- 필터 상태는 가능한 URL 파라미터로 관리하고 전역 상태 라이브러리는 추가하지 않습니다.
- 새 기능은 테스트를 먼저 작성하고 구현합니다.
- 커밋 메시지는 conventional commits 형식을 사용합니다. 예: `feat: add project dashboard`

## 참고 문서

- [docs/PRD.md](./docs/PRD.md): 제품 목표, 사용자 스토리, 핵심 플로우
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md): 아키텍처 규칙, 데이터 모델, 디렉토리 구조
- [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md): Docker 기반 운영 서버 실행 절차
- [DESIGN.md](./DESIGN.md): UI/UX 디자인 가이드
